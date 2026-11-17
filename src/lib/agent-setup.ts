/**
 * Plan and apply a Molecule install for a set of coding agents: the MCP
 * server, the Molecule skills, and the always-on conventions — machine-wide or
 * for one project.
 *
 * Planning is pure (it reads the table in `agent-harnesses.ts` and the files
 * that decide a target, nothing else), so `--dry-run` prints exactly what a
 * real run does. Every write keeps what the user already has: config files
 * gain one entry, instruction files gain one section, and an existing skill
 * file is kept unless `force` refreshes it.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import { execa, execaSync } from 'execa'

import {
  type AgentEnvironment,
  type AgentHarness,
  MCP_SERVER_NAME,
  type McpTarget,
  type SetupScope,
} from './agent-harnesses.js'
import { ensureSection, removeSection } from './instruction-section.js'
import { mergeJsonConfigEntry } from './json-config-entry.js'

/** The three things setup can install. */
export type SetupComponent = 'mcp' | 'skills' | 'instructions'

/** Every component, in the order they are applied. */
export const SETUP_COMPONENTS: readonly SetupComponent[] = ['mcp', 'skills', 'instructions']

/** The heading of the per-project capability map section in `AGENTS.md`. */
export const CAPABILITY_MAP_MARKER = '## Declared capability map'

/** One thing a setup run does. */
export type SetupStep =
  | { kind: 'mcp'; component: 'mcp'; agents: string[]; target: McpTarget }
  | { kind: 'skill'; component: 'skills'; agents: string[]; path: string; content: string }
  | { kind: 'section'; component: 'instructions'; agents: string[]; path: string }
  | { kind: 'file'; component: 'instructions'; agents: string[]; path: string; frontmatter: string }
  | { kind: 'import'; component: 'instructions'; agents: string[]; path: string; line: string }
  | { kind: 'note'; component: SetupComponent; agents: string[]; text: string }

/** How one step went. */
export interface SetupStepResult {
  step: SetupStep
  status: 'written' | 'updated' | 'present' | 'kept' | 'manual' | 'note' | 'failed'
  /** The failure reason, the CLI's last line, or what to do by hand. */
  detail?: string
}

/** Inputs to {@link planSetup}. */
export interface SetupPlanInput {
  scope: SetupScope
  harnesses: readonly AgentHarness[]
  components: ReadonlySet<SetupComponent>
  env: AgentEnvironment
  /** Skill path relative to a skills directory (`<name>/SKILL.md`) → content. */
  skills: Record<string, string>
}

const add = <T extends { agents: string[] }>(
  steps: T[],
  key: (step: T) => string,
  step: T,
): void => {
  const same = steps.find((s) => key(s) === key(step))
  if (same) {
    for (const agent of step.agents) if (!same.agents.includes(agent)) same.agents.push(agent)
  } else steps.push(step)
}

/**
 * Work out every step for the chosen agents, merging targets they share (one
 * `~/.agents/skills` copy for every agent that reads it, one `AGENTS.md`
 * section, one `.mcp.json` entry).
 *
 * @param input - Scope, agents, components, environment and skill files.
 * @returns The steps, MCP first, then skills, then instructions.
 */
