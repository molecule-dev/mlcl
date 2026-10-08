/**
 * The project-archive external-state coverage gate, run for real.
 *
 * `mlcl/scripts/check-external-state-coverage.mjs` is the gate; this is what
 * makes CI run it. mlcl's CI `build` job runs `npm test`, so the first test here
 * is the enforcement point: a new `@molecule/api-database-*` or
 * `@molecule/api-uploads-*` bond that lands in `registry.json` without a matching
 * `packages/api/bonds/project-archive-external-state/` bond fails the build.
 *
 * Why that matters more than a lint: `@molecule/api-project-archive` captures a
 * project and the caller then DESTROYS the original on `result.verified`. State
 * whose provider was never registered is captured by nobody, verifies clean, and
 * is then permanently deleted.
 *
 * The remaining tests are the ones that keep the gate honest — a gate that
 * cannot fail is not a gate. They run the real script against real registry
 * copies with a package added, asserting it fails, names the package, and points
 * at the fix; and that the category-wide uploads bond keeps a new uploads
 * provider passing rather than false-failing.
 *
 * The last group is the important one, and the reason this file is longer than
 * the gate deserves. Coverage used to be matched on NAMES ALONE, so three
 * separate edits made the gate report success over an uncovered, state-owning
 * provider: a covering package that was only a registry row, a per-provider name
 * that collided with another core's category-wide bond, and a `type` field typed
 * as anything other than `provider`. Each of those is measured here, and each
 * asserts a NON-zero exit — because the caller of the thing this gate protects
 * deletes the project's only copy on success.
 *
 * The script is SPAWNED rather than imported, deliberately: its exit code and
 * stderr are the contract CI and the pre-commit hook consume, so that is what is
 * asserted.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const SCRIPT = join(MLCL_ROOT, 'scripts', 'check-external-state-coverage.mjs')
const REGISTRY = join(MLCL_ROOT, 'registry.json')

/** Where external-state bonds live, relative to the molecule repo root. */
const BOND_DIR = 'packages/api/bonds/project-archive-external-state'

const workDir = mkdtempSync(join(tmpdir(), 'mlcl-external-state-'))

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

/** Outcome of one gate run. */
interface RunResult {
  /** Process exit code; `0` means coverage is complete. */
  code: number
  /** Combined stdout + stderr. */
  output: string
}

/**
 * Run the gate against a registry file.
 *
 * @param registryPath - Absolute path to a `registry.json` to check.
 * @param moleculeRoot - Optional molecule checkout to resolve covering bonds in;
 *   omitted, the gate resolves the real sibling checkout as it does in normal use.
 * @returns The exit code and combined output.
 */
function runGate(registryPath: string, moleculeRoot?: string): RunResult {
  const args = [SCRIPT, '--registry', registryPath]
  if (moleculeRoot !== undefined) args.push('--molecule-root', moleculeRoot)
  try {
    const output = execFileSync('node', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, output }
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string }
    if (typeof failure.status !== 'number') throw error
    return { code: failure.status, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` }
  }
}

/**
 * Write a copy of the real registry with extra packages merged in.
 *
 * @param fileName - File name to write inside the test's temp dir.
 * @param packages - Registry package entries to add.
 * @returns The absolute path of the written registry.
 */
function registryWith(fileName: string, packages: Record<string, unknown>): string {
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8')) as {
    packages: Record<string, unknown>
  }
  Object.assign(registry.packages, packages)
  const path = join(workDir, fileName)
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`)
  return path
}

/** One external-state bond directory as it should appear in a molecule checkout. */
interface BondFixture {
  /** `package.json` contents, or `null` to write none. */
  packageJson: Record<string, unknown> | null
  /** Whether to create the `src/` directory — i.e. whether there is any code. */
  src: boolean
}

