/**
 * Source text as the tests that read an app's imports and requests see it.
 *
 * @module
 */

/**
 * Source text with its comments removed, so a documented example is not read as code. A block
 * comment starts after whitespace or punctuation: the slash-star inside a glob string (an
 * `import.meta.glob` of every `locales/<code>/ui.ts`) is not one, and reading it as one removed the
 * code up to the next comment's end.
 *
 * @param text - A source file's text.
 * @returns The text without its comments.
 */
export function code(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[\s;{}()[\],=:])\/\*[\s\S]*?\*\//g, '$1')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n')
}
