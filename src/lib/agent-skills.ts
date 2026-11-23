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
 *  - the project skills authored under `templates/project-skills/<name>/SKILL.md`
 *    (api-patterns, database, styling, …): how a Molecule project's own code is
 *    written. They are the same files the Molecule harness's sandbox scaffold
 *    delivers, so every harness reads one text. Unlike the shared skills,
 *    `mlcl setup` never installs them into a harness, since they describe a
 *    Molecule project's layout and would mislead in any other codebase, and a
 *    project receives only those that fit its shape ({@link PROJECT_SKILL_SCOPE}).
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

/** Where the project skills are authored, relative to an mlcl `templates/` directory. */
export const PROJECT_SKILLS_DIR = 'project-skills'

/** Which project shapes a project skill applies to. */
interface ProjectSkillScope {
  /** The project has an API (`api`), an app (`app`), or either (both listed). */
  readonly sides: ReadonlyArray<'api' | 'app'>
  /** App frameworks its examples are written for; absent when any framework fits. */
  readonly frameworks?: readonly string[]
}

/**
 * Every project skill and the projects it applies to. A skill directory without an
 * entry here is refused, so a new skill is scoped on purpose.
 */
export const PROJECT_SKILL_SCOPE: Readonly<Record<string, ProjectSkillScope>> = {
  'api-patterns': { sides: ['api'] },
  'app-patterns': { sides: ['app'], frameworks: ['react'] },
  auth: { sides: ['api'] },
  'bond-system': { sides: ['api', 'app'] },
  database: { sides: ['api'] },
  'fix-build': { sides: ['api', 'app'] },
  i18n: { sides: ['api', 'app'] },
  security: { sides: ['api', 'app'] },
  styling: { sides: ['app'], frameworks: ['react'] },
}

/**
 * The sides a project of this shape has. Status pages are their own shapes and get
 * no project skill.
 *
 * @param projectType - A `mlcl create --type` value.
 * @returns The sides, empty for a shape the project skills do not describe.
 */
function projectSides(projectType: string): Array<'api' | 'app'> {
  switch (projectType) {
    case 'full-stack':
      return ['api', 'app']
    case 'api':
      return ['api']
    case 'app':
    case 'static':
      return ['app']
    default:
      return []
  }
}

/**
 * Point a project skill's paths at a single-workspace project. The skills are written
 * for the full-stack layout (`api/src/…`, `app/src/…`); an API-only project's
 * `api/src/handlers` is `src/handlers`, and an app-only project's `app/src/pages`
 * is `src/pages`. Routes (`/api/…`) and package names (`@molecule/api-…`) are left
 * alone, the same guard molecule.dev's path baking uses.
 *
 * @param content - The skill text.
 * @param sides - The project's sides.
 * @returns The text with the one workspace's prefix removed.
 */
function forProjectLayout(content: string, sides: ReadonlyArray<'api' | 'app'>): string {
  if (sides.length !== 1) return content
  return content.replace(new RegExp(`(^|[^/\\w.-])${sides[0]}/`, 'g'), '$1')
}

/**
 * Read the project skills that fit a project.
 *
 * @param templatesDir - An mlcl `templates/` directory.
 * @param project.projectType - A `mlcl create --type` value.
 * @param project.framework - The app framework, when the project has one (`react` when unset).
 * @returns Relative skill path (`<name>/SKILL.md`) → content; empty when the tree is absent.
 * @throws {Error} When a skill directory has no {@link PROJECT_SKILL_SCOPE} entry.
 */
