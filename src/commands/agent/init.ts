import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

const SECTION_MARKER = '## Molecule'

/** Per-harness file markers used by --agent auto detection (project root). */
const HARNESS_MARKERS: Record<string, string[]> = {
  'claude-code': ['.claude', 'CLAUDE.md'],
  cursor: ['.cursor'],
  codex: ['.codex'],
  zcode: ['.zcode'],
  gemini: ['.gemini'],
  windsurf: ['.windsurf'],
}

/** Harnesses with a well-known GLOBAL instructions file for --global. */
const GLOBAL_FILES: Record<string, string> = {
  'claude-code': join(homedir(), '.claude', 'CLAUDE.md'),
  codex: join(homedir(), '.codex', 'AGENTS.md'),
  gemini: join(homedir(), '.gemini', 'GEMINI.md'),
}

const CURSOR_RULE = (body: string): string =>
  `---\ndescription: Build and extend full-stack apps with Molecule (mlcl scaffold, @molecule packages, bonds)\nalwaysApply: true\n---\n\n${body}`

const CLAUDE_SKILL = (body: string): string =>
  `---\nname: molecule\ndescription: Build and extend full-stack apps with Molecule — scaffold with mlcl, prefer @molecule/* packages, swap providers via bonds\n---\n\n${body}`

/** Detect which agent harness is active in a directory, if any. */
function detectHarness(root: string): string {
  for (const [harness, markers] of Object.entries(HARNESS_MARKERS)) {
    if (markers.some((m) => existsSync(join(root, m)))) return harness
  }
  // No harness-specific markers — AGENTS.md is the cross-harness standard
  // (Claude Code, Codex, Cursor, Pi, … all read it).
  return 'generic'
}

/**
 * Ensure the Molecule doctrine section exists in a markdown instructions
 * file. Idempotent: an existing section is left alone unless `force` replaces
 * it (from the marker heading up to the next `## ` heading or EOF).
 */
function ensureSection(
  filePath: string,
  body: string,
  force: boolean,
): 'created' | 'added' | 'replaced' | 'skipped' {
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
  const markerIdx = existing.indexOf(SECTION_MARKER)
  if (markerIdx !== -1 && !force) return 'skipped'

  let out: string
  if (markerIdx !== -1) {
    // Replace from the marker to the next top-level heading (or EOF).
    const after = existing.indexOf('\n## ', markerIdx + SECTION_MARKER.length)
    const end = after === -1 ? existing.length : after + 1
    out = existing.slice(0, markerIdx) + body.trimEnd() + '\n' + existing.slice(end)
  } else {
    out = existing === '' ? `${body.trimEnd()}\n` : `${existing.trimEnd()}\n\n${body.trimEnd()}\n`
  }
  writeFileSync(filePath, out)
  return markerIdx === -1 ? (existing === '' ? 'created' : 'added') : 'replaced'
}

export default class AgentInit extends Command {
  static override description =
    'Make your AI coding agent (Claude Code, Codex, Cursor, Pi, …) molecule-aware: writes the Molecule conventions + mlcl quickstart into the agent instruction files it reads'

  static override examples = [
    '<%= config.bin %> agent init            # detect harness in this project and wire it up',
    '<%= config.bin %> agent init --agent cursor',
    '<%= config.bin %> agent init --agent claude-code --global   # every project, not just this one',
  ]

  static override flags = {
    agent: Flags.string({
      description: 'Which harness to target (default: auto-detect from project markers)',
      options: ['auto', ...Object.keys(HARNESS_MARKERS), 'generic', 'pi'],
    }),
    global: Flags.boolean({
      description:
        'Write to the harness-wide instructions file instead of this project (claude-code, codex, gemini)',
      default: false,
    }),
    force: Flags.boolean({
      description: 'Rewrite the Molecule section even if already present',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(AgentInit)
    const root = process.cwd()
    const harness = flags.agent === 'auto' || !flags.agent ? detectHarness(root) : flags.agent!

    const body = readFileSync(
      join(this.config.root, 'templates', 'shared', 'agent-init-section.md.tpl'),
      'utf8',
    )

    if (flags.global) {
      const target = GLOBAL_FILES[harness]
      if (!target) {
        this.error(
          `--global is supported for ${Object.keys(GLOBAL_FILES).join(', ')} (they have well-known home-dir instruction files). For ${harness}, run without --global in the project.`,
        )
      }
      mkdirSync(join(target, '..'), { recursive: true })
      const result = ensureSection(target, body, flags.force)
      this.log(
        `${result === 'skipped' ? 'Already present' : 'Updated'} (molecule section): ${target}`,
      )
      this.log(
        `Harness: ${harness} (global). Your agent now knows the molecule way in every session.`,
      )
      return
    }

    // AGENTS.md — the cross-harness standard section every major agent reads.
    const agentsResult = ensureSection(join(root, 'AGENTS.md'), body, flags.force)
    this.log(
      `${agentsResult === 'skipped' ? 'Already present' : 'Wrote'} molecule section → AGENTS.md`,
    )

    // Harness-specific surfaces on top of the standard.
    if (harness === 'cursor') {
      const rulePath = join(root, '.cursor', 'rules', 'molecule.mdc')
      mkdirSync(join(rulePath, '..'), { recursive: true })
      writeFileSync(rulePath, CURSOR_RULE(body))
      this.log(`Wrote cursor rule → .cursor/rules/molecule.mdc`)
    }
    if (harness === 'claude-code') {
      const skillPath = join(root, '.claude', 'skills', 'molecule', 'SKILL.md')
      mkdirSync(join(skillPath, '..'), { recursive: true })
      writeFileSync(skillPath, CLAUDE_SKILL(body))
      this.log(`Wrote claude skill → .claude/skills/molecule/SKILL.md`)
    }

    this.log(`\nHarness: ${harness}. Next: ask your agent to build something —`)
    this.log('  "Build me a blog with molecule" — it now knows to reach for mlcl.')
  }
}
