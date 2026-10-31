import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'
import {
  addPackages,
  applyTemplatePostInjectOverrides,
  copyTemplateInstance,
  createAppProject,
  readTemplateSetupSqlVersions,
} from '../scaffold.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATE_APPS = join(ROOT, 'templates', 'apps')

async function expectScaffoldedAuthGuidance(appPath: string): Promise<void> {
  const bond = await readFile(join(appPath, 'src', 'bonds', 'auth-default.ts'), 'utf8')
  const config = await readFile(join(appPath, 'src', 'config.ts'), 'utf8')

  for (const content of [bond, config]) {
    expect(content).toContain('getAccessToken()')
    expect(content).toContain('401/403')
    expect(content).toContain('logout()')
    expect(content).toContain('refresh()')
    expect(content).toContain('children')
    for (const field of [
      'tokenKey',
      'authScheme',
      'mapAuthResponse',
      'currentUserEndpoint',
      'profileUpdateMethod',
    ]) {
      expect(content).toContain(field)
    }
  }
  expect(bond).toContain('What this client already handles')
  expect(config).toContain('What the shared auth client already handles')
}

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

  it.each(['3d-model-viewer', 'ai-hotel-receptionist', 'kanban-board'])(
    'survives the real %s flagship template overrides',
    async (slug) => {
      const workdir = await mkdtemp(join(tmpdir(), 'mlcl-auth-guidance-'))
      try {
        const templateDir = join(TEMPLATE_APPS, slug)
        const destination = join(workdir, 'project')
        await copyTemplateInstance(
          templateDir,
          destination,
          'guidance-project',
          await readTemplateSetupSqlVersions(templateDir),
        )
        await expectScaffoldedAuthGuidance(join(destination, 'app'))
      } finally {
        await rm(workdir, { recursive: true, force: true })
      }
    },
    30_000,
  )

  it('reaches the real bare app scaffold and its generated auth bond', async () => {
    const workdir = await mkdtemp(join(tmpdir(), 'mlcl-auth-guidance-bare-'))
    try {
      const appPath = join(workdir, 'app')
      await createAppProject(appPath, 'guidance-app', 'react')
      const bond = synthesizeAppProjectFiles(
        [],
        ['@molecule/app-auth'],
        appPath,
        loadRegistry(),
      ).find((file) => file.targetPath.endsWith('bonds/auth-default.ts'))
      expect(bond).toBeDefined()
      await writeFile(bond!.targetPath, bond!.content)
      await expectScaffoldedAuthGuidance(appPath)
    } finally {
      await rm(workdir, { recursive: true, force: true })
    }
  }, 30_000)

  it('re-applies the shared header after a post-inject flagship bond override', async () => {
    const workdir = await mkdtemp(join(tmpdir(), 'mlcl-auth-guidance-override-'))
    try {
      const appPath = join(workdir, 'app')
      await createAppProject(appPath, 'guidance-app', 'react')
      await addPackages(appPath, ['@molecule/app-auth'])
      const bond = synthesizeAppProjectFiles(
        [],
        ['@molecule/app-auth'],
        appPath,
        loadRegistry(),
      ).find((file) => file.targetPath.endsWith('bonds/auth-default.ts'))
      expect(bond).toBeDefined()
      await writeFile(bond!.targetPath, bond!.content)

      await applyTemplatePostInjectOverrides('ai-hotel-receptionist', appPath, ROOT)

      await expectScaffoldedAuthGuidance(appPath)
    } finally {
      await rm(workdir, { recursive: true, force: true })
    }
  }, 30_000)

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
    expect(content).toContain('not rendering children')
    expect(content).not.toMatch(/RealWorld|realWorld|jwtToken/)
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
