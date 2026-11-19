import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const tailwindImport = /^@import\s+(['"])tailwindcss\1;/m
const suppliedImport = "@import './supplied-styles/entry.css';"
const instructions = `/* Put supplied CSS in ./supplied-styles/entry.css, or start that file with its @import.
 * Keep this import unlayered so normal rules override Tailwind Preflight. */
${suppliedImport}
`

/**
 * Wire a copy destination into the initial CSS imports for a Tailwind app. An
 * empty file emits no CSS, and a previous copy keeps its content.
 */
export async function withSuppliedStylesheet(src: string, css: string): Promise<string> {
  if (!tailwindImport.test(css)) return css

  const slot = join(src, 'supplied-styles', 'entry.css')
  await mkdir(dirname(slot), { recursive: true })
  try {
    await writeFile(slot, '', { flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }

  if (css.includes(suppliedImport)) return css
  return css.replace(tailwindImport, (line) => instructions + line)
}
