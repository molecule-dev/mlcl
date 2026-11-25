/**
 * The machine install of the MCP server: `mlcl setup` registers `node ~/.mlcl/mcp/run.mjs` for the
 * whole machine, never `npx -y molecule-mcp`.
 *
 * r19/r20 harness evals (2026-11-24): headless Claude Code waits about 2 s for its MCP servers and
 * then starts without them. `npx -y molecule-mcp` asks the registry for `latest` on every start
 * (1.2-1.4 s in the box, 70 s with the registry unreachable), so 3 of 10 sessions began with the
 * server pending and no Molecule tool. The installed copy answers in about 0.1 s. Covers the
 * launcher's start time with the registry unreachable, the command every agent gets at each
 * scope, replacing an older setup's entry (and keeping a user's own), setup's install, and the
 * server's daily background update.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  activate,
  LAUNCHER,
  MACHINE_HOME_ENV,
  NO_UPDATE_ENV,
  startBackgroundUpdate,
  update,
  type UpdateDeps,
} from '../../../mcp/src/machine-install.js'
import { AGENT_HARNESSES, type AgentEnvironment, type McpTarget } from '../agent-harnesses.js'
import { applySetup, type CliRunner, planSetup } from '../agent-setup.js'
import {
  installedMachineMcp,
  type MachineMcpDeps,
  prepareMachineMcp,
  useMachineMcp,
} from '../mcp-machine-install.js'
import { warmMcpServer } from '../mcp-warm.js'

let home: string
let cwd: string
const dirs: string[] = []
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'mcp-machine-home-'))
  cwd = mkdtempSync(join(tmpdir(), 'mcp-machine-cwd-'))
  dirs.push(home, cwd)
})
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const mcpHome = (): string => join(home, '.mlcl', 'mcp')
const run = (): string => join(mcpHome(), 'run.mjs')

/**
 * A stand-in molecule-mcp version: its bin answers `initialize` with its version and the
 * machine-install directory it was started with, and `tools/list` with one tool; it has the
 * machine-install CLI file too.
 */
function standInVersion(dir: string, version: string): void {
  const pkg = join(dir, 'node_modules', 'molecule-mcp')
  mkdirSync(join(pkg, 'bin'), { recursive: true })
  mkdirSync(join(pkg, 'dist'), { recursive: true })
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'molecule-mcp', version }))
  writeFileSync(join(pkg, 'dist', 'machine-install-cli.js'), '')
  writeFileSync(
    join(pkg, 'bin', 'run.js'),
    `process.stdin.on('data', (chunk) => {
  for (const line of String(chunk).split('\\n').filter(Boolean)) {
    const { id } = JSON.parse(line)
    const name = process.env.${MACHINE_HOME_ENV} ?? 'no-home'
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: { serverInfo: { name, version: '${version}' }, tools: [{ name: 'stand-in' }] } }) + '\\n')
  }
})
`,
  )
}

/** A machine install whose current version is `version`, as `activate` leaves it. */
function installed(version: string): void {
  standInVersion(join(mcpHome(), 'versions', version), version)
  writeFileSync(run(), LAUNCHER)
  writeFileSync(join(mcpHome(), 'current.json'), JSON.stringify({ version }))
}

const env = (onPath: string[] = [], extra: Partial<AgentEnvironment> = {}): AgentEnvironment => ({
  home,
  cwd,
  env: {},
  onPath: (bin) => onPath.includes(bin),
  ...extra,
})

/** Every command a target registers, as text. */
function commandText(target: McpTarget): string {
  switch (target.kind) {
    case 'cli':
      return [target.bin, ...target.args].join(' ')
    case 'json':
      return JSON.stringify(target.entry)
    case 'toml':
      return target.lines.join('\n')
    case 'manual':
      return target.lines.join('\n')
  }
}

/** Every agent setup offers: Aider has no MCP support. */
const mcpTargets = (scope: 'machine' | 'project', e: AgentEnvironment): McpTarget[] =>
  AGENT_HARNESSES.filter((harness) => harness.id !== 'aider').flatMap(
    (harness) => harness.mcp?.(scope, e) ?? [],
  )

