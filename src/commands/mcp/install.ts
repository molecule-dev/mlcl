import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'
import { execaSync } from 'execa'

import { setTelemetryContext } from '../../lib/telemetry.js'
import { ui } from '../../lib/ui.js'

/**
 * Harnesses with a NATIVE `mcp add` CLI. We shell out to their own command —
 * it owns the config format, scopes, and validation, so we never guess.
 * (Gemini's syntax has no `--` separator.)
 */
const CLI_INSTALLERS = [
  {
    harness: 'claude-code',
    bin: 'claude',
    args: ['mcp', 'add', 'molecule', '--', 'npx', '-y', 'molecule-mcp'],
  },
  {
    harness: 'cursor',
    bin: 'cursor',
    args: ['mcp', 'add', 'molecule', '--', 'npx', '-y', 'molecule-mcp'],
  },
  {
    harness: 'gemini',
    bin: 'gemini',
    args: ['mcp', 'add', 'molecule', 'npx', '-y', 'molecule-mcp'],
  },
  {
    harness: 'codex',
    bin: 'codex',
    args: ['mcp', 'add', 'molecule', '--', 'npx', '-y', 'molecule-mcp'],
  },
] as const

/**
 * Config-file harnesses. Each declares where its config lives, the (possibly
 * nested) key path servers live under, and the entry shape it expects — most
 * use `{command, args}`, OpenCode uses `{type:"local", command:[...]}`.
 */
interface FileInstaller {
  path: (project: boolean) => string
  keys: string[]
  entry: Record<string, unknown>
}

const STANDARD_ENTRY = { command: 'npx', args: ['-y', 'molecule-mcp'] }

