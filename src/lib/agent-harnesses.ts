/**
 * Where each coding agent reads the three things Molecule installs: the MCP
 * server, skills, and always-on instructions — for the whole machine and for
 * one project.
 *
 * One table, read by `mlcl setup`, `mlcl mcp install` and `mlcl agent init`.
 * Every path and command here comes from the agent vendor's own documentation
 * (checked 2026-11-15; Zed through Goose 2026-11-17); an agent whose docs name no file for something gets no
 * entry for it rather than a guess. When a vendor ships a native `mcp add`
 * command, it is used: that command owns the config format, its scopes and its
 * validation.
 *
 * Shared locations are named once and de-duplicated by the caller:
 * `~/.agents/skills` and `<project>/.agents/skills` are read by Codex, Cursor,
 * Gemini CLI, Devin Desktop, OpenCode, Amp, Zed, Crush, Cline, Junie and Goose; `<project>/AGENTS.md` is read by
 * nearly every agent.
 *
 * @module
 */

import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

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
  /** A file the agent reads that loads another by an import line (`@AGENTS.md`). */
  | { kind: 'import'; path: string; line: string }
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
  /**
   * The agent loads only the first project instruction file it finds, so a new
   * `AGENTS.md` beside the file it reads now would replace that file.
   */
  readsFirstFileOnly?: boolean
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
 * Claude Code reads `CLAUDE.md` (or `.claude/CLAUDE.md`). It reads `AGENTS.md` only
 * when no `CLAUDE.md` exists in the project OR ANY FOLDER ABOVE IT, and only from
 * v2.1.277 (code.claude.com/docs/en/memory#agents-md). A `CLAUDE.md` that IS
 * `AGENTS.md` (a symlink) or imports it already carries the section written there.
 * An import resolves from the importing file's folder, so `.claude/CLAUDE.md` names
 * the project's file as `@../AGENTS.md` (its `@AGENTS.md` is `.claude/AGENTS.md`).
 * Without a `CLAUDE.md`, the section goes in `AGENTS.md` and a one-line `CLAUDE.md`
 * imports it, the documented way to share the file: a project nested under a folder
 * with its own `CLAUDE.md` (a monorepo package) would otherwise never load the
 * conventions.
 */
function claudeProjectInstructions(e: AgentEnvironment): InstructionTarget[] {
  const agents = join(e.cwd, 'AGENTS.md')
  const claude = [join(e.cwd, 'CLAUDE.md'), join(e.cwd, '.claude', 'CLAUDE.md')].find((path) =>
    existsSync(path),
  )
  if (!claude)
    return [
      { kind: 'section', path: agents },
      { kind: 'import', path: join(e.cwd, 'CLAUDE.md'), line: '@AGENTS.md' },
    ]
  if (sameFile(claude, agents) || importsFile(claude, agents))
    return [{ kind: 'section', path: agents }]
  return [{ kind: 'section', path: claude }]
}

/** Whether `importer` has an `@<path>` line naming `imported`, resolved from its own folder. */
function importsFile(importer: string, imported: string): boolean {
  const target = relative(dirname(importer), imported).split(sep).join('/')
  const lines = readFileSync(importer, 'utf8').split(/\r?\n/)
  return lines.some((line) => {
    const trimmed = line.trim()
    return trimmed === `@${target}` || trimmed === `@./${target}`
  })
}

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile()
  } catch (_error) {
    // Absent: not the file the agent reads.
    return false
  }
}

/**
 * For an agent that loads only the first of `names` it finds: the section goes in
 * the file it reads now, or in `AGENTS.md` when the project has none of them.
 */
const firstFileSection = (e: AgentEnvironment, names: string[]): InstructionTarget => ({
  kind: 'section',
  path: join(e.cwd, names.find((name) => isFile(join(e.cwd, name))) ?? 'AGENTS.md'),
})

/**
 * Zed's project rules files, in the order it checks them; it reads the first one
 * that exists (zed-industries/zed `docs/src/ai/instructions.md`, `RULES_FILE_NAMES`
 * in `crates/prompt_store/src/prompts.rs`).
 */
const ZED_RULES_FILES = [
  '.rules',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  join('.github', 'copilot-instructions.md'),
  'AGENT.md',
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
]

/**
 * Junie checks `.junie/AGENTS.md`, then `AGENTS.md` with `.junie/rules`, then the
 * older `.junie/guidelines.md` or `.junie/guidelines/` folder
 * (junie.jetbrains.com/docs/guidelines-and-memory.html). The section joins the
 * level the project uses now, so a new `AGENTS.md` never hides its guidelines.
 */
