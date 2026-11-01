import { describe, expect, it } from 'vitest'

import { scaffoldProjectCliArgs } from '../../../mcp/src/scaffold-args.js'

describe('MCP scaffold_project caller', () => {
  it('forwards the supplied OpenAPI contract to the shared mlcl scaffold', () => {
    expect(
      scaffoldProjectCliArgs({
        name: 'accounts',
        type: 'full-stack',
        framework: 'react',
        packages: '@molecule/api-resource-user,@molecule/app-auth',
        api_contract: '/contracts/accounts.json',
        skip_install: true,
      }),
    ).toEqual([
      'create',
      'accounts',
      '--no-interactive',
      '--json',
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-resource-user,@molecule/app-auth',
      '--api-contract',
      '/contracts/accounts.json',
      '--skip-install',
    ])
  })
})
