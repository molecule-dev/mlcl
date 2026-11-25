import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'

import {
  AGENT_HARNESSES,
  type AgentEnvironment,
  type AgentHarness,
  detectInstalledHarnesses,
  findHarness,
  mcpServerCommand,
  type SetupScope,
} from '../lib/agent-harnesses.js'
import {
  applySetup,
  currentAgentEnvironment,
  planSetup,
  runAgentCli,
  SETUP_COMPONENTS,
  type SetupComponent,
  type SetupStep,
  type SetupStepResult,
} from '../lib/agent-setup.js'
import { loadRetiredSetupSkills, loadSetupSkills } from '../lib/agent-skills.js'
import { readProjectCapabilityMap, renderCapabilityMap } from '../lib/capability-map.js'
import { useMachineMcp } from '../lib/mcp-machine-install.js'
import { warmMcpServer } from '../lib/mcp-warm.js'
import { setTelemetryContext } from '../lib/telemetry.js'
import { ui } from '../lib/ui.js'

/** Agents `setup` offers: every one with something to install (Aider has no MCP, skills or rules files). */
const OFFERED = AGENT_HARNESSES.filter((h) => h.id !== 'aider')

const COMPONENT_TITLES: Record<SetupComponent, string> = {
  mcp: 'MCP server',
  skills: 'Skills',
  instructions: 'Conventions',
}

export default class Setup extends Command {
  static override description =
    'Set up your coding agents to build the Molecule way: registers the molecule MCP server and writes the Molecule conventions (or installs the Molecule skills for an agent with no rules file), for every project on this machine or for this project only'

  static override examples = [
    '<%= config.bin %> setup                                   # choose where and which agents',
    '<%= config.bin %> setup --yes                             # every agent found, whole machine',
    '<%= config.bin %> setup --scope project --agent claude-code,cursor --yes',
    '<%= config.bin %> setup --dry-run                         # show what it would write',
  ]

