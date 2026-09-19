import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'
import { execaSync } from 'execa'

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

/** Config-file harnesses: write/merge the standard mcpServers JSON shape. */
const FILE_INSTALLERS: Record<
  string,
  (project: boolean) => { path: string; key: string; top: string }
> = {
  windsurf: () => ({
    path: join(homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    key: 'mcpServers',
    top: 'mcpServers',
  }),
  vscode: (project) => ({
    path: project
      ? join(process.cwd(), '.vscode', 'mcp.json')
      : join(process.cwd(), '.vscode', 'mcp.json'),
    key: 'servers',
    top: 'servers',
  }),
  'cursor-project': () => ({
    path: join(process.cwd(), '.cursor', 'mcp.json'),
    key: 'mcpServers',
    top: 'mcpServers',
  }),
}

const SERVER_ENTRY = { command: 'npx', args: ['-y', 'molecule-mcp'] }

function mergeServerEntry(path: string, key: string): 'created' | 'added' | 'skipped' {
  let config: Record<string, unknown> = {}
  if (existsSync(path)) {
    config = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    const servers = config[key] as Record<string, unknown> | undefined
    if (servers?.molecule) return 'skipped'
  }
  config[key] = { ...((config[key] as object) ?? {}), molecule: SERVER_ENTRY }
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`)
  return existsSync(path) && Object.keys(config).length > 1 ? 'added' : 'created'
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
      options: [...CLI_INSTALLERS.map((c) => c.harness), ...Object.keys(FILE_INSTALLERS), 'auto'],
    }),
    project: Flags.boolean({
      description: 'Register at project level where the harness supports it (default: user/global)',
      default: false,
    }),
  }

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
        (existsSync(join(process.cwd(), '.cursor'))
          ? 'cursor-project'
          : existsSync(join(process.cwd(), '.vscode'))
            ? 'vscode'
            : null)
    }
    if (!harness) {
      this.error(
        'Could not detect a harness. Re-run with --agent <claude-code|cursor|gemini|codex|windsurf|vscode|cursor-project>.',
      )
    }

    const cli = CLI_INSTALLERS.find((c) => c.harness === harness)
    if (cli) {
      this.log(`Running ${cli.bin}'s own installer…`)
      const { failed, stdout, stderr } = execaSync(cli.bin, [...cli.args])
      if (failed) {
        this.error(`${cli.bin} mcp add failed: ${stderr.trim() || stdout.trim()}`)
      }
      this.log(`✓ Registered with ${cli.bin} (${stdout.trim().split('\n').pop() || 'ok'})`)
      this.log(
        '\nVerify inside the harness (e.g. /mcp) — tools appear once molecule-mcp publishes.',
      )
      return
    }

    const fileInstaller = FILE_INSTALLERS[harness]
    if (!fileInstaller) this.error(`No installer for harness "${harness}".`)
    const { path, key } = fileInstaller(flags.project)
    const result = mergeServerEntry(path, key)
    this.log(
      result === 'skipped'
        ? `Already registered → ${path}`
        : `${result === 'created' ? 'Wrote' : 'Updated'} ${path} (molecule server added)`,
    )
    this.log('\nRestart the harness to pick it up — tools appear once molecule-mcp publishes.')
  }
}
