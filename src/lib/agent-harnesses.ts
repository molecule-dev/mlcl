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

import { type AgentToolReport, claudeServerStatus, codexServerTools } from './agent-tool-check.js'

/** Machine-wide (every project for this user) or the current project only. */
export type SetupScope = 'machine' | 'project'

/** The MCP server every target registers. */
export const MCP_SERVER_NAME = 'molecule'

/**
 * The command a project's config starts the server with: a file shared with a team names no home
 * directory, so it runs the server through npx.
 */
export const PROJECT_MCP_COMMAND = ['npx', '-y', 'molecule-mcp'] as const

/**
 * The command every setup registered before the machine install: an entry that is exactly this is
 * replaced, and any other is the user's own and stays.
 */
export const LEGACY_MCP_COMMAND = ['npx', '-y', 'molecule-mcp'] as const

/** Where the machine install of the server lives (mcp/src/machine-install.ts). */
export const machineMcpHome = (home: string): string => join(home, '.mlcl', 'mcp')

/**
 * The command that starts the server at a scope. For the whole machine it is the installed copy's
 * launcher, `node ~/.mlcl/mcp/run.mjs`: npx asks the registry for `latest` on every start (1.2-1.4 s
 * in the harness evals, 70 s offline), and headless Claude Code waits about 2 s for its servers
 * before starting without them. The path uses forward slashes on every OS, which Node accepts
 * and JSON and TOML need no escaping for. `e.machineMcpCommand` replaces it when the machine
 * install could not be made.
 *
 * @param scope - Machine or project.
 * @param e - The environment.
 * @returns The executable and its arguments.
 */
export function mcpServerCommand(scope: SetupScope, e: AgentEnvironment): string[] {
  if (scope === 'project') return [...PROJECT_MCP_COMMAND]
  if (e.machineMcpCommand) return [...e.machineMcpCommand]
  return ['node', join(machineMcpHome(e.home), 'run.mjs').split(sep).join('/')]
}

/**
 * Codex's MCP limits for the server, in the TOML table setup writes. Codex's defaults are a 10 s
 * start and a 60 s tool call; a project's `npx -y molecule-mcp` on a machine without the package
 * yet downloads the server before it can answer, and a scaffold or `add_package` call runs the CLI
 * for up to its own 10 min limit (`CLI_TIMEOUT_DEFAULT_MS` in mcp/src/cli-command.ts). Codex
 * cutting the call first hides the CLI's answer, so the tool limit sits a minute above the CLI's.
 */
export const CODEX_MCP_TIMEOUT_LINES = [
  'startup_timeout_sec = 120',
  'tool_timeout_sec = 660',
] as const

const NPM_CONFIG_KEYS = [
  'registry',
  'userconfig',
  'globalconfig',
  'cache',
  'prefix',
  'cafile',
  'strict_ssl',
  'proxy',
  'https_proxy',
  'noproxy',
  'offline',
  'prefer_offline',
  'ignore_scripts',
] as const

const PLAYWRIGHT_ENV_KEYS = [
  'PLAYWRIGHT_BROWSERS_PATH',
  'PLAYWRIGHT_DOWNLOAD_HOST',
  'PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST',
  'PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST',
  'PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST',
  'PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT',
] as const

/**
 * The environment variables the server's work reads, which Codex must hand it. Codex starts an MCP
 * server with a short list of its own (HOME, LANG, PATH, TERM and TMPDIR of the variables an eval
 * box sets, Codex 0.166) unless its table names more in `env_vars`, by exact name: a name not set is
 * skipped, and a pattern (`NPM_CONFIG_*`) matches nothing. Without the list, `check_project`'s
 * Playwright browser install failed and the agent installed it from its own shell (harness eval
 * `check`, 2026-11-25), npm installs lose the registry and CA settings, and an opt-out
 * (`DO_NOT_TRACK=1`, `MOLECULE_TELEMETRY=0`) never reaches the server.
 */