describe('the installed launcher', () => {
  it('answers initialize in under 500 ms with the registry unreachable', async () => {
    installed('9.9.9')
    const times: number[] = []
    for (let i = 0; i < 5; i++) {
      const started = Date.now()
      const answer = await warmMcpServer(process.execPath, [run()], { timeoutMs: 10_000 })
      times.push(Date.now() - started)
      expect(answer.version).toBe('9.9.9')
    }
    times.sort((a, b) => a - b)
    expect(times[2]).toBeLessThan(500)
  }, 30_000)

  it('tells the server where its machine install is', () => {
    installed('9.9.9')
    const started = spawnSync(process.execPath, [run()], {
      input: `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })}\n`,
      encoding: 'utf8',
      timeout: 10_000,
    })
    expect(JSON.parse(started.stdout.split('\n')[0]).result.serverInfo.name).toBe(`${mcpHome()}/`)
  })

  // Counterexample: a launcher with nothing to start says how to fix it in one line.
  it('exits naming the fix when no version is installed', () => {
    mkdirSync(mcpHome(), { recursive: true })
    writeFileSync(run(), LAUNCHER)
    const started = spawnSync(process.execPath, [run()], { encoding: 'utf8', timeout: 10_000 })
    expect(started.status).toBe(1)
    expect(started.stderr).toBe(
      'molecule-mcp: no installed version. Run `npx mlcl setup` to install it again.\n',
    )
  })
})

describe('the command each agent registers', () => {
  it('is the installed launcher for the whole machine, for every agent, never npx', () => {
    for (const onPath of [[], ['claude', 'codex', 'gemini', 'opencode', 'copilot', 'cline']]) {
      const targets = mcpTargets('machine', env(onPath))
      expect(targets.length).toBeGreaterThan(10)
      for (const target of targets) {
        const text = commandText(target)
        expect(text, text).not.toContain('npx')
        expect(text, text).toContain(run())
      }
    }
  })

  it('is plain npx in a project, which a team shares, and names no home directory', () => {
    const targets = mcpTargets('project', env(['claude', 'codex', 'gemini', 'opencode']))
    expect(targets.length).toBeGreaterThan(5)
    for (const target of targets) {
      const text = commandText(target)
      expect(text, text).not.toContain(home)
      expect(text, text).toMatch(/npx[\s\S]*-y[\s\S]*molecule-mcp/)
      expect(text, text).not.toContain('prefer-offline')
    }
  })

  it('is npx for the whole machine when the install could not be made', async () => {
    const e = env()
    const result = await useMachineMcp(e, {
      latest: async () => {
        throw new Error('getaddrinfo ENOTFOUND registry.npmjs.org')
      },
      install: async () => undefined,
      activate: async () => '',
    })
    expect(result.ok).toBe(false)
    expect(result.line).toContain('npx -y molecule-mcp instead')
    for (const target of mcpTargets('machine', e)) expect(commandText(target)).not.toContain(run())
  })
})

