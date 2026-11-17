import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { AGENT_HARNESSES, type AgentHarness, findHarness } from '../../lib/agent-harnesses.js'
import {
  applySetup,
  currentAgentEnvironment,
  planSetup,
  runAgentCli,
  type SetupStep,
} from '../../lib/agent-setup.js'
import { readProjectCapabilityMap, renderCapabilityMap } from '../../lib/capability-map.js'
import { setTelemetryContext } from '../../lib/telemetry.js'
import { ui } from '../../lib/ui.js'

/** Project files that name the agent in use, checked in order (`--agent auto`). */
const HARNESS_MARKERS: [string, string[]][] = [
  ['claude-code', ['.claude', 'CLAUDE.md']],
  ['cursor', ['.cursor']],
  ['codex', ['.codex']],
  ['gemini', ['.gemini', 'GEMINI.md']],
  ['windsurf', ['.windsurf', '.devin']],
  ['kiro', ['.kiro']],
  ['copilot', [join('.github', 'copilot-instructions.md')]],
  ['zed', ['.zed', '.rules']],
  ['crush', ['.crush', 'CRUSH.md', 'crush.json', '.crush.json']],
  ['trae', ['.trae']],
  ['cline', ['.clinerules', '.cline']],
  ['junie', ['.junie']],
  ['continue', ['.continue']],
  ['goose', ['.goosehints']],
]

/** Agents that read only the project's `AGENTS.md`, with no table entry of their own. */
const AGENTS_MD_ONLY = ['generic', 'pi', 'zcode']

/** Agents with an instructions file of their own (project or machine). */
const WITH_INSTRUCTIONS = AGENT_HARNESSES.filter((h) => !h.mcpOnly)

/** Detect which agent a project is set up for; `generic` when none. */
function detectHarness(root: string): string {
  for (const [id, markers] of HARNESS_MARKERS) {
    if (markers.some((m) => existsSync(join(root, m)))) return id
  }
  // AGENTS.md is the cross-agent standard (Claude Code, Codex, Cursor, Pi, … read it).
  return 'generic'
}

export default class AgentInit extends Command {
  static override description =
    'Write the Molecule conventions + mlcl quickstart into the instruction files your coding agent reads (AGENTS.md, plus CLAUDE.md or GEMINI.md where the agent reads those). `mlcl setup` also installs the MCP server and the Molecule skills'

  static override examples = [
    '<%= config.bin %> agent init            # detect the agent in this project and write its files',
    '<%= config.bin %> agent init --agent gemini',
    '<%= config.bin %> agent init --agent claude-code --global   # every project, not just this one',
  ]

  static override flags = {
    agent: Flags.string({
      description: 'Which agent to target (default: detect from project files)',
      options: [
        'auto',
        ...WITH_INSTRUCTIONS.map((h) => h.id),
        ...WITH_INSTRUCTIONS.flatMap((h) => h.aliases ?? []),
        ...AGENTS_MD_ONLY,
      ],
    }),
    global: Flags.boolean({
      description: "Write to the agent's instructions file for every project instead of this one",
      default: false,
    }),
    force: Flags.boolean({
      description: 'Rewrite the Molecule section even if already present',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(AgentInit)
    const env = currentAgentEnvironment()
    const id = flags.agent === 'auto' || !flags.agent ? detectHarness(env.cwd) : flags.agent
    setTelemetryContext({ harness: id })
    const harness: AgentHarness | undefined = AGENTS_MD_ONLY.includes(id)
      ? undefined
      : findHarness(id)

    const template = readFileSync(
      join(this.config.root, 'templates', 'shared', 'agent-init-section.md.tpl'),
      'utf8',
    )
    const scope = flags.global ? 'machine' : 'project'
    const steps: SetupStep[] = harness
      ? planSetup({
          scope,
          harnesses: [harness],
          components: new Set(['instructions']),
          env,
          skills: {},
        })
      : []
    const written = (s: SetupStep): boolean => s.kind !== 'note'

    if (flags.global) {
      if (!steps.some(written)) {
        const supported = WITH_INSTRUCTIONS.filter((h) =>
          h.instructions('machine', env).some((t) => t.kind !== 'none'),
        ).map((h) => h.id)
        this.error(
          `--global is supported for ${supported.join(', ')} (agents with an instructions file for every project). For ${id}, run without --global in the project.`,
        )
      }
    } else {
      // AGENTS.md is written for every agent: it is the file the next agent reads
      // too. Not for an agent that reads only its first instruction file: a new
      // AGENTS.md would replace the file it reads now (Zed with only CLAUDE.md).
      const agentsMd = join(env.cwd, 'AGENTS.md')
      if (!harness?.readsFirstFileOnly && !steps.some((s) => 'path' in s && s.path === agentsMd))
        steps.unshift({
          kind: 'section',
          component: 'instructions',
          agents: [harness?.label ?? id],
          path: agentsMd,
        })
    }

    const capabilityMap = flags.global
      ? null
      : renderCapabilityMap(await readProjectCapabilityMap(env.cwd))
    const results = await applySetup(steps, {
      instructions: template,
      capabilityMap,
      cwd: env.cwd,
      force: flags.force,
      runCli: runAgentCli,
    })
    for (const { step, status, detail } of results) {
      const where =
        'path' in step ? step.path.replace(`${env.cwd}/`, '').replace(env.home, '~') : ''
      if (status === 'failed') this.error(`${where}: ${detail}`)
      else if (status === 'note') this.log(ui.dim(detail ?? ''))
      else if (step.kind === 'import')
        this.log(
          status === 'present'
            ? ui.ok(`Already present: ${step.line} in ${where}`)
            : `${ui.check(status === 'updated' ? 'Updated' : 'Wrote')} ${step.line} → ${ui.id(where)}`,
        )
      else if (status === 'present' || status === 'kept')
        this.log(ui.ok(`Already present: molecule section in ${where}`))
      else
        this.log(
          `${ui.check(status === 'updated' ? 'Updated' : 'Wrote')} molecule section → ${ui.id(where)}`,
        )
    }
    // MCP forwards stdout as the agent_init result, so the caller receives the
    // project fact even when the AGENTS.md section already existed.
    if (capabilityMap) this.log(capabilityMap)

    this.log(
      `\n${ui.heading(`Agent: ${harness?.label ?? id}`)}${flags.global ? ui.dim(' (every project)') : ''}. ${ui.dim('Next: ask your agent to build something —')}`,
    )
    this.log(
      `  ${ui.cmd('"Build me a blog with molecule"')} ${ui.dim('— it now knows to reach for mlcl.')}`,
    )
    this.log(
      `\n${ui.dim('For the MCP tools (search_packages, scaffold_project, …) and the Molecule skills, run:')}`,
    )
    this.log(`  ${ui.cmd(`npx mlcl setup${flags.global ? '' : ' --scope project'}`)}`)
  }
}
