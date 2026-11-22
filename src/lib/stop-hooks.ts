/**
 * The stop hooks a scaffold declares, one per harness that has them, each running
 * `mlcl check --stop-hook <harness>` (`check-stop-hook.ts`) when the agent is about to stop:
 *
 * - Claude Code: `.claude/settings.json`, through the `.claude` → `.agents` link. Claude Code
 *   loads a project settings file written during the session, so the hook applies from the first
 *   stop after `mlcl create .`.
 * - Codex: `.codex/hooks.json`. Codex runs a project hook once the user has reviewed and trusted
 *   it (`/hooks`).
 * - Cursor: `.cursor/hooks.json`, in any trusted workspace.
 *
 * The command names the mlcl version that scaffolded the project, so the check a project runs does
 * not change under it. A file that already exists is left as it is.
 *
 * @module
 */

import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { STOP_HOOK_MAX_BLOCKS } from './check-stop-hook.js'

/** Seconds a harness waits for the hook: the check's own budget, plus `npx` resolving mlcl. */
const HOOK_TIMEOUT_SECONDS = 360

/**
 * The hook files for a project, by path relative to its root.
 *
 * @param cliVersion - The mlcl version the hooks run.
 * @param claudeDir - Where `.claude` resolves to, relative to the root (`.agents` through the
 *   scaffold's link, or the user's own `.claude`).
 * @returns The files' JSON text.
 */
export function stopHookFiles(cliVersion: string, claudeDir: string): Record<string, string> {
  const check = (harness: string): string =>
    `npx --yes mlcl@${cliVersion} check --stop-hook ${harness}`
  const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`
  return {
    [join(claudeDir, 'settings.json')]: json({
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command: `cd "$CLAUDE_PROJECT_DIR" && ${check('claude')}`,
                timeout: HOOK_TIMEOUT_SECONDS,
              },
            ],
          },
        ],
      },
    }),
    [join('.codex', 'hooks.json')]: json({
      description: 'Type-check and lint when the agent stops (npx mlcl check).',
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                // Codex runs a hook in the session's directory and documents no project-root
                // variable; the git root is its advice for repository hooks.
                command: `cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" && ${check('codex')}`,
                timeout: HOOK_TIMEOUT_SECONDS,
              },
            ],
          },
        ],
      },
    }),
    [join('.cursor', 'hooks.json')]: json({
      version: 1,
      hooks: {
        stop: [
          {
            command: check('cursor'),
            timeout: HOOK_TIMEOUT_SECONDS,
            loop_limit: STOP_HOOK_MAX_BLOCKS,
          },
        ],
      },
    }),
  }
}

/**
 * Write the project's stop hooks, keeping any file that exists. Claude Code's goes in the directory
 * `.claude` resolves to; with no `.claude` (the link was refused) there is none.
 *
 * @param projectRoot - The project root.
 * @param cliVersion - The mlcl version the hooks run.
 * @returns The paths written, relative to the root.
 */
export function writeStopHooks(projectRoot: string, cliVersion: string): string[] {
  const claudeDir = claudeSettingsDir(projectRoot)
  const written: string[] = []
  for (const [path, text] of Object.entries(stopHookFiles(cliVersion, claudeDir ?? '.claude'))) {
    if (claudeDir === null && path.startsWith('.claude')) continue
    const target = join(projectRoot, path)
    if (existsSync(target)) continue
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, text)
    written.push(path)
  }
  return written
}

/**
 * Where `.claude` resolves to in a project.
 *
 * @param projectRoot - The project root.
 * @returns `.agents` when `.claude` is the scaffold's link to it, `.claude` for the user's own
 *   directory, or null when there is no `.claude`.
 */
function claudeSettingsDir(projectRoot: string): '.agents' | '.claude' | null {
  const claude = join(projectRoot, '.claude')
  if (!existsSync(claude)) return null
  try {
    return realpathSync(claude) === realpathSync(join(projectRoot, '.agents'))
      ? '.agents'
      : '.claude'
  } catch (_error) {
    return '.claude'
  }
}