  static override flags = {
    scope: Flags.string({
      description:
        'machine: every project for this user (default). project: only the current directory',
      options: ['machine', 'project'],
    }),
    agent: Flags.string({
      description: 'Agents to set up, comma-separated (default: every agent found on this machine)',
      multiple: true,
      delimiter: ',',
      options: [...OFFERED.map((h) => h.id), ...OFFERED.flatMap((h) => h.aliases ?? [])],
    }),
    skip: Flags.string({
      description: 'Leave something out, comma-separated',
      multiple: true,
      delimiter: ',',
      options: [...SETUP_COMPONENTS],
    }),
    force: Flags.boolean({
      description: 'Replace Molecule skills and sections you edited with this version',
      default: false,
    }),
    'dry-run': Flags.boolean({
      description: 'Print what would be written, change nothing',
      default: false,
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'Do not ask; use the flags and defaults',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Setup)
    const env = currentAgentEnvironment()
    const interactive = !flags.yes && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY)
    const found = detectInstalledHarnesses(env).filter((h) => OFFERED.includes(h))
    if (interactive) p.intro(ui.heading('Set up your coding agents for Molecule'))

    let scope = flags.scope as SetupScope | undefined
    if (!scope && interactive) {
      const answer = await p.select({
        message: 'Where should your agents use Molecule?',
        options: [
          { value: 'machine', label: 'Every project on this machine', hint: 'recommended' },
          { value: 'project', label: 'This project only', hint: env.cwd },
        ],
        initialValue: 'machine',
      })
      if (p.isCancel(answer)) return this.cancelled()
      scope = answer as SetupScope
    }
    scope ??= 'machine'

    let harnesses: AgentHarness[]
    if (flags.agent?.length) {
      harnesses = [...new Set(flags.agent.map((id) => findHarness(id)!))]
    } else if (interactive) {
      const answer = await p.multiselect({
        message: 'Which agents? (space toggles, enter confirms)',
        options: OFFERED.map((h) => ({
          value: h.id,
          label: h.label,
          hint: [found.includes(h) ? 'found' : undefined, h.mcpOnly ? 'MCP only' : undefined]
            .filter(Boolean)
            .join(', '),
        })),
        initialValues: found.map((h) => h.id),
        required: true,
      })
      if (p.isCancel(answer)) return this.cancelled()
      harnesses = (answer as string[]).map((id) => findHarness(id)!)
    } else {
      harnesses = found
    }
    if (harnesses.length === 0) {
      this.error(
        `No coding agent found on this machine. Name one with --agent <${OFFERED.map((h) => h.id).join('|')}>.`,
      )
    }
    setTelemetryContext({ harness: harnesses.map((h) => h.id).join(',') })

    const components = new Set(SETUP_COMPONENTS.filter((c) => !flags.skip?.includes(c)))
    const plan = (): SetupStep[] =>
      planSetup({
        scope: scope!,
        harnesses,
        components,
        env,
        skills: loadSetupSkills(join(this.config.root, 'templates')),
        retiredSkills: loadRetiredSetupSkills(join(this.config.root, 'templates')),
      })
    let steps = plan()
    const show = (path: string): string => this.displayPath(path, env)

    if (flags['dry-run'] || interactive) {
      this.log(
        `\n${ui.heading(scope === 'machine' ? 'Every project on this machine' : `This project (${env.cwd})`)} ${ui.dim(`— ${harnesses.map((h) => h.label).join(', ')}`)}`,
      )
      this.printPlan(steps, show)
    }
    if (flags['dry-run']) {
      this.log(ui.dim('\nDry run: nothing was written.'))
      return
    }
    if (interactive) {
      const go = await p.confirm({ message: 'Go ahead?', initialValue: true })
      if (p.isCancel(go) || !go) return this.cancelled()
    }

    // For the whole machine the agents start an installed copy of the server; when it cannot be
    // installed they get npx, and the plan is made again for that command.
    if (scope === 'machine' && steps.some((step) => step.kind === 'mcp')) {
      const machine = await useMachineMcp(env)
      this.log(`  ${machine.ok ? ui.check(machine.line) : ui.warn(machine.line)}`)
      if (!machine.ok) steps = plan()
    }

    const instructions = readFileSync(
      join(this.config.root, 'templates', 'shared', 'agent-init-section.md.tpl'),
      'utf8',
    )
    const capabilityMap =
      scope === 'project' ? renderCapabilityMap(await readProjectCapabilityMap(env.cwd)) : null
    const results = await applySetup(steps, {
      instructions,
      capabilityMap,
      cwd: env.cwd,
      force: flags.force,
      runCli: runAgentCli,
    })
    this.printResults(results, show)

    // Start the server once now, as the agents will: the first start downloads it, and an agent
    // that does that itself can begin its session before the tools are there (see lib/mcp-warm.ts).
    let warmFailed = false
    const registered = new Set<SetupStepResult['status']>(['written', 'updated', 'present'])
    if (results.some((r) => r.step.kind === 'mcp' && registered.has(r.status))) {
      const [command, ...args] = mcpServerCommand(scope, env)
      const shown = [command, ...args.map((arg) => this.displayPath(arg, env))].join(' ')
      try {
        const warm = await warmMcpServer(command, args)
        this.log(
          `  ${ui.check(`${shown} answers as in an agent session: ${warm.tools} tools`)} ${ui.dim(`(${warm.version}, ${(warm.ms / 1000).toFixed(1)} s)`)}`,
        )
      } catch (error) {
        warmFailed = true
        this.log(
          `  ${ui.cross(`${shown} did not start:`)} ${ui.warn(error instanceof Error ? error.message : String(error))}`,
        )
      }
    }

    const failed = results.filter((r) => r.status === 'failed').length + (warmFailed ? 1 : 0)
    const kept = results.some((r) => r.status === 'kept')
    if (kept) this.log(ui.dim('\nKept files you edited; --force replaces them with this version.'))
    if (failed) {
      this.log(ui.warn(`\n${failed} step(s) failed; the rest are done.`))
      process.exitCode = 1
    }
    const done = 'Restart your agents to load Molecule.'
    if (interactive) p.outro(done)
    else this.log(`\n${done}`)
  }

  private cancelled(): void {
    p.cancel('Nothing was changed.')
  }

  private displayPath(path: string, env: AgentEnvironment): string {
    if (path.startsWith(`${env.cwd}/`)) return relative(env.cwd, path)
    if (path.startsWith(`${env.home}/`)) return `~/${relative(env.home, path)}`
    return path
  }

