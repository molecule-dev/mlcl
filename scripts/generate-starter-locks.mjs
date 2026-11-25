#!/usr/bin/env node
/**
 * Generate the lockfiles `mlcl create` installs a custom stack from (`src/lib/starter-lock.ts`).
 *
 * For each app framework: scaffold and install a full-stack project of STACK the way a user's
 * create does (inject and the peer closure declare packages after the first install, so only a real
 * create's final lock holds them), with no shipped lock to start from (`MLCL_STARTER_LOCK_DIR` names
 * an empty directory, so every version resolves fresh), and keep the lock's installed-package
 * entries (root and workspace `node_modules/`) that are not workspace links. Sources are rewritten to registry.npmjs.org, which npm maps to whatever registry
 * the installing machine uses. Run it after the registry pins move (the release's pins stage), so
 * the locks name the versions a scaffold declares; `starter-lock.test.ts` fails when they do not.
 *
 *   node scripts/generate-starter-locks.mjs                  # every framework, from npm
 *   node scripts/generate-starter-locks.mjs react vue        # those frameworks
 *   STARTER_LOCK_REGISTRY=http://127.0.0.1:4873/ STARTER_LOCK_CACHE=<dir> node scripts/…   # another registry
 *   STARTER_LOCK_WORK=<dir>   # where the scaffolds install (default: the OS temp dir; ~600 MB each)
 *
 * Needs a built mlcl (`npm run build`): the scaffold runs `bin/run.js`.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MLCL = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOCKS = join(MLCL, 'locks')
/** The frameworks a custom full-stack create supports (react-native is a separate native app). */
const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native-web']
/**
 * The stack each lock is made from: sign-up and log-in on SQLite, the first thing most custom
 * stacks hold. A project naming other packages installs those beyond the lock.
 */
const STACK = [
  '@molecule/api-database-sqlite',
  '@molecule/api-resource-user',
  '@molecule/api-password-bcrypt',
  '@molecule/api-jwt-jsonwebtoken',
  '@molecule/app-auth',
  '@molecule/app-routing',
]
const NPMJS = 'https://registry.npmjs.org/'
const registry = process.env.STARTER_LOCK_REGISTRY ?? NPMJS

const frameworks = process.argv.slice(2).length ? process.argv.slice(2) : FRAMEWORKS
for (const fw of frameworks)
  if (!FRAMEWORKS.includes(fw)) throw new Error(`unknown framework ${fw}`)
mkdirSync(LOCKS, { recursive: true })

for (const framework of frameworks) {
  const work = mkdtempSync(
    join(process.env.STARTER_LOCK_WORK ?? tmpdir(), `mlcl-starter-lock-${framework}-`),
  )
  try {
    const started = Date.now()
    const project = join(work, 'starter')
    const env = {
      ...process.env,
      npm_config_registry: registry,
      MLCL_STARTER_LOCK_DIR: join(work, 'no-locks'),
    }
    if (process.env.STARTER_LOCK_CACHE) env.npm_config_cache = process.env.STARTER_LOCK_CACHE
    execFileSync(
      process.execPath,
      [
        join(MLCL, 'bin', 'run.js'),
        'create',
        'starter',
        '--type',
        'full-stack',
        '--framework',
        framework,
        '--packages',
        STACK.join(','),
        '--no-verify',
        '--no-interactive',
        '--json',
      ],
      { cwd: work, env, stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 26 },
    )
    const lock = JSON.parse(readFileSync(join(project, 'package-lock.json'), 'utf8'))
    const packages = {}
    const moleculeVersions = {}
    for (const [key, entry] of Object.entries(lock.packages)) {
      if (!key.includes('node_modules/') || entry.link) continue
      const kept = { ...entry }
      // A registry tarball (`<host>/<name>/-/<file>.tgz`) from any host is named on npmjs, which npm maps to
      // the installing machine's registry; a mirror may report its own public address, not the one asked.
      if (typeof kept.resolved === 'string' && !kept.resolved.startsWith(NPMJS)) {
        const url = new URL(kept.resolved)
        if (!/\/-\/[^/]+\.tgz$/.test(url.pathname))
          throw new Error(`${key}: not a registry tarball: ${kept.resolved}`)
        kept.resolved = NPMJS + url.pathname.slice(1)
      }
      packages[key] = kept
      const name = key.slice('node_modules/'.length)
      if (name.startsWith('@molecule/') && !name.includes('/node_modules/'))
        moleculeVersions[name] = entry.version
    }
    const out = { generatedFrom: { packages: STACK, moleculeVersions }, packages }
    writeFileSync(join(LOCKS, `${framework}.json`), `${JSON.stringify(out, null, 2)}\n`)
    console.log(
      `${framework}: ${Object.keys(packages).length} packages in ${((Date.now() - started) / 1000).toFixed(1)} s`,
    )
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}
