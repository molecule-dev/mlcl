import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import {
  formatGeneratedFiles,
  formatGeneratedSource,
  unformattedGeneratedFiles,
} from '../format.js'

const tempDirs: string[] = []

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `format-test-${prefix}-`))
  tempDirs.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe('formatGeneratedSource', () => {
  it('uses the destination config and its relative plugins before the file exists', async () => {
    const dir = await createTempDir('generated-source')
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(join(dir, 'plugin.mjs'), 'export default {}\n')
    await writeFile(
      join(dir, '.prettierrc'),
      JSON.stringify({ printWidth: 40, semi: true, singleQuote: false, plugins: ['./plugin.mjs'] }),
    )
    const source = "export const values = ['firstValue', 'secondValue', 'thirdValue']"
    const result = await formatGeneratedSource(source, join(dir, 'src', 'generated.ts'))
    expect(result).toBe(
      'export const values = [\n  "firstValue",\n  "secondValue",\n  "thirdValue",\n];\n',
    )
  })

  it('refuses an invalid generated program', async () => {
    const dir = await createTempDir('generated-invalid')
    await expect(formatGeneratedSource('export const =', join(dir, 'bad.ts'))).rejects.toThrow()
  })

  it('sees a formatter config created after an earlier emission', async () => {
    const dir = await createTempDir('generated-late-config')
    const path = join(dir, 'generated.ts')
    await formatGeneratedSource('const value = 1', path)
    await writeFile(join(dir, '.prettierrc'), '{"semi":true,"singleQuote":false}\n')
    expect(await formatGeneratedSource("const value = 'new'", path)).toBe('const value = "new";\n')
  })
})