describe('an entry an older setup made', () => {
  const legacy = { command: 'npx', args: ['-y', 'molecule-mcp'] }
  const cursorConfig = (): string => join(home, '.cursor', 'mcp.json')
  const setupCursor = async (): Promise<string[]> => {
    const steps = planSetup({
      scope: 'machine',
      harnesses: AGENT_HARNESSES.filter((h) => h.id === 'cursor'),
      components: new Set(['mcp']),
      env: env(),
      skills: {},
    })
    const results = await applySetup(steps, {
      instructions: '',
      cwd,
      force: false,
      runCli: async () => ({ ok: true, output: '' }),
    })
    return results.map((r) => r.status)
  }

  it('moves to the launcher in a JSON config, keeping the user’s other keys', async () => {
    mkdirSync(join(home, '.cursor'), { recursive: true })
    writeFileSync(
      cursorConfig(),
      `{\n  // mine\n  "mcpServers": {\n    "molecule": { "command": "npx", "args": ["-y", "molecule-mcp"], "env": { "DO_NOT_TRACK": "1" } }\n  }\n}\n`,
    )
    expect(await setupCursor()).toEqual(['updated'])
    const text = readFileSync(cursorConfig(), 'utf8')
    expect(text).toContain('// mine')
    expect(JSON.parse(text.replace('// mine', '')).mcpServers.molecule).toEqual({
      command: 'node',
      args: [run()],
      env: { DO_NOT_TRACK: '1' },
    })
    expect(await setupCursor()).toEqual(['present'])
  })

  // Counterexample: an entry the user changed stays theirs.
  it('stays when the user pinned a version', async () => {
    mkdirSync(join(home, '.cursor'), { recursive: true })
    const before = JSON.stringify({
      mcpServers: { molecule: { command: 'npx', args: ['-y', 'molecule-mcp@0.3.0'] } },
    })
    writeFileSync(cursorConfig(), before)
    expect(await setupCursor()).toEqual(['present'])
    expect(readFileSync(cursorConfig(), 'utf8')).toBe(before)
  })

  it('is removed with the claude CLI, then added again with the launcher', async () => {
    writeFileSync(join(home, '.claude.json'), JSON.stringify({ mcpServers: { molecule: legacy } }))
    const calls: string[] = []
    const claude: CliRunner = async (bin, args) => {
      calls.push([bin, ...args].join(' '))
      return { ok: true, output: '' }
    }
    const steps = planSetup({
      scope: 'machine',
      harnesses: AGENT_HARNESSES.filter((h) => h.id === 'claude-code'),
      components: new Set(['mcp']),
      env: env(['claude']),
      skills: {},
    })
    const results = await applySetup(steps, { instructions: '', cwd, force: false, runCli: claude })
    expect(results.map((r) => r.status)).toEqual(['updated'])
    expect(calls).toEqual([
      'claude mcp remove --scope user molecule',
      `claude mcp add --scope user molecule -- node ${run()}`,
    ])
  })

  it('is rewritten in the file a CLI without a remove step writes', async () => {
    const settings = join(home, '.gemini', 'settings.json')
    mkdirSync(join(home, '.gemini'), { recursive: true })
    writeFileSync(settings, JSON.stringify({ mcpServers: { molecule: legacy } }))
    const calls: string[] = []
    const steps = planSetup({
      scope: 'machine',
      harnesses: AGENT_HARNESSES.filter((h) => h.id === 'gemini'),
      components: new Set(['mcp']),
      env: env(['gemini']),
      skills: {},
    })
    const results = await applySetup(steps, {
      instructions: '',
      cwd,
      force: false,
      runCli: async (bin, args) => (calls.push([bin, ...args].join(' ')), { ok: true, output: '' }),
    })
    expect(results.map((r) => r.status)).toEqual(['updated'])
    expect(calls).toEqual([])
    expect(JSON.parse(readFileSync(settings, 'utf8')).mcpServers.molecule).toEqual({
      command: 'node',
      args: [run()],
    })
  })
})

describe('setup installs the server for the machine', () => {
  const deps = (latest: string, log: string[] = []): MachineMcpDeps => ({
    latest: async () => latest,
    install: async (dir, version) => {
      log.push(`install ${version}`)
      standInVersion(dir, version)
    },
    activate: async (cli, at) => {
      log.push(`activate ${cli.includes(latest)}`)
      writeFileSync(join(at, 'run.mjs'), LAUNCHER)
      writeFileSync(join(at, 'current.json'), JSON.stringify({ version: latest }))
      return `${JSON.stringify({ version: latest, ms: 90 })}\n`
    },
  })

  it('installs the latest version, then leaves a current one alone', async () => {
    const log: string[] = []
    expect(await prepareMachineMcp(home, deps('1.0.0', log))).toEqual({
      status: 'installed',
      version: '1.0.0',
      ms: 90,
    })
    expect(log).toEqual(['install 1.0.0', 'activate true'])
    expect(installedMachineMcp(mcpHome())).toBe('1.0.0')
    expect(await prepareMachineMcp(home, deps('1.0.0', log))).toEqual({
      status: 'current',
      version: '1.0.0',
    })
    expect(log).toHaveLength(2)
    // Nothing is left behind from the install.
    expect(existsSync(join(mcpHome(), 'versions', `1.0.0.tmp-${process.pid}`))).toBe(false)
  })

  it('keeps the installed version when the registry cannot be reached', async () => {
    installed('1.0.0')
    const result = await prepareMachineMcp(home, {
      ...deps('2.0.0'),
      latest: async () => {
        throw new Error('getaddrinfo ENOTFOUND registry.npmjs.org')
      },
    })
    expect(result).toMatchObject({ status: 'kept', version: '1.0.0' })
  })

  it('keeps the installed version, and removes the new one, when the new one does not start', async () => {
    installed('1.0.0')
    const result = await prepareMachineMcp(home, {
      ...deps('2.0.0'),
      activate: async () => {
        throw new Error('exited with code 1 before answering')
      },
    })
    expect(result).toMatchObject({ status: 'kept', version: '1.0.0' })
    expect(existsSync(join(mcpHome(), 'versions', '2.0.0'))).toBe(false)
    expect(installedMachineMcp(mcpHome())).toBe('1.0.0')
  })
})

