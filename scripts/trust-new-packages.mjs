#!/usr/bin/env node
/**
 * Make this repo's never-published packages publishable by CI — once, before
 * their first release. The same step as molecule's `npm run trust:new`.
 *
 * npm's trust endpoint requires the package to EXIST ("Package MUST exist" in
 * its API docs; a brand-new name answers `404 Package not found`, whatever
 * permissions are sent), and the OIDC exchange answers 404 for a name with
 * neither — so a first version has no OIDC path (npm/cli#8544). This does the
 * one-time part from the owner's `npm login` session and 2FA code: publish the
 * first version, then trust GitHub Actions for this repo's release.yml. Every
 * later version publishes from CI over OIDC with no code.
 *
 *   npm run trust:new           # publish + trust every package npm has never seen
 *   npm run trust:new -- --list # report only, never prompt
 *
 * A package marked `"private": true` (molecule-mcp keeps that guard so nothing
 * publishes it by accident) is published from a staged copy with the flag
 * removed; the working tree is never edited.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'

const ROOT = new URL('..', import.meta.url).pathname
const REPO = 'molecule-dev/mlcl'
const WORKFLOW = 'release.yml'
// Every package this repo publishes (release.yml publishes these two).
const MANIFESTS = ['package.json', 'mcp/package.json']

const pkgs = MANIFESTS.map((m) => ({
  dir: dirname(join(ROOT, m)),
  ...JSON.parse(readFileSync(join(ROOT, m), 'utf8')),
}))
// `--retrust <name>`: re-send an EXISTING package's trust link with the
// permissions below. A link made with `npm trust github` lacked them, and CI's
// publish then failed `403 OIDC permission denied for this action` (mlcl v2,
// 2026-10-13) although the OIDC login itself succeeded.
const ri = process.argv.indexOf('--retrust')
const retrust = ri >= 0 ? pkgs.filter((p) => p.name === process.argv[ri + 1]) : []
if (ri >= 0 && !retrust.length) {
  console.error(
    `--retrust names none of this repo's packages (${pkgs.map((p) => p.name).join(', ')})`,
  )
  process.exit(1)
}
const missing = []
for (const pkg of retrust.length ? [] : pkgs) {
  const res = await fetch(`https://registry.npmjs.org/${pkg.name.replace('/', '%2f')}`, {
    signal: AbortSignal.timeout(20_000),
  })
  if (res.status === 404) missing.push(pkg)
  else if (!res.ok) throw new Error(`npm registry answered ${res.status} for ${pkg.name}`)
}
if (!missing.length && !retrust.length) {
  console.log(`Nothing to do: npm already has ${pkgs.map((p) => p.name).join(', ')}.`)
  process.exit(0)
}
if (missing.length)
  console.log(`Never published: ${missing.map((p) => `${p.name}@${p.version}`).join(', ')}`)
if (retrust.length) console.log(`Re-trusting: ${retrust.map((p) => p.name).join(', ')}`)
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
const ask = async (label) => (await rl.question(`npm 2FA code for ${label} (6 digits): `)).trim()
const otpRefused = (text) => /one-time password|\be?otp\b|two-factor|2fa/i.test(text)

/** Build, stage without the private guard, and publish one package's first version. */
async function publishFirst(pkg) {
  console.log(`\n${pkg.name}: building and publishing ${pkg.version}`)
  if (pkg.scripts?.build) execFileSync('npm', ['run', 'build'], { cwd: pkg.dir, stdio: 'inherit' })
  const stage = mkdtempSync(join(tmpdir(), 'trust-new-'))
  try {
    cpSync(pkg.dir, stage, {
      recursive: true,
      filter: (src) => !/[/\\](node_modules|\.git)([/\\]|$)/.test(src),
    })
    const manifest = JSON.parse(readFileSync(join(stage, 'package.json'), 'utf8'))
    delete manifest.private
    writeFileSync(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    let otp = await ask(`publishing ${pkg.name}`)
    for (let attempt = 0; attempt < 2; attempt++) {
      // --ignore-scripts: the build already ran above in the real tree, and the
      // staged copy has no node_modules for a prepare/prepublish hook to use.
      const r = spawnSync(
        'npm',
        ['publish', '--access', 'public', '--ignore-scripts', '--otp', otp],
        { cwd: stage, encoding: 'utf8' },
      )
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`
      if (r.status === 0) return true
      if (attempt === 0 && otpRefused(out)) {
        otp = await ask(`publishing ${pkg.name} (the last code was refused)`)
        continue
      }
      console.error(out.trim())
      return false
    }
    return false
  } finally {
    rmSync(stage, { recursive: true, force: true })
  }
}

/** Trust this repo's release workflow to publish the package over OIDC. */
async function trust(pkg) {
  let otp = await ask(`trusting ${pkg.name}`)
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(
      `https://registry.npmjs.org/-/package/${pkg.name.replace('/', '%2f')}/trust`,
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
    if (res.ok || /already|duplicate/i.test(text)) return true
    if (attempt === 0 && (res.status === 401 || otpRefused(text))) {
      otp = await ask(`trusting ${pkg.name} (the last code was refused)`)
      continue
    }
    console.error(`✗ trust ${pkg.name}: ${res.status} ${text}`)
    return false
  }
  return false
}

let failed = false
for (const pkg of retrust) {
  if (await trust(pkg)) console.log(`✓ ${pkg.name} trusts ${REPO} ${WORKFLOW}`)
  else failed = true
}
for (const pkg of missing) {
  if (!(await publishFirst(pkg))) {
    console.error(`✗ ${pkg.name}: the first publish failed — nothing was trusted`)
    failed = true
    continue
  }
  console.log(`✓ ${pkg.name}@${pkg.version} published`)
  if (await trust(pkg)) console.log(`✓ ${pkg.name} trusts ${REPO} ${WORKFLOW}`)
  else failed = true
}
rl.close()
if (!failed) console.log('\nDone. Later versions publish from the Release workflow over OIDC.')
process.exit(failed ? 1 : 0)
