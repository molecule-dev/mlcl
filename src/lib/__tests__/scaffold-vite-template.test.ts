import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as prettier from 'prettier'
import { describe, expect, it } from 'vitest'

import { sortImportStatements } from '../format.js'
import {
  type AppViteConfigTemplateOptions,
  appViteConfigTemplateVars,
  getTemplatesDir,
  processTemplate,
} from '../scaffold.js'

const prettierConfig = async (): Promise<prettier.Options> =>
  JSON.parse(await readFile(join(getTemplatesDir(), 'app/shared/prettierrc.json.tpl'), 'utf8'))

/** Fills a template the way the scaffold does before its prettier pass. */
const fill = async (templateDir: string, vars: Record<string, string>): Promise<string> =>
  sortImportStatements(
    processTemplate(
      await readFile(join(getTemplatesDir(), templateDir, 'vite.config.ts.tpl'), 'utf8'),
      vars,
    ),
    'vite.config.ts',
  )

const react = { import: "import react from '@vitejs/plugin-react'", usage: 'react()' }
const tailwind = { import: "import tailwindcss from '@tailwindcss/vite'", usage: 'tailwindcss()' }
const base = { brandingImport: './src/branding.js', warmupClientFiles: "['src/bonds/*.ts']" }

describe('app/shared Vite template substitutions', () => {
  it.each<[string, AppViteConfigTemplateOptions]>([
    ['no plugins', { ...base, plugins: [], svelteKit: false }],
    ['a framework and a styling plugin', { ...base, plugins: [react, tailwind], svelteKit: false }],
    [
      'SvelteKit',
      {
        ...base,
        plugins: [
          { import: "import { sveltekit } from '@sveltejs/kit/vite'", usage: 'sveltekit()' },
        ],
        svelteKit: true,
      },
    ],
    [
      'a framework with extra config',
      {
        ...base,
        plugins: [react],
        svelteKit: false,
        extraConfig: "resolve: { alias: { 'react-native': 'react-native-web' } },",
      },
    ],
  ])('fills every placeholder with source that parses for %s', async (_case, options) => {
    const filled = await fill('app/shared', appViteConfigTemplateVars(options))
    expect(filled).not.toMatch(/\{\{[A-Z_]+\}\}/)
    // The scaffold formats the filled template with the project's prettier config
    // (formatGeneratedSource), which throws on a template that does not parse.
    const output = await prettier.format(filled, {
      ...(await prettierConfig()),
      parser: 'typescript',
    })
    expect(output).toContain('const config = createFrameworkViteConfig(branding, {')
    for (const plugin of options.plugins) {
      expect(output).toContain(plugin.import)
      expect(output).toContain(plugin.usage)
    }
    expect(output).toContain(
      options.svelteKit
        ? 'stripPreviewBridgePlugin({ svelteKit: true })'
        : 'stripPreviewBridgePlugin()',
    )
    expect(output.includes('svelteKit: {')).toBe(options.svelteKit)
    expect(output.includes('mergeConfig(config')).toBe(Boolean(options.extraConfig))
  })
})

describe('static Vite template substitutions', () => {
  it.each([
    ['empty', '  plugins: [],'],
    ['one', '  plugins: [onlyPlugin()],'],
    [
      'many',
      [
        '  plugins: [',
        '    frameworkPluginWithOptions(),',
        '    stylingPluginWithOptions(),',
        '    staticOrPwaPluginWithOptions(),',
        '    stripPreviewBridgePlugin(),',
        '  ],',
      ].join('\n'),
    ],
  ])('keeps the existing plugin placeholder for %s plugins', async (_shape, plugins) => {
    const output = await fill('static', {
      TAILWIND_IMPORT: '',
      VITE_PLUGIN_IMPORT: '',
      VITE_PLUGINS: plugins,
      RESOLVE_EXTENSIONS: '',
    })
    expect(output).not.toMatch(/\{\{[A-Z_]+\}\}/)
    expect(output).toContain(plugins)
    expect(output).toBe(
      await prettier.format(output, { ...(await prettierConfig()), parser: 'typescript' }),
    )
  })
})