/**
 * The external-state bonds the real registry ships, and the core each composes.
 *
 * None is category-wide: every one captures with its provider's own tooling
 * (`pg_dump` cannot dump MySQL; `wrangler d1 export` is the only thing that can
 * read a Cloudflare D1 database), so none depends on `@molecule/api-database`.
 *
 * A category-wide bond — one written against a CORE interface, covering every
 * provider of it — is still a shape the gate supports and refuses to accept
 * fraudulently, so it is still tested. It just has no instance in the tree, so
 * the tests that exercise it build their own with {@link categoryWideUploads},
 * rather than borrowing whatever happens to ship. That is the better test: it
 * cannot rot when the fleet changes.
 */
const REAL_BONDS: Record<string, string[]> = {
  d1: [],
  mysql: [],
  postgresql: [],
  pglite: [],
  sqlite: [],
}

/** The registry entry + on-disk fixture for a synthetic category-wide uploads bond. */
const CATEGORY_WIDE_UPLOADS = '@molecule/api-project-archive-external-state-uploads'

/**
 * Registry entry for a category-wide uploads bond, for the tests that need one.
 *
 * @param overrides - Fields to change (e.g. a `path` that does not exist).
 * @returns A registry patch to hand to `registryWith`.
 */
function categoryWideUploads(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    [CATEGORY_WIDE_UPLOADS]: {
      type: 'provider',
      category: 'project-archive',
      stack: 'api',
      label: 'Uploads external state',
      description: 'Captures a project uploads backend.',
      implements: '@molecule/api-project-archive',
      path: `${BOND_DIR}/uploads`,
      exports: [],
      secrets: [],
      ...overrides,
    },
  }
}

/**
 * Build a throwaway molecule checkout holding the registered external-state bonds.
 *
 * Lets a test make one covering bond defective on disk (no `src/`, wrong package
 * name, missing core dependency) while the rest stay real, which is the only way
 * to exercise the "a registry row is not a bond" checks without touching the real
 * molecule tree.
 *
 * @param dirName - Directory name inside the test's temp dir.
 * @param overrides - Per-token overrides; `null` omits that bond's directory entirely.
 * @returns The absolute path to use as `--molecule-root`.
 */
function moleculeRootFixture(
  dirName: string,
  overrides: Record<string, Partial<BondFixture> | null> = {},
): string {
  const root = join(workDir, dirName)
  // Overrides may name a token the tree does NOT ship (a synthetic category-wide
  // bond, say) — those get created too, so a test is never limited to the shapes
  // that happen to exist today.
  const tokens: Record<string, string[]> = { ...REAL_BONDS }
  for (const token of Object.keys(overrides)) tokens[token] ??= []

  for (const [token, cores] of Object.entries(tokens)) {
    const override = overrides[token]
    if (override === null) continue
    const fixture: BondFixture = {
      packageJson: {
        name: `@molecule/api-project-archive-external-state-${token}`,
        peerDependencies: Object.fromEntries(cores.map((core) => [core, '>=1.0.0'])),
      },
      src: true,
      ...(override ?? {}),
    }
    const dir = join(root, BOND_DIR, token)
    mkdirSync(dir, { recursive: true })
    if (fixture.packageJson) {
      writeFileSync(join(dir, 'package.json'), `${JSON.stringify(fixture.packageJson, null, 2)}\n`)
    }
    if (fixture.src) mkdirSync(join(dir, 'src'), { recursive: true })
  }
  return root
}

/** A state-owning provider bond with no external-state coverage. */
const MONGODB_PROVIDER = {
  type: 'provider',
  category: 'database',
  stack: 'api',
  label: 'MongoDB',
  description: 'MongoDB database provider.',
  implements: '@molecule/api-database',
  path: 'packages/api/bonds/database/mongodb',
  exports: [],
  secrets: [],
}