export function planSetup(input: SetupPlanInput): SetupStep[] {
  const { scope, harnesses, components, env, skills } = input
  const steps: SetupStep[] = []
  const stepKey = (step: SetupStep): string => {
    if (step.kind === 'note') return `note:${step.component}:${step.text}`
    if (step.kind === 'mcp') {
      const t = step.target
      return t.kind === 'cli'
        ? `cli:${t.bin}:${t.args.join(' ')}`
        : t.kind === 'manual'
          ? `manual:${t.lines.join('\n')}`
          : `${t.kind}:${t.path}`
    }
    return `${step.component}:${step.path}`
  }

  for (const component of SETUP_COMPONENTS) {
    if (!components.has(component)) continue
    for (const harness of harnesses) {
      const agents = [harness.label]
      if (component === 'mcp') {
        const targets = harness.mcp(scope, env)
        if (targets.length === 0) {
          add(steps, stepKey, {
            kind: 'note',
            component,
            agents,
            text: `${harness.label} has no documented MCP config for ${scope === 'machine' ? 'the whole machine' : 'one project'}.`,
          })
        }
        for (const target of targets) {
          const step: SetupStep = { kind: 'mcp', component, agents, target }
          const existing = steps.find((s) => stepKey(s) === stepKey(step))
          // Two agents reading one JSON file: one entry carrying both agents' keys.
          if (existing?.kind === 'mcp' && existing.target.kind === 'json' && target.kind === 'json')
            existing.target = {
              ...existing.target,
              entry: { ...target.entry, ...existing.target.entry },
            }
          add(steps, stepKey, step)
        }
      } else if (component === 'skills') {
        const dir = harness.skillsDir(scope, env)
        if (!dir) continue
        for (const [relative, content] of Object.entries(skills))
          add(steps, stepKey, {
            kind: 'skill',
            component,
            agents,
            path: join(dir, ...relative.split('/')),
            content,
          })
      } else {
        for (const target of harness.instructions(scope, env)) {
          if (target.kind === 'none')
            add(steps, stepKey, { kind: 'note', component, agents, text: target.note })
          else if (target.kind === 'section')
            add(steps, stepKey, { kind: 'section', component, agents, path: target.path })
          else if (target.kind === 'import')
            add(steps, stepKey, {
              kind: 'import',
              component,
              agents,
              path: target.path,
              line: target.line,
            })
          else
            add(steps, stepKey, {
              kind: 'file',
              component,
              agents,
              path: target.path,
              frontmatter: target.frontmatter,
            })
        }
      }
    }
  }
  return steps
}

/**
 * The real environment: `$HOME`, the current directory, and PATH lookups
 * (`MLCL_NO_PATH_DETECT=1` reports every command as absent, for tests).
 *
 * @returns The environment setup inspects.
 */
export function currentAgentEnvironment(): AgentEnvironment {
  const cache = new Map<string, boolean>()
  return {
    home: process.env.HOME || homedir(),
    cwd: process.cwd(),
    env: process.env,
    onPath: (bin) => {
      if (process.env.MLCL_NO_PATH_DETECT === '1') return false
      if (!cache.has(bin)) {
        try {
          execaSync('which', [bin])
          cache.set(bin, true)
        } catch (_error) {
          // `which` exits nonzero when the command is absent: that is the
          // answer being asked for, not a failure.
          cache.set(bin, false)
        }
      }
      return cache.get(bin)!
    },
  }
}

/**
 * Run an agent's own installer, never throwing: a failed `mcp add` is one
 * step's result, not the end of the run.
 *
 * @param bin - The agent's command.
 * @param args - Its arguments.
 * @returns Whether it exited 0, and its combined output.
 */
export async function runAgentCli(
  bin: string,
  args: string[],
): Promise<{ ok: boolean; output: string }> {
  const result = await execa(bin, args, { reject: false, all: true, timeout: 120_000 })
  return { ok: result.exitCode === 0, output: String(result.all ?? '') }
}

/** Runs a native installer; resolves with its exit status and combined output. */
export type CliRunner = (bin: string, args: string[]) => Promise<{ ok: boolean; output: string }>

/** Inputs to {@link applySetup}. */
export interface SetupApplyOptions {
  /** The conventions section (starts with `## Molecule`). */
  instructions: string
  /** The project's capability map section, written beside the conventions in `<cwd>/AGENTS.md`. */
  capabilityMap?: string | null
  /** The project root, so the capability map lands in its `AGENTS.md` only. */
  cwd: string
  /** Refresh existing skills and sections to this version. */
  force: boolean
  /** Runs native installers. */
  runCli: CliRunner
}

const writeOwnedFile = (
  path: string,
  content: string,
  force: boolean,
): SetupStepResult['status'] => {
  if (existsSync(path)) {
    if (readFileSync(path, 'utf8') === content) return 'present'
    if (!force) return 'kept'
    writeFileSync(path, content)
    return 'updated'
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  return 'written'
}

/**
 * Whether a TOML text already defines the dotted `table` (`mcp_servers.molecule`):
 * as a `[table]` / `[table.sub]` header, as a key inside its parent table
 * (`[mcp_servers]` then `molecule = {…}` or `molecule.command = …`), or as a
 * dotted key at the top level. Bare keys only, which is what Codex writes.
 */
export function tomlDefinesTable(text: string, table: string): boolean {
  let header = ''
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const heading = /^\[\[?\s*([^\]]+?)\s*\]\]?$/.exec(line)
    if (heading) {
      header = heading[1].replace(/\s*\.\s*/g, '.')
      if (header === table || header.startsWith(`${table}.`)) return true
      continue
    }
    const key = /^([A-Za-z0-9_.\-\s]+?)\s*=/.exec(line)?.[1].replace(/\s*\.\s*/g, '.')
    if (!key) continue
    const full = header ? `${header}.${key}` : key
    if (full === table || full.startsWith(`${table}.`)) return true
  }
  return false
}

