#!/usr/bin/env node
/**
 * Make this repo's never-published packages publishable by CI — once, before
 * their first release. The same step as molecule's `npm run trust:new`.
 *
 * npm's trusted publishing (OIDC) needs a trust link on the package, and the
 * link can exist BEFORE the package does: the trust endpoint accepts the
 * permission pair `createPackage` + `createStagedPackage`, which is what lets a
 * brand-new name's FIRST version publish from CI. (`npm trust github
 * --allow-publish` sends `createPackage` alone, which 404s for a missing name —
 * the reason this repo's release notes once said a first publish needed a
 * local `npm publish`.) The endpoint wants the owner's `npm login` session and
 * a current 2FA code; one code covers every call inside its window.
 *
 *   npm run trust:new           # trust every package npm has never seen
 *   npm run trust:new -- --list # report only, never prompt
 *
 * After it succeeds, dispatch the Release workflow; it publishes the package
 * over OIDC like every later version.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'

const ROOT = new URL('..', import.meta.url).pathname
const REPO = 'molecule-dev/mlcl'
const WORKFLOW = 'release.yml'
// Every package this repo publishes (release.yml publishes these two).
const MANIFESTS = ['package.json', 'mcp/package.json']

const names = MANIFESTS.map((m) => JSON.parse(readFileSync(join(ROOT, m), 'utf8')).name)
const missing = []
for (const name of names) {
  const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
    signal: AbortSignal.timeout(20_000),
  })
  if (res.status === 404) missing.push(name)
  else if (!res.ok) throw new Error(`npm registry answered ${res.status} for ${name}`)
}
if (!missing.length) {
  console.log(`Nothing to do: npm already has ${names.join(', ')}.`)
  process.exit(0)
}
console.log(`Never published: ${missing.join(', ')}`)
if (process.argv.includes('--list')) process.exit(0)
if (!process.stdin.isTTY) {
  console.error('No terminal for the 2FA prompt — run `npm run trust:new` from a shell.')
  process.exit(0)
}

const rc = join(homedir(), '.npmrc')
const token = existsSync(rc)
  ? (readFileSync(rc, 'utf8').match(/\/\/registry\.npmjs\.org\/:_authToken\s*=\s*(.+)/)?.[1] ?? '')
      .trim()
      .replace(/^["']|["']$/g, '')
  : ''
if (!token) {
  console.error('Not logged in to npm — run `npm login` first.')
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
let otp = (await rl.question('npm 2FA code (6 digits): ')).trim()
let failed = false
for (const name of missing) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(
      `https://registry.npmjs.org/-/package/${name.replace('/', '%2f')}/trust`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json',
          'npm-otp': otp,
        },
        body: JSON.stringify([
          {
            type: 'github',
            claims: { repository: REPO, workflow_ref: { file: WORKFLOW } },
            permissions: ['createPackage', 'createStagedPackage'],
          },
        ]),
        signal: AbortSignal.timeout(20_000),
      },
    )
    const text = (await res.text()).slice(0, 300)
    if (res.ok || /already|duplicate/i.test(text)) {
      console.log(`✓ ${name} trusts ${REPO} ${WORKFLOW}`)
      break
    }
    // A code that expired between calls: ask once more.
    if (attempt === 0 && (res.status === 401 || /otp|one-time/i.test(text))) {
      otp = (await rl.question(`That code was refused for ${name} — a fresh 2FA code: `)).trim()
      continue
    }
    console.error(`✗ ${name}: ${res.status} ${text}`)
    failed = true
    break
  }
}
rl.close()
if (!failed) {
  console.log(
    '\nDone. Dispatch the Release workflow (mcp_publish=true for molecule-mcp) to publish.',
  )
}
process.exit(failed ? 1 : 0)
