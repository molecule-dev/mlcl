/**
 * Registry loader — reads the centralized molecule registry.
 *
 * Reads mlcl/registry.json, the single source of truth for all package metadata.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { linkSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { t } from './i18n.js'
import {
  type ApiFrameworkConfig,
  type AppFrameworkConfig,
  type InferredPackage,
  type MoleculeMetadata,
  type PackageType,
  type Registry,
  Registry as RegistrySchema,
  type RegistryEntry,
  type StagingDriverRegistryEntry,
} from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Default path to the centralized registry file (mlcl/registry.json). */
const DEFAULT_REGISTRY_PATH = join(__dirname, '..', '..', 'registry.json')

/**
 * Resolve the registry file path.
 *
 * Honors the `MLCL_REGISTRY_PATH` environment override so tests (and advanced
 * multi-registry workflows) can point every reader/writer at an alternate file
 * without mutating the real `registry.json`; falls back to the default. Resolved
 * per-call (not memoized) so an override set after module load is respected.
 */
function registryFilePath(): string {
  return process.env.MLCL_REGISTRY_PATH ?? DEFAULT_REGISTRY_PATH
}

// ============================================================================
// Primary: Centralized Registry
// ============================================================================

/**
 * The derived `InferredPackage[]`, keyed by the parsed registry it came FROM
 * (plus the path that parse belongs to).
 *
 * The path is part of the key because {@link registryFilePath} is resolved per
 * call — the module's own contract is that a `MLCL_REGISTRY_PATH` set after
 * module load (the multi-registry workflow the override exists for, and every
 * test that points a reader at an alternate file) is respected. A bare
 * `InferredPackage[] | null` answered the SECOND path from the FIRST path's
 * cache: the caller asked one file and silently got another registry.
 *
 * `source` is the registry OBJECT {@link rawRegistryAt} handed back, so this
 * cache follows that one's invalidation instead of tracking the file itself:
 * one read, one `JSON.parse` and one zod validation of the fleet-sized registry
 * per (path, mtime, size) — shared by every reader in the process, instead of
 * one parse per READER (see {@link rawRegistryAt}).
 *
 * `moleculeDir` is part of the key for the SAME reason `path` is: the derived
 * entries carry `path: join(moleculeDir, entry.path)`, and
 * {@link resolveMoleculeDir} reads `MOLECULE_PACKAGES_DIR` per call — so a
 * `MOLECULE_PACKAGES_DIR` set after a first load must re-derive, or the second
 * caller is handed the FIRST directory's paths (an entry's `path` pointing into
 * a packages tree the environment no longer names).
 */
let _cache: {
  source: Registry
  path: string
  moleculeDir: string
  packages: InferredPackage[]
} | null = null

function resolveMoleculeDir(): string {
  if (process.env.MOLECULE_PACKAGES_DIR) {
    // MOLECULE_PACKAGES_DIR points to molecule/packages, go up one level
    return join(process.env.MOLECULE_PACKAGES_DIR, '..')
  }
  return join(__dirname, '..', '..', '..', 'molecule')
}

/**
 * Derive the `InferredPackage[]` view of an already-parsed registry.
 *
 * `moleculeDir` is passed in rather than resolved here so the caller can key
 * its cache on the same value it derives from — see {@link loadRegistry}.
 *
 * @param registry - The parsed registry.
 * @param moleculeDir - The molecule monorepo root the entries' paths hang off.
 */
