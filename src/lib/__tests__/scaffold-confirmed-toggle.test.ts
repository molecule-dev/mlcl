import { copyFile, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { ESLint, type Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const root = await mkdtemp(join(tmpdir(), 'await-refetch-toggle-'))
await mkdir(join(root, 'eslint-rules'))
await copyFile(
  new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
  join(root, 'eslint.config.mjs'),
)
await copyFile(
  new URL('../../../templates/shared/prefer-declared-clients.mjs', import.meta.url),
  join(root, 'eslint-rules/prefer-declared-clients.mjs'),
)
await symlink(dirname(dirname(require.resolve('eslint/package.json'))), join(root, 'node_modules'))
afterAll(() => rm(root, { recursive: true, force: true }))
const config = (await import(pathToFileURL(join(root, 'eslint.config.mjs')).href)).default
const engine = new ESLint({ cwd: root, overrideConfig: config, overrideConfigFile: true })
async function findings(source: string): Promise<Linter.LintMessage[]> {
  const report = await engine.lintText(source, { filePath: 'src/Control.tsx' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) =>
    file.messages.filter(
      (row) => row.ruleId === 'molecule-local/server-toggles-use-optimistic-value',
    ),
  )
}

const setting = `import {useState} from 'react'
export function Alerts({record}) {
  const [override, setOverride] = useState(null)
  const value = override ?? record
  const toggle = async () => {
    const updated = await saveAlerts(record.id, !value.enabled)
    if (updated) setOverride(updated)
  }
  return <button onClick={toggle}>{value.enabled ? 'Disable alerts' : 'Enable alerts'}</button>
}`
describe('toggles that display only the server-confirmed value', () => {
  it('reports the actual P311 l2352 follow handler', async () => {
    const source = await readFile(
      new URL('./fixtures/p311-profile-before.tsx.txt', import.meta.url),
      'utf8',
    )
    const rows = await findings(source)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 65 })
    expect(rows[0]?.message).toContain('before changing the control')
    expect(rows[0]?.message).toContain('useOptimisticValue')
  })
  it('reports a non-benchmark alert setting with a deferred response', async () => {
    expect(await findings(setting)).toHaveLength(1)
  })
  it.each([
    ['no displayed response', setting.replace('if (updated) setOverride(updated)', '')],
    ['literal command', setting.replace('!value.enabled', 'true')],
    [
      'form submission',
      setting.replace('onClick={toggle}', 'onSubmit={toggle}').replaceAll('button', 'form'),
    ],
    [
      'shared hook',
      `import {useOptimisticValue} from '@molecule/app-react'
export const Alerts = ({record}) => {const value = useOptimisticValue({value: record.enabled, commit: async next => saveAlerts(record.id, next)}); return <button onClick={() => value.update(current => !current)}>{String(value.value)}</button>}`,
    ],
  ])('keeps %s quiet', async (_name, source) => {
    expect(await findings(source)).toEqual([])
  })
})