const FILE_INSTALLERS: Record<string, FileInstaller> = {
  windsurf: {
    path: () => join(homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    keys: ['mcpServers'],
    entry: STANDARD_ENTRY,
  },
  vscode: {
    path: () => join(process.cwd(), '.vscode', 'mcp.json'),
    keys: ['servers'],
    entry: STANDARD_ENTRY,
  },
  'cursor-project': {
    path: () => join(process.cwd(), '.cursor', 'mcp.json'),
    keys: ['mcpServers'],
    entry: STANDARD_ENTRY,
  },
  opencode: {
    // OpenCode: project opencode.json (or global ~/.config/opencode/opencode.json)
    path: (project) =>
      project
        ? join(process.cwd(), 'opencode.json')
        : join(homedir(), '.config', 'opencode', 'opencode.json'),
    keys: ['mcp'],
    entry: { type: 'local', command: ['npx', '-y', 'molecule-mcp'] },
  },
  amp: {
    path: () => join(homedir(), '.config', 'amp', 'settings.json'),
    keys: ['mcpServers'],
    entry: STANDARD_ENTRY,
  },
  crush: {
    path: () => join(homedir(), '.config', 'crush', 'config.json'),
    keys: ['mcpServers'],
    entry: STANDARD_ENTRY,
  },
  kiro: {
    path: (project) =>
      project
        ? join(process.cwd(), '.kiro', 'settings', 'mcp.json')
        : join(homedir(), '.kiro', 'settings', 'mcp.json'),
    keys: ['mcpServers'],
    entry: STANDARD_ENTRY,
  },
  trae: {
    path: (project) =>
      project ? join(process.cwd(), '.trae', 'mcp.json') : join(homedir(), '.trae', 'mcp.json'),
    keys: ['mcpServers'],
    entry: STANDARD_ENTRY,
  },
  zed: {
    path: () => join(process.cwd(), '.zed', 'settings.json'),
    keys: ['agent', 'mcp_servers'],
    entry: STANDARD_ENTRY,
  },
}

/**
 * Harnesses with no safe programmatic writer (YAML configs, extension
 * global-storage, or in-app UIs) — we print the exact snippet instead of
 * risking a mangled config.
 */
const INSTRUCTION_ONLY: Record<string, string[]> = {
  goose: [
    'Add to ~/.config/goose/config.yaml under `extensions:` (goose configure also works):',
    '  molecule:',
    '    bundled: false',
    '    command: npx',
    '    args: [-y, molecule-mcp]',
    '    description: Molecule.dev package tools',
    '    type: stdio',
  ],
  junie: ['In Junie, run /mcp and add a server with command: npx -y molecule-mcp'],
  cline: [
    'Cline → MCP Servers → Configure: add mcpServers.molecule = {"command":"npx","args":["-y","molecule-mcp"]}',
    '(kilo code and other Cline forks use the same settings shape)',
  ],
  continue: [
    'In Continue\'s config.json, add: "mcpServers": {"molecule": {"command": "npx", "args": ["-y", "molecule-mcp"]}}',
  ],
  aider: [
    'Recent Aider versions: enable MCP and add molecule with command npx -y molecule-mcp (see aider docs for the current key) — otherwise use the mlcl CLI directly; aider reads AGENTS.md conventions too.',
  ],
}

function mergeServerEntry(
  path: string,
  keys: string[],
  entry: Record<string, unknown>,
): 'created' | 'added' | 'skipped' {
  let config: Record<string, unknown> = {}
  let preexisting = false
  if (existsSync(path)) {
    config = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    preexisting = true
  }
  // Walk/create the (possibly nested) key path, then set servers.molecule.
  let node: Record<string, unknown> = config
  for (const key of keys.slice(0, -1)) {
    node[key] ??= {}
    node = node[key] as Record<string, unknown>
  }
  const last = keys[keys.length - 1]
  const servers = (node[last] as Record<string, unknown> | undefined) ?? {}
  if (servers.molecule) return 'skipped'
  node[last] = { ...servers, molecule: entry }
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`)
  return preexisting ? 'added' : 'created'
}

export default class McpInstall extends Command {
  static override description =
    'Register the molecule MCP server with your coding agent — one command that uses the harness\u2019s own native installer when it has one (claude/cursor/gemini/codex) and writes the standard config for the rest'

  static override examples = [
    '<%= config.bin %> mcp install             # detect the harness and register',
    '<%= config.bin %> mcp install --agent cursor',
    '<%= config.bin %> mcp install --agent vscode --project',
  ]

  static override flags = {
    agent: Flags.string({
      description: 'Which harness to configure (default: auto-detect)',
      options: [
        ...CLI_INSTALLERS.map((c) => c.harness),
        ...Object.keys(FILE_INSTALLERS),
        ...Object.keys(INSTRUCTION_ONLY),
        'auto',
      ],
    }),
    project: Flags.boolean({
      description: 'Register at project level where the harness supports it (default: user/global)',
      default: false,
    }),
  }

  /** Project markers for file-config harnesses, checked in priority order. */
  static readonly PROJECT_MARKERS: [string, string][] = [
    ['cursor-project', '.cursor'],
    ['vscode', '.vscode'],
    ['zed', '.zed'],
    ['kiro', '.kiro'],
    ['trae', '.trae'],
    ['opencode', 'opencode.json'],
  ]

  public async run(): Promise<void> {
    const { flags } = await this.parse(McpInstall)

    let harness = flags.agent && flags.agent !== 'auto' ? flags.agent : null
    if (!harness) {
      // Prefer a harness CLI on PATH (MLCL_NO_PATH_DETECT=1 disables — tests);
      // fall back to project markers.
      const onPath =
        process.env.MLCL_NO_PATH_DETECT === '1'
          ? undefined
          : CLI_INSTALLERS.find(({ bin }) => {
              try {
                execaSync('which', [bin])
                return true
              } catch (_error) {
                // `which` exits nonzero when the harness CLI is absent — that
                // is the signal we are probing for, not a failure to handle.
                return false
              }
            })
      harness =
        onPath?.harness ??
        McpInstall.PROJECT_MARKERS.find(([, marker]) =>
          existsSync(join(process.cwd(), marker)),
        )?.[0] ??
        null
    }
    setTelemetryContext({ harness: harness ?? 'unknown' })
    if (!harness) {
      this.error(
        `Could not detect a harness. Re-run with --agent <${[...CLI_INSTALLERS.map((c) => c.harness), ...Object.keys(FILE_INSTALLERS), ...Object.keys(INSTRUCTION_ONLY)].join('|')}>.`,
      )
    }

    const cli = CLI_INSTALLERS.find((c) => c.harness === harness)
    if (cli) {
      this.log(ui.dim(`Running ${cli.bin}'s own installer…`))
      const { failed, stdout, stderr } = execaSync(cli.bin, [...cli.args])
      if (failed) {
        this.error(`${cli.bin} mcp add failed: ${stderr.trim() || stdout.trim()}`)
      }
      this.log(
        ui.check(`Registered with ${ui.id(cli.bin)} (${stdout.trim().split('\n').pop() || 'ok'})`),
      )
      this.log(
        ui.dim(
          '\nVerify inside the harness (e.g. /mcp) — tools appear once molecule-mcp publishes.',
        ),
      )
      return
    }

    const instructions = INSTRUCTION_ONLY[harness]
    if (instructions) {
      this.log(
        `${ui.heading(harness)} ${ui.dim('has no safe programmatic config writer — add the server by hand:')}\n`,
      )
      for (const line of instructions) this.log(`  ${ui.cmd(line)}`)
      return
    }

    const fileInstaller = FILE_INSTALLERS[harness]
    if (!fileInstaller) this.error(`No installer for harness "${harness}".`)
    const path = fileInstaller.path(flags.project)
    const result = mergeServerEntry(path, fileInstaller.keys, fileInstaller.entry)
    this.log(
      result === 'skipped'
        ? ui.ok(`Already registered → ${path}`)
        : `${ui.check(result === 'created' ? 'Wrote' : 'Updated')} ${ui.id(path)} ${ui.dim('(molecule server added)')}`,
    )
    this.log(
      ui.dim('\nRestart the harness to pick it up — tools appear once molecule-mcp publishes.'),
    )
  }
}
