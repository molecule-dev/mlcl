import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { writeFrameworkRecipes } from '../framework-recipes.js'
import { getRawRegistry } from '../registry.js'
import { ensureAgentsMd } from '../scaffold.js'

const registry = getRawRegistry()
const templates = join(import.meta.dirname, '../../../templates')
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function project(dependencies: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'framework-recipes-'))
  roots.push(root)
  await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies }))
  return root
}
const deps = { '@molecule/app-react': '4.1.0', '@molecule/app-query-react': '1.6.0' }
const declared = Object.keys(deps).map((name) => ({ name, workspace: '' }))

describe('framework compositions at the scaffold boundary', () => {
  it('delivers executable controls and names their actual path in the capability map', async () => {
    const root = await project(deps)
    await ensureAgentsMd(root)
    expect(await readFile(join(root, 'src/recipes/ResourceControls.tsx'), 'utf8')).toContain(
      'export function ResourceCreateForm',
    )
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toContain(
      'src/recipes/ResourceControls.tsx',
    )
  })
  it('preserves a user-edited recipe on repeated scaffold preparation', async () => {
    const root = await project(deps)
    await writeFrameworkRecipes(root, templates, registry, declared)
    await writeFile(join(root, 'src/recipes/ResourceControls.tsx'), 'export const Local = 1\n')
    await writeFrameworkRecipes(root, templates, registry, declared)
    expect(await readFile(join(root, 'src/recipes/ResourceControls.tsx'), 'utf8')).toBe(
      'export const Local = 1\n',
    )
  })
  it('refuses a recipe directory that points outside the project', async () => {
    const root = await project(deps)
    const outside = await project({})
    await mkdir(join(root, 'src'))
    await symlink(outside, join(root, 'src/recipes'))
    await expect(writeFrameworkRecipes(root, templates, registry, declared)).rejects.toThrow(
      'outside the project',
    )
    await expect(readFile(join(outside, 'ResourceControls.tsx'))).rejects.toThrow('ENOENT')
  })
  it.each([
    { '@molecule/app-react': '4.1.0' },
    { ...deps, '@molecule/app-query-react': '1.4.0' },
    { '@molecule/app-vue': '1.0.0', '@molecule/app-query-react': '1.6.0' },
  ])('does not add unsupported or undeclared imports: %j', async (dependencies) => {
    const root = await project(dependencies)
    const declarations = Object.keys(dependencies).map((name) => ({ name, workspace: '' }))
    expect(await writeFrameworkRecipes(root, templates, registry, declarations)).toEqual([])
  })
})
