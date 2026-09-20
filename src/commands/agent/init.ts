import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { setTelemetryContext } from '../../lib/telemetry.js'
import { ui } from '../../lib/ui.js'

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

const GEMINI_EXTENSION = (body: string): string =>
  `# Molecule\n\nGemini CLI extension: the molecule conventions + mlcl quickstart.\n\n${body.replace(/^## Molecule\n/, '')}`

const WINDSURF_RULE = (body: string): string =>
  `---\ntrigger: always_on\ndescription: Molecule conventions — build and extend apps with mlcl + @molecule packages\n---\n\n${body}`

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
    setTelemetryContext({ harness })

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
        result === 'skipped'
          ? ui.ok(`Already present (molecule section): ${target}`)
          : `${ui.check('Updated')} molecule section → ${ui.id(target)}`,
      )
      this.log(
        `${ui.heading(`Harness: ${harness}`)} ${ui.dim('(global). Your agent now knows the molecule way in every session.')}`,
      )
      return
    }

    // AGENTS.md — the cross-harness standard section every major agent reads.
    const agentsResult = ensureSection(join(root, 'AGENTS.md'), body, flags.force)
    this.log(
      agentsResult === 'skipped'
        ? ui.ok('Already present: molecule section in AGENTS.md')
        : `${ui.check('Wrote')} molecule section → ${ui.id('AGENTS.md')}`,
    )

    // Harness-specific surfaces on top of the standard.
    if (harness === 'cursor') {
      const rulePath = join(root, '.cursor', 'rules', 'molecule.mdc')
      mkdirSync(join(rulePath, '..'), { recursive: true })
      writeFileSync(rulePath, CURSOR_RULE(body))
      this.log(`${ui.check('Wrote')} cursor rule → ${ui.id('.cursor/rules/molecule.mdc')}`)
    }
    if (harness === 'claude-code') {
      const skillPath = join(root, '.claude', 'skills', 'molecule', 'SKILL.md')
      mkdirSync(join(skillPath, '..'), { recursive: true })
      writeFileSync(skillPath, CLAUDE_SKILL(body))
      this.log(`${ui.check('Wrote')} claude skill → ${ui.id('.claude/skills/molecule/SKILL.md')}`)
    }
    if (harness === 'gemini') {
      // Gemini CLI extensions: a directory with a GEMINI.md context file.
      const extPath = join(root, '.gemini', 'extensions', 'molecule', 'GEMINI.md')
      mkdirSync(join(extPath, '..'), { recursive: true })
      writeFileSync(extPath, GEMINI_EXTENSION(body))
      this.log(
        `${ui.check('Wrote')} gemini extension → ${ui.id('.gemini/extensions/molecule/GEMINI.md')}`,
      )
    }
    if (harness === 'windsurf') {
      // Windsurf rules live in .windsurf/rules with trigger frontmatter.
      const rulePath = join(root, '.windsurf', 'rules', 'molecule.md')
      mkdirSync(join(rulePath, '..'), { recursive: true })
      writeFileSync(rulePath, WINDSURF_RULE(body))
      this.log(`${ui.check('Wrote')} windsurf rule → ${ui.id('.windsurf/rules/molecule.md')}`)
    }

    this.log(
      `\n${ui.heading(`Harness: ${harness}`)}. ${ui.dim('Next: ask your agent to build something —')}`,
    )
    this.log(
      `  ${ui.cmd('"Build me a blog with molecule"')} ${ui.dim('— it now knows to reach for mlcl.')}`,
    )
    this.log(
      `\n${ui.dim('For structured tools (search_packages, scaffold_project, …), add the molecule MCP server:')}`,
    )
    for (const line of MCP_INSTALL_HINTS[harness] ?? MCP_INSTALL_HINTS.generic)
      this.log(`  ${ui.cmd(line)}`)
  }
}

/** The harness's OWN native install command, printed by agent init. */
const MCP_INSTALL_HINTS: Record<string, string[]> = {
  'claude-code': [
    'claude mcp add molecule -- npx -y molecule-mcp',
    '(or the full plugin: /plugin marketplace add molecule-dev/molecule-claude-code)',
  ],
  cursor: ['cursor mcp add molecule -- npx -y molecule-mcp'],
  gemini: ['gemini mcp add molecule npx -y molecule-mcp   # note: no -- separator'],
  codex: ['codex mcp add molecule -- npx -y molecule-mcp'],
  windsurf: [
    'Windsurf Settings → MCP → Add Server, or ~/.codeium/windsurf/mcp_config.json:',
    '  {"mcpServers":{"molecule":{"command":"npx","args":["-y","molecule-mcp"]}}}',
  ],
  generic: ['any MCP client → command: npx, args: ["-y", "molecule-mcp"]'],
}