describe('formatGeneratedFiles', () => {
  it('formats TypeScript files with Prettier config', async () => {
    const dir = await createTempDir('ts')
    await mkdir(join(dir, 'src'), { recursive: true })
    // Double quotes + semicolons → should be rewritten to single quotes, no semis
    await writeFile(join(dir, 'src', 'index.ts'), 'const x = "hello";\n')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(1)
    const result = await readFile(join(dir, 'src', 'index.ts'), 'utf-8')
    expect(result).toBe("const x = 'hello'\n")
  })

  it('formats JSON files', async () => {
    const dir = await createTempDir('json')
    // Tabs instead of 2-space indent
    await writeFile(
      join(dir, 'tsconfig.json'),
      '{\n\t"compilerOptions": {\n\t\t"strict": true\n\t}\n}',
    )

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(1)
    const result = await readFile(join(dir, 'tsconfig.json'), 'utf-8')
    expect(result).toContain('  "compilerOptions"')
    expect(result).not.toContain('\t')
  })

  it('formats CSS files', async () => {
    const dir = await createTempDir('css')
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(join(dir, 'src', 'index.css'), 'body{color:red}\n')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(1)
    const result = await readFile(join(dir, 'src', 'index.css'), 'utf-8')
    expect(result).toContain('body {')
  })

  it('formats HTML files', async () => {
    const dir = await createTempDir('html')
    await writeFile(join(dir, 'index.html'), '<html><body><p>hello</p></body></html>\n')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(1)
    const result = await readFile(join(dir, 'index.html'), 'utf-8')
    expect(result).toContain('<html>')
    expect(result).toContain('\n')
  })

  it('skips already-formatted files', async () => {
    const dir = await createTempDir('noop')
    await mkdir(join(dir, 'src'), { recursive: true })
    const content = "const x = 'hello'\n"
    await writeFile(join(dir, 'src', 'index.ts'), content)

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(0)
    const result = await readFile(join(dir, 'src', 'index.ts'), 'utf-8')
    expect(result).toBe(content)
  })

  it('skips node_modules directory', async () => {
    const dir = await createTempDir('nodemod')
    await mkdir(join(dir, 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(dir, 'node_modules', 'pkg', 'index.ts'), 'const x = "hello";\n')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(0)
  })

  it('skips dist directory', async () => {
    const dir = await createTempDir('dist')
    await mkdir(join(dir, 'dist'), { recursive: true })
    await writeFile(join(dir, 'dist', 'index.js'), 'const x = "hello";\n')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(0)
  })

  it('skips icons and fonts directories', async () => {
    const dir = await createTempDir('assets')
    await mkdir(join(dir, 'icons'), { recursive: true })
    await mkdir(join(dir, 'fonts'), { recursive: true })
    await writeFile(join(dir, 'icons', 'icon.html'), '<svg></svg>\n')
    await writeFile(join(dir, 'fonts', 'config.json'), '{"bad":true}\n')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(0)
  })

  it('skips non-formattable file types', async () => {
    const dir = await createTempDir('skip')
    await writeFile(join(dir, '.env'), 'SECRET=value\n')
    await writeFile(join(dir, 'setup.sql'), 'SELECT 1;\n')
    await writeFile(join(dir, 'logo.svg'), '<svg></svg>\n')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(0)
  })

  it('handles multiple file types in nested directories', async () => {
    const dir = await createTempDir('multi')
    await mkdir(join(dir, 'src', 'components'), { recursive: true })
    await writeFile(join(dir, 'src', 'index.ts'), 'const x = "hello";\n')
    await writeFile(
      join(dir, 'src', 'components', 'App.tsx'),
      'const App = () => <div>"hi"</div>;\n',
    )
    await writeFile(join(dir, 'package.json'), '{"name":"test","version":"1.0.0"}')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBeGreaterThanOrEqual(2)
  })

  it('skips malformed files without crashing', async () => {
    const dir = await createTempDir('malformed')
    await writeFile(join(dir, 'bad.json'), '{not valid json!!!}')
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(join(dir, 'src', 'good.ts'), 'const x = "hello";\n')

    const count = await formatGeneratedFiles(dir)

    // The good file should still be formatted even though bad.json fails
    expect(count).toBe(1)
    const result = await readFile(join(dir, 'src', 'good.ts'), 'utf-8')
    expect(result).toBe("const x = 'hello'\n")
  })

  it('returns 0 for empty directory', async () => {
    const dir = await createTempDir('empty')

    const count = await formatGeneratedFiles(dir)

    expect(count).toBe(0)
  })
})

describe('formatGeneratedFiles formats like prettier --write run from each package', () => {
  it.each(['default', 'import-only'] as const)(
    'resolves a %s plugin from the file package instead of mlcl',
    async (exportsKind) => {
      const dir = await createTempDir('package-plugin')
      const app = join(dir, 'app')
      const plugin = join(app, 'node_modules', 'prettier-plugin-project-fixture')
      await mkdir(plugin, { recursive: true })
      await writeFile(join(dir, 'package.json'), '{\n  "name": "root"\n}\n')
      await writeFile(join(app, 'package.json'), '{\n  "name": "app"\n}\n')
      await writeFile(
        join(plugin, 'package.json'),
        JSON.stringify({
          name: 'prettier-plugin-project-fixture',
          type: 'module',
          exports: exportsKind === 'import-only' ? { import: './index.js' } : './index.js',
        }),
      )
      await writeFile(join(plugin, 'index.js'), 'export default {}\n')
      await writeFile(
        join(app, '.prettierrc'),
        JSON.stringify({
          semi: false,
          singleQuote: true,
          plugins: ['prettier-plugin-project-fixture'],
        }),
      )
      await writeFile(join(app, 'index.ts'), 'const x = "hello";\n')

      expect(await formatGeneratedFiles(dir)).toBe(1)
      expect(await readFile(join(app, 'index.ts'), 'utf8')).toBe("const x = 'hello'\n")
      expect(await unformattedGeneratedFiles(dir)).toEqual([])
    },
  )

  it('keeps relative plugin paths anchored to the config file', async () => {
    const dir = await createTempDir('relative-plugin')
    await writeFile(join(dir, 'package.json'), '{\n  "name": "p"\n}\n')
    await writeFile(join(dir, 'plugin.mjs'), 'export default {}\n')
    await writeFile(
      join(dir, '.prettierrc'),
      JSON.stringify({
        semi: false,
        singleQuote: true,
        plugins: ['./plugin.mjs'],
      }),
    )
    await writeFile(join(dir, 'index.ts'), 'const x = "hello";\n')
    await formatGeneratedFiles(dir)
    expect(await readFile(join(dir, 'index.ts'), 'utf8')).toBe("const x = 'hello'\n")
  })

  it('refuses a clean check when a source file cannot be parsed', async () => {
    const dir = await createTempDir('uncheckable')
    await writeFile(join(dir, 'bad.json'), '{not valid json!!!}')
    await expect(unformattedGeneratedFiles(dir)).rejects.toThrow('bad.json')
    // The write API remains best-effort, as it was before the check API was added.
    expect(await formatGeneratedFiles(dir)).toBe(0)
  })

  it('does not load formatter configuration for an ignored file', async () => {
    const dir = await createTempDir('ignored-invalid-config')
    await writeFile(join(dir, 'package.json'), '{\n  "name": "p"\n}\n')
    await writeFile(join(dir, '.prettierignore'), '*\n')
    await writeFile(join(dir, '.prettierrc'), '{not valid JSON')
    await writeFile(join(dir, 'index.ts'), 'const x = "hello";\n')

    expect(await unformattedGeneratedFiles(dir)).toEqual([])
    expect(await formatGeneratedFiles(dir)).toBe(0)
    expect(await readFile(join(dir, 'index.ts'), 'utf8')).toBe('const x = "hello";\n')
  })

  it('uses the config that applies at the file, not its own', async () => {
    const dir = await createTempDir('own-config')
    await writeFile(join(dir, 'package.json'), '{\n  "name": "p"\n}\n')
    await writeFile(join(dir, '.prettierrc'), '{ "semi": true }\n')
    await writeFile(join(dir, 'index.ts'), "const x = 'hello'\n")

    expect(await formatGeneratedFiles(dir)).toBe(1)
    // Prettier's defaults plus the project's semi: double quotes and a semicolon.
    expect(await readFile(join(dir, 'index.ts'), 'utf-8')).toBe('const x = "hello";\n')
  })

  it("leaves files the package's .prettierignore or .gitignore excludes", async () => {
    const dir = await createTempDir('ignored')
    await mkdir(join(dir, 'app', 'public', 'vendor'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{\n  "name": "root"\n}\n')
    await writeFile(join(dir, 'app', 'package.json'), '{\n  "name": "app"\n}\n')
    await writeFile(join(dir, 'app', '.prettierignore'), '*.md\n')
    await writeFile(join(dir, 'app', '.gitignore'), 'public/vendor/\n')
    const notes = '# Notes\n\n\n\ntext\n'
    const vendor = 'const a=1\n'
    await writeFile(join(dir, 'app', 'NOTES.md'), notes)
    await writeFile(join(dir, 'app', 'public', 'vendor', 'lib.js'), vendor)
    // The root package has no ignore file, so its markdown IS formatted.
    await writeFile(join(dir, 'README.md'), notes)

    expect(await unformattedGeneratedFiles(dir)).toEqual(['README.md'])
    expect(await formatGeneratedFiles(dir)).toBe(1)
    expect(await readFile(join(dir, 'app', 'NOTES.md'), 'utf-8')).toBe(notes)
    expect(await readFile(join(dir, 'app', 'public', 'vendor', 'lib.js'), 'utf-8')).toBe(vendor)
    expect(await readFile(join(dir, 'README.md'), 'utf-8')).toBe('# Notes\n\ntext\n')
  })

  it('formats every extension a later prettier --write formats (markdown, YAML, JSX, CommonJS)', async () => {
    const dir = await createTempDir('extensions')
    await writeFile(join(dir, 'GUIDE.md'), '# Guide\n\n\n\nbody\n')
    await writeFile(join(dir, 'ci.yml'), 'jobs:\n    build:\n        runs-on: x\n')
    await writeFile(join(dir, 'view.jsx'), 'export const V = () => <div   />\n')
    await writeFile(join(dir, 'cfg.cjs'), 'module.exports = {a:1}\n')

    expect(await unformattedGeneratedFiles(dir)).toEqual([
      'GUIDE.md',
      'cfg.cjs',
      'ci.yml',
      'view.jsx',
    ])
  })

  it('lists what it would change without writing anything', async () => {
    const dir = await createTempDir('check-only')
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(join(dir, 'src', 'a.ts'), 'const x = "hello";\n')
    await writeFile(join(dir, 'src', 'b.ts'), "const y = 'clean'\n")

    expect(await unformattedGeneratedFiles(dir)).toEqual(['src/a.ts'])
    expect(await readFile(join(dir, 'src', 'a.ts'), 'utf-8')).toBe('const x = "hello";\n')
  })
})