  private describe(step: SetupStep, show: (path: string) => string): string {
    if (step.kind === 'note') return step.text
    if (step.kind === 'mcp') {
      const t = step.target
      if (t.kind === 'cli')
        return `${t.bin} ${t.args.map((a) => (/[\s{"]/.test(a) ? `'${a}'` : a)).join(' ')}`
      if (t.kind === 'manual') return 'by hand (instructions below)'
      return show(t.path)
    }
    if (step.kind === 'import') return `${show(step.path)} (imports ${step.line.replace(/^@/, '')})`
    return show(step.path)
  }

  /** Skill steps collapse to one line per skills directory (one for installs, one for removals). */
  private grouped<T extends { step: SetupStep }>(
    items: T[],
    show: (path: string) => string,
  ): { line: string; agents: string[]; items: T[] }[] {
    const groups = new Map<string, { line: string; agents: string[]; items: T[] }>()
    for (const item of items) {
      const { step } = item
      const skill = step.kind === 'skill' || step.kind === 'retire-skill'
      const key = skill ? `${step.kind}:${dirname(dirname(step.path))}` : `${groups.size}`
      const line = skill ? `${show(dirname(dirname(step.path)))}/` : this.describe(step, show)
      const group = groups.get(key) ?? { line, agents: [], items: [] }
      for (const agent of step.agents) if (!group.agents.includes(agent)) group.agents.push(agent)
      group.items.push(item)
      groups.set(key, group)
    }
    return [...groups.values()]
  }

  private printPlan(steps: SetupStep[], show: (path: string) => string): void {
    for (const component of SETUP_COMPONENTS) {
      // A removal is planned only where an earlier setup left the file.
      const mine = steps
        .filter((s) => s.component === component)
        .filter((s) => s.kind !== 'retire-skill' || existsSync(s.path))
        .map((step) => ({ step }))
      if (mine.length === 0) continue
      this.log(`\n${ui.cmd(COMPONENT_TITLES[component])}`)
      for (const group of this.grouped(mine, show)) {
        const skillNames = group.items.flatMap(({ step }) =>
          step.kind === 'skill' || step.kind === 'retire-skill'
            ? [step.path.split('/').at(-2)]
            : [],
        )
        const retiring = group.items[0].step.kind === 'retire-skill'
        const names =
          skillNames.length > 0
            ? ` ${ui.dim(`${retiring ? 'remove unedited: ' : ''}${skillNames.join(', ')}`)}`
            : ''
        this.log(`  ${group.line}${names} ${ui.dim(`(${group.agents.join(', ')})`)}`)
      }
    }
  }

  private printResults(results: SetupStepResult[], show: (path: string) => string): void {
    const label: Record<SetupStepResult['status'], string> = {
      written: 'added',
      updated: 'updated',
      present: 'already set up',
      kept: 'kept your edited copy',
      removed: 'removed (setup no longer installs it)',
      absent: '',
      manual: 'add by hand',
      note: '',
      failed: 'failed',
    }
    for (const component of SETUP_COMPONENTS) {
      // Nothing to say about an old skill that was never there.
      const mine = results.filter((r) => r.step.component === component && r.status !== 'absent')
      if (mine.length === 0) continue
      this.log(`\n${ui.cmd(COMPONENT_TITLES[component])}`)
      for (const group of this.grouped(mine, show)) {
        const statuses = [...new Set(group.items.map((r) => r.status))]
        const agents = ui.dim(`(${group.agents.join(', ')})`)
        if (statuses.includes('failed')) {
          const reason = group.items.find((r) => r.status === 'failed')?.detail ?? ''
          this.log(`  ${ui.cross(`${group.line} ${agents}`)} ${ui.warn(reason)}`)
        } else if (statuses[0] === 'note') {
          this.log(`  ${ui.dim(`· ${group.line}`)}`)
        } else if (statuses[0] === 'manual') {
          this.log(`  ${ui.warn('!')} ${agents} ${label.manual}:`)
          for (const line of (group.items[0].detail ?? '').split('\n'))
            this.log(`      ${ui.cmd(line)}`)
        } else {
          const text = statuses.map((s) => label[s]).join(', ')
          this.log(`  ${ui.check(`${group.line} ${agents}`)} ${ui.dim(text)}`)
        }
      }
    }
  }
}
