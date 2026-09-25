#!/usr/bin/env node
/**
 * molecule-mcp — the Molecule.dev MCP server.
 *
 * Thin, typed tools over the `mlcl` CLI's `--json` surface (the CLI is the
 * single source of truth; this server adds MCP tool schemas so agents that
 * prefer structured tools over shelling out get first-class molecule
 * support). The CLI binary is resolved as:
 *
 *   1. $MOLECULE_MCP_CLI (explicit override — used by tests / dev)
 *   2. `mlcl` on PATH (the published npm package)
 *
 * Read-heavy tools are safe by construction; the scaffold tool only ever runs
 * `mlcl create --no-interactive` with explicit arguments.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import {
  clearCredentials,
  listDevices,
  pollLogin,
  readCredentials,
  revokeDevice,
  startLogin,
  whoami,
} from './auth.js'
import {
  callHostedService,
  createApiKeyIntoEnv,
  listProjects,
  ServiceCallError,
} from './services.js'
import { tracked } from './telemetry.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { execa } from 'execa'
import { z } from 'zod'

const CLI = process.env.MOLECULE_MCP_CLI ?? 'mlcl'

async function runCli(args: string[], cwd?: string): Promise<string> {
  const { stdout, failed, stderr } = await execa(CLI, args, {
    cwd,
    reject: false,
    timeout: 10 * 60_000,
  })
  if (failed) throw new Error(stderr.trim() || stdout.trim() || `mlcl ${args.join(' ')} failed`)
  return stdout
}

/** Extract the JSON document from CLI stdout (progress lines precede it when any). */
function parseJsonOut<T>(out: string): T {
  const start =
    out.indexOf('[') === -1
      ? out.indexOf('{')
      : Math.min(...[out.indexOf('['), out.indexOf('{')].filter((i) => i !== -1))
  return JSON.parse(out.slice(start)) as T
}

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] })

const server = new McpServer({ name: 'molecule', version: '0.1.0' })

