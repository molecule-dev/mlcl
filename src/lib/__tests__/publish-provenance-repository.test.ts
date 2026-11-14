/**
 * Every package the Release workflow publishes with `--provenance` names this repository.
 *
 * npm checks a provenance statement against the manifest's `repository.url` and refuses the
 * publish when they differ: molecule-mcp 0.3.0 was signed in the 2026-11-14 Release and then
 * refused with `"repository.url" is ""`, after mlcl had already published from the same run.
 * The mlcl manifest is the reference, since its provenance publishes are accepted.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import type { WorkflowConfig } from '@molecule/api-ci-github-actions'

const MLCL = resolve(import.meta.dirname, '../../..')
const RELEASE = join(MLCL, '.github/workflows/release.yml')

interface Manifest {
  name?: string
  repository?: string | { url?: string; directory?: string }
}

/**
 * The repository a manifest's `repository` field names, as npm compares it.
 *
 * @param repository - The manifest's `repository` field.
 * @returns `https://github.com/<owner>/<repo>`, or '' when the field names none.
 */
function repositoryUrl(repository: Manifest['repository']): string {
  const raw = typeof repository === 'string' ? repository : (repository?.url ?? '')
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
}

/**
 * The directories, relative to mlcl, of the steps that run `npm publish … --provenance`.
 *
 * @param text - The workflow YAML.
 * @returns One directory per publishing step ('' for mlcl itself).
 */
function provenancePublishDirs(text: string): string[] {
  const workflow = parse(text) as Pick<WorkflowConfig, 'jobs'>
  const dirs: string[] = []
  for (const job of Object.values(workflow.jobs ?? {}))
    for (const step of job.steps ?? []) {
      const run = typeof step.run === 'string' ? step.run : ''
      if (!/\bnpm publish\b[^\n]*--provenance/.test(run)) continue
      const dir = String(step['working-directory'] ?? '')
      // The workflow checks mlcl out at ./mlcl.
      if (dir !== 'mlcl' && !dir.startsWith('mlcl/'))
        throw new Error(`a provenance publish runs outside mlcl/: "${dir}"`)
      dirs.push(dir.slice('mlcl/'.length))
    }
  return dirs
}

const manifest = (dir: string): Manifest =>
  JSON.parse(readFileSync(join(MLCL, dir, 'package.json'), 'utf8')) as Manifest

describe('provenance publishes', () => {
  const reference = repositoryUrl(manifest('').repository)

  it('reads the reference repository from the mlcl manifest', () => {
    expect(reference).toBe('https://github.com/molecule-dev/mlcl')
  })

  it('finds the mlcl and molecule-mcp publish steps', () => {
    expect(provenancePublishDirs(readFileSync(RELEASE, 'utf8')).sort()).toEqual(['', 'mcp'])
  })

  it.each(provenancePublishDirs(readFileSync(RELEASE, 'utf8')))(
    'the manifest in mlcl/%s names the repository its provenance will carry',
    (dir) => {
      const { repository } = manifest(dir)
      expect(repositoryUrl(repository)).toBe(reference)
      if (dir) expect(typeof repository === 'object' && repository.directory).toBe(dir)
    },
  )

  it('counterexample: a manifest with no repository names none', () => {
    expect(repositoryUrl(undefined)).toBe('')
    expect(repositoryUrl({ url: '' })).toBe('')
    expect(repositoryUrl('git+https://github.com/molecule-dev/mlcl.git')).toBe(reference)
  })
})