function junieProjectInstructions(e: AgentEnvironment): InstructionTarget[] {
  const junie = join(e.cwd, '.junie')
  if (isFile(join(junie, 'AGENTS.md')) || isFile(join(e.cwd, 'AGENTS.md')))
    return [firstFileSection(e, [join('.junie', 'AGENTS.md'), 'AGENTS.md'])]
  if (isFile(join(junie, 'guidelines.md')))
    return [{ kind: 'section', path: join(junie, 'guidelines.md') }]
  if (existsSync(join(junie, 'guidelines')))
    return [{ kind: 'file', path: join(junie, 'guidelines', 'molecule.md'), frontmatter: '' }]
  return [projectAgentsMd(e)]
}

/** A Continue rule that is always in context (continuedev/continue `docs/customize/deep-dives/rules.mdx`). */
const CONTINUE_RULE_FRONTMATTER = '---\nname: Molecule\nalwaysApply: true\n---\n\n'

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
  // Zed through Goose: paths from each vendor's docs and source, checked 2026-11-17.
  {
    id: 'zed',
    label: 'Zed',
    readsFirstFileOnly: true,
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
    // Zed reads skills from these two folders only (`docs/src/ai/skills.md`).
    skillsDir: agentsSkills,
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(xdgConfig(e), 'zed', 'AGENTS.md') }]
        : [firstFileSection(e, ZED_RULES_FILES)],
  },
  {
    id: 'crush',
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
    skillsDir: agentsSkills,
    // Crush loads every context file it finds, `AGENTS.md` among them, plus
    // `CRUSH.md` in its config folder for every project.
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(xdgConfig(e), 'crush', 'CRUSH.md') }]
        : [projectAgentsMd(e)],
  },
  {
    id: 'trae',
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
    skillsDir: (scope, e) => join(scope === 'machine' ? e.home : e.cwd, '.trae', 'skills'),
    // Trae reads `AGENTS.md` only when a setting is switched on; `.trae/rules`
    // is always read, and `alwaysApply` keeps the rule in every chat
    // (docs.trae.ai/ide/rules).
    instructions: (scope, e) =>
      scope === 'machine'
        ? [
            {
              kind: 'none',
              note: 'Trae keeps user rules in its settings (Settings → Rules), not in a file; the skills cover every project.',
            },
          ]
        : [
            {
              kind: 'file',
              path: join(e.cwd, '.trae', 'rules', 'molecule.md'),
              frontmatter: '---\nalwaysApply: true\n---\n\n',
            },
          ],
  },
  {
    id: 'cline',
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
    skillsDir: agentsSkills,
    // Cline combines every rules source; a rules file without frontmatter is
    // always applied (cline/cline `docs/customization/cline-rules.mdx`).
    instructions: (scope, e) =>
      scope === 'machine'
        ? [
            {
              kind: 'file',
              path: join(e.home, 'Documents', 'Cline', 'Rules', 'molecule.md'),
              frontmatter: '',
            },
          ]
        : [projectAgentsMd(e)],
  },
  {
    id: 'junie',
    label: 'Junie (JetBrains)',
    readsFirstFileOnly: true,
    installed: (e) => has(e, ['junie'], ['.junie']),
    mcp: (scope, e) => [
      jsonTarget(join(scope === 'machine' ? e.home : e.cwd, '.junie', 'mcp', 'mcp.json')),
    ],
    skillsDir: agentsSkills,
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(e.home, '.junie', 'AGENTS.md') }]
        : junieProjectInstructions(e),
  },
  {
    id: 'continue',
    label: 'Continue',
    // Its CLI reads the first of AGENTS.md, AGENT.md, CLAUDE.md and CODEX.md.
    readsFirstFileOnly: true,
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
    // Continue's IDE extension and CLI both read `.continue/rules` and
    // `.continue/skills`, in the project and in `~/.continue`.
    skillsDir: (scope, e) => join(scope === 'machine' ? e.home : e.cwd, '.continue', 'skills'),
    instructions: (scope, e) => [
      {
        kind: 'file',
        path: join(scope === 'machine' ? e.home : e.cwd, '.continue', 'rules', 'molecule.md'),
        frontmatter: CONTINUE_RULE_FRONTMATTER,
      },
    ],
  },
  {
    id: 'goose',
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
    skillsDir: agentsSkills,
    // Goose loads `.goosehints` and `AGENTS.md` from the project, and
    // `.goosehints` from its config folder for every project
    // (aaif-goose/goose `documentation/` using-goosehints.md, `crates/goose/src/hints/load_hints.rs`).
    instructions: (scope, e) =>
      scope === 'machine'
        ? [{ kind: 'section', path: join(xdgConfig(e), 'goose', '.goosehints') }]
        : [projectAgentsMd(e)],
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
