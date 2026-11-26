import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import type { Readable } from 'node:stream'
import { setTimeout as pause } from 'node:timers/promises'

import { CLI_COMMAND } from '#cli-command'

const MAX_OUTPUT_BYTES = 16 * 1024 * 1024
const STOP_GRACE_MS = 200

interface CommandExit {
  code: number | null
  signal: NodeJS.Signals | null
  error?: Error
}

export interface CheckCommand {
  exited: Promise<CommandExit>
  closed: Promise<void>
  output: () => { stdout: string; stderr: string }
  send: (signal: NodeJS.Signals | 0) => boolean
}

function capture(
  stream: Readable,
  name: string,
  onOverflow: (error: Error) => void,
  onLine?: (line: string) => void,
): () => string {
  let text = ''
  let bytes = 0
  let partial = ''
  stream.setEncoding('utf8').on('data', (data: string) => {
    const size = Buffer.byteLength(data)
    if (bytes <= MAX_OUTPUT_BYTES && bytes + size > MAX_OUTPUT_BYTES)
      onOverflow(new Error(`Check ${name} exceeded the 16 MiB limit`))
    bytes += size
    if (bytes <= MAX_OUTPUT_BYTES) text += data
    if (!onLine) return
    const lines = (partial + data).split('\n')
    partial = lines.pop() ?? ''
    for (const line of lines) onLine(line.replace(/\r$/, ''))
  })
  return () => text
}

/**
 * Run in a private process group so a check owns the shell and its descendants. `onLine` is told
 * each complete line the command prints on stdout, as it prints it.
 */
export function spawnCheckCommand(
  command: string,
  cwd: string,
  onOverflow: (error: Error) => void,
  onLine?: (line: string) => void,
): CheckCommand {
  const windows = process.platform === 'win32'
  const grouped = !windows
  // Every step is a bash command line. Windows has no /bin/bash: Git for Windows and WSL put a
  // `bash` on PATH.
  const child = spawn(windows ? 'bash' : '/bin/bash', ['-c', command], {
    cwd,
    detached: grouped,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const stdout = capture(child.stdout, 'stdout', onOverflow, onLine)
  const stderr = capture(child.stderr, 'stderr', onOverflow)
  const exited = new Promise<CommandExit>((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }))
    child.once('error', (error) =>
      resolve({ code: null, signal: null, error: noBash(error, windows) }),
    )
  })
  const closed = new Promise<void>((resolve) => child.once('close', () => resolve()))

  return {
    exited,
    closed,
    output: () => ({ stdout: stdout(), stderr: stderr() }),
    send(signal: NodeJS.Signals | 0): boolean {
      try {
        return grouped && child.pid ? process.kill(-child.pid, signal) : child.kill(signal)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
        throw error
      }
    },
  }
}

/** A spawn that found no bash, said as what to install; any other error as it is. */
function noBash(error: Error, windows: boolean): Error {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return error
  return new Error(
    windows
      ? `${CLI_COMMAND} check runs each step in bash, and none is on PATH: install Git for Windows (it provides bash) or run mlcl in WSL.`
      : `${CLI_COMMAND} check runs each step in /bin/bash, and it does not exist.`,
    { cause: error },
  )
}

async function groupExited(command: CheckCommand): Promise<boolean> {
  const deadline = performance.now() + STOP_GRACE_MS
  while (command.send(0)) {
    if (performance.now() >= deadline) return false
    await pause(10)
  }
  return true
}

/** Wait for the shell and its descendants, even when the shell exits first. */
export async function stopCheckCommand(command: CheckCommand): Promise<void> {
  if (command.send('SIGTERM') && !(await groupExited(command))) {
    command.send('SIGKILL')
    // A descendant may have closed its stdio, so the shell's close event alone is not enough.
    await groupExited(command)
  }
  await command.closed
}
