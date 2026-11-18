import { copyFile, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { ESLint } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The templates' jsx-a11y gate reads Molecule's layout boxes (Flex, Grid, Container, Spacer) as the
 * plain <div> they render, so a mouse-only `<Flex onClick>` fails lint the way a `<div onClick>` does.
 */
const require = createRequire(import.meta.url)
const root = await mkdtemp(join(tmpdir(), 'a11y-layout-boxes-'))
await mkdir(join(root, 'eslint-rules'))
await mkdir(join(root, 'src'))
await copyFile(
  process.env.SCAFFOLD_ESLINT_TEMPLATE ??
    new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
  join(root, 'eslint.config.mjs'),
)
for (const rule of [
  'prefer-declared-clients',
  'no-empty-interactive-target',
  'no-dropped-action',
  'no-class-code',
] as const) {
  await copyFile(
    new URL(`../../../templates/shared/${rule}.mjs`, import.meta.url),
    join(root, `eslint-rules/${rule}.mjs`),
  )
}
await symlink(dirname(dirname(require.resolve('eslint/package.json'))), join(root, 'node_modules'))
afterAll(() => rm(root, { recursive: true, force: true }))
const config = (await import(pathToFileURL(join(root, 'eslint.config.mjs')).href)).default
const engine = new ESLint({ cwd: root, overrideConfig: config, overrideConfigFile: true })

async function a11y(body: string): Promise<string[]> {
  const source = `import { Card, Flex, Grid } from '@molecule/app-ui-react'

export function Row({ go, key }: { go: () => void; key: (e: unknown) => void }) {
  return (
    ${body}
  )
}
`
  const report = await engine.lintText(source, { filePath: join(root, 'src/Row.tsx') })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) =>
    file.messages.filter((row) => row.ruleId?.startsWith('jsx-a11y/')).map((row) => row.ruleId!),
  )
}

describe('jsx-a11y reads the layout boxes as divs', () => {
  it.each([
    ['Flex', '<Flex onClick={go}>Open</Flex>'],
    ['Grid', '<Grid onClick={go}>Open</Grid>'],
  ])('a mouse-only %s fails', async (_name, body) => {
    expect(await a11y(body)).toEqual(
      expect.arrayContaining([
        'jsx-a11y/click-events-have-key-events',
        'jsx-a11y/no-static-element-interactions',
      ]),
    )
  })

  it('a Flex with the role and keys of a button passes', async () => {
    expect(
      await a11y('<Flex role="button" tabIndex={0} onClick={go} onKeyDown={key}>Open</Flex>'),
    ).toEqual([])
  })

  it('an interactive Card passes (it is a button and handles its own keys)', async () => {
    expect(await a11y('<Card interactive onClick={go}>Open</Card>')).toEqual([])
  })
})

describe('jsx-a11y allows only the list roles a bullet-less list needs', () => {
  it.each([
    ['ul', '<ul role="list"><li>One</li></ul>'],
    ['ol', '<ol role="list"><li>One</li></ol>'],
  ])(
    '%s role="list" passes (Safari drops the role of a list styled without bullets)',
    async (_tag, body) => {
      expect(await a11y(body)).toEqual([])
    },
  )

  it('any other redundant role still fails', async () => {
    expect(await a11y('<button role="button" onClick={go}>Open</button>')).toEqual([
      'jsx-a11y/no-redundant-roles',
    ])
  })
})

describe('jsx-a11y reads a focusable separator as the widget WAI-ARIA makes it', () => {
  it('a window splitter with aria-valuenow, tabIndex and key handling passes', async () => {
    expect(
      await a11y(
        '<div role="separator" aria-orientation="vertical" aria-label="Resize" aria-valuenow={50} aria-valuemin={0} aria-valuemax={100} tabIndex={0} onKeyDown={key} style={{ width: 4, background: "currentColor" }} />',
      ),
    ).toEqual([])
  })

  it('a separator without aria-valuenow is still not focusable', async () => {
    expect(
      await a11y(
        '<div role="separator" tabIndex={0} onKeyDown={key} style={{ width: 4, background: "currentColor" }} />',
      ),
    ).toEqual(
      expect.arrayContaining([
        'jsx-a11y/no-noninteractive-element-interactions',
        'jsx-a11y/no-noninteractive-tabindex',
      ]),
    )
  })

  it('aria-valuenow does not make any other role focusable', async () => {
    expect(
      await a11y(
        '<div role="note" aria-valuenow={50} tabIndex={0} onKeyDown={key} style={{ width: 4, background: "currentColor" }} />',
      ),
    ).toEqual(
      expect.arrayContaining([
        'jsx-a11y/no-noninteractive-element-interactions',
        'jsx-a11y/no-noninteractive-tabindex',
      ]),
    )
  })
})
