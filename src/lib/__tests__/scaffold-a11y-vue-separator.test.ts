import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { ESLint } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { copySharedEslintRules } from './shared-eslint-rules.js'

/**
 * The templates' Vue a11y gate (eslint-plugin-vuejs-accessibility, which the shared ESLint config turns on from
 * a Vue app's devDependencies) reads a focusable separator as the widget WAI-ARIA makes it, as jsx-a11y does for
 * React (scaffold-a11y-layout-boxes.test.ts). Its own file: two copies of the config in one process leave
 * typescript-eslint with two candidate tsconfig roots.
 */
const require = createRequire(import.meta.url)
const vueRoot = await mkdtemp(join(tmpdir(), 'a11y-vue-separator-'))
await mkdir(join(vueRoot, 'eslint-rules'))
await mkdir(join(vueRoot, 'src'))
await copyFile(
  process.env.SCAFFOLD_ESLINT_TEMPLATE ??
    new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
  join(vueRoot, 'eslint.config.mjs'),
)
await copySharedEslintRules(vueRoot)
await writeFile(
  join(vueRoot, 'package.json'),
  JSON.stringify({
    type: 'module',
    dependencies: { vue: '3.5.0' },
    devDependencies: {
      'eslint-plugin-vue': '10.12.0',
      'eslint-plugin-vuejs-accessibility': '2.6.3',
    },
  }),
)
await symlink(
  dirname(dirname(require.resolve('eslint/package.json'))),
  join(vueRoot, 'node_modules'),
)
afterAll(() => rm(vueRoot, { recursive: true, force: true }))
const vueConfig = (await import(pathToFileURL(join(vueRoot, 'eslint.config.mjs')).href)).default
const vueEngine = new ESLint({ cwd: vueRoot, overrideConfig: vueConfig, overrideConfigFile: true })

async function vueA11y(element: string): Promise<string[]> {
  const source = `<script setup lang="ts">
const emit = defineEmits<{ resize: [step: number] }>()
</script>

<template>
  ${element}
</template>
`
  const report = await vueEngine.lintText(source, { filePath: join(vueRoot, 'src/Splitter.vue') })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) =>
    file.messages
      .filter((row) => row.ruleId?.startsWith('vuejs-accessibility/'))
      .map((row) => row.ruleId!),
  )
}

describe('vuejs-accessibility reads a focusable separator as a widget too', () => {
  it.each([
    ['bound', ':aria-valuenow="50"'],
    ['static', 'aria-valuenow="50"'],
  ])('a window splitter with a %s aria-valuenow passes', async (_kind, valueNow) => {
    expect(
      await vueA11y(
        `<div role="separator" aria-label="Resize" ${valueNow} tabindex="0" @keydown="emit('resize', 16)" />`,
      ),
    ).toEqual([])
  })

  it.each([
    [
      'a separator without aria-valuenow',
      '<div role="separator" tabindex="0" @keydown="emit(\'resize\', 16)" />',
    ],
    [
      'a note with aria-valuenow',
      '<div role="note" :aria-valuenow="50" tabindex="0" @keydown="emit(\'resize\', 16)" />',
    ],
  ])('%s still fails', async (_name, element) => {
    expect(await vueA11y(element)).toEqual(['vuejs-accessibility/no-static-element-interactions'])
  })
})