function derivePackages(registry: Registry, moleculeDir: string): InferredPackage[] {
  return Object.entries(registry.packages)
    .map(([name, entry]) => ({
      name,
      version: '0.0.0',
      description: entry.description,
      dependencies: {},
      peerDependencies: {},
      type: entry.type as PackageType,
      routes: entry.routes ?? [],
      tables: (entry.tables ?? []).map((t) => ({ name: t.name, sqlFile: t.sqlFile })),
      exports: entry.exports ?? [],
      molecule: entry as unknown as MoleculeMetadata,
      path: join(moleculeDir, entry.path),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Load all packages for a given project type.
 *
 * The returned packages are derived from {@link rawRegistryAt} — the single
 * file-identity-keyed parse of the registry file — so a process that reads both
 * this and any {@link getRawRegistry} accessor (`loadAppFrameworks`,
 * `getMoleculeVersion`, …) parses the file once, not once per reader.
 *
 * A MISSING registry file throws here (as it always has): an empty package list
 * is a valid registry, so callers cannot tell "no fleet" from "no registry
 * file", and every caller treats an empty list as a legitimate answer.
 *
 * @param projectType - 'api' or 'app' (optional — returns all if omitted)
 */
export function loadRegistry(projectType?: 'api' | 'app'): InferredPackage[] {
  const path = registryFilePath()
  const { registry, present } = rawRegistryAt(path)
  if (!present) {
    // Loud, as the readFileSync ENOENT this replaced was: mlcl without its
    // registry is a broken install, and silently answering "no packages" would
    // turn every resolution failure into "nothing to do".
    throw new Error(`Registry not found: ${path}`)
  }
  const moleculeDir = resolveMoleculeDir()
  if (
    !_cache ||
    _cache.source !== registry ||
    _cache.path !== path ||
    _cache.moleculeDir !== moleculeDir
  ) {
    _cache = {
      source: registry,
      path,
      moleculeDir,
      packages: derivePackages(registry, moleculeDir),
    }
  }

  const packages = _cache.packages
  if (!projectType) return packages
  return packages.filter((entry) => {
    const stack = entry.molecule?.stack
    return stack === projectType
  })
}

/**
 * Clear the cached registry (useful in tests).
 */
export function clearRegistryCache(): void {
  _cache = null
  rawRegistryCache.clear()
}

/**
 * Look up a single package in the registry by name.
 */
export function findRegistryPackage(name: string): InferredPackage | undefined {
  const all = loadRegistry()
  return all.find((p) => p.name === name)
}

/**
 * Get the stack for a package from registry metadata (not name parsing).
 * Falls back to name-based inference for packages not in the registry.
 */
export function getPackageStack(name: string): 'api' | 'app' | undefined {
  const pkg = findRegistryPackage(name)
  const stack = pkg?.molecule?.stack
  if (stack === 'api' || stack === 'app') return stack
  // Fallback for packages not in the registry
  if (name.startsWith('@molecule/api-')) return 'api'
  if (name.startsWith('@molecule/app-')) return 'app'
  return undefined
}

/**
 * Find a package by its role (stack + type + category) in the registry.
 *
 * Used by the injector to resolve infrastructure and core package names
 * at generation time instead of hardcoding them.
 */
export function findPackageByRole(
  stack: 'api' | 'app',
  type: string,
  category: string,
): string | undefined {
  const all = loadRegistry()
  const match = all.find((p) => {
    const mol = p.molecule as Record<string, unknown> | undefined
    return mol?.stack === stack && mol?.type === type && mol?.category === category
  })
  return match?.name
}

/**
 * Find a package by its role or throw if not found.
 *
 * Unlike findPackageByRole, this never silently falls back to a hardcoded name.
 * If the registry is missing the expected entry, it fails loudly so the
 * registry can be fixed — keeping it as the single source of truth.
 */
export function requirePackageByRole(
  stack: 'api' | 'app' | string,
  type: string,
  category: string,
): string {
  const name = findPackageByRole(stack as 'api' | 'app', type, category)
  if (!name) {
    throw new Error(t('lib.registry.errors.missingRole', { stack, type, category }))
  }
  return name
}

// ============================================================================
// Registry Mutation (used by mlcl init, sync-registry, etc.)
// ============================================================================

/**
 * The file state a read-modify-write cycle saw when it READ the registry, and
 * the state the publish step therefore expects the file to still have.
 *
 * Keyed on `mtimeNs` (nanosecond — `mtimeMs` rounds to a millisecond, which two
 * writes inside the same millisecond share), size, AND the inode, all read
 * through the bigint stat variant so the nanosecond/inode fields are typed.
 *
 * The inode is what makes this an IDENTITY rather than a coincidence: a publish
 * replaces the file by RENAME (see {@link writeRegistry}), which brings a NEW
 * inode into place, and Linux file timestamps come from the coarse clock — so
 * two same-length documents written within one clock tick share both `mtimeNs`
 * and `size`. Without the inode the publish check saw "unchanged" and renamed
 * over the rival's entry, exactly the silent drop this stamp exists to catch.
 * {@link registryCacheKey} carries the same three fields, for the same reason.
 */
interface RegistryStamp {
  mtimeNs: bigint
  size: bigint
  ino: bigint
}

/**
 * The registry file's current {@link RegistryStamp}, or null when it does not
 * exist.
 *
 * ONLY `ENOENT` means "no registry file here". Any other stat failure — a
 * symlinked `registry.json` whose target cannot be resolved (`ELOOP`), a
 * transient `EIO`, `EMFILE` under fd pressure — must NOT be read as absence:
 * {@link readRegistryWithStamp} answers a null stamp with an EMPTY registry
 * WITHOUT reading the file, and the publish step then sees `null → null` as
 * "unchanged" and renames that one-entry document over the fleet. Rethrow, the
 * same ENOENT-only rule the migrate runner's guarded writes apply.
 *
 * @param path - Registry file path.
 * @returns The file's stamp, or null when the file is not there.
 */
function registryStamp(path: string): RegistryStamp | null {
  try {
    const stat = statSync(path, { bigint: true })
    return { mtimeNs: stat.mtimeNs, size: stat.size, ino: stat.ino }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
    return null
  }
}

/** A stamp (or its absence) as the publish failure message names it. */
function stampToString(stamp: RegistryStamp | null): string {
  return stamp === null
    ? '(absent)'
    : `mtimeNs=${stamp.mtimeNs} size=${stamp.size} ino=${stamp.ino}`
}

/**
 * Read the registry for a read-modify-write cycle, together with the
 * {@link RegistryStamp} the publish step will compare against.
 *
 * The stamp is taken BEFORE the read: a write that lands between the two is
 * exactly the concurrent update the stamp comparison must catch (the read then
 * returns bytes the stamp does not describe, so publishing is refused and the
 * caller re-reads).
 */
function readRegistryWithStamp(): { registry: Registry; stamp: RegistryStamp | null } {
  const path = registryFilePath()
  const stamp = registryStamp(path)
  if (stamp === null) {
    return { registry: { version: 1, packages: {} }, stamp: null }
  }
  return { registry: RegistrySchema.parse(JSON.parse(readFileSync(path, 'utf-8'))), stamp }
}

/** Raised when the registry file changed between this caller's read and its publish. */
class RegistryConcurrentUpdateError extends Error {}

/** Read-modify-write attempts before a persistently contested registry fails loudly. */
const REGISTRY_WRITE_ATTEMPTS = 5

/**
 * How long a mutation waits for a rival publisher's lock before failing loudly.
 * Resolved per call from `MLCL_REGISTRY_LOCK_WAIT_MS` (a positive integer, else
 * the default) — the same per-call contract `registryFilePath` applies to its
 * override, so a test (or an operator on a slow filesystem) can set it after
 * module load.
 */
function registryLockWaitMs(): number {
  const parsed = Number(process.env.MLCL_REGISTRY_LOCK_WAIT_MS)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 10_000
}
/**
 * Age past which a publish lock's holder is presumed dead and the lock is
 * stolen. A publish holds the lock for milliseconds, so a lock this old is a
 * crashed process's leftover, not a live writer.
 */
const REGISTRY_LOCK_STEAL_MS = 60_000

/**
 * The publish-serialization lock, next to the registry file it guards.
 *
 * The stamp check inside {@link writeRegistry} is a check-then-act: between the
 * check and the rename two publishers can BOTH see "unchanged" and both rename,
 * and the second replaces the first's document with one that never saw it — the
 * silent entry drop the stamp exists to prevent, unreachable by any retry
 * because neither writer observed a conflict. The lock removes that window: the
 * whole read-modify-write runs under it, so publishers serialize before they
 * read. The stamp check stays as the backstop for a writer that does not take
 * the lock (an older mlcl, a hand editor's tooling).
 */
function registryLockPath(): string {
  return `${registryFilePath()}.publish.lock`
}

/** A bounded synchronous sleep — the mutation API is synchronous, so the wait must be. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/**
 * The identity of ONE lock file: the inode plus the nanosecond mtime that tell
 * it apart from a different file created in its place — and the file's exact
 * BYTES, which is what tells them apart when that pair cannot.
 *
 * ext4 hands a freed inode straight back to the next file created in the same
 * directory (verified on this machine), so the inode alone is not enough — see
 * {@link stealStaleLock}. The mtime is not enough either, and the RELEASE path
 * is where it fails: Linux file timestamps come from the coarse clock, and a
 * rival that replaces a YOUNG lock — one this process created microseconds
 * ago, then stalled past the steal age — does so inside the same clock tick,
 * so the replacement can carry BOTH the reused inode and the same mtime. An
 * inode + mtime identity then reads "the file we put there", and the release
 * deletes a live holder's lock — the path looks free to a third publisher
 * while the rival still believes it holds it. (Observed 2026-10-12: the
 * release-side race suite failed roughly one run in ten exactly this way, on
 * the ext4 /tmp.) The content cannot collide: every lock this code creates
 * carries a fresh random token beside the pid, so two different files never
 * read the same.
 */
interface LockIdentity {
  ino: bigint
  mtimeNs: bigint
  content: string
}

/**
 * The {@link LockIdentity} of the file at `path`, or null when it cannot be
 * described (already gone, or unstattable/unreadable).
 *
 * @param path - The file to identify.
 * @returns Its inode, nanosecond mtime and bytes, or null.
 */
function lockIdentityOf(path: string): LockIdentity | null {
  try {
    const stat = statSync(path, { bigint: true })
    return { ino: stat.ino, mtimeNs: stat.mtimeNs, content: readFileSync(path, 'utf-8') }
  } catch (_error) {
    // Missing (already released, or renamed away by a rival) or uninspectable —
    // there is no file here to identify.
    return null
  }
}

/**
 * Remove the lock at `lockPath` ONLY when the file there is the one `expected`
 * identifies — never a different file a rival has since put in its place.
 *
 * Two callers need exactly this: {@link stealStaleLock}, taking over a
 * presumed-dead holder's leftover, and {@link releaseRegistryPublishLock},
 * dropping THIS process's own lock when its mutation finishes. Both stat the
 * file they mean to remove some microseconds before they remove it, and that
 * gap is a race: by the time the removal runs, a rival may have removed the
 * file and created its OWN fresh one — a different inode. A plain `rmSync`
 * cannot tell the two apart: it deletes whatever is at the path NOW, so it
 * deletes the rival's lock, and the two processes both believe they hold it.
 * That reopens the check-then-rename window the lock exists to close (each
 * publisher's stamp check can pass before the other's rename and after it, and
 * the second rename silently drops the first writer's entry).
 *
 * So the removal goes through the one operation that can carry identity across
 * the gap: `rename` the lock aside (atomic), then compare the moved file's
 * identity against `expected`. The same identity is the file we meant to remove
 * — remove it. Anything else (a live writer's fresh lock, or a moved file that
 * cannot be stat'ed at all) is put back untouched (hard-linked, so a third
 * party that grabbed the path in the meantime keeps its own file rather than
 * having it replaced).
 *
 * The identity is the inode AND the nanosecond mtime AND the file's bytes,
 * never the inode alone: a freed inode can be handed straight back to the next
 * file created in the same directory, so a rival's freshly-created lock can
 * carry the very inode number the removed one had — an inode-only check then
 * reads "same file" and deletes the live lock. The mtime separates them when
 * whatever a rival creates in the gap is measurably later (a STALE lock, judged
 * so at sixty seconds); for a YOUNG lock — a rival replacing one this process
 * released microseconds late — the replacement can land in the same coarse
 * clock tick and reuse the inode, so the bytes are the decisive check: every
 * lock this code writes carries a fresh random token, and only the file whose
 * bytes match what this caller put there is removed.
 *
 * @param lockPath - The lock path to act on.
 * @param expected - The identity of the file this caller owns or judged stale.
 * @returns True when the identified file was removed; false when the path held
 *   a different file (put back untouched) or nothing.
 */
function removeLockIfIdentity(lockPath: string, expected: LockIdentity): boolean {
  const graveyard = `${lockPath}.graveyard.${process.pid}`
  try {
    renameSync(lockPath, graveyard)
  } catch (_error) {
    // Gone already (or unrenamable) — nothing to remove.
    return false
  }
  const moved = lockIdentityOf(graveyard)
  if (
    moved !== null &&
    moved.ino === expected.ino &&
    moved.mtimeNs === expected.mtimeNs &&
    moved.content === expected.content
  ) {
    // The file we moved is the one we meant to remove: it holds nothing anyone needs.
    try {
      rmSync(graveyard, { force: true })
    } catch (_error) {
      // Inert litter beside the registry; the lock itself is already released.
    }
    return true
  }
  // We moved a LIVE holder's fresh lock — or one we could not verify. Put it back
  // without replacing whatever is at the path now (link fails with EEXIST when
  // someone re-took it), then drop our extra name — the bytes and the inode are
  // the holder's either way.
  try {
    linkSync(graveyard, lockPath)
  } catch (_error) {
    // The path is taken again (or the link failed): the holder will re-create
    // its lock or a rival now owns the path; never overwrite either.
  }
  try {
    rmSync(graveyard, { force: true })
  } catch (_error) {
    // Inert litter; see above.
  }
  return false
}

/**
 * Remove a presumed-dead holder's publish lock — but only the file that was
 * judged stale, never one a live writer created in the meantime.
 *
 * The mtime that decides "this holder is a crashed leftover" is read from a
 * `statSync` some microseconds before the removal, and that gap is a race: two
 * processes that both see the SAME stale lock both decide to steal it, the
 * first of them removes it and creates its own fresh lock, and the second — its
 * stat already taken against the old file — then removed the FIRST'S fresh
 * lock. Both then believed they held the lock, which reopens exactly the
 * check-then-rename window the lock exists to close: each publisher's
 * {@link writeRegistry} stamp check can pass before the other's rename and
 * after it, and the second rename silently drops the first writer's entry —
 * the outcome no retry can answer, because neither writer observed a conflict.
 * A plain `rmSync(lockPath)` cannot tell the two files apart: it deletes
 * whatever is there NOW.
 *
 * So the removal goes through the one operation that can carry identity across
 * the gap: `rename` the lock aside (atomic), then compare the moved file's
 * identity against the one stat'ed before the move. The same identity is the
 * file we judged stale — remove it, and report `true` so the caller retries its
 * create immediately. Anything else — a different identity (a live writer
 * created its own lock in the gap) or a moved file that cannot be stat'ed at
 * all — is put back untouched (hard-linked, so a third party that grabbed the
 * path in the meantime keeps its own file rather than having it replaced) and
 * reported `false`: the caller then takes its ordinary wait path instead of
 * retrying the steal, so an unverifiable lock can never turn this into a loop
 * that spin-steals the same file for ever.
 *
 * The identity is the inode AND the nanosecond mtime AND the bytes, never the
 * inode alone: ext4 (verified on this machine) hands a freed inode straight
 * back to the next file created in the same directory, so a rival's
 * freshly-created lock can carry the very inode number the removed stale one
 * had — an inode-only check then reads "same file", deletes the live lock, and
 * reopens the race. The mtime separates them here because the age is what made
 * the original look stale: the file we judged dead is at least
 * {@link REGISTRY_LOCK_STEAL_MS} old by the clock, while anything a rival
 * creates inside the gap is fresh — and the bytes are the backstop that holds
 * even where the clock does not (see {@link LockIdentity}).
 *
 * @param lockPath - The publish lock the caller judged stale.
 * @returns True when the stale lock was removed (the caller may create its own);
 *   false when nothing was taken over and the caller must wait instead.
 */
function stealStaleLock(lockPath: string): boolean {
  const stale = lockIdentityOf(lockPath)
  // Released between the caller's stat and this one — nothing to steal.
  if (stale === null) return false
  return removeLockIfIdentity(lockPath, stale)
}

/**
 * The identity of the lock file THIS process created and currently holds, or
 * null when it holds none. Recorded the instant the create succeeds so
 * {@link releaseRegistryPublishLock} can drop THAT file and nothing else: a
 * holder stalled past {@link REGISTRY_LOCK_STEAL_MS} (a suspended process, a VM
 * freeze — not only a crash) has its lock stolen and replaced by a rival's, and
 * a release that removed whatever is at the path would then delete the rival's
 * lock while the rival still believes it holds it, letting a third publisher in
 * — the silent entry drop the lock exists to prevent.
 */
let heldLockIdentity: LockIdentity | null = null

/**
 * Take {@link registryLockPath} exclusively, waiting out a rival's live publish
 * and stealing a dead one.
 *
 * `wx` (O_CREAT|O_EXCL) is the atomic test-and-set: the loser of a race fails
 * with EEXIST instead of both believing they hold the lock. A held lock is
 * waited out up to {@link registryLockWaitMs} (`MLCL_REGISTRY_LOCK_WAIT_MS`,
 * 10 s by default); one older than
 * {@link REGISTRY_LOCK_STEAL_MS} is a crashed holder's leftover and is taken
 * over through {@link stealStaleLock}, so it cannot wedge every future mutation
 * behind it — and a rival's own just-created lock is never the file that gets
 * removed.
 *
 * Every path here is bounded: a lock that cannot be INSPECTED at all (a stat
 * failure that is not the holder's ENOENT release — EACCES, ELOOP, EIO) is
 * reported rather than retried, because retrying it would never reach the wait
 * budget below and would spin this process without limit.
 *
 * @throws When the lock stays held past the wait budget — the caller is told
 *   which file to inspect, never left spinning.
 */
function acquireRegistryPublishLock(): void {
  const lockPath = registryLockPath()
  const deadline = Date.now() + registryLockWaitMs()
  for (;;) {
    try {
      // The pid names the holder for the operator; the random token is what the
      // release identifies THIS file by — see {@link LockIdentity}: an inode
      // reused within the same coarse clock tick makes inode + mtime alone
      // ambiguous for a young lock, and the bytes never are.
      const token = randomUUID()
      const content = `${process.pid} ${token}\n`
      writeFileSync(lockPath, content, { flag: 'wx' })
      // Record which file we just made, so the release drops exactly this one.
      try {
        const made = statSync(lockPath, { bigint: true })
        heldLockIdentity = { ino: made.ino, mtimeNs: made.mtimeNs, content }
      } catch (identityError) {
        // The create SUCCEEDED but the file it made cannot be described — a
        // transient stat failure (EMFILE under fd pressure, EIO, EACCES).
        // Carrying on would run the publish under a lock with no identity to
        // release against: the lock stays on disk after this process finishes,
        // and this process's next mutation — like every other publisher — then
        // waits out the whole steal age behind a lock nobody holds and fails.
        // The file is provably this call's own (O_CREAT|O_EXCL named it for
        // this process microseconds ago, and a rival may only take over a lock
        // past {@link REGISTRY_LOCK_STEAL_MS}), so drop it and report the
        // failure rather than write the registry unserialized.
        try {
          rmSync(lockPath, { force: true })
        } catch (_cleanupError) {
          // Best-effort: the identity failure is reported below.
        }
        throw new Error(
          `${lockPath} was created but cannot be inspected (${String(identityError)}) — this ` +
            'process cannot promise to release the publish lock, so the registry was left ' +
            'untouched. Check that file and its directory, then re-run the command.',
          { cause: identityError },
        )
      }
      return
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error
      let heldMs: number
      try {
        heldMs = Date.now() - statSync(lockPath).mtimeMs
      } catch (statError) {
        // ENOENT — the holder released it between our create and this stat, so
        // retry immediately. Anything else means this path cannot be inspected:
        // this process cannot tell a dead holder from a live one, and treating
        // it as "released" retries at full speed forever (the write below keeps
        // failing EEXIST on a file the stat keeps refusing to describe). Say so.
        if ((statError as NodeJS.ErrnoException)?.code === 'ENOENT') continue
        throw new Error(
          `${lockPath} exists but cannot be inspected (${String(statError)}) — this process ` +
            'cannot tell whether another mlcl publish is running. Check that file and its ' +
            'directory, then re-run the command.',
          { cause: statError },
        )
      }
      if (heldMs > REGISTRY_LOCK_STEAL_MS && stealStaleLock(lockPath)) {
        // The stale leftover is gone — this process's own create is next.
        continue
      }
      if (Date.now() >= deadline) {
        let holder = 'an unknown process'
        try {
          // First field only: the bytes also carry the random release token
          // (see the create above), which is noise in an operator-facing line.
          holder = `pid ${readFileSync(lockPath, 'utf-8').trim().split(/\s+/)[0]}`
        } catch (_readError) {
          // The lock may have been released while this message was built.
        }
        throw new Error(
          `${lockPath} has been held for ${Math.round(heldMs)}ms by ${holder} — ` +
            'another mlcl publish is stuck or a crashed one left the lock behind. ' +
            'If no mlcl command is running, remove that file and re-run the command.',
          { cause: error },
        )
      }
      sleepSync(25)
    }
  }
}

/**
 * Release the publish lock THIS process holds — and only the file it created.
 *
 * Best-effort: a lock left behind is stolen after {@link REGISTRY_LOCK_STEAL_MS}.
 * The removal is identity-scoped ({@link removeLockIfIdentity}) rather than a
 * plain `rmSync` because a holder stalled past the steal age has its lock taken
 * over and replaced by a rival's: removing whatever is at the path would delete
 * the RIVAL's lock, and the path would then look free to a third publisher while
 * the rival still believed it held it — reopening the check-then-rename window
 * this lock closes.
 */
function releaseRegistryPublishLock(): void {
  const identity = heldLockIdentity
  heldLockIdentity = null
  // No recorded identity means this process created no lock it can prove it
  // owns — remove nothing rather than a file that may belong to a rival.
  if (identity === null) return
  removeLockIfIdentity(registryLockPath(), identity)
}

/**
 * Apply a mutation to the registry with optimistic concurrency control, under
 * the publish lock.
 *
 * The naive cycle — read, mutate in memory, write — silently DROPS a concurrent
 * writer's entry: two parallel `mlcl init` runs both read the same file, both
 * add their package and publish, and the second rename replaces the first
 * writer's entry with a file that never saw it. Every later
 * `requirePackageByRole` for the dropped package then fails with "missing
 * role". Two guards close that: the publish lock serializes publishers (the
 * check-then-rename gap inside {@link writeRegistry} is not observable across
 * lock holders), and the publish step's stamp check — which answers a writer
 * that never took the lock — is retried by re-reading (picking up the other
 * writer's entry) and re-applying, up to {@link REGISTRY_WRITE_ATTEMPTS} times.
 * A persistently contested registry (a runaway writer) fails loudly instead of
 * clobbering.
 *
 * @param apply - The mutation, applied to a freshly-read registry per attempt.
 */
function mutateRegistry(apply: (registry: Registry) => void): void {
  acquireRegistryPublishLock()
  try {
    let lastConflict: RegistryConcurrentUpdateError | null = null
    for (let attempt = 0; attempt < REGISTRY_WRITE_ATTEMPTS; attempt++) {
      const { registry, stamp } = readRegistryWithStamp()
      apply(registry)
      try {
        writeRegistry(stamp, registry)
        return
      } catch (error) {
        if (!(error instanceof RegistryConcurrentUpdateError)) throw error
        lastConflict = error
      }
    }
    throw new Error(
      `${registryFilePath()} kept changing while the update was being applied ` +
        `(${REGISTRY_WRITE_ATTEMPTS} attempts, last conflict: ${String(lastConflict)}) — ` +
        `another mlcl process is writing it; re-run the command`,
    )
  } finally {
    releaseRegistryPublishLock()
  }
}

function writeRegistry(stamp: RegistryStamp | null, registry: Registry): void {
  // Sort packages alphabetically for deterministic output
  const sorted: Registry = {
    version: registry.version,
    ...(registry.typeDefaults ? { typeDefaults: registry.typeDefaults } : {}),
    packages: Object.fromEntries(
      Object.entries(registry.packages).sort(([a], [b]) => a.localeCompare(b)),
    ),
    ...(registry.apiFrameworks ? { apiFrameworks: registry.apiFrameworks } : {}),
    ...(registry.appFrameworks ? { appFrameworks: registry.appFrameworks } : {}),
    ...(registry.stagingDrivers ? { stagingDrivers: registry.stagingDrivers } : {}),
    ...(registry.toolchain ? { toolchain: registry.toolchain } : {}),
    ...(registry.moleculeVersions ? { moleculeVersions: registry.moleculeVersions } : {}),
    ...(registry.themePresets ? { themePresets: registry.themePresets } : {}),
  }
  // Publish by rename from a temp file in the SAME directory, never by an
  // in-place writeFileSync: an in-place write truncates registry.json first
  // and then writes, so a crash (or a full disk) between the two leaves a
  // truncated file that every mlcl command's parse fails on, with no backup.
  // rename is atomic on the same filesystem, so a failure before it leaves
  // the original bytes untouched. The pid in the temp name keeps parallel
  // mlcl processes from renaming each other's half-written file.
  //
  // The stamp check immediately before the rename is the optimistic-concurrency
  // gate {@link mutateRegistry} retries on: the file must still be in the state
  // the caller read it in, or the rename would silently REPLACE another
  // process's just-published entry with a file that never saw it.
  const target = registryFilePath()
  const temp = `${target}.${process.pid}.tmp`
  try {
    writeFileSync(temp, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
    const current = registryStamp(target)
    const changed =
      current === null
        ? stamp !== null
        : stamp === null ||
          current.mtimeNs !== stamp.mtimeNs ||
          current.size !== stamp.size ||
          current.ino !== stamp.ino
    if (changed) {
      throw new RegistryConcurrentUpdateError(
        `${target} changed after it was read (${stampToString(stamp)} → ${stampToString(current)})`,
      )
    }
    renameSync(temp, target)
  } catch (error) {
    // The temp file may exist partially written (or not at all) — remove it so
    // a failed publish leaves no litter next to the registry.
    try {
      rmSync(temp, { force: true })
    } catch (_cleanupError) {
      // Cleanup of OUR OWN temp file is best-effort: the registry itself is
      // intact (the destructive step never ran), and a leftover `${pid}.tmp`
      // is inert. Failing here would only mask the original write error.
    }
    throw error
  }
  clearRegistryCache()
}

/**
 * Add or update a package entry in the registry.
 *
 * Runs through {@link mutateRegistry}: a concurrent writer's entry is picked up
 * by the re-read instead of being dropped by this publish.
 */
export function updateRegistryEntry(packageName: string, entry: RegistryEntry): void {
  mutateRegistry((registry) => {
    registry.packages[packageName] = entry
  })
}

/** Cached registry paths kept before the oldest is evicted (see the cap below). */
export const RAW_REGISTRY_CACHE_LIMIT = 4

/**
 * Parsed-registry cache for {@link getRawRegistry}.
 *
 * Every framework/toolchain/version accessor funnels through getRawRegistry —
 * {@link getMoleculeVersion} among them, which scaffold and inject call once
 * per DEPENDENCY — and each call used to re-read and re-parse the whole
 * registry file. At ~900 packages (1.5 MB) that is ~27 ms per call, so one
 * scaffold paid seconds of pure re-parsing that grows with the fleet, not with
 * the work. The key is the file's IDENTITY — nanosecond mtime, size and inode
 * ({@link registryCacheKey}) — so an edit from ANOTHER process
 * (molecule's pre-commit doc regen writes this file) or an `MLCL_REGISTRY_PATH`
 * flip is honored on the next call; in-process writes go through
 * {@link writeRegistry}, which calls {@link clearRegistryCache}. The map holds
 * at most {@link RAW_REGISTRY_CACHE_LIMIT} paths — alternate registries in a
 * multi-registry workflow, never a growth surface.
 *
 * Callers must treat the returned object as READ-ONLY or finish in a registry
 * write: the sync-registry subcommands mutate it and then writeFileSync the
 * file (mtime changes → fresh parse next call). Every other caller only reads.
 */
const rawRegistryCache = new Map<string, { key: string; registry: Registry }>()

/**
 * The cache key that identifies one STATE of a registry file.
 *
 * Millisecond mtime + size is NOT an identity: two writers inside the same
 * millisecond whose documents happen to be the same length share it, and the
 * reader then serves the FIRST parse for the rest of the process's life. That
 * bound is reachable — a publish replaces the file by rename (so the inode
 * changes every time even when the bytes are the same length), and
 * `writeRegistry`'s own {@link RegistryStamp} already uses nanosecond mtime for
 * exactly this reason. Nanoseconds plus the inode catch both write shapes: a
 * rename (new inode, any mtime) and an in-place `writeFileSync` (same inode,
 * new mtime).
 *
 * @param stat - The file's `statSync(path, { bigint: true })` result.
 * @returns The identity string the raw-registry cache is keyed on.
 */
function registryCacheKey(stat: { mtimeNs: bigint; size: bigint; ino: bigint }): string {
  return `${stat.mtimeNs}:${stat.size}:${stat.ino}`
}

/**
 * The parsed registry and whether the FILE was there.
 *
 * THE single read + `JSON.parse` + zod validation of the registry file: every
 * reader in this module goes through here, so a process pays for the
 * fleet-sized file once per (path, {@link registryCacheKey}) no matter how many
 * accessors it touches. `present` separates "the file is missing" from "the
 * registry is empty": {@link getRawRegistry} answers an empty registry for a
 * missing file (its callers only ever read an optional section), while
 * {@link loadRegistry} must fail loudly — an empty package list is a valid
 * registry, so it cannot stand in for a broken install.
 *
 * @param path - Registry file path (already resolved from the env override).
 * @returns The parsed registry, and whether the file existed.
 */
function rawRegistryAt(path: string): { registry: Registry; present: boolean } {
  let stat: { mtimeNs: bigint; size: bigint; ino: bigint }
  try {
    stat = statSync(path, { bigint: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
    // No registry file at this path — the empty registry, flagged as absent.
    // ONLY ENOENT may be read as absence, the same rule registryStamp applies:
    // a symlinked registry whose target cannot be resolved (ELOOP), a transient
    // EIO or an EMFILE under fd pressure would otherwise answer every accessor
    // here an EMPTY registry — loadToolchain scaffolds without its pins and
    // getMoleculeVersion reports the 1.0.0 fallback — silently, where the
    // failure is the real answer.
    return { registry: { version: 1, packages: {} }, present: false }
  }
  const key = registryCacheKey(stat)
  const hit = rawRegistryCache.get(path)
  if (hit && hit.key === key) return { registry: hit.registry, present: true }
  const registry = RegistrySchema.parse(JSON.parse(readFileSync(path, 'utf-8')))
  if (rawRegistryCache.size >= RAW_REGISTRY_CACHE_LIMIT && !rawRegistryCache.has(path)) {
    const oldest = rawRegistryCache.keys().next().value
    if (oldest !== undefined) rawRegistryCache.delete(oldest)
  }
  rawRegistryCache.set(path, { key, registry })
  return { registry, present: true }
}

/**
 * Get the raw registry data (for AI context building).
 */
export function getRawRegistry(): Registry {
  return rawRegistryAt(registryFilePath()).registry
}

/**
 * Get the path to the registry file (honors the `MLCL_REGISTRY_PATH` override).
 */
export function getRegistryPath(): string {
  return registryFilePath()
}

// ============================================================================
// Framework Configuration (from registry)
// ============================================================================

/**
 * Load API framework configurations from the registry.
 */
export function loadApiFrameworks(): Record<string, ApiFrameworkConfig> {
  const registry = getRawRegistry()
  return registry.apiFrameworks ?? {}
}

/**
 * Load app framework configurations from the registry.
 */
export function loadAppFrameworks(): Record<string, AppFrameworkConfig> {
  const registry = getRawRegistry()
  return registry.appFrameworks ?? {}
}

/**
 * Get the set of npm dependency names that identify app projects.
 *
 * Derived from all appFrameworks dependency keys in the registry. A framework
 * whose markers live ONLY in `devDependencies` contributes its devDependencies
 * instead of nothing: `appFrameworks.svelte` declares `dependencies: {}` with
 * `svelte`, `@sveltejs/kit`, `@sveltejs/adapter-auto` and
 * `@sveltejs/vite-plugin-svelte` under `devDependencies`, so a Svelte project
 * was invisible to the "is this an app project?" check both callers run
 * (`inject.ts`'s `detectAppProject`, `validator.ts`'s
 * `detectAppProjectForValidation`) — which decides whether secrets land in
 * `app/.env` or `api/.env`, whether the API-only `ensureMigrateRunnerImports`
 * step runs, and which validation mode applies. The fallback is per-framework,
 * never a union of both keys: `@types/react` and `@vitejs/plugin-*` are shared
 * by projects of several kinds, and adding them for a framework that already
 * names runtime dependencies would widen the heuristic for every project.
 *
 * @returns Every framework's identifying package names, deduplicated.
 */
export function getAppFrameworkDeps(): string[] {
  const frameworks = loadAppFrameworks()
  const deps = new Set<string>()
  for (const fw of Object.values(frameworks)) {
    const runtime = Object.keys(fw.dependencies ?? {})
    const identifying = runtime.length > 0 ? runtime : Object.keys(fw.devDependencies ?? {})
    for (const dep of identifying) deps.add(dep)
  }
  return [...deps]
}

/**
 * Detect the app framework from a project's dependency map.
 * Returns the framework key (e.g. 'react', 'vue', 'svelte', 'solid') or undefined.
 */
export function detectAppFramework(
  deps: Record<string, string>,
  moleculeMeta?: { framework?: string },
): string | undefined {
  // Primary: explicit framework marker set by mlcl create
  if (moleculeMeta?.framework) return moleculeMeta.framework
  // Fallback: match framework deps/devDeps from registry
  const frameworks = loadAppFrameworks()
  for (const [name, fw] of Object.entries(frameworks)) {
    const fwDeps = [...Object.keys(fw.dependencies ?? {}), ...Object.keys(fw.devDependencies ?? {})]
    if (fwDeps.some((d) => d in deps)) return name
  }
  return undefined
}

/**
 * Get the shared code subdirectory for a framework (e.g. 'lib' for SvelteKit).
 * Returns undefined if the framework uses the default src/ root.
 */
export function getSharedCodeDir(framework: string): string | undefined {
  const frameworks = loadAppFrameworks()
  return frameworks[framework]?.sharedCodeDir
}

/**
 * Load pinned toolchain versions from the registry.
 * Returns shared, api, app, and moleculePackage dev dependency maps.
 */
export function loadToolchain(): {
  shared: Record<string, string>
  api: Record<string, string>
  app: Record<string, string>
  moleculePackage: Record<string, string>
} {
  const registry = getRawRegistry()
  return {
    shared: registry.toolchain?.shared ?? {},
    api: registry.toolchain?.api ?? {},
    app: registry.toolchain?.app ?? {},
    moleculePackage: registry.toolchain?.moleculePackage ?? {},
  }
}

/**
 * Load the exact @molecule/* version map from the registry.
 *
 * Returns the lockstep `default` version every @molecule package pins to plus
 * any per-package `overrides`. This is the single source of truth for the
 * versions scaffolded projects pin each @molecule dependency to.
 */
export function loadMoleculeVersions(): { default: string; overrides: Record<string, string> } {
  const registry = getRawRegistry()
  return {
    default: registry.moleculeVersions?.default ?? '1.0.0',
    overrides: registry.moleculeVersions?.overrides ?? {},
  }
}

/**
 * Resolve the exact version a given @molecule/* package pins to.
 *
 * Reads `moleculeVersions.overrides[packageName]` first, then falls back to
 * `moleculeVersions.default`. Never returns a range — exact pins only. Packages
 * not present in the map resolve to the default (the monorepo lockstep version).
 *
 * @param packageName - The @molecule/* package name to resolve a version for.
 */
export function getMoleculeVersion(packageName: string): string {
  const { default: defaultVersion, overrides } = loadMoleculeVersions()
  return overrides[packageName] ?? defaultVersion
}

/**
 * Load staging driver configurations from the registry.
 */
export function loadStagingDrivers(): Record<string, StagingDriverRegistryEntry> {
  const registry = getRawRegistry()
  return registry.stagingDrivers ?? {}
}

/**
 * Theme preset entry from the registry.
 */
export interface ThemePreset {
  label: string
  description: string
  themeProvider: string
  classMapProvider?: string
}

/**
 * Load theme preset configurations from the registry.
 */
export function loadThemePresets(): Record<string, ThemePreset> {
  const registry = getRawRegistry()
  return (registry.themePresets ?? {}) as Record<string, ThemePreset>
}
