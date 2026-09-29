/**
 * Finds the agent sessions a harness recorded for a directory on this
 * machine, so `mlcl transcripts import --from <harness>` can send them
 * without the person hunting for files.
 *
 * Only names, sizes and the working directory a session recorded are read
 * here — never the conversation itself. The file's text is read later, one
 * file at a time, when it is actually sent.
 *
 * @module
 */

import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/** A harness whose local sessions can be discovered. */
export type DiscoverableHarness = 'claude-code' | 'codex'

/** The harnesses {@link discoverSessions} knows where to look for. */
export const DISCOVERABLE_HARNESSES: readonly DiscoverableHarness[] = ['claude-code', 'codex']

/** One session file found on disk. */
export interface DiscoveredSession {
  /** Absolute path to the session file. */
  path: string
  /** Size in bytes. */
  size: number
  /** Last modification time, ISO 8601. */
  modifiedAt: string
}

/**
 * The directory name Claude Code keeps a project's sessions under: the
 * project's absolute path with every character that is not a letter or a
 * digit replaced by `-` (`/home/me/app.v2` → `-home-me-app-v2`).
 *
 * @param cwd - The project directory.
 * @returns The directory name under `~/.claude/projects`.
 */
export function claudeProjectDirName(cwd: string): string {
  return resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-')
}

/**
 * Reads a file's first line without reading the rest (Codex puts the whole
 * system prompt in its first line, so the line can be large).
 *
 * @param path - The file.
 * @param maxBytes - Stop looking for the newline after this many bytes.
 * @returns The first line, or null when none ends within the limit.
 */
export function readFirstLine(path: string, maxBytes = 8 * 1024 * 1024): string | null {
  const fd = openSync(path, 'r')
  try {
    const chunk = Buffer.alloc(64 * 1024)
    const parts: Buffer[] = []
    let read = 0
    while (read < maxBytes) {
      const n = readSync(fd, chunk, 0, chunk.length, read)
      if (n === 0) break
      const slice = chunk.subarray(0, n)
      const nl = slice.indexOf(0x0a)
      if (nl !== -1) {
        parts.push(Buffer.from(slice.subarray(0, nl)))
        return Buffer.concat(parts).toString('utf8')
      }
      parts.push(Buffer.from(slice))
      read += n
    }
    // A file with a single line and no trailing newline is still one line.
    return read > 0 && read < maxBytes ? Buffer.concat(parts).toString('utf8') : null
  } finally {
    closeSync(fd)
  }
}

/**
 * The working directory a Codex rollout recorded in its `session_meta` line.
 *
 * @param path - A `rollout-*.jsonl` file.
 * @returns The recorded directory, or null when the file does not start with one.
 */
export function codexSessionCwd(path: string): string | null {
  const line = readFirstLine(path)
  if (!line) return null
  try {
    const first = JSON.parse(line) as { type?: string; payload?: { cwd?: unknown } }
    return first.type === 'session_meta' && typeof first.payload?.cwd === 'string'
      ? first.payload.cwd
      : null
  } catch (_error) {
    // Not JSON: not a rollout this reader understands.
    return null
  }
}

function describe(path: string): DiscoveredSession {
  const st = statSync(path)
  return { path, size: st.size, modifiedAt: st.mtime.toISOString() }
}

function walkFiles(dir: string, match: (name: string) => boolean, out: string[]): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, match, out)
    else if (entry.isFile() && match(entry.name)) out.push(full)
  }
}

/**
 * Every session a harness recorded for a directory, oldest first.
 *
 * - Claude Code: `~/.claude/projects/<dir name>/*.jsonl` (see {@link claudeProjectDirName}).
 * - Codex: `~/.codex/sessions/**\/rollout-*.jsonl` whose `session_meta` names the directory.
 *
 * @param harness - Which harness's store to search.
 * @param cwd - The project directory the sessions ran in.
 * @param home - The home directory (tests pass a fixture).
 * @returns The session files found.
 */
export function discoverSessions(
  harness: DiscoverableHarness,
  cwd: string,
  home: string = homedir(),
): DiscoveredSession[] {
  const target = resolve(cwd)
  const found: string[] = []
  if (harness === 'claude-code') {
    const dir = join(home, '.claude', 'projects', claudeProjectDirName(target))
    if (existsSync(dir)) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.jsonl')) found.push(join(dir, entry.name))
      }
    }
  } else {
    const all: string[] = []
    walkFiles(
      join(home, '.codex', 'sessions'),
      (name) => name.startsWith('rollout-') && name.endsWith('.jsonl'),
      all,
    )
    for (const path of all) {
      const recorded = codexSessionCwd(path)
      if (recorded && resolve(recorded) === target) found.push(path)
    }
  }
  return found.map(describe).sort((a, b) => a.modifiedAt.localeCompare(b.modifiedAt))
}