export function loadProjectSkills(
  templatesDir: string,
  project: { projectType: string; framework?: string | null },
): Record<string, string> {
  const root = join(templatesDir, PROJECT_SKILLS_DIR)
  if (!existsSync(root)) return {}
  const sides = projectSides(project.projectType)
  const framework = project.framework ?? 'react'
  const out: Record<string, string> = {}
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = join(root, entry.name, 'SKILL.md')
    if (!entry.isDirectory() || !existsSync(file)) continue
    const scope = PROJECT_SKILL_SCOPE[entry.name]
    if (!Object.hasOwn(PROJECT_SKILL_SCOPE, entry.name) || !scope)
      throw new Error(`project skill "${entry.name}" has no PROJECT_SKILL_SCOPE entry`)
    if (!scope.sides.some((side) => sides.includes(side))) continue
    if (scope.frameworks && sides.includes('app') && !scope.frameworks.includes(framework)) continue
    out[`${entry.name}/SKILL.md`] = forProjectLayout(readFileSync(file, 'utf-8'), sides)
  }
  return out
}

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
wiring, and any peer packages a provider needs. Read its docs with
\`npx mlcl docs @molecule/<name>\` before using its API; they document the
interface, usage examples and wiring.

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
 * Read the host-only skills (`templates/host-skills/<name>/SKILL.md`): start a
 * new app with Molecule, and extend a project with packages. `mlcl setup`
 * installs them into a user's agents; scaffolded projects do not receive them.
 *
 * @param templatesDir - An mlcl `templates/` directory.
 * @returns Relative skill path (`<name>/SKILL.md`) → content; empty when absent.
 */
export function loadHostSkills(templatesDir: string): Record<string, string> {
  const root = join(templatesDir, 'host-skills')
  if (!existsSync(root)) return {}
  const out: Record<string, string> = {}
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = join(root, entry.name, 'SKILL.md')
    if (entry.isDirectory() && existsSync(file))
      out[`${entry.name}/SKILL.md`] = readFileSync(file, 'utf-8')
  }
  return out
}

/**
 * The skills earlier versions of `mlcl setup` installed and this one never does: the shared
 * workflow skills (`capability-first`), which come with each scaffolded project now. Setup removes
 * an unedited copy of each.
 *
 * @param templatesDir - An mlcl `templates/` directory.
 * @returns Relative skill path (`<name>/SKILL.md`) → the content setup installed.
 */
export function loadRetiredSetupSkills(templatesDir: string): Record<string, string> {
  return loadSharedSkills(templatesDir)
}

/**
 * Every skill `mlcl setup` installs, for an agent it writes no instructions for: the host-only ones. The shared workflow
 * skills are left out: every Molecule project receives them in its own
 * `.agents/skills`, and outside one they point at a capability map and
 * `src/bonds/` files that do not exist, while `extend-with-packages` already
 * says to search before writing a capability. Installed machine-wide, both
 * matched every request, and Codex opened the two of them before answering.
 * The package catalog is left out too: it is scoped to one project's stack,
 * and the MCP `search_packages` tool answers the same question for any project.
 *
 * @param templatesDir - An mlcl `templates/` directory.
 * @returns Relative skill path (`<name>/SKILL.md`) → content.
 */
export function loadSetupSkills(templatesDir: string): Record<string, string> {
  return loadHostSkills(templatesDir)
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
 * `.agents/skills`: the shared skills, the project skills that fit its shape, and
 * the package catalog.
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
  const files = {
    ...loadSharedSkills(opts.templatesDir),
    ...loadProjectSkills(opts.templatesDir, opts),
  }
  files[PACKAGE_CATALOG_SKILL_FILE] = renderLocalPackageCatalog(opts)
  return files
}

/**
 * The "Skills" section of a project's AGENTS.md: one row per skill the project has on disk, with
 * the description from its frontmatter, so the table lists exactly what was delivered.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns The Markdown section, or an empty string when the project has no skills.
 */
export function renderSkillIndex(projectRoot: string): string {
  const root = join(projectRoot, AGENT_SKILLS_DIR)
  if (!existsSync(root)) return ''
  const rows: string[] = []
  for (const name of readdirSync(root).sort()) {
    if (RESERVED_SKILL_DIRS.has(name)) continue
    const file = join(root, name, 'SKILL.md')
    if (!existsSync(file)) continue
    const frontmatter = readFileSync(file, 'utf-8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
    const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? ''
    rows.push(
      `| **${name}** | ${description.replaceAll('|', '\\|')} | \`${AGENT_SKILLS_DIR}/${name}/SKILL.md\` |`,
    )
  }
  if (rows.length === 0) return ''
  return [
    '## Skills',
    '',
    'Detailed guides for this project. Read the one that matches the work before writing it.',
    '',
    '| Skill | When to read | Path |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n')
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