server.registerTool(
  'search_packages',
  {
    title: 'Search @molecule packages',
    description:
      'Search the @molecule/* package fleet by name or capability (e.g. "payments", "social login", "file uploads"). Returns matching packages with stack, category, and the install command. ALWAYS prefer an existing package over hand-rolling a capability.',
    inputSchema: {
      query: z.string().describe('Capability or package-name query'),
      stack: z.enum(['api', 'app']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  tracked('search_packages', async ({ query, stack, limit }) => {
    const args = ['search', query, '--json']
    if (stack) args.push('--stack', stack)
    if (limit) args.push('--limit', String(limit))
    return text(await runCli(args))
  }),
)

server.registerTool(
  'list_templates',
  {
    title: 'List molecule app templates',
    description:
      'List the flagship full-stack app templates (blog, crm, team-chat, …) with slugs, descriptions, and package counts — the fastest starting point for a new app.',
    inputSchema: {},
  },
  tracked('list_templates', async () => text(await runCli(['templates', '--json']))),
)

server.registerTool(
  'scaffold_project',
  {
    title: 'Scaffold a molecule project',
    description:
      'Create a new project with mlcl — either from a flagship template (preferred) or a custom package stack. Runs fully unattended and returns a JSON result (path, packages, secrets to fill in .env). Requires Node >= 22.',
    inputSchema: {
      name: z.string().describe('Project name (lowercase slug)'),
      template: z.string().optional().describe('Template slug from list_templates (preferred)'),
      type: z
        .enum(['api', 'app', 'full-stack', 'static', 'status-page', 'status-page-edge'])
        .optional(),
      framework: z
        .string()
        .optional()
        .describe('Frontend framework (default react; templates carry their own)'),
      packages: z
        .string()
        .optional()
        .describe('Comma-separated @molecule/* names for a custom stack'),
      skip_install: z.boolean().optional(),
      directory: z.string().optional().describe('Directory to scaffold in (default cwd)'),
    },
  },
  tracked(
    'scaffold_project',
    async ({ name, template, type, framework, packages, skip_install, directory }) => {
      const args = ['create', name, '--no-interactive', '--json']
      if (template) args.push('--template', template)
      if (type) args.push('--type', type)
      if (framework) args.push('--framework', framework)
      if (packages) args.push('--packages', packages)
      if (skip_install) args.push('--skip-install')
      const out = await runCli(args, directory)
      const start = out.indexOf('{')
      return text(start === -1 ? out : out.slice(start))
    },
  ),
)

server.registerTool(
  'add_package',
  {
    title: 'Add a package to this project',
    description:
      'Install and wire a @molecule/* package into the project at directory (mlcl add --inject: writes the dependency, generates the bond wiring, peers, migrations, routes).',
    inputSchema: {
      name: z.string().describe('Full package name, e.g. @molecule/api-emails-mailgun'),
      directory: z
        .string()
        .optional()
        .describe('Project root containing package.json (default cwd)'),
    },
  },
  tracked('add_package', async ({ name, directory }) =>
    text(await runCli(['add', name, '--inject'], directory)),
  ),
)

server.registerTool(
  'swap_provider',
  {
    title: 'Swap a provider',
    description:
      'Swap a wired provider for another implementing the same interface (e.g. @molecule/api-database-mysql for PostgreSQL) without rewriting the app. Use -r when the category has several providers wired.',
    inputSchema: {
      new_provider: z.string().describe('New provider package, e.g. @molecule/api-database-mysql'),
      replace: z
        .string()
        .optional()
        .describe(
          'Full package name of the provider to replace, e.g. @molecule/api-emails-mailgun (required when several are wired)',
        ),
      directory: z.string().optional(),
    },
  },
  tracked('swap_provider', async ({ new_provider, replace, directory }) => {
    const args = ['swap', new_provider, '--no-interactive', '--install']
    if (replace) args.push('-r', replace)
    return text(await runCli(args, directory))
  }),
)

server.registerTool(
  'read_package_doc',
  {
    title: 'Read a package README',
    description:
      'Read the generated usage reference for an installed @molecule/* package (API, examples, wiring) from node_modules — the authoritative doc for using it correctly.',
    inputSchema: {
      name: z.string().describe('Package name without the @molecule/ scope or with it'),
      directory: z
        .string()
        .optional()
        .describe('Project root to resolve node_modules from (default cwd)'),
    },
  },
  tracked('read_package_doc', async ({ name, directory }) => {
    const short = name.replace(/^@molecule\//, '')
    // Path-join guard: a crafted name must not escape node_modules.
    if (!/^[A-Za-z0-9._-]+$/.test(short)) {
      return text(`Invalid package name "${short}" — expected a plain @molecule/<name>.`)
    }
    const base = directory ?? process.cwd()
    // Walk UP from the given directory like Node's module resolution: in a
    // full-stack scaffold the packages hoist to the PROJECT ROOT's
    // node_modules while the user points the tool at api/ or app/.
    for (const dir of candidateDirs(base)) {
      for (const p of [
        join(dir, 'node_modules', '@molecule', short, 'README.md'),
        join(dir, 'node_modules', '@molecule', short, 'dist', 'README.md'),
      ]) {
        try {
          const doc = readFileSync(p, 'utf8')
          if (doc.length > 200_000)
            return text(`${doc.slice(0, 200_000)}\n\n[…truncated — full doc at ${p}]`)
          return text(doc)
        } catch {
          /* try next path */
        }
      }
    }
    return text(
      `No local README found for @molecule/${short} — is it installed near ${base}? Run search_packages to find it, add_package to install it, or browse https://www.molecule.dev/packages/${short}`,
    )
  }),
)

/** base, base/.., base/../.. — bounded like node_modules lookup. */
function candidateDirs(base: string): string[] {
  const dirs: string[] = []
  let cur = base
  for (let i = 0; i < 5 && cur; i++) {
    dirs.push(cur)
    const parent = dirname(cur)
    if (parent === cur) break
    cur = parent
  }
  return dirs
}

// ── Self-installation surface ────────────────────────────────────────────────
// Once a harness adds this ONE server, it also carries the molecule doctrine
// (resource below) and can wire a project's agent files itself — so the
// install story per harness is a single MCP config line, nothing else.

server.registerTool(
  'agent_init',
  {
    title: 'Make this project molecule-aware',
    description:
      'Write the molecule conventions + mlcl quickstart into the agent instruction files the active harness reads (AGENTS.md standard section, plus Cursor rules / Claude skill / Gemini extension / Windsurf rule when their markers are present). Idempotent — never clobbers user edits.',
    inputSchema: {
      directory: z.string().optional().describe('Project root (default cwd)'),
    },
  },
  tracked('agent_init', async ({ directory }) =>
    text(await runCli(['agent', 'init'], directory ?? process.cwd())),
  ),
)

server.registerResource(
  'conventions',
  'molecule://conventions',
  {
    title: 'The molecule way',
    description:
      'The molecule conventions for building and extending apps — packages before hand-rolled code, bonds for providers, ClassMap styling, i18n text, plus the mlcl quickstart commands. Read this before working in a molecule-built project.',
    mimeType: 'text/markdown',
  },
  async () => ({
    contents: [
      {
        uri: 'molecule://conventions',
        mimeType: 'text/markdown',
        // Bundled copy of mlcl's templates/shared/agent-init-section.md.tpl —
        // keep the two in sync when the doctrine changes.
        text: readFileSync(join(import.meta.dirname, '..', 'assets', 'conventions.md'), 'utf8'),
      },
    ],
  }),
)

// ── Auth surface — the same device-code login + credentials file as the CLI. ──

server.registerTool(
  'login',
  {
    title: 'Log in to molecule.dev',
    description:
      'Start the browser login flow. Returns a URL and a code — show BOTH to the user and ask them to open the URL (they may need to log in first, then click Approve). Then call login_poll with the returned deviceCode until it says logged_in.',
    inputSchema: {},
  },
  tracked('login', async () => {
    const session = await startLogin()
    return text(
      JSON.stringify(
        {
          next: 'Show this URL to the user, then poll:',
          url: session.url,
          code: session.userCode,
          deviceCode: session.deviceCode,
        },
        null,
        2,
      ),
    )
  }),
)

server.registerTool(
  'login_poll',
  {
    title: 'Poll the molecule.dev login',
    description:
      'Check whether the user approved the login. Poll every few seconds after showing the login URL; logged_in means the token is stored and every surface (this server, the mlcl CLI, deploys) is authenticated.',
    inputSchema: { deviceCode: z.string().describe('The deviceCode returned by the login tool') },
  },
  tracked('login_poll', async ({ deviceCode }) =>
    text(JSON.stringify(await pollLogin(deviceCode))),
  ),
)

server.registerTool(
  'logout',
  {
    title: 'Log out of molecule.dev',
    description:
      'Remove the stored molecule.dev token (affects this server and the mlcl CLI alike).',
    inputSchema: {},
  },
  tracked('logout', async () => {
    clearCredentials()
    return text('Logged out — stored token cleared.')
  }),
)

server.registerTool(
  'whoami',
  {
    title: 'Check molecule.dev login status',
    description:
      'Returns the logged-in account, or a prompt to run login. Call this before platform operations (deploy, env push) to give a clear not-logged-in error instead of a 401.',
    inputSchema: {},
  },
  tracked('whoami', async () => {
    if (!readCredentials() && !process.env.MOLECULE_TOKEN) {
      return text(JSON.stringify({ loggedIn: false, hint: 'Call the login tool first.' }))
    }
    try {
      const me = await whoami()
      return text(
        me
          ? JSON.stringify({ loggedIn: true, ...me })
          : JSON.stringify({ loggedIn: false, hint: 'Token invalid — run login.' }),
      )
    } catch (_error) {
      return text(
        JSON.stringify({ loggedIn: false, hint: 'Could not reach molecule.dev — retry whoami.' }),
      )
    }
  }),
)

server.registerTool(
  'list_devices',
  {
    title: 'List molecule.dev devices/sessions',
    description:
      "List the account's logged-in devices (browsers + CLIs), marking which one is the current session. Use before revoke_device; revoking a row kills its token — the response to a lost/stolen machine report.",
    inputSchema: {},
  },
  tracked('list_devices', async () => text(JSON.stringify(await listDevices(), null, 2))),
)

server.registerTool(
  'revoke_device',
  {
    title: 'Revoke a molecule.dev device/session',
    description:
      'Revoke one device by id (from list_devices) — every token bound to it dies within ~10s. This is the kill-switch for a stolen machine or a CLI login the user wants to end. Irreversible.',
    inputSchema: { deviceId: z.string().describe('Device id from list_devices') },
  },
  tracked('revoke_device', async ({ deviceId }) => {
    await revokeDevice(deviceId)
    return text(`Revoked ${deviceId}. Tokens bound to it die within ~10s.`)
  }),
)

// ── molecule.dev hosted services ─────────────────────────────────────────────
// The session token manages the account; a PROJECT API key (mk_…) pays for
// service calls. create_api_key writes that key into the project's .env so it
// never passes through the transcript, and the service tools read it from there
// (or MOLECULE_API_KEY). Every call is metered and billed to that project.

/** Turn a ServiceCallError into a readable tool error; rethrow anything else. */
async function serviceResult(run: () => Promise<string>) {
  try {
    return text(await run())
  } catch (error) {
    if (error instanceof ServiceCallError) {
      return { content: [{ type: 'text' as const, text: error.message }], isError: true }
    }
    throw error
  }
}

server.registerTool(
  'list_projects',
  {
    title: 'List molecule.dev projects',
    description:
      "List the logged-in account's molecule.dev projects (id, name, role). Use the id with create_api_key. Requires login.",
    inputSchema: {},
  },
  tracked('list_projects', async () =>
    serviceResult(async () => JSON.stringify(await listProjects(), null, 2)),
  ),
)

server.registerTool(
  'create_api_key',
  {
    title: 'Create a molecule.dev project API key',
    description:
      "Mint a project API key (mk_…) and write it as MOLECULE_API_KEY into the given .env file — the key is NOT returned, so it stays out of the chat. Apps (through @molecule/*-molecule bonds) and this server's service tools read it from there; usage bills to that project. Returns the masked key and whether the file looks gitignored. Requires login.",
    inputSchema: {
      project_id: z.string().describe('Project id from list_projects'),
      env_file: z
        .string()
        .describe(
          'Path of the dotenv file to write, e.g. /path/to/app/api/.env (named .env or .env.<x>)',
        ),
      name: z.string().optional().describe('Label for the key (default mcp)'),
      scopes: z
        .array(z.string())
        .optional()
        .describe('Limit the key, e.g. [broker:embeddings]. Default: every hosted service.'),
    },
  },
  tracked('create_api_key', async ({ project_id, env_file, name, scopes }) =>
    serviceResult(async () =>
      JSON.stringify(
        await createApiKeyIntoEnv(project_id, name ?? 'mcp', env_file, scopes),
        null,
        2,
      ),
    ),
  ),
)

server.registerTool(
  'embed_text',
  {
    title: 'Embed text with molecule.dev',
    description:
      'Turn text into embedding vectors on molecule.dev (no OpenAI account needed; metered to the project whose MOLECULE_API_KEY is used). Returns model, token usage and the vectors (or only their length with summary_only). The same service backs @molecule/api-ai-embeddings-molecule in app code.',
    inputSchema: {
      input: z.union([z.string(), z.array(z.string())]).describe('Text or list of texts'),
      model: z.enum(['text-embedding-3-small', 'text-embedding-3-large']).optional(),
      dimensions: z.number().int().min(1).max(3072).optional(),
      summary_only: z
        .boolean()
        .optional()
        .describe('Return only counts and usage, not the vectors (vectors are long)'),
      directory: z
        .string()
        .optional()
        .describe('Project directory whose .env holds MOLECULE_API_KEY'),
    },
  },
  tracked('embed_text', async ({ input, model, dimensions, summary_only, directory }) =>
    serviceResult(async () => {
      const result = (await callHostedService(
        'embeddings',
        'embed',
        { input, ...(model ? { model } : {}), ...(dimensions ? { dimensions } : {}) },
        directory,
      )) as { embeddings: number[][]; model: string; usage: unknown }
      return JSON.stringify(
        summary_only
          ? {
              model: result.model,
              usage: result.usage,
              vectors: result.embeddings.length,
              dimensions: result.embeddings[0]?.length ?? 0,
            }
          : result,
      )
    }),
  ),
)

server.registerTool(
  'translate',
  {
    title: 'Translate text with molecule.dev',
    description:
      'Translate UI strings or other text into another language on molecule.dev (no translation-vendor account needed; metered per character to the project whose MOLECULE_API_KEY is used). Pass placeholders such as {{count}} in "protect" so they come back unchanged — then still check each result contains them. Up to 200 texts / 50,000 characters per call. The same service backs @molecule/api-ai-translation-molecule in app code.',
    inputSchema: {
      text: z.union([z.string(), z.array(z.string())]).describe('Text or list of texts'),
      target_lang: z.string().describe('Target language code, e.g. "de", "pt-BR", "zh-TW"'),
      source_lang: z.string().optional().describe('Source language code; omit to auto-detect'),
      protect: z
        .array(z.string())
        .optional()
        .describe('Exact substrings to keep unchanged, e.g. ["{{count}}", "Acme"]'),
      context: z
        .string()
        .optional()
        .describe(
          'What the texts are, e.g. "button labels in a banking app" — improves short strings',
        ),
      directory: z
        .string()
        .optional()
        .describe('Project directory whose .env holds MOLECULE_API_KEY'),
    },
  },
  tracked('translate', async ({ text, target_lang, source_lang, protect, context, directory }) =>
    serviceResult(async () => {
      const result = await callHostedService(
        'translation',
        'translate',
        {
          text,
          targetLang: target_lang,
          ...(source_lang ? { sourceLang: source_lang } : {}),
          ...(protect?.length ? { protect } : {}),
          ...(context ? { context } : {}),
        },
        directory,
      )
      return JSON.stringify(result)
    }),
  ),
)

const AUDIO_FORMATS = ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'] as const

server.registerTool(
  'text_to_speech',
  {
    title: 'Text to speech with molecule.dev',
    description:
      'Synthesize speech on molecule.dev (OpenAI tts-1 / tts-1-hd, no OpenAI account; metered to the project whose MOLECULE_API_KEY is used) and write the audio to output_file. Up to 4096 characters per call. The same service backs @molecule/api-ai-speech-molecule in app code.',
    inputSchema: {
      text: z.string().min(1).max(4096),
      output_file: z
        .string()
        .describe('Where to write the audio; its extension must match the format (e.g. out.mp3)'),
      voice: z
        .enum(['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'])
        .optional(),
      model: z.enum(['tts-1', 'tts-1-hd']).optional(),
      format: z.enum(AUDIO_FORMATS).optional().describe('Default mp3'),
      speed: z.number().min(0.25).max(4).optional(),
      directory: z
        .string()
        .optional()
        .describe('Project directory whose .env holds MOLECULE_API_KEY'),
    },
  },
  tracked(
    'text_to_speech',
    async ({ text: input, output_file, voice, model, format, speed, directory }) =>
      serviceResult(async () => {
        const responseFormat = format ?? 'mp3'
        const target = resolve(output_file)
        if (extname(target).toLowerCase() !== `.${responseFormat}`) {
          throw new ServiceCallError(
            `output_file must end in .${responseFormat} for format ${responseFormat}.`,
          )
        }
        if (!existsSync(dirname(target))) {
          throw new ServiceCallError(`Directory ${dirname(target)} does not exist.`)
        }
        const result = (await callHostedService(
          'speech',
          'synthesize',
          {
            input,
            responseFormat,
            ...(voice ? { voice } : {}),
            ...(model ? { model } : {}),
            ...(speed ? { speed } : {}),
          },
          directory,
        )) as { audio: string; contentType: string }
        const audio = Buffer.from(result.audio, 'base64')
        writeFileSync(target, audio)
        return JSON.stringify({
          wroteTo: target,
          bytes: audio.length,
          contentType: result.contentType,
        })
      }),
  ),
)

server.registerTool(
  'transcribe_audio',
  {
    title: 'Transcribe audio with molecule.dev',
    description:
      'Transcribe a local audio file (mp3, mp4, m4a, wav, webm, ogg, flac; up to 12 MB) to text on molecule.dev with whisper-1, metered to the project whose MOLECULE_API_KEY is used. Returns text, language, duration and segments.',
    inputSchema: {
      file: z.string().describe('Path of the audio file'),
      language: z
        .string()
        .regex(/^[a-z]{2}$/)
        .optional()
        .describe('ISO 639-1 hint, e.g. en'),
      prompt: z.string().max(2000).optional().describe('Spelling hints: names, jargon'),
      directory: z
        .string()
        .optional()
        .describe('Project directory whose .env holds MOLECULE_API_KEY'),
    },
  },
  tracked('transcribe_audio', async ({ file, language, prompt, directory }) =>
    serviceResult(async () => {
      const path = resolve(file)
      if (!existsSync(path)) throw new ServiceCallError(`No file at ${path}.`)
      const size = statSync(path).size
      if (size > 12 * 1024 * 1024) {
        throw new ServiceCallError(
          `The file is ${size} bytes; the limit is 12 MB. Split it into shorter clips.`,
        )
      }
      const name = basename(path)
      const result = await callHostedService(
        'speech',
        'transcribe',
        {
          audio: readFileSync(path).toString('base64'),
          filename: /^[\w.-]{1,100}$/.test(name) ? name : `audio${extname(path) || '.mp3'}`,
          ...(language ? { language } : {}),
          ...(prompt ? { prompt } : {}),
        },
        directory,
      )
      return JSON.stringify(result)
    }),
  ),
)

/** The configured server — exported so tests can link an in-memory client to it. */
export { server as moleculeServer }
