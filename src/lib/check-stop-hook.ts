/**
 * `mlcl check --stop-hook <harness>`: the check a coding harness runs when its agent is about to
 * stop, so type and lint errors go back to the agent before it hands the work over. This is the
 * loop the Molecule harness runs after every turn that changed files: type-check and lint, the
 * errors returned as a message to fix, at most three rounds.
 *
 * The hook runs the check only when the project's files changed since its last passing run, and
 * prints nothing on a pass. It stops asking after {@link STOP_HOOK_MAX_BLOCKS} failed rounds in a
 * row, so an error the agent cannot fix never traps it. The scaffold declares the hook for each
 * harness that has one (`stop-hooks.ts`).
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { checkLogDir, type CheckStepKind, runCheckLocal } from './check.js'

/** The harnesses whose stop hook `mlcl check --stop-hook` answers. */
export const STOP_HOOK_HARNESSES = ['claude', 'codex', 'cursor'] as const

/** One of {@link STOP_HOOK_HARNESSES}. */
export type StopHookHarness = (typeof STOP_HOOK_HARNESSES)[number]

/** The steps the hook runs: the Molecule harness's post-turn verification. */
export const STOP_HOOK_STEPS: readonly CheckStepKind[] = ['typecheck', 'lint']

/** Failed rounds in a row after which the hook lets the agent stop. */
export const STOP_HOOK_MAX_BLOCKS = 3

/** The check's time budget in the hook (the harnesses' hook timeout is set above it). */
export const STOP_HOOK_BUDGET_MS = 5 * 60_000

/** How long the hook waits for the harness's input on stdin. */
export const STOP_HOOK_INPUT_MS = 2_000

/**
 * Everything a harness wrote to the hook's stdin: '' for a terminal, and what arrived so far when
 * the stream is still open after `timeoutMs` (a harness that never closes it must not hang the hook).
 *
 * @param stream - The hook's stdin.
 * @param timeoutMs - How long to wait for the stream to end.
 * @returns The text.
 */
export async function readHookInput(
  stream: NodeJS.ReadableStream & { isTTY?: boolean } = process.stdin,
  timeoutMs = STOP_HOOK_INPUT_MS,
): Promise<string> {
  if (stream.isTTY) return ''
  return new Promise((resolve) => {
    let text = ''
    const done = (): void => {
      clearTimeout(timer)
      stream.pause()
      resolve(text)
    }
    const timer = setTimeout(done, timeoutMs)
    timer.unref()
    stream.setEncoding('utf8')
    stream.on('data', (chunk: string) => {
      text += chunk
    })
    stream.on('end', done)
    stream.on('error', done)
  })
}

/** What the hook remembers between stops, in the check's cache directory. */
interface StopHookState {
  /** The fingerprint of the files at the last passing run. */
  passed?: string
  /** Failed rounds in a row, by session. */
  blocks: Record<string, number>
}

/** The parts of a harness's stop-hook input the hook reads. */
export interface StopHookInput {
  /** The session (Claude Code, Codex) or conversation (Cursor) the stop belongs to. */
  sessionId: string
  /**
   * True when the agent is already continuing because a stop hook asked it to (Claude Code's
   * `stop_hook_active`). False starts a new run of rounds.
   */
  continuing: boolean
}

/**
 * Read a harness's stop-hook input.
 *
 * @param raw - The JSON the harness wrote to the hook's stdin (empty when there was none).
 * @returns The session and whether a stop hook already continued it.
 */
export function parseStopHookInput(raw: string): StopHookInput {
  let input: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') input = parsed as Record<string, unknown>
  } catch (_error) {
    // No input, or not JSON: every stop is one session that is not continuing.
  }
  const id = [input.session_id, input.conversation_id].find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )
  return {
    sessionId: id ?? 'default',
    continuing:
      input.stop_hook_active === true ||
      (typeof input.loop_count === 'number' && input.loop_count > 0),
  }
}

/**
 * A fingerprint of the project's working tree: HEAD plus each changed or untracked file's path,
 * size and modification time, as git lists them. Null outside a git repository, where every stop
 * runs the check.
 *
 * @param root - The project root.
 * @returns The fingerprint, or null.
 */
