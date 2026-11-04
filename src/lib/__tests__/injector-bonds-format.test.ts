import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as prettier from 'prettier'
import { describe, expect, it } from 'vitest'

import { generateBondsIndexContent } from '../injector.js'
import { loadRegistry } from '../registry.js'
import { getTemplatesDir } from '../scaffold.js'

describe('generated bond setup is a formatter fixed point', () => {
  it.each([0, 1, 8])('preserves %i secrets without a format rewrite', async (count) => {
    const names = Array.from({ length: count }, (_, index) => `PROVIDER_${index}_SECRET_KEY`)
    const content = generateBondsIndexContent(
      [
        {
          interfacePackage: '@molecule/api-secrets',
          providerPackage: '@molecule/api-secrets-env',
          interfaceType: 'secrets',
          setupCode: '',
        },
      ],
      [],
      names,
    )
    const config = JSON.parse(
      await readFile(join(getTemplatesDir(), 'api', 'prettierrc.json.tpl'), 'utf8'),
    )
    expect(content).toBe(await prettier.format(content, { ...config, parser: 'typescript' }))
  })

  it('formats the monitoring import when database and cache checks are both enabled', async () => {
    const content = generateBondsIndexContent(
      [],
      ['service-device'],
      [],
      ['@molecule/api-monitoring', '@molecule/api-database-sqlite', '@molecule/api-cache-memory'],
      loadRegistry(),
    )
    const config = JSON.parse(
      await readFile(join(getTemplatesDir(), 'api', 'prettierrc.json.tpl'), 'utf8'),
    )
    expect(content).toContain('monitor.register(createDatabaseCheck())')
    expect(content).toContain('monitor.register(createCacheCheck())')
    expect(content).toBe(await prettier.format(content, { ...config, parser: 'typescript' }))
  })
})
