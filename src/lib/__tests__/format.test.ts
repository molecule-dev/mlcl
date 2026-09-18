import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { formatGeneratedFiles } from '../format.js'

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