export const MCP_SERVER_ENV_VARS = [
  // Molecule's own: credentials, endpoints, telemetry opt-out, CLI overrides.
  'MOLECULE_TOKEN',
  'MOLECULE_API_KEY',
  'MOLECULE_API_URL',
  'MOLECULE_SITE_URL',
  'MOLECULE_ENV',
  'MOLECULE_TELEMETRY',
  'MOLECULE_TELEMETRY_URL',
  'DO_NOT_TRACK',
  'MLCL_CREDENTIALS_FILE',
  'MLCL_DEBUG',
  'MLCL_REQUIRE_INJECT',
  'MLCL_IDE_PREVIEW',
  'MLCL_ACTIVITY_CAPTURE',
  'MOLECULE_MCP_CLI',
  'MOLECULE_MCP_CLI_TIMEOUT_MS',
  'MOLECULE_MCP_NO_UPDATE',
  'MOLECULE_PACKAGES_DIR',
  'MLCL_REGISTRY_PATH',
  'MLCL_REGISTRY_LOCK_WAIT_MS',
  // The network: a proxy and its CA, which npm, Playwright and Node's fetch read.
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
  'https_proxy',
  'http_proxy',
  'all_proxy',
  'no_proxy',
  'NODE_USE_ENV_PROXY',
  'NODE_EXTRA_CA_CERTS',
  'NODE_USE_SYSTEM_CA',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  // npm normalizes these names after inheriting them from Codex.
  ...NPM_CONFIG_KEYS.flatMap((key) => [`NPM_CONFIG_${key.toUpperCase()}`, `npm_config_${key}`]),
  // Windows command resolution, home and browser cache, plus Linux's browser cache override.
  'Path',
  'PATHEXT',
  'SystemRoot',
  'SYSTEMROOT',
  'ComSpec',
  'COMSPEC',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'TEMP',
  'TMP',
  'XDG_CACHE_HOME',
  // Where Playwright keeps and fetches its browsers.
  ...PLAYWRIGHT_ENV_KEYS,
  ...PLAYWRIGHT_ENV_KEYS.map((key) => `npm_config_${key.toLowerCase()}`),
] as const

/**
 * The tools Codex shows the model before its first turn: the ones a coding agent calls first,
 * as `UP_FRONT_TOOLS` in mcp/src/tool-loading.ts names them for Claude Code (a test keeps the
 * two lists equal).
 *
 * Codex puts every MCP tool behind its tool search and reads no per-tool hint, so in the
 * 2026-11-25 find eval it spent a model call looking up `search_packages` before calling it
 * (3 calls and 52k input tokens, against 2 and 38k for the split below). Codex chooses per
 * server, so setup registers the server twice: `molecule` exposes only these tools and keeps
 * them out of the tool search (`omit_tools_from = ["deferred"]`), and {@link CODEX_MORE_SERVER_NAME}
 * exposes every other tool, where Codex defers them as before.
 */
export const CODEX_UP_FRONT_TOOLS = [
  'search_packages',
  'read_package_doc',
  'list_templates',
  'scaffold_project',
  'add_package',
  'check_project',
] as const

/** The second Codex registration of the server, holding every tool not in {@link CODEX_UP_FRONT_TOOLS}. */
export const CODEX_MORE_SERVER_NAME = 'molecule_more'

/** A TOML array of strings, spaced as Codex writes one. */
const tomlStrings = (values: readonly string[]): string =>
  JSON.stringify(values).replace(/","/g, '", "')

/** The `env_vars` line of each Codex table setup writes ({@link MCP_SERVER_ENV_VARS}). */
export const CODEX_MCP_ENV_LINE = `env_vars = ${tomlStrings(MCP_SERVER_ENV_VARS)}`

/**
 * The `{command, args}` entry most JSON configs take.
 *
 * @param scope - Machine or project.
 * @param e - The environment.
 * @returns The entry.
 */
export function standardMcpEntry(scope: SetupScope, e: AgentEnvironment): Record<string, unknown> {
  const [command, ...args] = mcpServerCommand(scope, e)
  return { command, args }
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
  /**
   * The command machine-scope targets register instead of the installed launcher: set by setup
   * when the machine install could not be made, so the agents still get a server that starts.
   */
  machineMcpCommand?: readonly string[]
}

