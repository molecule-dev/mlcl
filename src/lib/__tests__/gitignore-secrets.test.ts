/**
 * SEC1 regression — scaffolded `.gitignore`s must protect the ENTIRE `.env*`
 * secrets family, not just exact `.env`.
 *
 * The original bug: every scaffold `.gitignore` listed `.env` + `.env.local`,
 * so a stray `.env.staging` / `.env.production` (incl. a molecule package's own
 * `.env.staging.<slug>` secret files) was neither gitignored nor copy-excluded
 * and would be committed and pushed. Fix: `.env*` + `!.env.example` everywhere.
 *
 * These tests use real `git check-ignore` semantics (not a string `.includes`)
 * so they assert what git ACTUALLY does, including the negation ordering. Each
 * one fails if the source narrows back to exact `.env`. They sweep EVERY scaffold
 * `.gitignore` source — the `.tpl` files, all flagship `templates/apps/*`, the
 * exported `ENV_SECRETS_GITIGNORE` block, and the live React Native scaffold
 * output — so a future source can never silently regress.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createReactNativeAppProject, ENV_SECRETS_GITIGNORE } from '../scaffold.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(ROOT, 'templates')

// The secret members of the family that MUST be ignored, plus the one
// non-secret schema reference that MUST stay tracked.
const SECRET_ENV_FILES = [
  '.env',
  '.env.local',
  '.env.staging',
  '.env.production',
  '.env.staging.my-app',
]
const TRACKED_ENV_FILES = ['.env.example']

// molecule.dev platform runtime markers the sandbox writes into the project
// root (`/workspace`) — install progress markers (import-repo.ts) and the boot
// timeline (dev-server-cmd.ts). Never project source; every scaffolded
// `.gitignore` must ignore the whole `.mol-*` family (`*.log` alone leaves the
// `.pending`/`.exit` markers tracked).
const MOL_MARKER_FILES = [
  '.mol-install-my-repo.pending',
  '.mol-install-my-repo.exit',
  '.mol-install-my-repo.log',
  '.mol-boot-timeline.log',
]

let workdir: string

beforeEach(async () => {
  workdir = await mkdtemp(join(tmpdir(), 'mlcl-gitignore-'))
})

afterEach(async () => {
  await rm(workdir, { recursive: true, force: true })
})

/**
 * Drop the given `.gitignore` content into a fresh git repo and report, per
 * candidate path, whether git would ignore it — the real `git check-ignore`
 * semantics rather than a brittle text match.
 */
async function ignoredStatus(
  gitignoreContent: string,
  candidates: string[],
): Promise<Record<string, boolean>> {
  const repo = await mkdtemp(join(workdir, 'repo-'))
  execFileSync('git', ['init', '-q'], { cwd: repo })
  await writeFile(join(repo, '.gitignore'), gitignoreContent)
  const result: Record<string, boolean> = {}
  for (const candidate of candidates) {
    try {
      // Exit 0 → ignored; exit 1 → not ignored (throws).
      execFileSync('git', ['check-ignore', '-q', '--', candidate], { cwd: repo })
      result[candidate] = true
    } catch (_error) {
      // Non-zero exit is git's "not ignored" signal — the expected, non-error path.
      result[candidate] = false
    }
  }
  return result
}

async function expectEnvSemantics(content: string, label: string): Promise<void> {
  const status = await ignoredStatus(content, [...SECRET_ENV_FILES, ...TRACKED_ENV_FILES])
  for (const secret of SECRET_ENV_FILES) {
    expect(status[secret], `${label}: ${secret} must be ignored`).toBe(true)
  }
  for (const tracked of TRACKED_ENV_FILES) {
    expect(status[tracked], `${label}: ${tracked} must stay tracked`).toBe(false)
  }
}

async function expectMolMarkersIgnored(content: string, label: string): Promise<void> {
  const status = await ignoredStatus(content, MOL_MARKER_FILES)
  for (const marker of MOL_MARKER_FILES) {
    expect(status[marker], `${label}: ${marker} must be ignored`).toBe(true)
  }
}

describe('SEC1 — .env* secrets protection in scaffolded .gitignore', () => {
  it('ENV_SECRETS_GITIGNORE ignores the whole .env* family but keeps .env.example', async () => {
    await expectEnvSemantics(ENV_SECRETS_GITIGNORE, 'ENV_SECRETS_GITIGNORE')
  })

  it('does NOT regress to exact .env (a narrow .env-only list leaks .env.staging)', async () => {
    // Guard against the original bug: prove the test would FAIL on the old content.
    const narrow = 'node_modules/\ndist/\n.env\n.env.local\n'
    const status = await ignoredStatus(narrow, SECRET_ENV_FILES)
    expect(status['.env.staging'], 'exact-.env list must leak .env.staging').toBe(false)
    expect(status['.env.production'], 'exact-.env list must leak .env.production').toBe(false)
  })

  describe('template .gitignore source files', () => {
    const tplSources = [
      join(TEMPLATES, 'api', 'gitignore.tpl'),
      join(TEMPLATES, 'app', 'shared', 'gitignore.tpl'),
      join(TEMPLATES, 'app', 'shared', 'gitignore-svelte.tpl'),
    ]
    for (const src of tplSources) {
      it(`${src.slice(ROOT.length + 1)} protects the .env* family`, async () => {
        const content = await readFile(src, 'utf-8')
        await expectEnvSemantics(content, src)
      })

      // Not a secret, but generated service data that must never be committed:
      // molecule.dev runs an in-container Meilisearch sidecar with
      // --db-path ./.meilisearch (search index data, potentially large/binary).
      it(`${src.slice(ROOT.length + 1)} ignores the .meilisearch/ sidecar index data`, async () => {
        const content = await readFile(src, 'utf-8')
        const status = await ignoredStatus(content, ['.meilisearch/data.ms'])
        expect(status['.meilisearch/data.ms'], `${src}: .meilisearch/ must be ignored`).toBe(true)
      })

      it(`${src.slice(ROOT.length + 1)} ignores .mol-* platform runtime markers`, async () => {
        const content = await readFile(src, 'utf-8')
        await expectMolMarkersIgnored(content, src)
      })
    }
  })

  it('every flagship templates/apps/*/.gitignore protects the .env* family', async () => {
    const appsDir = join(TEMPLATES, 'apps')
    const entries = await readdir(appsDir, { withFileTypes: true })
    const gitignores = entries
      .filter((e) => e.isDirectory())
      .map((e) => join(appsDir, e.name, '.gitignore'))
      .filter((p) => existsSync(p))

    // Sanity: the flagship fleet exists (so this isn't a vacuous pass).
    expect(gitignores.length).toBeGreaterThan(50)

    for (const gi of gitignores) {
      const content = await readFile(gi, 'utf-8')
      await expectEnvSemantics(content, gi)
      await expectMolMarkersIgnored(content, gi)
    }
  })

  it('the React Native scaffold emits a .env*-protected .gitignore', async () => {
    const projectPath = join(workdir, 'rn-app')
    await createReactNativeAppProject(projectPath, 'rn-app')
    const content = await readFile(join(projectPath, '.gitignore'), 'utf-8')
    await expectEnvSemantics(content, 'react-native scaffold .gitignore')
    await expectMolMarkersIgnored(content, 'react-native scaffold .gitignore')
  })
})
