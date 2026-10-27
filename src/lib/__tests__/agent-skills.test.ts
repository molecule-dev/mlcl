/**
 * The agent guidance a scaffolded project receives has ONE owner: the shared
 * skills authored in `templates/.agents/skills/` and the framework-scoped
 * `molecule-packages` catalog rendered from `registry.json`.
 *
 * These cases cover the owner itself — what it lists, what it excludes, how it
 * scopes the catalog, and the non-destructive write — plus the counterexamples
 * that must stay harmless: a missing templates tree, an existing user-owned
 * skill, and a `.claude` the user already has. The scaffold paths that consume
 * it are exercised end to end in `commands/__tests__/create-agent-skills.test.ts`.
 *
 * @module
 */

import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  AGENT_SKILLS_DIR,
  buildLocalAgentSkillFiles,
  catalogStackForProjectType,
  ensureClaudeSkillsLink,
  loadSharedSkills,
  PACKAGE_CATALOG_SKILL_FILE,
  renderLocalPackageCatalog,
  writeAgentSkillFiles,
} from '../agent-skills.js'
import { getRawRegistry } from '../registry.js'
import { ensureAgentSkills, ensureAgentsMd } from '../scaffold.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES_DIR = join(MLCL_ROOT, 'templates')
const CANONICAL_SKILL = join(TEMPLATES_DIR, '.agents', 'skills', 'capability-first', 'SKILL.md')

const roots: string[] = []

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-agent-skills-'))
  roots.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of roots.splice(0)) await rm(dir, { recursive: true, force: true })
})

describe('loadSharedSkills — the canonical skill tree, path-neutral', () => {
  it('keys the canonical workflow by its relative sandbox path', () => {
    const skills = loadSharedSkills(TEMPLATES_DIR)
    const body = skills['capability-first/SKILL.md']
    expect(body, 'the canonical capability-first skill must be listed').toBeTruthy()
    // Byte-for-byte with the authored file: a keyword-only or truncated
    // delivery would pass a bare truthiness check.
    expect(body).toBe(readFileSync(CANONICAL_SKILL, 'utf8'))
    for (const step of ['## 1. Inspect', '## 2. Reuse', '## 3. Adapt', '## 4. Create']) {
      expect(body, `the order names ${step}`).toContain(step)
    }
  })

  it('never lists the reserved corpora as skills', () => {
    const skills = loadSharedSkills(TEMPLATES_DIR)
    const keys = Object.keys(skills)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(key, `${key} is a corpus, not a skill`).not.toMatch(/^(patterns|examples)\//)
      expect(key.endsWith('/SKILL.md'), `${key} must be a skill file`).toBe(true)
    }
  })

  it('returns an empty map when the templates tree is absent (standalone checkout)', () => {
    expect(loadSharedSkills('/nonexistent-templates-for-agent-skills')).toEqual({})
  })
})

describe('catalogStackForProjectType', () => {
  it('maps every create --type to the packages that project can use', () => {
    // status-page-edge scaffolds no app workspace; status-page does.
    expect(catalogStackForProjectType('api')).toBe('api')
    expect(catalogStackForProjectType('status-page-edge')).toBe('api')
    expect(catalogStackForProjectType('app')).toBe('app')
    expect(catalogStackForProjectType('static')).toBe('app')
    expect(catalogStackForProjectType('full-stack')).toBe('full-stack')
    expect(catalogStackForProjectType('status-page')).toBe('full-stack')
  })

  it('gives an unknown shape the superset rather than a silently narrowed list', () => {
    expect(catalogStackForProjectType('something-new')).toBe('full-stack')
  })
})

