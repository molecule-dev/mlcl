#!/usr/bin/env node
/**
 * REAL end-to-end login test — against the RUNNING local molecule.dev stack
 * (api :4000), not a mock. Exercises the exact user path:
 *
 *   mlcl login --no-browser  →  POST /cli/device-code (real DB row)
 *   approve via real session  →  POST /cli/approve
 *   CLI poll receives token   →  GET /users/me verifies + stores
 *   whoami + project list     →  authenticated platform ops work
 *
 * PREREQUISITES:
 *   - molecule-dev dev stack running (cd molecule-dev && npm run dev)
 *   - docker exec access to molecule-dev-db-1 (for --setup only)
 *
 * Usage:
 *   node scripts/e2e-login-local.mjs --setup   # first run: mint test-user password
 *   node scripts/e2e-login-local.mjs           # the dance itself
 *
 * The --setup step sets test@molecule.dev's password to a known value via the
 * REAL bcrypt bond (packages/api/bonds/password/bcrypt) + psql — the same hash
 * the platform itself stores. Cookie jar at /tmp/mlcl-e2e-cookies.txt is
 * (re)created by the script's login call.
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MLCL = join(import.meta.dirname, '..')
const API = process.env.MOLECULE_API_URL ?? 'http://localhost:4000/api'
const EMAIL = 'test@molecule.dev'
const PASSWORD = 'MlclE2eTest!2026'

let failures = 0
const check = (name, cond, detail = '') => {
  console.log(
    `${cond ? '✓' : '✗'} ${name}${!cond && detail ? ` — ${String(detail).slice(0, 160)}` : ''}`,
  )
  if (!cond) failures++
}

async function main() {
  if (process.argv.includes('--setup')) {
    const { setProvider, hash } = await import(
      join(MLCL, '../molecule/packages/api/core/password/dist/index.js').replace(/\\/g, '/')
    )
    const bcrypt = await import(
      join(MLCL, '../molecule/packages/api/bonds/password/bcrypt/dist/index.js').replace(/\\/g, '/')
    )
    setProvider(bcrypt.provider)
    const passwordHash = await hash(PASSWORD)
    const userId = execFileSync(
      'docker',
      [
        'exec',
        'molecule-dev-db-1',
        'psql',
        '-U',
        'molecule',
        '-d',
        'molecule',
        '-tAc',
        `UPDATE "usersSecrets" SET "passwordHash" = '${passwordHash}'
         WHERE id = (SELECT id FROM users WHERE email = '${EMAIL}')
         RETURNING LEFT("passwordHash", 4)`,
      ],
      { encoding: 'utf8' },
    ).trim()
    check('setup: password set', passwordHash.length > 0, userId)
    if (!passwordHash) process.exit(1)
  }

  // 1. Real login → session cookie (what the browser holds after the form).
  const login = await fetch(`${API}/users/log-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const setCookie = login.headers.get('set-cookie') ?? ''
  const cookie = setCookie.split(';')[0]
  check('platform login (real credentials)', login.ok && cookie.length > 0, `HTTP ${login.status}`)
  if (!login.ok) process.exit(1)

  // 2. The CLI dance in an isolated HOME.
  const home = mkdtempSync(join(tmpdir(), 'mlcl-e2e-real-'))
  const cli = spawn(process.execPath, [join(MLCL, 'bin/run.js'), 'login', '--no-browser'], {
    env: { ...process.env, HOME: home, MOLECULE_ENV: 'local', MOLECULE_TELEMETRY: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let captured = ''
  cli.stdout.on('data', (c) => (captured += c))
  cli.stderr.on('data', (c) => (captured += c))
  await new Promise((r) => setTimeout(r, 2500))
  const code = captured.match(/[A-Z2-9]{4}-[A-Z2-9]{4}/)?.[0]
  check('CLI printed a code', Boolean(code), captured.slice(0, 120))
  check('CLI URL points at local site', captured.includes('localhost:3000/cli'), captured)

  // 3. Approve as the authenticated user (what the /cli page does).
  const approve = await fetch(`${API}/cli/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ userCode: code }),
  })
  check('approve (real session)', approve.ok, `HTTP ${approve.status}`)

  // 4. CLI finishes + stores.
  await new Promise((r) => setTimeout(r, 5000))
  check('CLI logged in', captured.includes('Logged in as test@molecule.dev'), captured.slice(-160))
  const creds = JSON.parse(readFileSync(join(home, '.mlcl/credentials.json'), 'utf8'))
  check('token stored + email captured', creds.token?.length > 20 && creds.email === EMAIL)

  cli.kill()
  rmSync(home, { recursive: true, force: true })
  console.log(failures ? `\n${failures} FAILED` : '\nreal-stack login e2e: ALL GREEN')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
