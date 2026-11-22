/**
 * `npmInstallRoot`: where `mlcl add` / `swap` / `inject` run `npm install`.
 *
 * 2026-11-22 smoke test: after `mlcl create --skip-install`, Codex ran
 * `cd api && mlcl add @molecule/api-resource-user --inject`; `npm install` inside `api/` ran the
 * root's `prepare` (`husky`) without installing the root's dev tools, failed with
 * `sh: husky: not found` and the command exited 1. Installing from the workspace root fixes it.
 *
 * @module
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { npmInstallRoot } from '../npm-install-root.js'

describe('npmInstallRoot', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mlcl-install-root-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const manifest = (dir: string, body: Record<string, unknown>): string => {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify(body))
    return dir
  }

  it('installs a full-stack workspace (api/, app/) from the project root', () => {
    const project = manifest(join(root, 'tool-shed'), {
      workspaces: ['api', 'app'],
      scripts: { prepare: 'husky' },
    })
    const api = manifest(join(project, 'api'), { name: 'api' })
    const app = manifest(join(project, 'app'), { name: 'app' })
    expect(npmInstallRoot(api)).toBe(project)
    expect(npmInstallRoot(app)).toBe(project)
  })

  it('reads glob and `{ packages }` workspace forms', () => {
    const mono = manifest(join(root, 'mono'), { workspaces: { packages: ['packages/*'] } })
    const pkg = manifest(join(mono, 'packages', 'web'), { name: 'web' })
    expect(npmInstallRoot(pkg)).toBe(mono)
  })

  it('leaves a directory that is no workspace member alone (the counterexample)', () => {
    const outer = manifest(join(root, 'outer'), { workspaces: ['api'] })
    const other = manifest(join(outer, 'tools'), { name: 'tools' })
    const standalone = manifest(join(root, 'standalone'), { name: 'standalone' })
    expect(npmInstallRoot(other)).toBe(other)
    expect(npmInstallRoot(standalone)).toBe(standalone)
    expect(npmInstallRoot(outer)).toBe(outer)
  })

  it('skips an unreadable package.json on the way up', () => {
    const project = manifest(join(root, 'proj'), { workspaces: ['api'] })
    mkdirSync(join(project, 'api'), { recursive: true })
    writeFileSync(join(project, 'api', 'package.json'), '{ not json')
    const nested = manifest(join(project, 'api', 'deep'), { name: 'deep' })
    expect(npmInstallRoot(nested)).toBe(nested)
    expect(npmInstallRoot(join(project, 'api'))).toBe(project)
  })
})