describe('renderLocalPackageCatalog — framework-scoped, locally actionable', () => {
  const registry = getRawRegistry()

  it('scopes a Vue full-stack project to Vue packages and both stacks', () => {
    const catalog = renderLocalPackageCatalog({
      registry,
      projectType: 'full-stack',
      framework: 'vue',
    })
    expect(catalog).toMatch(/^# @molecule\/\* packages — vue\/full-stack$/m)
    // Backend packages are part of a full-stack project…
    expect(catalog).toContain('`@molecule/api-database`')
    // …its own framework is listed…
    expect(catalog).toContain('`@molecule/app-vue`')
    // …and another framework's binding is not.
    expect(catalog).not.toContain('@molecule/app-oauth-logos-react')
  })

  it('scopes a React project to React, the counterpart of the Vue case', () => {
    const catalog = renderLocalPackageCatalog({
      registry,
      projectType: 'full-stack',
      framework: 'react',
    })
    expect(catalog).toContain('`@molecule/app-oauth-logos-react`')
    expect(catalog).not.toContain('`@molecule/app-vue`')
  })

  it('lists no frontend packages for an api-only project', () => {
    const catalog = renderLocalPackageCatalog({ registry, projectType: 'api' })
    expect(catalog).toContain('`@molecule/api-database`')
    expect(catalog).not.toContain('`@molecule/app-')
  })

  it('teaches the LOCAL add path and README location, never the sandbox ones', () => {
    const catalog = renderLocalPackageCatalog({ registry, projectType: 'app', framework: 'react' })
    expect(catalog).toContain('npx mlcl add @molecule/<name> --inject')
    expect(catalog).toContain('node_modules/@molecule/<name>/README.md')
    // The sandbox's pre-installed-superset wording/paths do not apply here: a
    // scaffolded checkout has neither `/workspace` nor a fleet pre-installed.
    expect(catalog).not.toContain('/workspace')
    expect(catalog).not.toMatch(/already installed at the workspace root/)
  })

  it('carries frontmatter a harness can index', () => {
    const catalog = renderLocalPackageCatalog({
      registry,
      projectType: 'full-stack',
      framework: 'vue',
    })
    expect(catalog).toMatch(/^---\nname: molecule-packages\n/m)
    const description = catalog.match(/^description: (.+)$/m)?.[1]?.trim() ?? ''
    expect(description.length).toBeGreaterThan(40)
    expect(description.length).toBeLessThan(1024)
  })
})

describe('buildLocalAgentSkillFiles', () => {
  it('delivers the skills and the catalog together, keyed relative to .agents/skills', () => {
    const files = buildLocalAgentSkillFiles({
      templatesDir: TEMPLATES_DIR,
      registry: getRawRegistry(),
      projectType: 'full-stack',
      framework: 'vue',
    })
    expect(Object.keys(files)).toContain('capability-first/SKILL.md')
    expect(Object.keys(files)).toContain(PACKAGE_CATALOG_SKILL_FILE)
    for (const key of Object.keys(files)) {
      expect(key.startsWith('/'), `${key} must stay relative for path adaptation`).toBe(false)
    }
  })

  it('still delivers the catalog when the templates tree is missing (counterexample)', () => {
    const files = buildLocalAgentSkillFiles({
      templatesDir: '/nonexistent-templates-for-agent-skills',
      registry: getRawRegistry(),
      projectType: 'api',
    })
    expect(files['capability-first/SKILL.md']).toBeUndefined()
    expect(files[PACKAGE_CATALOG_SKILL_FILE]).toContain('name: molecule-packages')
  })
})

describe('the gap this owner closes — AGENTS.md alone is prose, not skills', () => {
  it('the pre-fix agent step delivered no skill tree; the owner adds it', async () => {
    const projectRoot = tempProject()
    // Faithful control: exactly what a local scaffold did before this owner
    // existed — write AGENTS.md and nothing under `.agents/`. Every assertion
    // in this file fails against that state, which is what makes them a
    // regression guard rather than a description of the new code.
    await ensureAgentsMd(projectRoot)
    expect(existsSync(join(projectRoot, 'AGENTS.md'))).toBe(true)
    expect(existsSync(join(projectRoot, '.agents'))).toBe(false)

    await ensureAgentSkills(projectRoot, { projectType: 'full-stack', framework: 'vue' })

    expect(
      readFileSync(join(projectRoot, AGENT_SKILLS_DIR, 'capability-first', 'SKILL.md'), 'utf8'),
    ).toBe(readFileSync(CANONICAL_SKILL, 'utf8'))
    expect(
      readFileSync(join(projectRoot, AGENT_SKILLS_DIR, 'molecule-packages', 'SKILL.md'), 'utf8'),
    ).toContain('vue/full-stack')
  })
})

describe('writeAgentSkillFiles — non-destructive by construction', () => {
  it('writes under .agents/skills and never overwrites a user-owned file', async () => {
    const projectRoot = tempProject()
    const userPath = join(projectRoot, AGENT_SKILLS_DIR, 'capability-first', 'SKILL.md')
    await mkdir(join(projectRoot, AGENT_SKILLS_DIR, 'capability-first'), { recursive: true })
    writeFileSync(userPath, 'my own edited skill\n')

    const result = await writeAgentSkillFiles(projectRoot, {
      'capability-first/SKILL.md': 'generated body\n',
      'molecule-packages/SKILL.md': 'generated catalog\n',
    })

    expect(readFileSync(userPath, 'utf8')).toBe('my own edited skill\n')
    expect(result.skipped).toEqual([join(AGENT_SKILLS_DIR, 'capability-first/SKILL.md')])
    expect(result.written).toEqual([join(AGENT_SKILLS_DIR, 'molecule-packages/SKILL.md')])
    expect(
      readFileSync(join(projectRoot, AGENT_SKILLS_DIR, 'molecule-packages', 'SKILL.md'), 'utf8'),
    ).toBe('generated catalog\n')
  })

  it('is idempotent: a second write creates nothing', async () => {
    const projectRoot = tempProject()
    const files = { 'capability-first/SKILL.md': 'body\n' }
    await writeAgentSkillFiles(projectRoot, files)
    const again = await writeAgentSkillFiles(projectRoot, files)
    expect(again.written).toEqual([])
    expect(again.skipped).toEqual([join(AGENT_SKILLS_DIR, 'capability-first/SKILL.md')])
  })

  it('skips instead of failing when `.agents` is a regular file', async () => {
    // Guidance never blocks a build: a broken `.agents` (a file, not a
    // directory) would make the write throw ENOTDIR and fail the scaffold.
    const projectRoot = tempProject()
    writeFileSync(join(projectRoot, '.agents'), 'not a directory\n')

    const result = await writeAgentSkillFiles(projectRoot, {
      'capability-first/SKILL.md': 'body\n',
    })

    expect(result.written).toEqual([])
    expect(result.skipped).toEqual([join(AGENT_SKILLS_DIR, 'capability-first/SKILL.md')])
    expect(readFileSync(join(projectRoot, '.agents'), 'utf8')).toBe('not a directory\n')
    // …and nothing links `.claude` at a regular file.
    expect(await ensureClaudeSkillsLink(projectRoot)).toBe('unavailable')
  })
})

describe('ensureClaudeSkillsLink', () => {
  it('links .claude at .agents so harness skills discovery sees the delivered files', async () => {
    const projectRoot = tempProject()
    // The real order: write the tree, then link it.
    await writeAgentSkillFiles(projectRoot, { 'capability-first/SKILL.md': 'through the link\n' })
    expect(await ensureClaudeSkillsLink(projectRoot)).toBe('linked')
    expect(lstatSync(join(projectRoot, '.claude')).isSymbolicLink()).toBe(true)
    expect(readlinkSync(join(projectRoot, '.claude'))).toBe('.agents')

    expect(
      await readFile(
        join(projectRoot, '.claude', 'skills', 'capability-first', 'SKILL.md'),
        'utf8',
      ),
    ).toBe('through the link\n')
  })

  it('never touches a .claude the user already has', async () => {
    const projectRoot = tempProject()
    await mkdir(join(projectRoot, '.claude', 'skills'), { recursive: true })
    expect(await ensureClaudeSkillsLink(projectRoot)).toBe('present')
    expect(lstatSync(join(projectRoot, '.claude')).isSymbolicLink()).toBe(false)
    expect(existsSync(join(projectRoot, '.claude', 'skills'))).toBe(true)
  })
})
