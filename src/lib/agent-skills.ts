/**
 * The agent guidance a scaffolded project receives — ONE path-neutral owner.
 *
 * Two artifacts are delivered:
 *
 *  - the canonical shared skills authored under
 *    `templates/.agents/skills/<name>/SKILL.md` (`capability-first` is the
 *    reuse-before-writing workflow). `patterns/` and `examples/` sit beside them
 *    and are copy-source corpora, NOT skills: indexing either would inject it
 *    always-on and crowd the skill budget.
 *  - `molecule-packages/SKILL.md`, the framework-scoped @molecule catalog,
 *    rendered from `registry.json` by the existing `buildCatalog` owner — this
 *    module adds no second scorer.
 *
 * Keys are RELATIVE to `.agents/skills` (`<name>/SKILL.md`) so every caller
 * adapts its own root: a local scaffold writes `<project>/.agents/skills/…` and
 * molecule-dev maps the same keys under `/workspace/.agents/skills/`. The one
 * per-environment piece is the catalog HEADER — how a package is added and where
 * `node_modules` lives differ between a scaffolded checkout and a pre-installed
 * sandbox — so that text stays with each adapter while the skill bodies and the
 * catalog body are shared.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { buildCatalog, type CatalogStack } from './catalog-generator.js'
import type { Registry } from './schema.js'

/** Directory (relative to a project root) the skills are written under. */
export const AGENT_SKILLS_DIR = '.agents/skills'

/**
 * Directories beside the shared skills that are corpora, not skills. Mirrors the
 * exclusion the molecule-dev executor's discovery applies, so a scaffolded
 * project and a sandbox list the same names.
 */
export const RESERVED_SKILL_DIRS: ReadonlySet<string> = new Set(['patterns', 'examples'])

/** The generated catalog's skill directory (and its file, relative to the skills root). */
export const PACKAGE_CATALOG_SKILL = 'molecule-packages'
export const PACKAGE_CATALOG_SKILL_FILE = `${PACKAGE_CATALOG_SKILL}/SKILL.md`

/**
 * Frontmatter + prose for the LOCAL package catalog.
 *
 * Deliberately distinct from the sandbox's header: a scaffolded checkout is not
 * a pre-installed superset, so a package is added with `npx mlcl add … --inject`
 * and its README lives at the project's own `node_modules`. The body appended
 * after this header is the shared, registry-derived catalog.
 */
export const LOCAL_PACKAGE_CATALOG_HEADER = `---
name: molecule-packages
description: Catalog of the @molecule/* packages available to this project, grouped by intent. Check here before writing custom code — a package may already provide the capability.
---

# Available @molecule/* packages

Everything below is published on the public npm registry. Add one with
\`npx mlcl add @molecule/<name> --inject\` — it writes the dependency, the bond
wiring, and any peer packages a provider needs. Read the installed
\`node_modules/@molecule/<name>/README.md\` before using its API; it documents
the interface, usage examples and wiring.

**Prefer a @molecule/* package over writing custom code.** If a package exists
for the feature, use it — unless the user named a specific library or asked for
their own version, which is their call.

`

/**
 * Which packages a project of this shape can use.
 *
 * `status-page-edge` is API-shaped (it scaffolds no app workspace), and
 * `status-page` is full-stack (it does) — the same split `create` uses to select
 * the package menus. An unknown shape gets the superset rather than a silently
 * narrowed catalog.
 *
 * @param projectType - A `mlcl create --type` value.
 * @returns The catalog stack to scope the package list to.
 */
export function catalogStackForProjectType(projectType: string): CatalogStack {
  switch (projectType) {
    case 'api':
    case 'status-page-edge':
      return 'api'
    case 'app':
    case 'static':
      return 'app'
    default:
      return 'full-stack'
  }
}

/**
 * Read the canonical shared skills.
 *
 * The same files molecule-dev's sandbox scaffold reads; the walk rules (reserved
 * corpora, `SKILL.md` required) live here so both surfaces list one set.
 *
 * @param templatesDir - An mlcl `templates/` directory.
 * @returns Relative skill path (`<name>/SKILL.md`) → authored content. Empty when
 *   the templates tree is absent (a standalone package checkout), which callers
 *   treat like the other template loaders: still succeed, just without them.
 */
export function loadSharedSkills(templatesDir: string): Record<string, string> {
  const root = join(templatesDir, '.agents', 'skills')
  if (!existsSync(root)) return {}
  const out: Record<string, string> = {}
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (RESERVED_SKILL_DIRS.has(entry.name)) continue
    const file = join(root, entry.name, 'SKILL.md')
    if (!existsSync(file)) continue
    out[`${entry.name}/SKILL.md`] = readFileSync(file, 'utf-8')
  }
  return out
}

