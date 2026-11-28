import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { Config } from '@oclif/core'
import { expect, it, vi } from 'vitest'

import StageUp from '../stage/up.js'

const stage = vi.hoisted(() => ({ up: vi.fn(async () => ({})), save: vi.fn() }))
vi.mock('../../lib/staging.js', () => ({
  addEnvironment: stage.save,
  allocatePort: async () => ({ api: 3000, app: 3001, db: 3002 }),
  branchToSlug: async () => 'fixture',
  loadDriver: async () => ({
    name: 'fixture',
    config: { label: 'Test driver', defaultPortRange: [3000, 3002] },
    provider: { checkPrerequisites: async () => ({ met: true }), up: stage.up },
  }),
}))

it.each(['api', 'app'])(
  'keeps the %s build warning and stages under a silent npm parent',
  async (missing) => {
    const root = mkdtempSync(join(tmpdir(), 'mlcl-stage-npm-'))
    try {
      for (const side of ['api', 'app']) {
        mkdirSync(join(root, side))
        writeFileSync(
          join(root, side, 'package.json'),
          JSON.stringify({
            name: `fixture-${side}`,
            scripts: side === missing ? {} : { build: 'exit 0' },
          }),
        )
      }
      const realNpm = execFileSync('which', ['npm'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
      mkdirSync(join(root, 'bin'))
      writeFileSync(
        join(root, 'bin/npm'),
        '#!/bin/bash\nexec "$REAL_FIXTURE_NPM" "$@" > >(cat) 2> >(cat >&2)\n',
        { mode: 0o755 },
      )
      vi.stubEnv('REAL_FIXTURE_NPM', realNpm)
      vi.stubEnv('PATH', `${join(root, 'bin')}${delimiter}${process.env.PATH}`)
      vi.stubEnv('npm_config_cache', join(root, 'cache'))
      vi.stubEnv('npm_config_logs_max', '0')
      const config = await Config.load(join(import.meta.dirname, '..', '..', '..'))
      const run = async (loglevel: string): Promise<string[]> => {
        stage.up.mockClear()
        stage.save.mockClear()
        vi.stubEnv('npm_config_loglevel', loglevel)
        const cmd = new StageUp(['--branch', 'fixture', '--project-path', root], config)
        const messages: string[] = []
        vi.spyOn(cmd, 'warn').mockImplementation((message) => {
          messages.push(String(message))
          return message
        })
        await cmd.run()
        expect(stage.up).toHaveBeenCalledTimes(1)
        expect(stage.save).toHaveBeenCalledTimes(1)
        return messages
      }
      const normal = await run('notice')
      expect(normal).toEqual([expect.stringContaining('Missing script: "build"')])
      expect(await run('silent')).toEqual(normal)
    } finally {
      vi.unstubAllEnvs()
      vi.restoreAllMocks()
      rmSync(root, { recursive: true, force: true })
    }
  },
)
