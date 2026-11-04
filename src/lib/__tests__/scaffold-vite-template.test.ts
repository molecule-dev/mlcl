import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as prettier from 'prettier'
import { describe, expect, it } from 'vitest'

import { sortImportStatements } from '../format.js'
import { getTemplatesDir, processTemplate } from '../scaffold.js'

describe.each(['app/shared', 'static'])('%s Vite template substitutions', (templateDir) => {
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
        '    previewConsoleLogPlugin,',
        '    stripPreviewBridgePlugin(),',
        '  ],',
      ].join('\n'),
    ],
  ])('keeps the existing plugin placeholder for %s plugins', async (_shape, plugins) => {
    const template = await readFile(
      join(getTemplatesDir(), templateDir, 'vite.config.ts.tpl'),
      'utf8',
    )
    const output = sortImportStatements(
      processTemplate(template, {
        TAILWIND_IMPORT: '',
        VITE_PLUGIN_IMPORT: '',
        BRANDING_IMPORT: './src/branding.js',
        VITE_PLUGINS: plugins,
        RESOLVE_EXTENSIONS: '',
      }),
    )
    expect(output).not.toMatch(/\{\{[A-Z_]+\}\}/)
    expect(output).toContain(plugins)
    const config = JSON.parse(
      await readFile(join(getTemplatesDir(), 'app/shared/prettierrc.json.tpl'), 'utf8'),
    )
    expect(output).toBe(await prettier.format(output, { ...config, parser: 'typescript' }))
  })
})
