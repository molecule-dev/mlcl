/**
 * Where each coding agent reads the three things Molecule installs: the MCP
 * server, skills, and always-on instructions — for the whole machine and for
 * one project.
 *
 * One table, read by `mlcl setup`, `mlcl mcp install` and `mlcl agent init`.
 * Every path and command here comes from the agent vendor's own documentation
 * (checked 2026-11-15); an agent whose docs name no file for something gets no
 * entry for it rather than a guess. When a vendor ships a native `mcp add`
 * command, it is used: that command owns the config format, its scopes and its
 * validation.
 *
 * Shared locations are named once and de-duplicated by the caller:
 * `~/.agents/skills` and `<project>/.agents/skills` are read by Codex, Cursor,
 * Gemini CLI, Devin Desktop, OpenCode and Amp; `<project>/AGENTS.md` is read by
 * nearly every agent.
 *
 * @module
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'

/** Machine-wide (every project for this user) or the current project only. */
export type SetupScope = 'machine' | 'project'

/** The MCP server every target registers. */
export const MCP_SERVER_NAME = 'molecule'

/** The command that starts the server. */
export const MCP_SERVER_COMMAND = ['npx', '-y', 'molecule-mcp'] as const

/** The `{command, args}` entry most JSON configs take. */
export const STANDARD_MCP_ENTRY: Readonly<Record<string, unknown>> = {
  command: 'npx',
  args: ['-y', 'molecule-mcp'],
}

/** What the installer looks at: injectable so tests run against a temp home. */
export interface AgentEnvironment {
  /** The user's home directory. */
  home: string
  /** The project root (`--scope project`) or the current directory. */
  cwd: string
  /** Environment variables (`CODEX_HOME`, `COPILOT_HOME`). */
  env: Record<string, string | undefined>
  /** Whether a command is on PATH. */
  onPath: (bin: string) => boolean
}

/** One way to register the MCP server with an agent. */
export type McpTarget =
  /** Run the agent's own installer (`claude mcp add …`). */
  | { kind: 'cli'; bin: string; args: string[] }
  /** Merge `molecule` into a JSON / JSONC file under `keys`, keeping comments. */
  | { kind: 'json'; path: string; keys: string[]; entry: Record<string, unknown> }
  /** Append a `[table]` to a TOML file when it is not there yet. */
  | { kind: 'toml'; path: string; table: string; lines: string[] }
  /** No safe writer: print what to add by hand. */
  | { kind: 'manual'; lines: string[] }

/** One place an agent reads always-on instructions from. */
export type InstructionTarget =
  /** A shared markdown file: only the `## Molecule` section is ours. */
  | { kind: 'section'; path: string }
  /** A file of our own in a rules directory, with the agent's frontmatter. */
  | { kind: 'file'; path: string; frontmatter: string }
  /** The agent keeps these settings outside any file. */
  | { kind: 'none'; note: string }

/** One coding agent and where it reads each thing. */
export interface AgentHarness {
  /** Stable id used by `--agent`. */
  id: string
  /** Name shown to the user. */
  label: string
  /** Older ids `--agent` still accepts. */
  aliases?: string[]
  /** The agent documents only its MCP configuration: no skills or instructions files. */
  mcpOnly?: boolean
  /** Whether the agent looks installed for this user. */
  installed: (e: AgentEnvironment) => boolean
  /** How to register the MCP server; empty when the agent has no MCP support at this scope. */
  mcp: (scope: SetupScope, e: AgentEnvironment) => McpTarget[]
  /** The skills directory; `null` when the agent reads no skills at this scope. */
  skillsDir: (scope: SetupScope, e: AgentEnvironment) => string | null
  /** Where always-on instructions go; empty when the agent reads none at this scope. */
  instructions: (scope: SetupScope, e: AgentEnvironment) => InstructionTarget[]
}

const has = (e: AgentEnvironment, bins: string[], dirs: string[]): boolean =>
  bins.some((bin) => e.onPath(bin)) || dirs.some((dir) => existsSync(join(e.home, dir)))

const agentsSkills = (scope: SetupScope, e: AgentEnvironment): string =>
  scope === 'machine' ? join(e.home, '.agents', 'skills') : join(e.cwd, '.agents', 'skills')

const projectAgentsMd = (e: AgentEnvironment): InstructionTarget => ({
  kind: 'section',
  path: join(e.cwd, 'AGENTS.md'),
})

