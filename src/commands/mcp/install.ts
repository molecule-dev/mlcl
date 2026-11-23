import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

import {
  AGENT_HARNESSES,
  type AgentHarness,
  detectInstalledHarnesses,
  findHarness,
  type SetupScope,
} from '../../lib/agent-harnesses.js'
import {
  applySetup,
  currentAgentEnvironment,
  planSetup,
  runAgentCli,
} from '../../lib/agent-setup.js'
import { setTelemetryContext } from '../../lib/telemetry.js'
import { ui } from '../../lib/ui.js'

/**
 * Project files that name an agent when nothing is installed for this user,
 * checked in order. The marker also means the project scope.
 */
const PROJECT_MARKERS: [string, string][] = [
  ['cursor', '.cursor'],
  ['copilot', '.vscode'],
  ['zed', '.zed'],
  ['kiro', '.kiro'],
  ['trae', '.trae'],
  ['opencode', 'opencode.json'],
]

export default class McpInstall extends Command {
  static override description =
    'Register the molecule MCP server with one coding agent, using the agent’s own installer when it has one. `mlcl setup` does this for every agent at once, with the Molecule conventions'

  static override examples = [
    '<%= config.bin %> mcp install             # the first agent found on this machine',
    '<%= config.bin %> mcp install --agent cursor',
    '<%= config.bin %> mcp install --agent copilot --project',
  ]

  static override flags = {
    agent: Flags.string({
      description: 'Which agent to configure (default: the first one found)',
      options: [
        ...AGENT_HARNESSES.map((h) => h.id),
        ...AGENT_HARNESSES.flatMap((h) => h.aliases ?? []),
        'auto',
      ],
    }),
    project: Flags.boolean({
      description: 'Register for this project only (default: every project for this user)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(McpInstall)
    const env = currentAgentEnvironment()

    let harness: AgentHarness | undefined
    let scope: SetupScope = flags.project ? 'project' : 'machine'
    if (flags.agent && flags.agent !== 'auto') {
      harness = findHarness(flags.agent)
      if (flags.agent === 'cursor-project') scope = 'project'
    } else {
      harness = detectInstalledHarnesses(env)[0]
      if (!harness) {
        const marker = PROJECT_MARKERS.find(([, file]) => existsSync(join(env.cwd, file)))
        if (marker) {
          harness = findHarness(marker[0])
          scope = 'project'
        }
      }
    }
    setTelemetryContext({ harness: harness?.id ?? 'unknown' })
    if (!harness) {
      this.error(
        `Could not detect a coding agent. Re-run with --agent <${AGENT_HARNESSES.map((h) => h.id).join('|')}>.`,
      )
    }

    const steps = planSetup({
      scope,
      harnesses: [harness],
      components: new Set(['mcp']),
      env,
      skills: {},
    })
    const results = await applySetup(steps, {
      instructions: '',
      cwd: env.cwd,
      force: false,
      runCli: runAgentCli,
    })
    for (const { step, status, detail } of results) {
      const where =
        step.kind === 'mcp'
          ? step.target.kind === 'cli'
            ? `${step.target.bin} ${step.target.args.slice(0, 3).join(' ')}`
            : step.target.kind === 'manual'
              ? ''
              : step.target.path
          : ''
      if (status === 'failed') this.error(`${harness.label}: ${where} failed: ${detail}`)
      else if (status === 'note') this.log(ui.dim(detail ?? ''))
      else if (status === 'manual') {
        this.log(
          `${ui.heading(harness.label)} ${ui.dim('has no safe config writer. Add the server by hand:')}\n`,
        )
        for (const line of (detail ?? '').split('\n')) this.log(`  ${ui.cmd(line)}`)
      } else if (status === 'present') this.log(ui.ok(`Already registered → ${where}`))
      else
        this.log(
          `${ui.check(status === 'updated' ? 'Updated' : 'Registered')} ${ui.id(where)} ${ui.dim(`(${harness.label})`)}`,
        )
    }
    this.log(ui.dim('\nRestart the agent to load the Molecule tools.'))
  }
}