/** One way to register the MCP server with an agent. */
export type McpTarget =
  /**
   * Run the agent's own installer (`claude mcp add …`). With `unlessToml`, the installer is
   * skipped when that file already defines that table: `codex mcp add` rewrites the whole
   * table, so a second run would drop every key added to it since (timeouts, `env`).
   */
  | {
      kind: 'cli'
      bin: string
      args: string[]
      unlessToml?: { path: string; table: string }
      /** Where an older setup's entry may be: replaced instead of reported as present. */
      legacy?: CliLegacyEntry[]
    }
  /**
   * Merge `molecule` into a JSON / JSONC file under `keys`, keeping comments. An existing entry
   * whose keys match `legacy` (an older setup's command) takes every key of `entry`.
   */
  | {
      kind: 'json'
      path: string
      keys: string[]
      entry: Record<string, unknown>
      legacy?: Record<string, unknown>
    }
  /**
   * A `[table]` in a TOML file holding every key of `lines`: appended when the file lacks the
   * table, and a key the table does not set yet is added to it. A key already set is kept, unless
   * its line is one of `legacyLines` (an older setup's command): that line is replaced.
   */
  | {
      kind: 'toml'
      path: string
      table: string
      lines: string[]
      legacyLines?: string[]
      /**
       * A second table that starts the same server, added only while `table` runs setup's own
       * command (every line of `command`): `lines` then also go in `table`, and `tableLines` make
       * the second table. A command the user set is theirs, and the split would start a different
       * server beside it.
       */
      split?: { command: string[]; lines: string[]; table: string; tableLines: string[] }
    }
  /** No safe writer: print what to add by hand. */
  | { kind: 'manual'; lines: string[] }

/**
 * Where a native `mcp add` writes its entry, to find one an older setup made. A CLI refuses a name
 * that exists, so that entry would stay. With `remove`, the CLI deletes it first (its file is the
 * agent's own state, written by running sessions); without, the entry is rewritten in the file.
 */
export interface CliLegacyEntry {
  /** The JSON file the CLI writes. */
  path: string
  /** The key path its servers live under. */
  keys: string[]
  /** The older entry's keys, as that setup wrote them. */
  match: Record<string, unknown>
  /** The keys to write in its place, when there is no `remove`. */
  entry: Record<string, unknown>
  /** The CLI's arguments that delete the entry, run before the `mcp add`. */
  remove?: string[]
}

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
  /**
   * The agent never shows the model an MCP server's `instructions`, so the server's guidance
   * reaches it only through its instruction file: `mlcl mcp install` writes the conventions there
   * too. Codex 0.171 connected a stub server, called its tool, and saw none of its instructions
   * (nonce probe, 2026-11-24); Claude Code showed them to at least 3,000 characters.
   */
  ignoresServerInstructions?: boolean
  /** Whether the agent looks installed for this user. */
  installed: (e: AgentEnvironment) => boolean
  /** How to register the MCP server; empty when the agent has no MCP support at this scope. */
  mcp: (scope: SetupScope, e: AgentEnvironment) => McpTarget[]
  /** The skills directory; `null` when the agent reads no skills at this scope. */
  skillsDir: (scope: SetupScope, e: AgentEnvironment) => string | null
  /** Where always-on instructions go; empty when the agent reads none at this scope. */
  instructions: (scope: SetupScope, e: AgentEnvironment) => InstructionTarget[]
  /**
   * Ask the agent itself whether its next session gets the molecule server's tools, for an agent
   * that can say (setup reports it for the whole machine; see agent-tool-check.ts).
   */
  serverTools?: { bin: string; ask: () => Promise<AgentToolReport> }
}

const has = (e: AgentEnvironment, bins: string[], dirs: string[]): boolean =>
  bins.some((bin) => e.onPath(bin)) || dirs.some((dir) => existsSync(join(e.home, dir)))