/** The TOML table Codex reads, appended when the file does not define it yet. */
function appendTomlTable(path: string, table: string, lines: string[]): SetupStepResult['status'] {
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''
  if (tomlDefinesTable(text, table)) return 'present'
  mkdirSync(dirname(path), { recursive: true })
  const block = `[${table}]\n${lines.join('\n')}\n`
  writeFileSync(path, text.trim() === '' ? block : `${text.trimEnd()}\n\n${block}`)
  return text === '' ? 'written' : 'updated'
}

/**
 * An import line (`@AGENTS.md`) in a file the agent reads: the file is created with
 * just that line when missing, and the line is added at the end when the file lacks it.
 *
 * @param path - The file that imports (a project `CLAUDE.md`).
 * @param line - The import line, exactly as the agent expects it.
 * @returns `written` for a new file, `updated` when the line was added, else `present`.
 */
export function ensureImportLine(path: string, line: string): SetupStepResult['status'] {
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''
  if (text.split(/\r?\n/).some((existing) => existing.trim() === line)) return 'present'
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text.trim() === '' ? `${line}\n` : `${text.trimEnd()}\n\n${line}\n`)
  return text === '' ? 'written' : 'updated'
}

async function applyMcp(
  target: McpTarget,
  runCli: CliRunner,
): Promise<Omit<SetupStepResult, 'step'>> {
  switch (target.kind) {
    case 'cli': {
      const { ok, output } = await runCli(target.bin, target.args)
      const last = output.trim().split('\n').pop() ?? ''
      if (ok) return { status: 'written', detail: last }
      if (/already exists/i.test(output)) return { status: 'present', detail: last }
      return {
        status: 'failed',
        detail: `${target.bin} ${target.args.join(' ')}: ${last || 'failed'}`,
      }
    }
    case 'json': {
      const result = mergeJsonConfigEntry(target.path, target.keys, MCP_SERVER_NAME, target.entry)
      return {
        status: result === 'present' ? 'present' : result === 'updated' ? 'updated' : 'written',
      }
    }
    case 'toml':
      return { status: appendTomlTable(target.path, target.table, target.lines) }
    case 'manual':
      return { status: 'manual', detail: target.lines.join('\n') }
  }
}

/**
 * Carry out the planned steps. A step that fails is reported and the rest
 * still run: one agent's unreadable config must not stop the others.
 *
 * @param steps - From {@link planSetup}.
 * @param options - Content and the native-installer runner.
 * @returns One result per step, in order.
 */
export async function applySetup(
  steps: readonly SetupStep[],
  options: SetupApplyOptions,
): Promise<SetupStepResult[]> {
  const results: SetupStepResult[] = []
  const agentsMd = join(options.cwd, 'AGENTS.md')
  for (const step of steps) {
    try {
      if (step.kind === 'note') {
        results.push({ step, status: 'note', detail: step.text })
      } else if (step.kind === 'mcp') {
        results.push({ step, ...(await applyMcp(step.target, options.runCli)) })
      } else if (step.kind === 'skill') {
        results.push({ step, status: writeOwnedFile(step.path, step.content, options.force) })
      } else if (step.kind === 'import') {
        results.push({ step, status: ensureImportLine(step.path, step.line) })
      } else if (step.kind === 'file') {
        results.push({
          step,
          status: writeOwnedFile(step.path, step.frontmatter + options.instructions, options.force),
        })
      } else {
        mkdirSync(dirname(step.path), { recursive: true })
        const result = ensureSection(step.path, options.instructions, options.force)
        if (step.path === agentsMd) {
          // The map is a sibling section with its own marker, so --force and an
          // already-scaffolded AGENTS.md never duplicate it.
          if (options.capabilityMap)
            ensureSection(step.path, options.capabilityMap, options.force, CAPABILITY_MAP_MARKER)
          else if (options.force) removeSection(step.path, CAPABILITY_MAP_MARKER)
        }
        results.push({
          step,
          status: result === 'skipped' ? 'present' : result === 'replaced' ? 'updated' : 'written',
        })
      }
    } catch (error) {
      results.push({ step, status: 'failed', detail: (error as Error).message })
    }
  }
  return results
}
