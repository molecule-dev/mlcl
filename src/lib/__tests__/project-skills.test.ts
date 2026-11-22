/**
 * The project skills (how a Molecule project's own code is written) reach every scaffolded
 * project that they describe, and only those: `mlcl setup` never installs them into a harness,
 * where they would apply to codebases Molecule did not create. The Molecule harness's sandbox
 * delivers the same files (molecule-dev's agents-dir-template tests hold it to them).
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  loadProjectSkills,
  loadSetupSkills,
  PROJECT_SKILL_SCOPE,
  PROJECT_SKILLS_DIR,
  renderSkillIndex,
} from '../agent-skills.js'

const MLCL = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(MLCL, 'templates')
const names = (files: Record<string, string>): string[] =>
  Object.keys(files)
    .map((path) => path.replace('/SKILL.md', ''))
    .sort()

const temps: string[] = []
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const temp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-project-skills-'))
  temps.push(dir)
  return dir
}

describe('loadProjectSkills', () => {
  it('gives a full-stack React project all nine', () => {
    expect(
      names(loadProjectSkills(TEMPLATES, { projectType: 'full-stack', framework: 'react' })),
    ).toEqual([
      'api-patterns',
      'app-patterns',
      'auth',
      'bond-system',
      'database',
      'fix-build',
      'i18n',
      'security',
      'styling',
    ])
  })

  it('points an API-only project at src/, leaving routes and package names alone', () => {
    const files = loadProjectSkills(TEMPLATES, { projectType: 'api' })
    expect(names(files)).not.toContain('app-patterns')
    expect(names(files)).not.toContain('styling')
    const api = files['api-patterns/SKILL.md']
    expect(api).toContain('src/handlers/')
    expect(api).not.toMatch(/(^|[^/\w.-])api\/src\//)
    expect(api).toContain('/api/')
    expect(files['database/SKILL.md']).toContain('@molecule/api-database')
  })

  it('gives a non-React app no skill written in React', () => {
    const files = loadProjectSkills(TEMPLATES, { projectType: 'app', framework: 'vue' })
    expect(names(files)).toEqual(['bond-system', 'fix-build', 'i18n', 'security'])
  })

  it('gives a status page none: the skills describe the API and app layout it does not have', () => {
    expect(loadProjectSkills(TEMPLATES, { projectType: 'status-page-edge' })).toEqual({})
  })

  it('scopes every authored skill, and authors every scoped one', () => {
    const authored = readdirSync(join(TEMPLATES, PROJECT_SKILLS_DIR)).sort()
    expect(Object.keys(PROJECT_SKILL_SCOPE).sort()).toEqual(authored)
  })

  it('refuses a skill directory with no scope entry', () => {
    const root = temp()
    mkdirSync(join(root, PROJECT_SKILLS_DIR, 'unscoped'), { recursive: true })
    writeFileSync(
      join(root, PROJECT_SKILLS_DIR, 'unscoped', 'SKILL.md'),
      '---\nname: unscoped\n---\n',
    )
    expect(() => loadProjectSkills(root, { projectType: 'full-stack' })).toThrow(
      'project skill "unscoped" has no PROJECT_SKILL_SCOPE entry',
    )
  })

  it('is never installed into a harness by mlcl setup', () => {
    const setup = names(loadSetupSkills(TEMPLATES))
    for (const name of Object.keys(PROJECT_SKILL_SCOPE)) expect(setup).not.toContain(name)
  })
})

describe('the commands the project guidance names', () => {
  it('are real mlcl commands', () => {
    const texts = [
      readFileSync(join(TEMPLATES, 'shared', 'AGENTS.md.tpl'), 'utf8'),
      ...readdirSync(join(TEMPLATES, PROJECT_SKILLS_DIR)).map((name) =>
        readFileSync(join(TEMPLATES, PROJECT_SKILLS_DIR, name, 'SKILL.md'), 'utf8'),
      ),
    ]
    const commands = new Set(
      texts.flatMap((text) => [...text.matchAll(/npx mlcl ([a-z][\w-]*)/g)].map((m) => m[1])),
    )
    expect(commands.size).toBeGreaterThan(0)
    for (const command of commands) {
      const file = join(MLCL, 'src', 'commands', `${command}.ts`)
      const topic = join(MLCL, 'src', 'commands', command, 'index.ts')
      expect(existsSync(file) || existsSync(topic), `npx mlcl ${command}`).toBe(true)
    }
  })
})

describe('renderSkillIndex', () => {
  it('lists the skills on disk with their descriptions, and no corpus', () => {
    const root = temp()
    const skill = (name: string, description: string): void => {
      mkdirSync(join(root, '.agents', 'skills', name), { recursive: true })
      writeFileSync(
        join(root, '.agents', 'skills', name, 'SKILL.md'),
        `---\nname: ${name}\ndescription: ${description}\n---\n\nBody\n`,
      )
    }
    skill('database', 'Queries | migrations')
    skill('examples', 'a corpus')
    const index = renderSkillIndex(root)
    expect(index).toMatch(/^## Skills\n/)
    expect(index).toContain(
      '| **database** | Queries \\| migrations | `.agents/skills/database/SKILL.md` |',
    )
    expect(index).not.toContain('examples')
  })

  it('is empty for a project with no skills', () => {
    expect(renderSkillIndex(temp())).toBe('')
  })
})
