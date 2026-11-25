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

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
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
import { CAPABILITY_MAP_MARKER, ensureSection, removeSection } from './instruction-section.js'
import { jsonConfigEntryMatches, mergeJsonConfigEntry } from './json-config-entry.js'

/** The three things setup can install. */
export type SetupComponent = 'mcp' | 'skills' | 'instructions'

/** Every component, in the order they are applied. */
export const SETUP_COMPONENTS: readonly SetupComponent[] = ['mcp', 'skills', 'instructions']

/** One thing a setup run does. */
export type SetupStep =
  | { kind: 'mcp'; component: 'mcp'; agents: string[]; target: McpTarget }
  | { kind: 'skill'; component: 'skills'; agents: string[]; path: string; content: string }
  /** A Molecule skill an earlier setup installed there that this one does not: removed when unedited. */
  | { kind: 'retire-skill'; component: 'skills'; agents: string[]; path: string; content: string }
  | { kind: 'section'; component: 'instructions'; agents: string[]; path: string }
  | { kind: 'file'; component: 'instructions'; agents: string[]; path: string; frontmatter: string }
  | { kind: 'import'; component: 'instructions'; agents: string[]; path: string; line: string }
  | { kind: 'note'; component: SetupComponent; agents: string[]; text: string }

/** How one step went. */
export interface SetupStepResult {
  step: SetupStep
  status:
    'written' | 'updated' | 'present' | 'kept' | 'removed' | 'absent' | 'manual' | 'note' | 'failed'
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
  /**
   * Skills an earlier setup installed that this one never does (`<name>/SKILL.md` → the content it
   * installed). An unedited copy is removed, so a re-run ends where a first run does.
   */
  retiredSkills?: Record<string, string>
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
  const { scope, harnesses, components, env, skills, retiredSkills = {} } = input
  const steps: SetupStep[] = []
  const stepKey = (step: SetupStep): string => {
    if (step.kind === 'note') return `note:${step.component}:${step.text}`
    if (step.kind === 'retire-skill') return `retire:${step.path}`
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
        // One copy of the guidance per agent. The instruction section says what the skills say,
        // and an agent that opens a matching skill before acting spends a model turn on it: Codex
        // read extend-with-packages before every answer (harness eval `find`, 2026-11-23: 20.7 s
        // with the skills, 12.6 s without). So the skills go only to an agent setup writes no
        // instructions for (Cursor and Trae keep user rules in their settings).
        const instructed =
          components.has('instructions') &&
          harness.instructions(scope, env).some((target) => target.kind !== 'none')
        for (const [relative, content] of Object.entries(instructed ? {} : skills))
          add(steps, stepKey, {
            kind: 'skill',
            component,
            agents,
            path: join(dir, ...relative.split('/')),
            content,
          })
        for (const [relative, content] of Object.entries(
          instructed ? { ...retiredSkills, ...skills } : retiredSkills,
        ))
          add(steps, stepKey, {
            kind: 'retire-skill',
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
  // A skills directory two agents read (`~/.agents/skills`) keeps a skill while either agent gets it.
  const installed = new Set(steps.flatMap((step) => (step.kind === 'skill' ? [step.path] : [])))
  return steps.filter((step) => step.kind !== 'retire-skill' || !installed.has(step.path))
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
 * Remove a file setup wrote earlier, unless the user edited it (`force` removes it anyway), and its
 * folder once that is empty.
 *
 * @param path - The file.
 * @param content - What setup wrote there.
 * @param force - Remove an edited copy too.
 * @returns `removed`, `kept` (edited) or `absent`.
 */
const retireOwnedFile = (
  path: string,
  content: string,
  force: boolean,
): SetupStepResult['status'] => {
  if (!existsSync(path)) return 'absent'
  if (!force && readFileSync(path, 'utf8') !== content) return 'kept'
  rmSync(path)
  if (readdirSync(dirname(path)).length === 0) rmdirSync(dirname(path))
  return 'removed'
}

/**
 * Whether a TOML text already defines the dotted `table` (`mcp_servers.molecule`):
 * as a `[table]` / `[table.sub]` header, as a key inside its parent table
 * (`[mcp_servers]` then `molecule = {…}` or `molecule.command = …`), or as a
 * dotted key at the top level. A quoted part (`[mcp_servers."molecule"]`, `"command" = …`) names
 * the same key as the bare one.
 */
export function tomlDefinesTable(text: string, table: string): boolean {
  let header = ''
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const heading = /^\[\[?\s*([^\]]+?)\s*\]\]?$/.exec(line)
    if (heading) {
      header = tomlDottedName(heading[1])
      if (header === table || header.startsWith(`${table}.`)) return true
      continue
    }
    const key = /^([\w.\-\s"']+?)\s*=/.exec(line)?.[1]
    if (!key) continue
    const full = header ? `${header}.${tomlDottedName(key)}` : tomlDottedName(key)
    if (full === table || full.startsWith(`${table}.`)) return true
  }
  return false
}

/** A dotted TOML name with its spaces and the quotes of its simple parts removed: `a . "b"` → `a.b`. */
const tomlDottedName = (name: string): string =>
  name
    .trim()
    .replace(/\s*\.\s*/g, '.')
    .replace(/(["'])([\w-]+)\1/g, '$2')

/** The dotted name a TOML `[table]` / `[[table]]` heading line opens, or null for any other line. */
const tomlHeading = (row: string): string | null => {
  const name = /^\[\[?\s*([^\]]+?)\s*\]\]?$/.exec(row.replace(/#.*$/, '').trim())?.[1]
  return name === undefined ? null : tomlDottedName(name)
}

/** The key a TOML `key = value` line sets, bare or quoted (`"command"`), or null for any other line. */
const tomlLineKey = (line: string): string | null => {
  const match = /^\s*(?:(["'])([\w-]+)\1|([\w-]+))\s*=/.exec(line.replace(/#.*$/, ''))
  return match ? (match[2] ?? match[3]) : null
}

/**
 * The setting a key holds: a timeout in seconds and the same timeout in milliseconds
 * (`startup_timeout_sec`, `startup_timeout_ms`) are one setting, and the user's unit wins.
 */
const tomlSetting = (line: string): string | null =>
  tomlLineKey(line)?.replace(/_(?:sec|ms)$/, '') ?? null

/** A TOML line with its comment and every space removed, to compare one value with another. */
const tomlLineValue = (line: string): string => line.replace(/#.*$/, '').replace(/\s+/g, '')

/**
 * The TOML table Codex reads, holding every key of `lines`. The table is appended when the file
 * does not define it. When it is a `[table]` block, each key of `lines` the block does not set yet
 * goes at the end of the block, and every key it already sets keeps its value: a user's own command
 * or timeout wins. The exception is a block holding every line of `legacyLines` (an older setup's
 * command): those lines take the value `lines` gives their key. A table defined any other way
 * (dotted keys, an inline table), and a block that sets `url` (a streamable HTTP registration,
 * which takes no command, timeouts or environment), are left as they are.
 */
function ensureTomlTable(
  path: string,
  table: string,
  lines: string[],
  legacyLines: string[] = [],
): SetupStepResult['status'] {
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''
  if (!tomlDefinesTable(text, table)) {
    mkdirSync(dirname(path), { recursive: true })
    const block = `[${table}]\n${lines.join('\n')}\n`
    writeFileSync(path, text.trim() === '' ? block : `${text.trimEnd()}\n\n${block}`)
    return text === '' ? 'written' : 'updated'
  }
  const rows = text.split('\n')
  const start = rows.findIndex((row) => tomlHeading(row) === table)
  if (start < 0) return 'present'
  let end = rows.findIndex((row, at) => at > start && tomlHeading(row) !== null)
  if (end < 0) end = rows.length
  const block = rows.slice(start + 1, end)
  if (block.some((row) => tomlLineKey(row) === 'url')) return 'present'
  const legacy = new Set(legacyLines.map(tomlLineValue))
  let replaced = false
  if (
    legacy.size > 0 &&
    [...legacy].every((line) => block.some((row) => tomlLineValue(row) === line))
  )
    for (let at = start + 1; at < end; at++) {
      if (!legacy.has(tomlLineValue(rows[at]))) continue
      const next = lines.find((line) => tomlLineKey(line) === tomlLineKey(rows[at]))
      if (next === undefined || tomlLineValue(next) === tomlLineValue(rows[at])) continue
      rows[at] = next
      replaced = true
    }
  const set = new Set(rows.slice(start + 1, end).map(tomlSetting))
  const missing = lines.filter((line) => !set.has(tomlSetting(line)))
  if (missing.length === 0) {
    if (!replaced) return 'present'
    writeFileSync(path, rows.join('\n'))
    return 'updated'
  }
  let last = end - 1
  while (last > start && rows[last].trim() === '') last--
  rows.splice(last + 1, 0, ...missing)
  writeFileSync(path, rows.join('\n'))
  return 'updated'
}

/**
 * The lines of a `[table]` block in a TOML file, or null when the file defines no such block
 * (no table, or one written as dotted keys or an inline table).
 */
function tomlTableBlock(path: string, table: string): string[] | null {
  if (!existsSync(path)) return null
  const rows = readFileSync(path, 'utf8').split('\n')
  const start = rows.findIndex((row) => tomlHeading(row) === table)
  if (start < 0) return null
  const end = rows.findIndex((row, at) => at > start && tomlHeading(row) !== null)
  return rows.slice(start + 1, end < 0 ? rows.length : end)
}

/**
 * {@link ensureTomlTable}, then the target's split: while the table runs setup's own command, its
 * split lines go in it and the second table is ensured beside it.
 */
function ensureTomlTarget(target: Extract<McpTarget, { kind: 'toml' }>): SetupStepResult['status'] {
  const first = ensureTomlTable(target.path, target.table, target.lines, target.legacyLines)
  const split = target.split
  if (!split) return first
  const block = tomlTableBlock(target.path, target.table)
  const own =
    block !== null &&
    split.command.every((line) => block.some((row) => tomlLineValue(row) === tomlLineValue(line)))
  if (!own) return first
  const statuses = [
    first,
    ensureTomlTable(target.path, target.table, split.lines),
    ensureTomlTable(target.path, split.table, split.tableLines),
  ]
  if (first === 'written') return 'written'
  return statuses.includes('updated') ? 'updated' : 'present'
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
      if (
        target.unlessToml &&
        existsSync(target.unlessToml.path) &&
        tomlDefinesTable(readFileSync(target.unlessToml.path, 'utf8'), target.unlessToml.table)
      )
        return { status: 'present' }
      // An entry an older setup made: rewrite it in the file, or remove it with the CLI first
      // (the CLI refuses to add a name that exists).
      let replacing = false
      for (const legacy of target.legacy ?? []) {
        if (!jsonConfigEntryMatches(legacy.path, legacy.keys, MCP_SERVER_NAME, legacy.match))
          continue
        if (!legacy.remove) {
          mergeJsonConfigEntry(
            legacy.path,
            legacy.keys,
            MCP_SERVER_NAME,
            legacy.entry,
            legacy.match,
          )
          return { status: 'updated' }
        }
        const removed = await runCli(target.bin, legacy.remove)
        if (!removed.ok)
          return {
            status: 'failed',
            detail: `${target.bin} ${legacy.remove.join(' ')}: ${removed.output.trim().split('\n').pop() || 'failed'}`,
          }
        replacing = true
      }
      const { ok, output } = await runCli(target.bin, target.args)
      const last = output.trim().split('\n').pop() ?? ''
      if (ok) return { status: replacing ? 'updated' : 'written', detail: last }
      if (/already exists/i.test(output)) return { status: 'present', detail: last }
      return {
        status: 'failed',
        detail: `${target.bin} ${target.args.join(' ')}: ${last || 'failed'}`,
      }
    }
    case 'json': {
      const result = mergeJsonConfigEntry(
        target.path,
        target.keys,
        MCP_SERVER_NAME,
        target.entry,
        target.legacy,
      )
      return {
        status: result === 'present' ? 'present' : result === 'updated' ? 'updated' : 'written',
      }
    }
    case 'toml':
      return { status: ensureTomlTarget(target) }
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
      } else if (step.kind === 'retire-skill') {
        results.push({ step, status: retireOwnedFile(step.path, step.content, options.force) })
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