/**
 * Render the local `molecule-packages` skill: the local header plus the
 * framework-scoped catalog body.
 *
 * @param opts.registry - The parsed registry (the catalog's only source).
 * @param opts.projectType - A `mlcl create --type` value.
 * @param opts.framework - The app framework, when the project has one. An
 *   api-only catalog is framework-agnostic; `express` names the API framework
 *   `mlcl create` scaffolds so the title stays truthful.
 * @returns The complete SKILL.md content.
 */
export function renderLocalPackageCatalog(opts: {
  registry: Registry
  projectType: string
  framework?: string | null
}): string {
  const stack = catalogStackForProjectType(opts.projectType)
  const framework = opts.framework ?? (stack === 'api' ? 'express' : 'react')
  return (
    LOCAL_PACKAGE_CATALOG_HEADER +
    buildCatalog({ registry: opts.registry, framework, stack }) +
    '\n'
  )
}

/**
 * Every skill file a scaffolded project receives, keyed relative to
 * `.agents/skills`.
 *
 * The generated catalog is assigned after the shared skills so that a canonical
 * directory of the same name can never shadow it — the catalog has exactly one
 * producer.
 *
 * @param opts.templatesDir - An mlcl `templates/` directory.
 * @param opts.registry - The parsed registry.
 * @param opts.projectType - A `mlcl create --type` value.
 * @param opts.framework - The app framework, when the project has one.
 * @returns Relative path → file content.
 */
export function buildLocalAgentSkillFiles(opts: {
  templatesDir: string
  registry: Registry
  projectType: string
  framework?: string | null
}): Record<string, string> {
  const files = loadSharedSkills(opts.templatesDir)
  files[PACKAGE_CATALOG_SKILL_FILE] = renderLocalPackageCatalog(opts)
  return files
}

/** What a write touched, and what it left alone. */
export interface AgentSkillWriteResult {
  /** Project-relative paths created by this call. */
  written: string[]
  /** Project-relative paths that already existed and were kept verbatim. */
  skipped: string[]
}

/**
 * Write the skill files into `<projectRoot>/.agents/skills/`.
 *
 * Non-destructive by construction: each file is created with the exclusive
 * (`wx`) flag, so an existing skill — user-written, or edited after an earlier
 * scaffold — is left untouched instead of being overwritten. Same policy
 * `ensureAgentsMd` applies to `AGENTS.md`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param files - Relative skill path → content (see {@link buildLocalAgentSkillFiles}).
 * @returns The paths written and skipped.
 */
export async function writeAgentSkillFiles(
  projectRoot: string,
  files: Record<string, string>,
): Promise<AgentSkillWriteResult> {
  const written: string[] = []
  const skipped: string[] = []
  // A regular FILE named `.agents` is a broken project state, not a delivery
  // target: writing under it would throw ENOTDIR and fail the whole scaffold.
  // Guidance never blocks a build, so report every file as skipped instead.
  const agentsRoot = join(projectRoot, '.agents')
  if (existsSync(agentsRoot) && !statSync(agentsRoot).isDirectory()) {
    return { written, skipped: Object.keys(files).map((rel) => join(AGENT_SKILLS_DIR, rel)) }
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const target = join(projectRoot, AGENT_SKILLS_DIR, ...relativePath.split('/'))
    await mkdir(dirname(target), { recursive: true })
    try {
      await writeFile(target, content, { flag: 'wx' })
      written.push(join(AGENT_SKILLS_DIR, relativePath))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      skipped.push(join(AGENT_SKILLS_DIR, relativePath))
    }
  }
  return { written, skipped }
}

/**
 * Point `.claude` at `.agents` so harnesses that discover skills from
 * `.claude/skills` see the delivered ones — the same link the molecule-dev
 * sandbox scaffold creates.
 *
 * Never touches a `.claude` the user already has. A platform that refuses
 * symlinks (Windows without developer mode) is not an error: the skills remain
 * at the canonical `.agents/skills` path.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns `linked` when the link was created, `present` when `.claude` already
 *   exists, `unavailable` when the platform refused it.
 */
export async function ensureClaudeSkillsLink(
  projectRoot: string,
): Promise<'linked' | 'present' | 'unavailable'> {
  const linkPath = join(projectRoot, '.claude')
  if (existsSync(linkPath)) return 'present'
  // Only a real directory is worth pointing at (see writeAgentSkillFiles: a
  // regular file named `.agents` is skipped, never linked).
  const agentsRoot = join(projectRoot, '.agents')
  if (!existsSync(agentsRoot) || !statSync(agentsRoot).isDirectory()) return 'unavailable'
  try {
    await symlink('.agents', linkPath, 'dir')
    return 'linked'
  } catch (_error) {
    // Intentional noop: the canonical `.agents/skills` delivery already
    // succeeded; a refused link must not fail the scaffold.
    return 'unavailable'
  }
}
