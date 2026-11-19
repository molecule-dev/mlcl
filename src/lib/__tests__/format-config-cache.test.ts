/**
 * A format pass reads the project's prettier configuration as it is on disk when the pass
 * runs. Prettier keeps the result of every configuration lookup, even one made with
 * `useCache: false`, so a generator that formats a file before it writes `.prettierrc` left
 * the later pass formatting the whole project with prettier's defaults. The project's config
 * here differs from mlcl's own fallback, which would otherwise hide a missed config.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { formatGeneratedSource, unformattedGeneratedFiles } from '../format.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('unformattedGeneratedFiles', () => {
  it('reads a .prettierrc written after an earlier lookup in its directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mlcl-format-config-cache-'))
    dirs.push(dir)
    // The generator formats one file before it writes the project's formatter config.
    expect(await formatGeneratedSource("const a = 'x'\n", join(dir, 'early.ts'))).toBe(
      "const a = 'x'\n",
    )
    await writeFile(join(dir, '.prettierrc'), JSON.stringify({ singleQuote: false, semi: true }))
    await writeFile(join(dir, 'late.ts'), 'const b = "y";\n')
    expect(await unformattedGeneratedFiles(dir)).toEqual([])
  })

  it('counterexample: still reports a file its configuration would change', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mlcl-format-config-cache-'))
    dirs.push(dir)
    await writeFile(join(dir, '.prettierrc'), JSON.stringify({ singleQuote: false, semi: true }))
    await writeFile(join(dir, 'late.ts'), "const b = 'y'\n")
    expect(await unformattedGeneratedFiles(dir)).toEqual(['late.ts'])
  })
})
