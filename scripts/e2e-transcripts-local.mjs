#!/usr/bin/env node
/**
 * REAL end-to-end check of transcript import and public build sessions —
 * against a RUNNING local molecule.dev API, not a mock:
 *   platform login (real credentials) → mlcl login (device code, approved)
 *   → a project + share link → mlcl transcripts import <real files>
 *   → mlcl transcripts list → mlcl share visibility --transcripts on
 *   → anonymous GET /share/:slug/sessions + one session → redaction check
 *   → mlcl share visibility --transcripts off → the public route 404s again.
 *
 * The public workspace (code) half needs a running sandbox; the check only
 * asserts that turning it on without one answers `workspace.sleeping`.
 *
 * Usage:
 *   MOLECULE_API_URL=http://localhost:4210/api node scripts/e2e-transcripts-local.mjs <transcript files…>
 *   (run scripts/e2e-login-local.mjs --setup once first: it sets the test user's password)
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MLCL = join(import.meta.dirname, '..')
const API = process.env.MOLECULE_API_URL ?? 'http://localhost:4000/api'
const EMAIL = 'test@molecule.dev'
const PASSWORD = 'MlclE2eTest!2026'
const files = process.argv.slice(2)

let failures = 0
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`)
  if (!cond) failures++
}

const home = mkdtempSync(join(tmpdir(), 'mlcl-e2e-transcripts-'))
const env = {
  ...process.env,
  HOME: home,
  MOLECULE_ENV: 'local',
  MOLECULE_API_URL: API,
  MOLECULE_TELEMETRY: '0',
}
const mlcl = (...args) => {
  try {
    return {
      ok: true,
      out: execFileSync(process.execPath, [join(MLCL, 'bin/run.js'), ...args], {
        env,
        encoding: 'utf8',
      }),
    }
  } catch (error) {
    return { ok: false, out: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

async function main() {
  if (!files.length) {
    console.error('usage: e2e-transcripts-local.mjs <transcript files…>')
    process.exit(2)
  }
  const login = await fetch(`${API}/users/log-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
  check('platform login', login.ok && cookie.length > 0, `HTTP ${login.status}`)
  if (!login.ok) process.exit(1)

  const cli = spawn(process.execPath, [join(MLCL, 'bin/run.js'), 'login', '--no-browser'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let captured = ''
  cli.stdout.on('data', (c) => (captured += c))
  cli.stderr.on('data', (c) => (captured += c))
  await new Promise((r) => setTimeout(r, 2500))
  const code = captured.match(/[A-Z2-9]{4}-[A-Z2-9]{4}/)?.[0]
  const approve = await fetch(`${API}/cli/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ userCode: code }),
  })
  check('mlcl login approved', Boolean(code) && approve.ok, `HTTP ${approve.status}`)
  await new Promise((r) => setTimeout(r, 5000))
  cli.kill()
  check('mlcl logged in', captured.includes('Logged in as'), captured.slice(-120))

  // A project and a share link, the way the IDE creates them.
  const created = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ name: 'transcripts e2e', projectType: 'static' }),
  })
  const project = await created.json().catch(() => ({}))
  const projectId = project?.props?.id ?? project?.id ?? project?.data?.id
  check('project created', created.ok && Boolean(projectId), `HTTP ${created.status}`)
  const share = await fetch(`${API}/projects/${projectId}/shares`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ role: 'viewer' }),
  })
  const shareBody = await share.json().catch(() => ({}))
  const slug =
    shareBody?.slug ?? shareBody?.link?.slug ?? shareBody?.props?.slug ?? shareBody?.data?.slug
  check('share link created', share.ok && Boolean(slug), JSON.stringify(shareBody).slice(0, 160))

  // Import through the CLI.
  const imp = mlcl('transcripts', 'import', ...files, '-p', projectId, '--json')
  check('mlcl transcripts import', imp.ok, imp.out.slice(0, 300))
  const again = mlcl('transcripts', 'import', files[0], '-p', projectId, '--json')
  check(
    're-import is idempotent',
    again.ok && /already|existing|"status":\s*200|"duplicate"/i.test(again.out),
    again.out.slice(0, 200),
  )
  const list = mlcl('transcripts', 'list', '-p', projectId)
  check(
    'mlcl transcripts list shows the imports',
    list.ok && /imported/.test(list.out),
    list.out.slice(0, 300),
  )

  // Public view: off → 404; on → sessions readable anonymously.
  const off = await fetch(`${API}/share/${slug}/sessions`)
  check('public sessions 404 before opting in', off.status === 404, `HTTP ${off.status}`)
  const vis = mlcl('share', 'visibility', '-p', projectId, '--transcripts', 'on')
  check('mlcl share visibility --transcripts on', vis.ok, vis.out.slice(0, 200))
  const pub = await fetch(`${API}/share/${slug}/sessions`)
  const pubBody = await pub.json().catch(() => ({}))
  const sessions = pubBody?.sessions ?? []
  check(
    'public sessions listed',
    pub.ok && sessions.some((s) => s.source === 'import'),
    `HTTP ${pub.status}, ${sessions.length} sessions`,
  )
  for (const s of sessions.filter((x) => x.source === 'import')) {
    const one = await fetch(`${API}/share/${slug}/sessions/${s.id}`)
    const body = await one.json().catch(() => ({}))
    const turns = body?.session?.turns ?? []
    check(
      `session ${s.harness}: ${s.turns} turns, title "${String(s.title).slice(0, 50)}"`,
      one.ok && turns.length === s.turns && turns.length > 0,
    )
    const text = JSON.stringify(body)
    check(
      `session ${s.harness}: no private key or bearer token`,
      !/-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer [A-Za-z0-9._-]{20,}/.test(text),
    )
  }
  const meta = await fetch(`${API}/share/${slug}`)
  const metaBody = await meta.json().catch(() => ({}))
  const flat = metaBody?.props ?? metaBody?.data ?? metaBody
  check(
    'share resolve reports publicTranscript',
    JSON.stringify(flat).includes('"publicTranscript":true'),
  )

  // Code: without a running sandbox the switch refuses, plainly.
  const ws = mlcl('share', 'visibility', '-p', projectId, '--workspace', 'on')
  check(
    'workspace on without a sandbox explains itself',
    !ws.ok && /Start the project's sandbox first/.test(ws.out),
    ws.out.slice(0, 200),
  )

  // Off again → 404 like an unknown slug.
  mlcl('share', 'visibility', '-p', projectId, '--transcripts', 'off')
  const offAgain = await fetch(`${API}/share/${slug}/sessions`)
  check('public sessions 404 after opting out', offAgain.status === 404, `HTTP ${offAgain.status}`)

  await fetch(`${API}/projects/${projectId}`, { method: 'DELETE', headers: { cookie } })
  rmSync(home, { recursive: true, force: true })
  console.log(failures ? `\n${failures} FAILED` : '\ntranscripts e2e (real local stack): ALL GREEN')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  rmSync(home, { recursive: true, force: true })
  process.exit(1)
})
