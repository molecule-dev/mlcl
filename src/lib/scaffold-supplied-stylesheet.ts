import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const suppliedImport = "@import './supplied-styles/entry.css';"
const instructions = `/* Put supplied CSS in ./supplied-styles/entry.css, beside its relative assets. */
${suppliedImport}
`

/**
 * Wire the supplied stylesheet after the entry's import and layer prelude.
 * A supplied stylesheet can declare its own layers after the app's resets.
 * The empty file emits no CSS, and a previous copy keeps its content.
 *
 * @param src - Directory containing the global CSS entry.
 * @param css - CSS for that entry.
 * @returns The entry with its supplied stylesheet import.
 */
export async function withSuppliedStylesheet(src: string, css: string): Promise<string> {
  const slot = join(src, 'supplied-styles', 'entry.css')
  await mkdir(dirname(slot), { recursive: true })
  try {
    await writeFile(slot, '', { flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }

  const prelude =
    /(?:\s|\/\*[\s\S]*?\*\/|@(?:charset|import|layer)\b(?:[^;{}"'(]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\([^)]*\))*;)*/iy
  const header = prelude.exec(css)?.[0] ?? ''
  if (
    /^\s*@import\s+(['"])\.\/supplied-styles\/entry\.css\1\s*;/m.test(
      header.replace(/\/\*[\s\S]*?\*\//g, ' '),
    )
  )
    return css
  const prefix = header && !header.endsWith('\n') ? header + '\n' : header
  return prefix + instructions + css.slice(header.length)
}