export function treeFingerprint(root: string): string | null {
  const git = (args: string[]): string | null => {
    try {
      return execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 10_000,
        maxBuffer: 1 << 26,
      })
    } catch (_error) {
      return null
    }
  }
  const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  if (status === null) return null
  const hash = createHash('sha256').update(git(['rev-parse', '--verify', '-q', 'HEAD']) ?? '')
  for (const entry of status.split('\0').filter(Boolean)) {
    const path = entry.slice(3)
    hash.update(`\0${entry}`)
    try {
      const stat = statSync(join(root, path))
      hash.update(`\0${stat.size}\0${stat.mtimeMs}`)
    } catch (_error) {
      // A deleted file: its status line already says so.
    }
  }
  return hash.digest('hex')
}

/** Where the hook keeps its state. */
function statePath(root: string): string {
  return join(checkLogDir(root), 'stop-hook.json')
}

/**
 * The hook's state for a project.
 *
 * @param root - The project root.
 * @returns The stored state, or an empty one.
 */
export function readStopHookState(root: string): StopHookState {
  try {
    const state = JSON.parse(readFileSync(statePath(root), 'utf8')) as Partial<StopHookState>
    return { passed: state.passed, blocks: state.blocks ?? {} }
  } catch (_error) {
    return { blocks: {} }
  }
}

/**
 * Store the hook's state for a project.
 *
 * @param root - The project root.
 * @param state - The state.
 */
export function writeStopHookState(root: string, state: StopHookState): void {
  mkdirSync(checkLogDir(root), { recursive: true })
  writeFileSync(statePath(root), `${JSON.stringify(state)}\n`)
}

/**
 * Whether this stop runs the check.
 *
 * @param root - The project root.
 * @param fingerprint - {@link treeFingerprint} now.
 * @param state - The stored state.
 * @returns `run`, or why not: the dependencies are not installed (there is nothing to check
 *   against yet), or nothing changed since the last pass.
 */
export function stopHookPlan(
  root: string,
  fingerprint: string | null,
  state: StopHookState,
): 'run' | 'not-installed' | 'unchanged' {
  if (!existsSync(join(root, 'node_modules'))) return 'not-installed'
  if (fingerprint !== null && state.passed === fingerprint) return 'unchanged'
  return 'run'
}

/**
 * The message that sends the agent back to fix the errors.
 *
 * @param report - The check's report.
 * @returns The message.
 */
export function stopHookReason(report: string): string {
  return [
    'npx mlcl check found type or lint errors. Fix every error below at its cause (not by disabling the check or casting it away), then stop again:',
    '',
    report.trim(),
  ].join('\n')
}

/**
 * What the hook prints to make the harness continue with the errors, in that harness's format.
 *
 * @param harness - The harness the hook answers.
 * @param reason - {@link stopHookReason}.
 * @returns The stdout text.
 */
export function stopHookOutput(harness: StopHookHarness, reason: string): string {
  if (harness === 'cursor') return JSON.stringify({ followup_message: reason })
  return JSON.stringify({ decision: 'block', reason })
}

/**
 * Answer one stop: run the check when it is due and return what to print, or null to let the
 * agent stop.
 *
 * @param root - The project root.
 * @param harness - The harness whose hook format to answer in.
 * @param rawInput - The hook's stdin.
 * @returns The stdout text that continues the agent with the errors, or null.
 */
export async function runStopHook(
  root: string,
  harness: StopHookHarness,
  rawInput: string,
): Promise<string | null> {
  const input = parseStopHookInput(rawInput)
  const state = readStopHookState(root)
  // A stop the agent reached on its own starts a new run of rounds.
  if (!input.continuing) delete state.blocks[input.sessionId]
  const blocks = state.blocks[input.sessionId] ?? 0
  if (blocks >= STOP_HOOK_MAX_BLOCKS) return null
  const fingerprint = treeFingerprint(root)
  if (stopHookPlan(root, fingerprint, state) !== 'run') return null
  const result = await runCheckLocal(
    root,
    { steps: [...STOP_HOOK_STEPS] },
    { budgetMs: STOP_HOOK_BUDGET_MS },
  )
  if ('error' in result) return null
  if (result.ok) {
    // The fingerprint from before the run: a file changed while the check ran is checked next time.
    delete state.blocks[input.sessionId]
    writeStopHookState(root, { passed: fingerprint ?? undefined, blocks: state.blocks })
    return null
  }
  writeStopHookState(root, {
    passed: state.passed,
    blocks: { ...state.blocks, [input.sessionId]: blocks + 1 },
  })
  return stopHookOutput(harness, stopHookReason(result.report))
}