describe('a version becoming current', () => {
  it('happens only after it answers as itself, and keeps just it and the one it replaced', async () => {
    installed('1.0.0')
    standInVersion(join(mcpHome(), 'versions', '0.9.0'), '0.9.0')
    standInVersion(join(mcpHome(), 'versions', '1.1.0'), '1.1.0')
    await expect(
      activate(mcpHome(), { version: '1.1.0', start: async () => ({ version: '1.0.0', ms: 5 }) }),
    ).rejects.toThrow('answered as 1.0.0, not 1.1.0')
    expect(installedMachineMcp(mcpHome())).toBe('1.0.0')
    expect(
      await activate(mcpHome(), {
        version: '1.1.0',
        start: async () => ({ version: '1.1.0', ms: 5 }),
      }),
    ).toEqual({ version: '1.1.0', ms: 5 })
    expect(installedMachineMcp(mcpHome())).toBe('1.1.0')
    expect(readFileSync(run(), 'utf8')).toBe(LAUNCHER)
    expect(existsSync(join(mcpHome(), 'versions', '1.0.0'))).toBe(true)
    expect(existsSync(join(mcpHome(), 'versions', '0.9.0'))).toBe(false)
  })
})

describe('the server’s background update', () => {
  const started: string[] = []
  const launch = (at: string): void => {
    started.push(at)
  }
  beforeEach(() => {
    started.length = 0
  })

  it('runs only from the machine install, at most once a day, unless turned off', () => {
    const at = mcpHome()
    mkdirSync(at, { recursive: true })
    expect(startBackgroundUpdate({}, Date.now(), launch)).toBe(false)
    expect(
      startBackgroundUpdate({ [MACHINE_HOME_ENV]: at, [NO_UPDATE_ENV]: '1' }, Date.now(), launch),
    ).toBe(false)
    // Never checked: check now.
    expect(startBackgroundUpdate({ [MACHINE_HOME_ENV]: at }, Date.now(), launch)).toBe(true)
    writeFileSync(join(at, 'checked'), '')
    expect(startBackgroundUpdate({ [MACHINE_HOME_ENV]: at }, Date.now(), launch)).toBe(false)
    const dayAgo = (Date.now() - 25 * 60 * 60 * 1000) / 1000
    utimesSync(join(at, 'checked'), dayAgo, dayAgo)
    expect(startBackgroundUpdate({ [MACHINE_HOME_ENV]: at }, Date.now(), launch)).toBe(true)
    expect(started).toEqual([at, at])
  })

  const updateDeps = (latest: string, activates = true): UpdateDeps => ({
    latest: () => latest,
    install: (at, version) => {
      standInVersion(join(at, 'versions', version), version)
      return join(
        at,
        'versions',
        version,
        'node_modules',
        'molecule-mcp',
        'dist',
        'machine-install-cli.js',
      )
    },
    activate: (_cli, at) => {
      if (activates) writeFileSync(join(at, 'current.json'), JSON.stringify({ version: latest }))
      return activates
    },
  })

  it('switches to a newer version, and does nothing when current', async () => {
    installed('1.0.0')
    expect(await update(mcpHome(), updateDeps('1.1.0'))).toBe('updated 1.1.0')
    expect(installedMachineMcp(mcpHome())).toBe('1.1.0')
    expect(await update(mcpHome(), updateDeps('1.1.0'))).toBe('current')
    expect(existsSync(join(mcpHome(), 'update.lock'))).toBe(false)
  })

  it('keeps the current version when offline or when the new one does not start', async () => {
    installed('1.0.0')
    const offline: UpdateDeps = {
      ...updateDeps('1.1.0'),
      latest: () => {
        throw new Error('ENOTFOUND')
      },
    }
    expect(await update(mcpHome(), offline)).toBe('offline')
    expect(await update(mcpHome(), updateDeps('1.1.0', false))).toBe('failed 1.1.0 did not start')
    expect(existsSync(join(mcpHome(), 'versions', '1.1.0'))).toBe(false)
    expect(installedMachineMcp(mcpHome())).toBe('1.0.0')
  })

  it('runs one updater at a time, and takes over a lock a dead one left', async () => {
    installed('1.0.0')
    mkdirSync(join(mcpHome(), 'update.lock'))
    expect(await update(mcpHome(), updateDeps('1.1.0'))).toBe('busy')
    const hourAgo = (Date.now() - 60 * 60 * 1000) / 1000
    utimesSync(join(mcpHome(), 'update.lock'), hourAgo, hourAgo)
    expect(await update(mcpHome(), updateDeps('1.1.0'))).toBe('updated 1.1.0')
  })
})
