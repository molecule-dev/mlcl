import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const shared = fileURLToPath(new URL('../../../templates/shared/', import.meta.url))

/**
 * The rule modules the shared ESLint config imports (`./eslint-rules/<file>`), read from the config
 * itself. A test that copied a hand-kept list failed to import the config the day a rule file was
 * added (2026-11-20, `no-stand-in-query-record.mjs`: about 20 such lists).
 *
 * @param template - The config template the test copies.
 * @returns The imported file names, each once.
 */
export async function sharedEslintRuleFiles(
  template = join(shared, 'eslint.config.js.tpl'),
): Promise<string[]> {
  const text = await readFile(template, 'utf8')
  const files = [...text.matchAll(/\bfrom '\.\/eslint-rules\/([\w.-]+\.mjs)'/g)].map(
    (match) => match[1] as string,
  )
  if (!files.length) throw new Error(`${template} imports no ./eslint-rules/ module`)
  return [...new Set(files)]
}

/**
 * Copy every rule module the shared config imports from `templates/shared/` into
 * `<root>/eslint-rules/`. A test that swaps one rule for a candidate copies it afterwards.
 *
 * @param root - The test project the config is copied into.
 * @param template - The config template the test copies.
 */
export async function copySharedEslintRules(root: string, template?: string): Promise<void> {
  await mkdir(join(root, 'eslint-rules'), { recursive: true })
  for (const file of await sharedEslintRuleFiles(template))
    await copyFile(join(shared, file), join(root, 'eslint-rules', file))
}
