import { execFileSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveDefaultProviders } from '../features.js'
import { getMoleculeVersion, loadAppFrameworks, loadRegistry } from '../registry.js'
import { getTemplateRequiredPackages } from '../scaffold.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')

describe('React query defaults use the existing registry provider contract', () => {
  it('includes the React query binding and resolves its memory provider', () => {
    const packages = loadRegistry()
    const framework = packages.find((p) => p.name === '@molecule/app-react')!
    const required = getTemplateRequiredPackages('react', framework, loadAppFrameworks().react)
    expect(required).toContain('@molecule/app-query-react')
    expect(resolveDefaultProviders(['@molecule/app-react', ...required], packages)).toContain(
      '@molecule/app-query-memory',
    )
  })

  it('preserves an explicitly selected TanStack query provider', () => {
    const packages = loadRegistry()
    const framework = packages.find((p) => p.name === '@molecule/app-react')!
    const required = getTemplateRequiredPackages('react', framework, loadAppFrameworks().react)
    const defaults = resolveDefaultProviders(
      ['@molecule/app-react', ...required, '@molecule/app-query-tanstack'],
      packages,
    )
    expect(defaults).not.toContain('@molecule/app-query-memory')
  })

  it.each(['memory', 'tanstack'])(
    'the actual CLI generates one usable %s query bond',
    async (name) => {
      const scratch = await mkdtemp(join(tmpdir(), 'mlcl-query-defaults-'))
      const project = join(scratch, 'project')
      try {
        execFileSync(
          process.execPath,
          [
            join(ROOT, 'bin', 'run.js'),
            'create',
            project,
            '--type',
            'full-stack',
            '--framework',
            'react',
            '--no-interactive',
            '--skip-install',
            ...(name === 'tanstack' ? ['--packages', '@molecule/app-query-tanstack'] : []),
          ],
          { cwd: ROOT, encoding: 'utf8', timeout: 30_000, stdio: 'pipe' },
        )
        const pkg = JSON.parse(await readFile(join(project, 'app', 'package.json'), 'utf8')) as {
          dependencies: Record<string, string>
        }
        for (const selected of [
          '@molecule/app-query',
          '@molecule/app-query-react',
          `@molecule/app-query-${name}`,
        ]) {
          expect(pkg.dependencies[selected]).toBe(getMoleculeVersion(selected))
        }
        const other = name === 'memory' ? 'tanstack' : 'memory'
        expect(pkg.dependencies[`@molecule/app-query-${other}`]).toBeUndefined()
        const bonds = await readdir(join(project, 'app', 'src', 'bonds'))
        expect(bonds.filter((file) => file.startsWith('app-query-'))).toEqual([
          `app-query-${name}.ts`,
        ])
        const bond = await readFile(
          join(project, 'app', 'src', 'bonds', `app-query-${name}.ts`),
          'utf8',
        )
        expect(bond).toContain("from '@molecule/app-query'")
        expect(bond).toContain(`from '@molecule/app-query-${name}'`)
        expect(bond).toContain('setProvider(provider)')
        const setup = await readFile(join(project, 'app', 'src', 'bonds', 'index.ts'), 'utf8')
        expect(setup).toContain(`setupAppQuery${name === 'memory' ? 'Memory' : 'Tanstack'}()`)
        expect(await readFile(join(project, 'app', 'src', 'main.tsx'), 'utf8')).toContain(
          'setupProviders()',
        )
      } finally {
        await rm(scratch, { recursive: true, force: true })
      }
    },
  )
})