const jsonTarget = (
  path: string,
  keys: string[] = ['mcpServers'],
  entry: Record<string, unknown> = { ...STANDARD_MCP_ENTRY },
): McpTarget => ({ kind: 'json', path, keys, entry })

/** `<dir>/<base>.jsonc` when that file exists, else `<dir>/<base>.json`. */
const jsonOrJsonc = (dir: string, base: string): string =>
  existsSync(join(dir, `${base}.jsonc`)) ? join(dir, `${base}.jsonc`) : join(dir, `${base}.json`)

const sameFile = (a: string, b: string): boolean => {
  try {
    return realpathSync(a) === realpathSync(b)
  } catch (_error) {
    // One of them does not exist yet, so they cannot be the same file.
    return false
  }
}

/**
 * Claude Code reads `CLAUDE.md` (or `.claude/CLAUDE.md`), and `AGENTS.md` only
 * when no `CLAUDE.md` exists. A `CLAUDE.md` that IS `AGENTS.md` (a symlink) or
 * imports it (`@AGENTS.md`) already carries the section written there.
 */
function claudeProjectInstructions(e: AgentEnvironment): InstructionTarget[] {
  const agents = join(e.cwd, 'AGENTS.md')
  const claude = [join(e.cwd, 'CLAUDE.md'), join(e.cwd, '.claude', 'CLAUDE.md')].find((path) =>
    existsSync(path),
  )
  if (!claude) return [{ kind: 'section', path: agents }]
  if (sameFile(claude, agents) || /^@AGENTS\.md\s*$/m.test(readFileSync(claude, 'utf8')))
    return [{ kind: 'section', path: agents }]
  return [{ kind: 'section', path: claude }]
}

const cli = (bin: string, args: string[]): McpTarget => ({ kind: 'cli', bin, args })

const manual = (...lines: string[]): McpTarget => ({ kind: 'manual', lines })

/**
 * The entry for the project `.mcp.json`, read by Claude Code and by GitHub
 * Copilot (VS Code and the CLI). Copilot requires `tools`; Claude Code accepts
 * it. A JSON merge adds only the keys an existing entry lacks, so the file
 * ends up the same whichever agent is set up first.
 */
const STDIO_ENTRY: Readonly<Record<string, unknown>> = {
  type: 'stdio',
  ...STANDARD_MCP_ENTRY,
  tools: ['*'],
}

const xdgConfig = (e: AgentEnvironment): string => e.env.XDG_CONFIG_HOME || join(e.home, '.config')

const copilotHome = (e: AgentEnvironment): string => e.env.COPILOT_HOME || join(e.home, '.copilot')

/**
 * Every agent `mlcl setup` can configure, in the order they are offered.
 * `mcpOnly` agents have documented MCP configuration but no documented skills
 * or instructions location.
 */
