import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { appEntryModule, loadAppFrameworks } from '../registry.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const templateOf = (framework: string, entry: string): string =>
  join(ROOT, 'templates', 'app', framework, `${entry.slice('src/'.length)}.tpl`)

describe('the module index.html loads comes from the registry', () => {
  it('names a template module for every framework with an index.html and app templates', () => {
    const frameworks = Object.entries(loadAppFrameworks()).filter(
      ([name, config]) =>
        (config.htmlTemplate ?? 'index.html') === 'index.html' &&
        existsSync(join(ROOT, 'templates', 'app', name)),
    )
    expect(frameworks.map(([name]) => name).sort()).toEqual(
      ['angular', 'react', 'react-native-web', 'solid', 'vue'].sort(),
    )
    const missing = frameworks
      .map(([name, config]) => ({ name, entry: appEntryModule(config) }))
      .filter(({ name, entry }) => !existsSync(templateOf(name, entry)))
    expect(missing).toEqual([])
  })

  it('React loads src/bootstrap.tsx, which starts the app through main', async () => {
    const react = loadAppFrameworks().react
    expect(react).toBeDefined()
    expect(appEntryModule(react!)).toBe('src/bootstrap.tsx')
    const bootstrap = await readFile(templateOf('react', 'src/bootstrap.tsx'), 'utf8')
    expect(bootstrap).toMatch(/import \{[^}]*\binitializeApp\b[^}]*\} from '\.\/main\.js'/)
  })

  it('counterexample: a framework that declares no entryModule loads src/main with its extension', () => {
    expect(appEntryModule({})).toBe('src/main.tsx')
    expect(appEntryModule({ fileExtension: 'ts' })).toBe('src/main.ts')
    expect(appEntryModule(loadAppFrameworks().vue!)).toBe('src/main.ts')
  })
})
