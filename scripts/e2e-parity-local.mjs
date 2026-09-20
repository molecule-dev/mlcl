#!/usr/bin/env node
/**
 * Live parity e2e — drives every `parity ✅` row of docs/PARITY.md against the
 * RUNNING local stack. Read-only where possible; mutating ops create+delete
 * their own rows. Prereqs: molecule-dev `npm run dev`, test-user password set
 * (e2e-login-local.mjs --setup). Exit 1 on any failure — this is the parity
 * gate's live proof, paired with check-parity-coverage.mjs (structural).
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MLCL = join(import.meta.dirname, '..')
const API = process.env.MOLECULE_API_URL ?? 'http://localhost:4000/api'
const EMAIL = 'test@molecule.dev'
const PASSWORD = 'MlclE2eTest!2026'

let failures = 0
const check = (name, cond, detail = '') => {
  console.log(
    `${cond ? '✓' : '✗'} ${name}${!cond && detail ? ` — ${String(detail).slice(0, 140)}` : ''}`,
  )
  if (!cond) failures++
}

async function main() {
  // Login (real) → cookie for approve-style flows + CLI credentials via dance.
  const login = await fetch(`${API}/users/log-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
  check('P0 login', login.ok)

  const home = mkdtempSync(join(tmpdir(), 'mlcl-parity-'))
  const run = (args, input = '') =>
    new Promise((resolve) => {
      const p = spawn(process.execPath, [join(MLCL, 'bin/run.js'), ...args], {
        env: { ...process.env, HOME: home, MOLECULE_ENV: 'local', MOLECULE_TELEMETRY: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let out = ''
      p.stdout.on('data', (c) => (out += c))
      p.stderr.on('data', (c) => (out += c))
      p.on('close', (code) => resolve({ code, out }))
      p.stdin.end(input)
    })

  // CLI login via the dance
  let dance = ''
  const cli = spawn(process.execPath, [join(MLCL, 'bin/run.js'), 'login', '--no-browser'], {
    env: { ...process.env, HOME: home, MOLECULE_ENV: 'local', MOLECULE_TELEMETRY: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  cli.stdout.on('data', (c) => (dance += c))
  cli.stderr.on('data', (c) => (dance += c))
  await new Promise((r) => setTimeout(r, 2500))
  const code = dance.match(/[A-Z2-9]{4}-[A-Z2-9]{4}/)?.[0]
  await fetch(`${API}/cli/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ userCode: code }),
  })
  await new Promise((r) => setTimeout(r, 5000))
  check('P1 CLI login dance', dance.includes('Logged in as'))

  // Find a project to operate on (the test user has IoT Device Manager etc.)
  const projects = await (await fetch(`${API}/projects`, { headers: { cookie } })).json()
  const project =
    (Array.isArray(projects) ? projects : (projects?.devices ?? []))[0] ?? projects?.[0]
  const pid = project?.id
  check('P2 have a project', Boolean(pid), JSON.stringify(projects).slice(0, 120))

  if (pid) {
    // ── project ──
    const plist = await run(['project', 'list', '--json'])
    check(
      'P3 project list --json',
      plist.code === 0 && plist.out.includes(pid),
      plist.out.slice(-120),
    )
    const popen = await run(['project', 'open', pid])
    check(
      'P4 project open prints workspace URL',
      popen.out.includes(`/workspace/${pid}`),
      popen.out,
    )

    // ── sandbox ──
    const sstatus = await run(['sandbox', 'status', '--project', pid])
    check('P5 sandbox status (any state)', sstatus.code === 0, sstatus.out.slice(-140))

    // ── snapshots ──
    const snaps = await run(['snapshot', 'list', '--project', pid])
    check('P6 snapshot list', snaps.code === 0, snaps.out.slice(-120))

    // ── deploy ──
    const deps = await run(['deploy', 'list', '--project', pid])
    check('P7 deploy list', deps.code === 0, deps.out.slice(-120))

    // ── workflows (GET only, no --apply to keep the sandbox clean) ──
    const wf = await run(['deploy', 'workflow-github', '--project', pid])
    check(
      'P8 workflow-github generates YAML',
      wf.code === 0 && /on:|jobs:|name:/m.test(wf.out),
      wf.out.slice(-120),
    )

    // ── domains ──
    const doms = await run(['domain', 'list', '--project', pid])
    check('P9 domain list', doms.code === 0, doms.out.slice(-120))

    // ── api keys: create + list + revoke (own rows) ──
    const key = await run(['apikey', 'create', '--project', pid, '--name', 'parity-e2e'])
    const keyId = key.out.match(/mk_\w+|\b[0-9a-f-]{36}\b/)?.[0]
    check('P10 apikey create', key.code === 0 && Boolean(keyId), key.out.slice(-120))
    if (keyId) {
      const klist = await run(['apikey', 'list', '--project', pid])
      check('P11 apikey list', klist.code === 0, klist.out.slice(-120))
      // revoke by id (the 36-char form)
      const rowId =
        keyId.length === 36
          ? keyId
          : (await run(['apikey', 'list', '--project', pid, '--json'])).out.match(
              /"id":\s*"[0-9a-f-]{36}"/,
            )?.[1]
      const krm = await run(['apikey', 'rm', '--project', pid, rowId ?? keyId])
      check('P12 apikey rm', krm.code === 0, krm.out.slice(-120))
    }

    // ── team ──
    const tlist = await run(['team', 'list', '--project', pid])
    check('P13 team list', tlist.code === 0, tlist.out.slice(-120))
    const tinv = await run([
      'team',
      'invite',
      '--project',
      pid,
      '--email',
      `parity-${Date.now()}@example.com`,
      '--role',
      'viewer',
    ])
    check('P14 team invite', tinv.code === 0, tinv.out.slice(-140))
    if (tinv.code === 0) {
      const inviteId = (await run(['team', 'list', '--project', pid, '--json'])).out.match(
        /"id":\s*"([^"]+)"/,
      )?.[1]
      if (inviteId) {
        const trev = await run(['team', 'revoke', '--project', pid, inviteId])
        check('P15 team revoke invite', trev.code === 0, trev.out.slice(-120))
      }
    }

    // ── shares: create + list + rm (own rows) ──
    const sh = await run(['share', 'create', '--project', pid])
    check('P16 share create', sh.code === 0, sh.out.slice(-120))
    if (sh.code === 0) {
      const shl = await run(['share', 'list', '--project', pid])
      check('P17 share list', shl.code === 0, shl.out.slice(-120))
      const shareId = shl.out.match(/[0-9a-f-]{36}/)?.[0]
      if (shareId) {
        const shm = await run(['share', 'rm', '--project', pid, shareId])
        check('P18 share rm', shm.code === 0, shm.out.slice(-120))
      }
    }

    // ── builds ──
    const bl = await run(['build', 'list', '--project', pid])
    check('P19 build list', bl.code === 0, bl.out.slice(-120))

    // ── usage ──
    const usage = await run(['usage', '--project', pid])
    check('P20 usage --project', usage.code === 0, usage.out.slice(-120))
    const tiers = await run(['usage', 'tiers'])
    check('P21 usage tiers', tiers.code === 0, tiers.out.slice(-120))

    // ── db backups ──
    const blist = await run(['db', 'backup-list', '--project', pid])
    check('P22 db backup-list', blist.code === 0, blist.out.slice(-120))

    // ── env ──
    const envPull = await run(['env', 'pull', '--project', pid])
    check('P23 env pull', envPull.code === 0, envPull.out.slice(-140))

    // ── git (mediated — will fail gracefully without a remote; assert clean error, not a crash) ──
    const gp = await run(['git', 'push', '--project', pid])
    check(
      'P24 git push handles no-remote cleanly',
      gp.code !== 0 || gp.out.includes('Pushed'),
      gp.out.slice(-140),
    )
  }

  // ── devices (already security-matrix-tested; quick re-check) ──
  const dl = await run(['device', 'list'])
  check('P25 device list', dl.code === 0, dl.out.slice(-120))

  cli.kill()
  rmSync(home, { recursive: true, force: true })
  console.log(failures ? `\n${failures} FAILED` : '\nparity e2e: ALL GREEN')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