const agentsSkills = (scope: SetupScope, e: AgentEnvironment): string =>
  scope === 'machine' ? join(e.home, '.agents', 'skills') : join(e.cwd, '.agents', 'skills')

const projectAgentsMd = (e: AgentEnvironment): InstructionTarget => ({
  kind: 'section',
  path: join(e.cwd, 'AGENTS.md'),
})

/**
 * The keys an older setup wrote for the entry shaped like `entry`: `{command, args}`, or OpenCode's
 * `command` array.
 */
const legacyEntry = (entry: Record<string, unknown>): Record<string, unknown> =>
  Array.isArray(entry.command)
    ? { command: [...LEGACY_MCP_COMMAND] }
    : { command: LEGACY_MCP_COMMAND[0], args: LEGACY_MCP_COMMAND.slice(1) }

const jsonTarget = (path: string, keys: string[], entry: Record<string, unknown>): McpTarget => ({
  kind: 'json',
  path,
  keys,
  entry,
  legacy: legacyEntry(entry),
})

/** A JSON target with the standard `{command, args}` entry under `mcpServers`. */
const standardJson = (
  path: string,
  scope: SetupScope,
  e: AgentEnvironment,
  keys: string[] = ['mcpServers'],
): McpTarget => jsonTarget(path, keys, standardMcpEntry(scope, e))

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

const cli = (
  bin: string,
  args: string[],
  extra: { unlessToml?: { path: string; table: string }; legacy?: CliLegacyEntry[] } = {},
): McpTarget => ({ kind: 'cli', bin, args, ...extra })

/** The CLI legacy entry for a `{command, args}` file: rewritten in place. */
const legacyInFile = (
  path: string,
  scope: SetupScope,
  e: AgentEnvironment,
  keys: string[] = ['mcpServers'],
): CliLegacyEntry => {
  const entry = standardMcpEntry(scope, e)
  return { path, keys, match: legacyEntry(entry), entry }
}

const manual = (...lines: string[]): McpTarget => ({ kind: 'manual', lines })

/**
 * The entry for the project `.mcp.json`, read by Claude Code and by GitHub
 * Copilot (VS Code and the CLI). Copilot requires `tools`; Claude Code accepts
 * it. A JSON merge adds only the keys an existing entry lacks, so the file
 * ends up the same whichever agent is set up first.
 */
const stdioEntry = (scope: SetupScope, e: AgentEnvironment): Record<string, unknown> => ({
  type: 'stdio',
  ...standardMcpEntry(scope, e),
  tools: ['*'],
})

