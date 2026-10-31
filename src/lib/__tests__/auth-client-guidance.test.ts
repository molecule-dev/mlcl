import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')

describe('scaffolded shared-auth guidance', () => {
  it('puts the client capabilities and adaptation fields in every generated auth bond', () => {
    const files = synthesizeAppProjectFiles(
      [],
      ['@molecule/app-auth'],
      '/tmp/test-app',
      loadRegistry(),
    )
    const bond = files.find((file) => file.targetPath.endsWith('bonds/auth-default.ts'))
    expect(bond).toBeDefined()
    const content = bond!.content

    expect(content).toContain('What this client already handles')
    expect(content).toContain('getAccessToken()')
    expect(content).toContain('401/403')
    expect(content).toContain('children')
    expect(content).toContain('logout()')
    expect(content).toContain('refresh()')
    for (const field of [
      'tokenKey',
      'authScheme',
      'mapAuthResponse',
      'currentUserEndpoint',
      'profileUpdateMethod',
    ]) {
      expect(content).toContain(field)
    }
  })

  it('points the shared config at the same client instead of a parallel session layer', async () => {
    const content = await readFile(
      join(ROOT, 'templates', 'app', 'shared', 'config.ts.tpl'),
      'utf8',
    )

    expect(content).toContain('What the shared auth client already handles')
    expect(content).toContain('getAccessToken()')
    expect(content).toContain('401/403')
    expect(content).toContain('logout()')
    expect(content).toContain('refresh()')
    expect(content).toContain('does not delay rendering children')
    for (const field of [
      'tokenKey',
      'authScheme',
      'mapAuthResponse',
      'currentUserEndpoint',
      'profileUpdateMethod',
    ]) {
      expect(content).toContain(field)
    }
  })
})