export const AGENT_HARNESSES: readonly AgentHarness[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    installed: (e) => has(e, ['claude'], ['.claude']),
    // `claude mcp add` defaults to the LOCAL scope (this directory only), so
    // the machine scope names `--scope user`. The project file is the shared
    // `.mcp.json`, which GitHub Copilot reads too (see STDIO_ENTRY).
    mcp: (scope, e) =>
      scope === 'project'
        ? [jsonTarget(join(e.cwd, '.mcp.json'), ['mcpServers'], { ...STDIO_ENTRY })]
        : e.onPath('claude')
          ? [
              cli('claude', [
                'mcp',
                'add',
                '--scope',
                'user',
                MCP_SERVER_NAME,
                '--',
                ...MCP_SERVER_COMMAND,
              ]),
            ]
          : [
              manual(
                `Install the claude CLI, then run: claude mcp add --scope user ${MCP_SERVER_NAME} -- ${MCP_SERVER_COMMAND.join(' ')}`,
              ),
            ],
    skillsDir: (scope, e) =>
      scope === 'machine' ? join(e.home, '.claude', 'skills') : join(e.cwd, '.claude', 'skills'),
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(e.home, '.claude', 'CLAUDE.md') }]
        : claudeProjectInstructions(e),
  },
  {
    id: 'codex',
    label: 'Codex',
    installed: (e) => has(e, ['codex'], ['.codex']) || Boolean(e.env.CODEX_HOME),
    // `codex mcp add` has no scope flag and writes ~/.codex/config.toml; a
    // project's own servers go in .codex/config.toml (trusted projects only).
    mcp: (scope, e) => {
      const toml = (path: string): McpTarget => ({
        kind: 'toml',
        path,
        table: `mcp_servers.${MCP_SERVER_NAME}`,
        lines: ['command = "npx"', 'args = ["-y", "molecule-mcp"]'],
      })
      if (scope === 'project') return [toml(join(e.cwd, '.codex', 'config.toml'))]
      if (e.onPath('codex'))
        return [cli('codex', ['mcp', 'add', MCP_SERVER_NAME, '--', ...MCP_SERVER_COMMAND])]
      return [toml(join(e.env.CODEX_HOME || join(e.home, '.codex'), 'config.toml'))]
    },
    skillsDir: agentsSkills,
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(e.env.CODEX_HOME || join(e.home, '.codex'), 'AGENTS.md') }]
        : [projectAgentsMd(e)],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    aliases: ['cursor-project'],
    installed: (e) => has(e, ['cursor', 'cursor-agent'], ['.cursor']),
    // Cursor has no `mcp add` command; its CLI only lists and enables servers.
    mcp: (scope, e) => [
      jsonTarget(join(scope === 'machine' ? e.home : e.cwd, '.cursor', 'mcp.json')),
    ],
    skillsDir: agentsSkills,
    instructions: (scope, e) =>
      scope === 'machine'
        ? [
            {
              kind: 'none',
              note: 'Cursor keeps user rules in its settings (Customize → Rules), not in a file; the skills cover every project.',
            },
          ]
        : [projectAgentsMd(e)],
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    installed: (e) => has(e, ['gemini'], ['.gemini']),
    // `gemini mcp add` defaults to the PROJECT scope; no `--` separator.
    mcp: (scope, e) =>
      e.onPath('gemini')
        ? [
            cli('gemini', [
              'mcp',
              'add',
              '-s',
              scope === 'machine' ? 'user' : 'project',
              MCP_SERVER_NAME,
              ...MCP_SERVER_COMMAND,
            ]),
          ]
        : [jsonTarget(join(scope === 'machine' ? e.home : e.cwd, '.gemini', 'settings.json'))],
    skillsDir: agentsSkills,
    instructions: (scope, e) => [
      {
        kind: 'section',
        path: scope === 'machine' ? join(e.home, '.gemini', 'GEMINI.md') : join(e.cwd, 'GEMINI.md'),
      },
    ],
  },
  {
    id: 'windsurf',
    label: 'Devin Desktop (Windsurf)',
    aliases: ['devin'],
    installed: (e) =>
      has(
        e,
        ['devin', 'windsurf'],
        [join('.config', 'devin'), '.devin', join('.codeium', 'windsurf')],
      ),
    // Windsurf became Devin Desktop; an install that still has the old
    // ~/.codeium/windsurf config keeps getting it too.
    mcp: (scope, e) => {
      if (scope === 'project') return [jsonTarget(join(e.cwd, '.devin', 'mcp_config.json'))]
      const targets = [jsonTarget(join(e.home, '.config', 'devin', 'mcp_config.json'))]
      if (existsSync(join(e.home, '.codeium', 'windsurf')))
        targets.push(jsonTarget(join(e.home, '.codeium', 'windsurf', 'mcp_config.json')))
      return targets
    },
    skillsDir: agentsSkills,
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(e.home, '.devin', 'global_rules.md') }]
        : [projectAgentsMd(e)],
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    installed: (e) => has(e, ['opencode'], [join('.config', 'opencode')]),
    // Current configs nest servers under `mcp.servers`; the CLI writes
    // whichever shape the installed version reads.
    mcp: (scope, e) => {
      if (e.onPath('opencode'))
        return [
          cli('opencode', [
            'mcp',
            'add',
            MCP_SERVER_NAME,
            ...(scope === 'machine' ? ['--global'] : []),
            '--',
            ...MCP_SERVER_COMMAND,
          ]),
        ]
      const dir = scope === 'machine' ? join(e.home, '.config', 'opencode') : e.cwd
      return [
        jsonTarget(jsonOrJsonc(dir, 'opencode'), ['mcp', 'servers'], {
          type: 'local',
          command: [...MCP_SERVER_COMMAND],
        }),
      ]
    },
    skillsDir: agentsSkills,
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(e.home, '.config', 'opencode', 'AGENTS.md') }]
        : [projectAgentsMd(e)],
  },
  {
    id: 'amp',
    label: 'Amp',
    installed: (e) => has(e, ['amp'], [join('.config', 'amp')]),
    // Amp's settings keys are flat, dotted names: `"amp.mcpServers": {…}`.
    mcp: (scope, e) => [
      jsonTarget(
        scope === 'machine'
          ? join(e.home, '.config', 'amp', 'settings.json')
          : join(e.cwd, '.amp', 'settings.json'),
        ['amp.mcpServers'],
      ),
    ],
    skillsDir: agentsSkills,
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(e.home, '.config', 'amp', 'AGENTS.md') }]
        : [projectAgentsMd(e)],
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot (VS Code, Copilot CLI)',
    aliases: ['vscode'],
    installed: (e) => has(e, ['code', 'copilot'], ['.copilot']) || Boolean(e.env.COPILOT_HOME),
    // VS Code's Copilot harness and the Copilot CLI read the same files: the
    // user's `$COPILOT_HOME/mcp-config.json` and the project's `.mcp.json`.
    // (`.vscode/mcp.json` and `code --add-mcp` are the deprecated Local
    // harness format, due for removal in February 2027.)
    mcp: (scope, e) =>
      scope === 'project'
        ? [jsonTarget(join(e.cwd, '.mcp.json'), ['mcpServers'], { ...STDIO_ENTRY })]
        : e.onPath('copilot')
          ? [cli('copilot', ['mcp', 'add', MCP_SERVER_NAME, '--', ...MCP_SERVER_COMMAND])]
          : [
              jsonTarget(join(copilotHome(e), 'mcp-config.json'), ['mcpServers'], {
                type: 'local',
                ...STANDARD_MCP_ENTRY,
                tools: ['*'],
              }),
            ],
    skillsDir: (scope, e) =>
      scope === 'machine' ? join(copilotHome(e), 'skills') : join(e.cwd, '.github', 'skills'),
    // `*.instructions.md` files apply only while a matching file is open;
    // `copilot-instructions.md` applies everywhere.
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(copilotHome(e), 'copilot-instructions.md') }]
        : [projectAgentsMd(e)],
  },
  {
    id: 'kiro',
    label: 'Kiro',
    installed: (e) => has(e, ['kiro', 'kiro-cli'], ['.kiro']),
    mcp: (scope, e) => [
      jsonTarget(join(scope === 'machine' ? e.home : e.cwd, '.kiro', 'settings', 'mcp.json')),
    ],
    skillsDir: (scope, e) => join(scope === 'machine' ? e.home : e.cwd, '.kiro', 'skills'),
    instructions: (scope, e) =>
      scope === 'machine'
        ? [
            {
              kind: 'file',
              path: join(e.home, '.kiro', 'steering', 'molecule.md'),
              frontmatter: '---\ninclusion: always\n---\n\n',
            },
          ]
        : [projectAgentsMd(e)],
  },
  // The agents below document only their MCP configuration.
  {
    id: 'zed',
    mcpOnly: true,
    label: 'Zed',
    installed: (e) => e.onPath('zed') || existsSync(join(xdgConfig(e), 'zed')),
    mcp: (scope, e) => [
      jsonTarget(
        scope === 'machine'
          ? join(xdgConfig(e), 'zed', 'settings.json')
          : join(e.cwd, '.zed', 'settings.json'),
        ['context_servers'],
        { ...STANDARD_MCP_ENTRY, env: {} },
      ),
    ],
    skillsDir: () => null,
    instructions: () => [],
  },
  {
    id: 'crush',
    mcpOnly: true,
    label: 'Crush',
    installed: (e) => e.onPath('crush') || existsSync(join(xdgConfig(e), 'crush')),
    // Crush's JSON config is deprecated in favour of `crushrc` but stays
    // supported, and every Crush version reads it.
    mcp: (scope, e) => [
      jsonTarget(
        scope === 'machine'
          ? join(xdgConfig(e), 'crush', 'crush.json')
          : existsSync(join(e.cwd, 'crush.json'))
            ? join(e.cwd, 'crush.json')
            : join(e.cwd, '.crush.json'),
        ['mcp'],
        { type: 'stdio', ...STANDARD_MCP_ENTRY },
      ),
    ],
    skillsDir: () => null,
    instructions: () => [],
  },
  {
    id: 'trae',
    mcpOnly: true,
    label: 'Trae',
    installed: (e) => has(e, ['trae'], ['.trae']),
    mcp: (scope, e) =>
      scope === 'project'
        ? [jsonTarget(join(e.cwd, '.trae', 'mcp.json'))]
        : [
            manual(
              'Trae keeps global MCP servers in its settings: Settings → MCP → Add → Create Manually, then paste:',
              `  {"mcpServers": {"${MCP_SERVER_NAME}": {"command": "npx", "args": ["-y", "molecule-mcp"]}}}`,
            ),
          ],
    skillsDir: () => null,
    instructions: () => [],
  },
  {
    id: 'cline',
    mcpOnly: true,
    label: 'Cline',
    installed: (e) => has(e, ['cline'], ['.cline']),
    mcp: (scope, e) => {
      if (scope === 'project') return []
      if (e.onPath('cline'))
        return [cli('cline', ['mcp', 'add', MCP_SERVER_NAME, '--yes', '--', ...MCP_SERVER_COMMAND])]
      if (e.env.CLINE_MCP_SETTINGS_PATH) return [jsonTarget(e.env.CLINE_MCP_SETTINGS_PATH)]
      if (e.env.CLINE_DATA_DIR || e.env.CLINE_DIR)
        return [
          manual(
            `Cline → MCP Servers → Configure, then add mcpServers.${MCP_SERVER_NAME} = {"command": "npx", "args": ["-y", "molecule-mcp"]}`,
          ),
        ]
      return [jsonTarget(join(e.home, '.cline', 'data', 'settings', 'cline_mcp_settings.json'))]
    },
    skillsDir: () => null,
    instructions: () => [],
  },
  {
    id: 'junie',
    mcpOnly: true,
    label: 'Junie (JetBrains)',
    installed: (e) => has(e, ['junie'], ['.junie']),
    mcp: (scope, e) => [
      jsonTarget(join(scope === 'machine' ? e.home : e.cwd, '.junie', 'mcp', 'mcp.json')),
    ],
    skillsDir: () => null,
    instructions: () => [],
  },
  {
    id: 'continue',
    mcpOnly: true,
    label: 'Continue',
    installed: (e) => existsSync(join(e.home, '.continue')),
    // Continue picks up Claude-format JSON files dropped into a project's
    // `.continue/mcpServers/`; its global config is a YAML list.
    mcp: (scope, e) =>
      scope === 'project'
        ? [jsonTarget(join(e.cwd, '.continue', 'mcpServers', `${MCP_SERVER_NAME}.json`))]
        : [
            manual(
              'Add to ~/.continue/config.yaml (it also needs top-level name, version and schema):',
              'mcpServers:',
              `  - name: ${MCP_SERVER_NAME}`,
              '    command: npx',
              '    args: ["-y", "molecule-mcp"]',
            ),
          ],
    skillsDir: () => null,
    instructions: () => [],
  },
  {
    id: 'goose',
    mcpOnly: true,
    label: 'Goose',
    installed: (e) => e.onPath('goose') || existsSync(join(xdgConfig(e), 'goose')),
    mcp: (scope) =>
      scope === 'project'
        ? []
        : [
            manual(
              'Add to ~/.config/goose/config.yaml under `extensions:` (or run `goose configure`):',
              `  ${MCP_SERVER_NAME}:`,
              '    type: stdio',
              `    name: ${MCP_SERVER_NAME}`,
              '    enabled: true',
              '    cmd: npx',
              '    args: ["-y", "molecule-mcp"]',
              '    timeout: 300',
            ),
          ],
    skillsDir: () => null,
    instructions: () => [],
  },
  {
    id: 'aider',
    mcpOnly: true,
    label: 'Aider',
    installed: (e) => e.onPath('aider'),
    mcp: () => [
      manual(
        'Aider has no MCP support yet; use the mlcl CLI directly (npx mlcl search, npx mlcl add).',
      ),
    ],
    skillsDir: () => null,
    instructions: () => [],
  },
]

/**
 * Find a harness by id or alias.
 *
 * @param id - An `--agent` value.
 * @returns The harness, or `undefined` for an unknown id.
 */
export function findHarness(id: string): AgentHarness | undefined {
  return AGENT_HARNESSES.find((h) => h.id === id || h.aliases?.includes(id))
}

/**
 * The harnesses that look installed for this user, in table order.
 *
 * @param e - The environment to inspect.
 * @returns The installed harnesses.
 */
export function detectInstalledHarnesses(e: AgentEnvironment): AgentHarness[] {
  return AGENT_HARNESSES.filter((h) => h.installed(e))
}