/** The command as one line, for an instruction the user follows by hand. */
const commandLine = (scope: SetupScope, e: AgentEnvironment): string =>
  mcpServerCommand(scope, e).join(' ')

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
    serverTools: { bin: 'claude', ask: () => claudeServerStatus(MCP_SERVER_NAME) },
    // `claude mcp add` defaults to the LOCAL scope (this directory only), so
    // the machine scope names `--scope user`. The project file is the shared
    // `.mcp.json`, which GitHub Copilot reads too (see stdioEntry).
    // Its user-scope servers live in ~/.claude.json, which running sessions write, so an older
    // entry is removed with the CLI rather than edited in the file.
    mcp: (scope, e) =>
      scope === 'project'
        ? [jsonTarget(join(e.cwd, '.mcp.json'), ['mcpServers'], stdioEntry(scope, e))]
        : e.onPath('claude')
          ? [
              cli(
                'claude',
                [
                  'mcp',
                  'add',
                  '--scope',
                  'user',
                  MCP_SERVER_NAME,
                  '--',
                  ...mcpServerCommand(scope, e),
                ],
                {
                  legacy: [
                    {
                      ...legacyInFile(join(e.home, '.claude.json'), scope, e),
                      remove: ['mcp', 'remove', '--scope', 'user', MCP_SERVER_NAME],
                    },
                  ],
                },
              ),
            ]
          : [
              manual(
                `Install the claude CLI, then run: claude mcp add --scope user ${MCP_SERVER_NAME} -- ${commandLine(scope, e)}`,
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
    ignoresServerInstructions: true,
    serverTools: {
      bin: 'codex',
      ask: () => codexServerTools(MCP_SERVER_NAME, { more: CODEX_MORE_SERVER_NAME }),
    },
    installed: (e) => has(e, ['codex'], ['.codex']) || Boolean(e.env.CODEX_HOME),
    // `codex mcp add` has no scope flag and writes ~/.codex/config.toml; a
    // project's own servers go in .codex/config.toml (trusted projects only).
    // It has no timeout flag either (`-c` is not saved), so the timeouts are
    // added to the table it wrote, with the split of the tools (CODEX_UP_FRONT_TOOLS).
    mcp: (scope, e) => {
      const table = `mcp_servers.${MCP_SERVER_NAME}`
      const [command, ...args] = mcpServerCommand(scope, e)
      const commandLines = (bin: string, argv: readonly string[]): string[] => [
        `command = ${JSON.stringify(bin)}`,
        `args = ${tomlStrings(argv)}`,
      ]
      const toml = (path: string): McpTarget => ({
        kind: 'toml',
        path,
        table,
        lines: [...commandLines(command, args), ...CODEX_MCP_TIMEOUT_LINES, CODEX_MCP_ENV_LINE],
        legacyLines: commandLines(LEGACY_MCP_COMMAND[0], LEGACY_MCP_COMMAND.slice(1)),
        split: {
          command: commandLines(command, args),
          lines: [
            `enabled_tools = ${tomlStrings(CODEX_UP_FRONT_TOOLS)}`,
            'omit_tools_from = ["deferred"]',
          ],
          table: `mcp_servers.${CODEX_MORE_SERVER_NAME}`,
          tableLines: [
            ...commandLines(command, args),
            ...CODEX_MCP_TIMEOUT_LINES,
            CODEX_MCP_ENV_LINE,
            `disabled_tools = ${tomlStrings(CODEX_UP_FRONT_TOOLS)}`,
          ],
        },
      })
      if (scope === 'project') return [toml(join(e.cwd, '.codex', 'config.toml'))]
      const path = join(e.env.CODEX_HOME || join(e.home, '.codex'), 'config.toml')
      if (!e.onPath('codex')) return [toml(path)]
      return [
        cli('codex', ['mcp', 'add', MCP_SERVER_NAME, '--', command, ...args], {
          unlessToml: { path, table },
        }),
        toml(path),
      ]
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
      standardJson(join(scope === 'machine' ? e.home : e.cwd, '.cursor', 'mcp.json'), scope, e),
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
    mcp: (scope, e) => {
      const settings = join(scope === 'machine' ? e.home : e.cwd, '.gemini', 'settings.json')
      return e.onPath('gemini')
        ? [
            cli(
              'gemini',
              [
                'mcp',
                'add',
                '-s',
                scope === 'machine' ? 'user' : 'project',
                MCP_SERVER_NAME,
                ...mcpServerCommand(scope, e),
              ],
              { legacy: [legacyInFile(settings, scope, e)] },
            ),
          ]
        : [standardJson(settings, scope, e)]
    },
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
      if (scope === 'project')
        return [standardJson(join(e.cwd, '.devin', 'mcp_config.json'), scope, e)]
      const targets = [standardJson(join(e.home, '.config', 'devin', 'mcp_config.json'), scope, e)]
      if (existsSync(join(e.home, '.codeium', 'windsurf')))
        targets.push(
          standardJson(join(e.home, '.codeium', 'windsurf', 'mcp_config.json'), scope, e),
        )
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
      const dir = scope === 'machine' ? join(e.home, '.config', 'opencode') : e.cwd
      const file = jsonOrJsonc(dir, 'opencode')
      const entry = { type: 'local', command: mcpServerCommand(scope, e) }
      if (e.onPath('opencode'))
        return [
          cli(
            'opencode',
            [
              'mcp',
              'add',
              MCP_SERVER_NAME,
              ...(scope === 'machine' ? ['--global'] : []),
              '--',
              ...mcpServerCommand(scope, e),
            ],
            {
              legacy: [['mcp', 'servers'], ['mcp']].map((keys) => ({
                path: file,
                keys,
                match: legacyEntry(entry),
                entry: { command: entry.command },
              })),
            },
          ),
        ]
      return [jsonTarget(file, ['mcp', 'servers'], entry)]
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
      standardJson(
        scope === 'machine'
          ? join(e.home, '.config', 'amp', 'settings.json')
          : join(e.cwd, '.amp', 'settings.json'),
        scope,
        e,
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
    mcp: (scope, e) => {
      if (scope === 'project')
        return [jsonTarget(join(e.cwd, '.mcp.json'), ['mcpServers'], stdioEntry(scope, e))]
      const config = join(copilotHome(e), 'mcp-config.json')
      return e.onPath('copilot')
        ? [
            cli('copilot', ['mcp', 'add', MCP_SERVER_NAME, '--', ...mcpServerCommand(scope, e)], {
              legacy: [legacyInFile(config, scope, e)],
            }),
          ]
        : [
            jsonTarget(config, ['mcpServers'], {
              type: 'local',
              ...standardMcpEntry(scope, e),
              tools: ['*'],
            }),
          ]
    },
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
      standardJson(
        join(scope === 'machine' ? e.home : e.cwd, '.kiro', 'settings', 'mcp.json'),
        scope,
        e,
      ),
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
        { ...standardMcpEntry(scope, e), env: {} },
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
        { type: 'stdio', ...standardMcpEntry(scope, e) },
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
        ? [standardJson(join(e.cwd, '.trae', 'mcp.json'), scope, e)]
        : [
            manual(
              'Trae keeps global MCP servers in its settings: Settings → MCP → Add → Create Manually, then paste:',
              `  ${JSON.stringify({ mcpServers: { [MCP_SERVER_NAME]: standardMcpEntry(scope, e) } })}`,
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
      const settings =
        e.env.CLINE_MCP_SETTINGS_PATH ||
        join(e.home, '.cline', 'data', 'settings', 'cline_mcp_settings.json')
      if (e.onPath('cline'))
        return [
          cli(
            'cline',
            ['mcp', 'add', MCP_SERVER_NAME, '--yes', '--', ...mcpServerCommand(scope, e)],
            { legacy: [legacyInFile(settings, scope, e)] },
          ),
        ]
      if (e.env.CLINE_MCP_SETTINGS_PATH) return [standardJson(settings, scope, e)]
      if (e.env.CLINE_DATA_DIR || e.env.CLINE_DIR)
        return [
          manual(
            `Cline → MCP Servers → Configure, then add mcpServers.${MCP_SERVER_NAME} = ${JSON.stringify(standardMcpEntry(scope, e))}`,
          ),
        ]
      return [standardJson(settings, scope, e)]
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
      standardJson(
        join(scope === 'machine' ? e.home : e.cwd, '.junie', 'mcp', 'mcp.json'),
        scope,
        e,
      ),
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
    mcp: (scope, e) => {
      if (scope === 'project')
        return [
          standardJson(join(e.cwd, '.continue', 'mcpServers', `${MCP_SERVER_NAME}.json`), scope, e),
        ]
      const [command, ...args] = mcpServerCommand(scope, e)
      return [
        manual(
          'Add to ~/.continue/config.yaml (it also needs top-level name, version and schema):',
          'mcpServers:',
          `  - name: ${MCP_SERVER_NAME}`,
          `    command: ${command}`,
          `    args: ${JSON.stringify(args)}`,
        ),
      ]
    },
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
    mcp: (scope, e) => {
      if (scope === 'project') return []
      const [command, ...args] = mcpServerCommand(scope, e)
      return [
        manual(
          'Add to ~/.config/goose/config.yaml under `extensions:` (or run `goose configure`):',
          `  ${MCP_SERVER_NAME}:`,
          '    type: stdio',
          `    name: ${MCP_SERVER_NAME}`,
          '    enabled: true',
          `    cmd: ${command}`,
          `    args: ${JSON.stringify(args)}`,
          '    timeout: 300',
        ),
      ]
    },
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
