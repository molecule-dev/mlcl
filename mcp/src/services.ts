/**
 * molecule.dev hosted services for MCP tools.
 *
 * Two credentials, two jobs:
 *   - the SESSION token (login / MOLECULE_TOKEN) manages the account — list
 *     projects, mint a project API key;
 *   - a PROJECT API key (`mk_…`) pays for service calls, metered and billed to
 *     that project exactly like a deployed app calling the same URL. It is read
 *     from MOLECULE_API_KEY, else from the project's `.env` (the same place the
 *     app's `@molecule/*-molecule` bonds read it), so the key never has to pass
 *     through the chat transcript.
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

import { apiBase, sessionToken } from './auth.js'

/** Where a project key was found (never the key itself). */
export interface ServiceKey {
  key: string
  source: string
}

/** Parse one variable out of a dotenv file; undefined when absent. */
function readDotenvVar(file: string, name: string): string | undefined {
  if (!existsSync(file)) return undefined
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && m[1] === name) return m[2].replace(/^(['"])(.*)\1$/, '$2') || undefined
  }
  return undefined
}

/**
 * The project API key for service calls: MOLECULE_API_KEY from the server's
 * environment, else `MOLECULE_API_KEY` in `.env` at `directory` or up to two
 * parents (a full-stack project keeps it in `api/.env` or the root).
 *
 * @param directory - Project directory to search (default cwd).
 * @returns The key and where it came from, or null.
 */
export function resolveServiceKey(directory?: string): ServiceKey | null {
  if (process.env.MOLECULE_API_KEY) {
    return { key: process.env.MOLECULE_API_KEY, source: 'MOLECULE_API_KEY env' }
  }
  let dir = resolve(directory ?? process.cwd())
  for (let i = 0; i < 3; i++) {
    for (const file of [join(dir, '.env'), join(dir, 'api', '.env')]) {
      const key = readDotenvVar(file, 'MOLECULE_API_KEY')
      if (key) return { key, source: file }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/** Thrown with a message an agent can act on. */
export class ServiceCallError extends Error {
  constructor(
    message: string,
    /** Seconds the platform asked us to wait (`Retry-After`), when it sent the header. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
  }
}

/** Seconds from a `Retry-After` header, or undefined. */
function retryAfterOf(response: Response): number | undefined {
  const value = Number(response.headers.get('retry-after'))
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined
}

/** The "try again" hint: the header's seconds, or a minute for `service.busy`. */
function retryHint(seconds: number | undefined, errorKey: string | undefined): string {
  if (seconds !== undefined) return ` Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`
  return errorKey === 'service.busy' ? ' Try again in a minute.' : ''
}

/**
 * POST /v1/services/<service>/<operation> with the project key.
 *
 * @param service - e.g. `'embeddings'`.
 * @param operation - e.g. `'embed'`.
 * @param body - The JSON body (the service's normalized request).
 * @param directory - Project directory used to find the key.
 * @returns The parsed JSON response.
 */
export async function callHostedService(
  service: string,
  operation: string,
  body: unknown,
  directory?: string,
): Promise<unknown> {
  const found = resolveServiceKey(directory)
  if (!found) {
    throw new ServiceCallError(
      'No molecule project API key. Call create_api_key (it writes MOLECULE_API_KEY into the project .env), or set MOLECULE_API_KEY for this server.',
    )
  }
  const response = await fetch(`${apiBase()}/v1/services/${service}/${operation}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${found.key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : {}
  } catch (_error) {
    // Non-JSON body (a proxy error page): report the status, not the body.
    const seconds = retryAfterOf(response)
    throw new ServiceCallError(
      `molecule.dev returned ${response.status} (not JSON).${retryHint(seconds, undefined)}`,
      seconds,
    )
  }
  if (!response.ok) {
    const err = data as { error?: string; errorKey?: string }
    const hint =
      response.status === 401
        ? ` The key from ${found.source} was rejected: it is revoked, or its scopes do not include this service. Create one with create_api_key (the default scope covers every service).`
        : response.status === 402
          ? ' The project owner has used their included allowance; they can enable usage billing on molecule.dev.'
          : ''
    const seconds = retryAfterOf(response)
    throw new ServiceCallError(
      `${service}/${operation} failed (${response.status} ${err.errorKey ?? ''}): ${(err.error ?? 'error').replace(/[.\s]+$/, '')}.${hint}${retryHint(seconds, err.errorKey)}`,
      seconds,
    )
  }
  return data
}

/** Authenticated JSON request with the session token. */
async function sessionRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = sessionToken()
  if (!token) throw new ServiceCallError('Not logged in — call the login tool first.')
  const response = await fetch(`${apiBase()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })
  const text = await response.text()
  const seconds = retryAfterOf(response)
  let data: T & { error?: string; errorKey?: string }
  try {
    data = (text ? JSON.parse(text) : {}) as T & { error?: string; errorKey?: string }
  } catch (_error) {
    // Non-JSON body (a proxy error page): report the status, not a SyntaxError.
    throw new ServiceCallError(
      `molecule.dev returned ${response.status} (not JSON).${retryHint(seconds, undefined)}`,
      seconds,
    )
  }
  if (!response.ok) {
    throw new ServiceCallError(
      `${path} failed (${response.status}): ${data.error ?? 'error'}${retryHint(seconds, data.errorKey)}`,
      seconds,
    )
  }
  return data
}

/** A project row as the MCP tool reports it. */
export interface McpProject {
  id: string
  name?: string
  role?: string
}

/** GET /projects — owned + team projects. */
export async function listProjects(): Promise<McpProject[]> {
  const raw = await sessionRequest<unknown>('/projects')
  const rows = Array.isArray(raw)
    ? raw
    : ((raw as { projects?: unknown[]; data?: unknown[] }).projects ??
      (raw as { data?: unknown[] }).data ??
      [])
  return rows.map((row) => {
    const r = row as McpProject & { props?: McpProject }
    const p = r.props ?? r
    return { id: p.id, name: p.name, ...((p.role ?? r.role) ? { role: p.role ?? r.role } : {}) }
  })
}

/** The only files create_api_key will write: a dotenv file by name. */
const ENV_FILE_RE = /^\.env(\.[A-Za-z0-9_-]+)?$/

/** What create_api_key reports (never the plaintext). */
export interface CreatedKey {
  id: string
  masked: string
  scopes: string[]
  wroteTo: string
  gitignored: boolean
}

/**
 * Mint a project API key and write it into a dotenv file as
 * MOLECULE_API_KEY, replacing an existing line. The plaintext is returned by
 * the platform exactly once and is never echoed back to the agent.
 *
 * @param projectId - The project the key bills to.
 * @param name - A label shown in the project's key list.
 * @param envFile - Path of the dotenv file to write (basename `.env` or `.env.<x>`).
 * @param scopes - Optional scopes (default: all brokered services).
 * @returns Masked key metadata + where it was written.
 */
export async function createApiKeyIntoEnv(
  projectId: string,
  name: string,
  envFile: string,
  scopes?: string[],
): Promise<CreatedKey> {
  const target = resolve(envFile)
  if (!ENV_FILE_RE.test(basename(target))) {
    throw new ServiceCallError('env_file must be a dotenv file named .env or .env.<name>.')
  }
  if (!existsSync(dirname(target))) {
    throw new ServiceCallError(`Directory ${dirname(target)} does not exist.`)
  }
  const minted = await sessionRequest<{
    id: string
    token?: string
    masked: string
    scopes: string[]
  }>(`/projects/${encodeURIComponent(projectId)}/api-keys`, {
    method: 'POST',
    body: { name, ...(scopes?.length ? { scopes } : {}) },
  })
  if (!minted.token) throw new ServiceCallError('The platform did not return a key.')

  const line = `MOLECULE_API_KEY=${minted.token}`
  const existed = existsSync(target)
  const lines = existed ? readFileSync(target, 'utf8').split('\n') : []
  const at = lines.findIndex((l) => /^\s*(?:export\s+)?MOLECULE_API_KEY\s*=/.test(l))
  if (at >= 0) lines[at] = line
  else {
    if (lines.length && lines[lines.length - 1] === '') lines.pop()
    lines.push(line, '')
  }
  writeFileSync(target, lines.join('\n'), { mode: 0o600 })
  // The file now holds a secret: owner-only even if it existed with wider bits.
  chmodSync(target, 0o600)

  // A .gitignore in the file's directory or up to three parents that names it.
  // A heuristic for a warning, not a guarantee — git's own rules are richer.
  const patterns = ['.env', '.env*', '.env.*', '*.env', basename(target), `/${basename(target)}`]
  let gitignored = false
  for (let dir = dirname(target), i = 0; i < 4 && !gitignored; i++) {
    const gitignore = join(dir, '.gitignore')
    gitignored =
      existsSync(gitignore) &&
      readFileSync(gitignore, 'utf8')
        .split('\n')
        .some((l) => patterns.includes(l.trim()))
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return {
    id: minted.id,
    masked: minted.masked,
    scopes: minted.scopes,
    wroteTo: target,
    gitignored,
  }
}