describe('project-archive external-state coverage', () => {
  it('every state-owning provider bond in registry.json is covered', () => {
    const { code, output } = runGate(REGISTRY)
    expect(output).toContain('external-state coverage complete')
    expect(code).toBe(0)
  })

  it('fails and names the package when a state-owning bond has no external-state provider', () => {
    const path = registryWith('uncovered-database.json', {
      '@molecule/api-database-mongodb': MONGODB_PROVIDER,
    })

    const { code, output } = runGate(path)
    expect(code).toBe(1)
    expect(output).toContain('@molecule/api-database-mongodb')
    // The failure must tell the reader what to DO, not just that something is wrong.
    expect(output).toContain('packages/api/bonds/project-archive-external-state/')
    expect(output).toContain('ProjectExternalStateProvider')
  })

  it('catches a state-owning bond whose `implements` field is missing', () => {
    // Matching on `implements` alone would let this through, and forgetting to
    // wire a package up correctly is exactly the mistake this gate exists for.
    const path = registryWith('missing-implements.json', {
      '@molecule/api-database-cockroach': {
        type: 'provider',
        category: 'database',
        stack: 'api',
        label: 'CockroachDB',
        description: 'CockroachDB database provider.',
        path: 'packages/api/bonds/database/cockroach',
        exports: [],
        secrets: [],
      },
    })

    const { code, output } = runGate(path)
    expect(code).toBe(1)
    expect(output).toContain('@molecule/api-database-cockroach')
  })

  it('DEMANDS coverage for a new uploads bond, because none is exempt by default', () => {
    // The two shipped uploads bonds are exempt by name, with written reasons. A
    // THIRD one inherits nothing: `upload()` takes no key and every bond mints a
    // bare uuid at the backend root, so no generic bond can tell which objects
    // belong to one project. Whoever adds GCS has to say where its bytes survive.
    const path = registryWith('new-uploads-bond.json', {
      '@molecule/api-uploads-gcs': {
        type: 'provider',
        category: 'storage',
        stack: 'api',
        label: 'Google Cloud Storage',
        description: 'GCS uploads provider.',
        implements: '@molecule/api-uploads',
        path: 'packages/api/bonds/uploads/gcs',
        exports: [],
        secrets: [],
      },
    })

    const { code, output } = runGate(path)
    expect(code).toBe(1)
    expect(output).toContain('@molecule/api-uploads-gcs')
  })

  it('a category-wide bond DOES cover every provider of the core it composes', () => {
    // No such bond ships today, so this builds one. The shape is still supported
    // and still worth guarding: one bond written against a CORE interface,
    // covering every provider of it, present and future.
    const path = registryWith('category-wide.json', {
      ...categoryWideUploads(),
      '@molecule/api-uploads-gcs': {
        type: 'provider',
        category: 'storage',
        stack: 'api',
        label: 'Google Cloud Storage',
        description: 'GCS uploads provider.',
        implements: '@molecule/api-uploads',
        path: 'packages/api/bonds/uploads/gcs',
        exports: [],
        secrets: [],
      },
    })
    const root = moleculeRootFixture('category-wide-root', {
      uploads: {
        packageJson: {
          name: CATEGORY_WIDE_UPLOADS,
          peerDependencies: { '@molecule/api-uploads': '>=1.0.0' },
        },
        src: true,
      },
    })

    const { code, output } = runGate(path, root)
    expect(output).toContain('external-state coverage complete')
    expect(code).toBe(0)
  })

  it('ignores app-stack packages that share a state-owning category string', () => {
    // `storage` is the uploads core's category AND `@molecule/app-storage`'s, and
    // a browser localStorage bond owns no project state. Scoping by category
    // alone would demand an archive bond for it.
    const path = registryWith('app-stack-provider.json', {
      '@molecule/app-storage-indexeddb': {
        type: 'provider',
        category: 'storage',
        stack: 'app',
        label: 'IndexedDB',
        description: 'IndexedDB storage provider.',
        implements: '@molecule/app-storage',
        path: 'packages/app/bonds/storage/indexeddb',
        exports: [],
        secrets: [],
      },
    })

    expect(runGate(path).code).toBe(0)
  })

  // ==========================================================================
  // Coverage must be CODE, not a name. Each test below is a measured way the
  // gate reported success over an uncovered, state-owning provider.
  // ==========================================================================

  describe('a registry row is not coverage', () => {
    it('fails when the covering package does not exist on disk', () => {
      // The whole bypass is one registry edit: name a bond that was never
      // written. Name-only matching marked MongoDB covered and exited 0.
      const path = registryWith('phantom-covering-package.json', {
        '@molecule/api-database-mongodb': MONGODB_PROVIDER,
        '@molecule/api-project-archive-external-state-mongodb': {
          type: 'provider',
          category: 'project-archive-external-state',
          stack: 'api',
          label: 'MongoDB external state',
          description: 'Captures MongoDB external state.',
          implements: '@molecule/api-project-archive',
          path: 'nope',
          exports: [],
          secrets: [],
        },
      })

      const { code, output } = runGate(path)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-project-archive-external-state-mongodb')
      expect(output).toContain('A registry row is not a bond')
      // …and the provider it pretended to cover is still reported as a gap.
      expect(output).toContain('@molecule/api-database-mongodb')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('fails when the covering package points at another package’s directory', () => {
      // A well-formed path that resolves to a REAL bond dir — just not this
      // bond's. Existence alone is not identity.
      const path = registryWith('covering-package-wrong-dir.json', {
        '@molecule/api-database-mongodb': MONGODB_PROVIDER,
        '@molecule/api-project-archive-external-state-mongodb': {
          type: 'provider',
          category: 'project-archive-external-state',
          stack: 'api',
          label: 'MongoDB external state',
          description: 'Captures MongoDB external state.',
          implements: '@molecule/api-project-archive',
          path: `${BOND_DIR}/sqlite`,
          exports: [],
          secrets: [],
        },
      })

      const { code, output } = runGate(path)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-project-archive-external-state-sqlite')
      expect(output).toContain('@molecule/api-database-mongodb')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('fails when a registered bond directory has no src/', () => {
      // An empty directory with a package.json is a name with a shape. It
      // captures nothing, so it covers nothing.
      const moleculeRoot = moleculeRootFixture('no-src', { sqlite: { src: false } })

      const { code, output } = runGate(REGISTRY, moleculeRoot)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-project-archive-external-state-sqlite')
      expect(output).toContain('no src/')
      // The sqlite provider it was covering is now correctly a gap.
      expect(output).toContain('@molecule/api-database-sqlite')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('fails when a registered bond directory has no package.json', () => {
      const moleculeRoot = moleculeRootFixture('no-package-json', { mysql: { packageJson: null } })

      const { code, output } = runGate(REGISTRY, moleculeRoot)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-project-archive-external-state-mysql')
      expect(output).toContain('@molecule/api-database-mysql')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('fails when a registered bond directory is missing entirely', () => {
      const moleculeRoot = moleculeRootFixture('absent-bond', { postgresql: null })

      const { code, output } = runGate(REGISTRY, moleculeRoot)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-project-archive-external-state-postgresql')
      expect(output).toContain('@molecule/api-database-postgresql')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('passes on a molecule checkout where every registered bond is real', () => {
      // The negative control for the four tests above: the same fixture builder,
      // unmutated, must still certify — otherwise those failures prove nothing.
      const moleculeRoot = moleculeRootFixture('all-real')

      const { code, output } = runGate(REGISTRY, moleculeRoot)
      expect(output).toContain('external-state coverage complete')
      expect(code).toBe(0)
    })
  })

  describe('a covering token belongs to one core', () => {
    it('does not let another core’s category-wide bond cover a name-collided provider', () => {
      // `…-external-state-uploads` is the category-wide bond for the UPLOADS
      // core: it calls `listFiles`/`getFile` on the uploads bond and has never
      // seen a database. A database provider whose name merely ends in
      // `uploads` reduced to the same token and was matched against it.
      const path = registryWith('token-collision.json', {
        ...categoryWideUploads(),
        '@molecule/api-database-uploads': {
          type: 'provider',
          category: 'database',
          stack: 'api',
          label: 'Uploads-backed database',
          description: 'A database provider that happens to be named uploads.',
          implements: '@molecule/api-database',
          path: 'packages/api/bonds/database/uploads',
          exports: [],
          secrets: [],
        },
      })

      const root = moleculeRootFixture('token-collision-root', {
        uploads: {
          packageJson: {
            name: CATEGORY_WIDE_UPLOADS,
            peerDependencies: { '@molecule/api-uploads': '>=1.0.0' },
          },
          src: true,
        },
      })

      const { code, output } = runGate(path, root)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-database-uploads')
      // The message must say WHY the same-named bond is not coverage, or the
      // reader will conclude the gate is broken and add an exemption.
      expect(output).toContain('name collision, not coverage of @molecule/api-database')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('fails a category-wide bond that does not depend on the core it is named for', () => {
      // A `…-external-state-<core>` bond claims every provider of that core,
      // present and future. It can only do that by composing the core
      // interface; one that does not depend on the core is not composing it,
      // and the blast radius of believing it is every uploads bond ever written.
      const path = registryWith('category-bond-without-core.json', categoryWideUploads())
      const moleculeRoot = moleculeRootFixture('category-bond-without-core', {
        uploads: { packageJson: { name: CATEGORY_WIDE_UPLOADS }, src: true },
      })

      const { code, output } = runGate(path, moleculeRoot)
      expect(code).toBe(1)
      expect(output).toContain('does not depend on @molecule/api-uploads')
      expect(output).not.toContain('external-state coverage complete')
    })
  })

  describe('scope is not decided by hand-typed metadata', () => {
    it('does not let a wrong `type` field remove a state-owning bond from the check', () => {
      // `type: 'bond'` instead of `'provider'` is a plausible typo and used to
      // skip the package silently — the gate then certified coverage over an
      // uncaptured database.
      const path = registryWith('mistyped-type.json', {
        '@molecule/api-database-mongodb': { ...MONGODB_PROVIDER, type: 'bond' },
      })

      const { code, output } = runGate(path)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-database-mongodb')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('does not let a wrong `stack` field remove a state-owning bond from the check', () => {
      // Same class: an `@molecule/api-*` package is API-stack by construction,
      // so a `stack` value that says otherwise is wrong metadata, not a reason
      // to stop looking.
      const path = registryWith('mistyped-stack.json', {
        '@molecule/api-database-mongodb': { ...MONGODB_PROVIDER, stack: 'app' },
      })

      const { code, output } = runGate(path)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-database-mongodb')
      expect(output).not.toContain('external-state coverage complete')
    })

    it('does not let a missing `type` field remove a state-owning bond from the check', () => {
      const withoutType: Record<string, unknown> = { ...MONGODB_PROVIDER }
      delete withoutType.type
      const path = registryWith('missing-type.json', {
        '@molecule/api-database-mongodb': withoutType,
      })

      const { code, output } = runGate(path)
      expect(code).toBe(1)
      expect(output).toContain('@molecule/api-database-mongodb')
    })
  })

  describe('an unreadable input is a failure, not a skip', () => {
    it('refuses to certify coverage when the molecule checkout cannot be read', () => {
      // Coverage is a claim about code in the molecule repo. Without it the gate
      // cannot distinguish a real bond from an empty registry row — and the
      // caller of what it protects deletes the project on success.
      const { code, output } = runGate(REGISTRY, join(workDir, 'does-not-exist'))
      expect(code).toBe(1)
      expect(output).toContain('cannot read the molecule checkout')
      expect(output).not.toContain('external-state coverage complete')
    })
  })
})
