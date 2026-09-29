/**
 * `mlcl transcripts import|list|rm` and `mlcl share visibility` against a
 * local HTTP mock standing in for api.molecule.dev, plus session discovery
 * against a fixture home directory. The real-stack check is the platform's
 * own route tests; this covers the CLI's side of the contract.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  claudeProjectDirName,
  codexSessionCwd,
  discoverSessions,
  readFirstLine,
} from '../../lib/transcript-discovery.js'
import ShareVisibility from '../share/visibility.js'
import TranscriptsImport, { type ImportOutcome } from '../transcripts/import.js'
import TranscriptsList from '../transcripts/list.js'
import TranscriptsRm from '../transcripts/rm.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

async function run<T>(
  commandClass: new (argv: string[], config: Config) => { run(): Promise<T> },
  argv: string[],
): Promise<T> {
  const config = await Config.load(MLCL_ROOT)
  return new commandClass(argv, config).run()
}

describe('session discovery', () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'mlcl-home-'))
  })
  afterEach(() => rmSync(home, { recursive: true, force: true }))

  it('names Claude Code project dirs by replacing every non-alphanumeric with -', () => {
    expect(claudeProjectDirName('/home/me/Repos/app.v2')).toBe('-home-me-Repos-app-v2')
    expect(claudeProjectDirName('/home/me/Repos/molecule-workspace/how-molecule-works')).toBe(
      '-home-me-Repos-molecule-workspace-how-molecule-works',
    )
  })

  it("finds a directory's Claude Code sessions and ignores other files and projects", () => {
    const cwd = '/work/app'
    const dir = join(home, '.claude', 'projects', claudeProjectDirName(cwd))
    mkdirSync(join(dir, 'memory'), { recursive: true })
    writeFileSync(join(dir, 'a.jsonl'), '{}\n')
    writeFileSync(join(dir, 'b.jsonl'), '{}\n')
    writeFileSync(join(dir, 'notes.md'), 'x')
    mkdirSync(join(home, '.claude', 'projects', claudeProjectDirName('/work/other')), {
      recursive: true,
    })
    writeFileSync(
      join(home, '.claude', 'projects', claudeProjectDirName('/work/other'), 'c.jsonl'),
      '{}\n',
    )
    const found = discoverSessions('claude-code', cwd, home).map((s) => s.path.split('/').pop())
    expect(found.sort()).toEqual(['a.jsonl', 'b.jsonl'])
  })

  it('finds Codex rollouts whose session_meta names the directory, and only those', () => {
    const day = join(home, '.codex', 'sessions', '2026', '09', '29')
    mkdirSync(day, { recursive: true })
    const meta = (cwd: string): string =>
      `${JSON.stringify({ type: 'session_meta', payload: { cwd, base_instructions: 'x'.repeat(200_000) } })}\n{"type":"x"}\n`
    writeFileSync(join(day, 'rollout-1.jsonl'), meta('/work/app'))
    writeFileSync(join(day, 'rollout-2.jsonl'), meta('/work/other'))
    writeFileSync(join(day, 'rollout-3.jsonl'), 'not json\n')
    writeFileSync(join(day, 'history.jsonl'), meta('/work/app'))
    expect(codexSessionCwd(join(day, 'rollout-1.jsonl'))).toBe('/work/app')
    expect(codexSessionCwd(join(day, 'rollout-3.jsonl'))).toBeNull()
    const found = discoverSessions('codex', '/work/app', home).map((s) => s.path.split('/').pop())
    expect(found).toEqual(['rollout-1.jsonl'])
  })

  it('reads a first line longer than one read chunk, and a file with no newline', () => {
    const f = join(home, 'long.txt')
    writeFileSync(f, `${'a'.repeat(100_000)}\nsecond`)
    expect(readFirstLine(f)?.length).toBe(100_000)
    writeFileSync(f, 'only line')
    expect(readFirstLine(f)).toBe('only line')
  })

  it('returns nothing when the harness has no store', () => {
    expect(discoverSessions('claude-code', '/work/app', home)).toEqual([])
    expect(discoverSessions('codex', '/work/app', home)).toEqual([])
  })
})

describe('transcripts + share visibility commands (mock api.molecule.dev)', () => {
  let server: Server
  let dir: string
  const requests: Array<{ method: string; path: string; body?: Record<string, unknown> }> = []
  let settings: Record<string, unknown> = {}
  let sandboxRunning = true

  beforeEach(async () => {
    requests.length = 0
    settings = {}
    sandboxRunning = true
    dir = mkdtempSync(join(tmpdir(), 'mlcl-transcripts-'))
    server = createServer((req, res) => {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined
        const path = req.url ?? ''
        requests.push({ method: req.method ?? 'GET', path, body })
        const send = (status: number, json?: unknown): void => {
          res.writeHead(status, { 'content-type': 'application/json' })
          res.end(json === undefined ? '' : JSON.stringify(json))
        }
        if (req.method === 'POST' && path === '/projects/p_1/transcripts') {
          if (String(body?.text).includes('not a transcript'))
            return send(422, { error: 'Not recognized', errorKey: 'transcript.unrecognized' })
          return send(201, {
            transcript: {
              id: `t_${requests.length}`,
              source: 'import',
              format: 'claude-code',
              harness: 'Claude Code',
              title: 'Build the slides',
              turns: 12,
            },
          })
        }
        if (req.method === 'GET' && path === '/projects/p_1/transcripts')
          return send(200, {
            transcripts: [
              {
                id: 'c_ide',
                source: 'molecule-ide',
                format: 'molecule-ide',
                harness: 'Molecule IDE',
                title: 'a',
                turns: 3,
              },
              {
                id: 't_1',
                source: 'import',
                format: 'codex',
                harness: 'Codex',
                title: 'b',
                turns: 5,
              },
            ],
          })
        if (req.method === 'DELETE' && path === '/projects/p_1/transcripts/t_1') return send(204)
        if (req.method === 'DELETE' && path.startsWith('/projects/p_1/transcripts/'))
          return send(404, { error: 'Transcript not found', errorKey: 'transcript.notFound' })
        if (req.method === 'PUT' && path === '/projects/p_1/public-transcript') {
          settings.publicTranscript = body?.enabled
          return send(200, { enabled: body?.enabled })
        }
        if (req.method === 'PUT' && path === '/projects/p_1/public-workspace') {
          // The platform's shape (molecule-dev Share/workspace.ts setPublicWorkspace).
          if (body?.enabled === true && !sandboxRunning)
            return send(409, {
              error: "Start the project's workspace, then publish its code.",
              errorKey: 'workspace.sleeping',
            })
          settings.publicWorkspace = body?.enabled
          return send(
            200,
            body?.enabled
              ? { enabled: true, files: 42, capturedAt: '2026-09-29T10:00:00.000Z' }
              : { enabled: false, files: 0, capturedAt: null },
          )
        }
        if (req.method === 'GET' && path === '/projects/p_1')
          return send(200, { props: { id: 'p_1', name: 'slides', settings } })
        send(404, { error: 'not found' })
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_TOKEN = 'tok_test'
  })

  afterEach(async () => {
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    rmSync(dir, { recursive: true, force: true })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('import posts each file as { fileName, text } and reports each outcome', async () => {
    const a = join(dir, 'session.jsonl')
    const b = join(dir, 'notes.txt')
    writeFileSync(a, '{"type":"user"}\n')
    writeFileSync(b, 'not a transcript')
    const out = await run<ImportOutcome[]>(TranscriptsImport, ['-p', 'p_1', '--json', a, b])
    expect(out.map((o) => o.status)).toEqual(['imported', 'unrecognized'])
    expect(out[0].transcript?.turns).toBe(12)
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts[0].body).toEqual({ fileName: 'session.jsonl', text: '{"type":"user"}\n' })
  })

  it('import exits non-zero when every file fails', async () => {
    const b = join(dir, 'notes.txt')
    writeFileSync(b, 'not a transcript')
    await expect(run(TranscriptsImport, ['-p', 'p_1', '--json', b])).rejects.toThrow(/EEXIT: 1/)
  })

  it('import --dry-run sends nothing', async () => {
    const a = join(dir, 'session.jsonl')
    writeFileSync(a, '{}\n')
    const out = await run<ImportOutcome[]>(TranscriptsImport, [
      '-p',
      'p_1',
      '--dry-run',
      '--json',
      a,
    ])
    expect(out[0].status).toBe('would-send')
    expect(requests).toHaveLength(0)
  })

  it('import refuses files and --from together, and neither', async () => {
    await expect(run(TranscriptsImport, ['-p', 'p_1'])).rejects.toThrow(/Pass transcript files/)
    await expect(
      run(TranscriptsImport, ['-p', 'p_1', '--from', 'codex', 'x.jsonl']),
    ).rejects.toThrow(/not both/)
  })

  it('list unwraps the transcripts envelope with both sources; rm deletes by id', async () => {
    const rows = await run<Array<{ id: string; source: string }>>(TranscriptsList, [
      '-p',
      'p_1',
      '--json',
    ])
    expect(rows.map((r) => [r.id, r.source])).toEqual([
      ['c_ide', 'molecule-ide'],
      ['t_1', 'import'],
    ])
    await run(TranscriptsRm, ['-p', 'p_1', 't_1'])
    expect(requests.at(-1)).toMatchObject({
      method: 'DELETE',
      path: '/projects/p_1/transcripts/t_1',
    })
  })

  it('rm explains that an IDE conversation cannot be removed, and names an unknown id', async () => {
    await expect(run(TranscriptsRm, ['-p', 'p_1', 'c_ide'])).rejects.toThrow(
      /own conversation in the molecule\.dev IDE.*cannot be removed/,
    )
    await expect(run(TranscriptsRm, ['-p', 'p_1', 'nope'])).rejects.toThrow(
      /No imported transcript nope/,
    )
  })

  it('share visibility --workspace on reports the copy, and refuses while the sandbox sleeps', async () => {
    const on = await run<{ workspaceCopy?: { files: number; capturedAt: string | null } }>(
      ShareVisibility,
      ['-p', 'p_1', '--workspace', 'on', '--json'],
    )
    expect(on.workspaceCopy).toEqual({
      enabled: true,
      files: 42,
      capturedAt: '2026-09-29T10:00:00.000Z',
    })
    sandboxRunning = false
    await expect(run(ShareVisibility, ['-p', 'p_1', '--workspace', 'on'])).rejects.toThrow(
      /Start the project's sandbox first \(mlcl sandbox start -p p_1\)/,
    )
  })

  it('share visibility sets both opt-ins and reads them back from the project', async () => {
    const before = await run<{ transcripts: boolean; workspace: boolean }>(ShareVisibility, [
      '-p',
      'p_1',
      '--json',
    ])
    expect(before).toEqual({ transcripts: false, workspace: false })
    const after = await run<{ transcripts: boolean; workspace: boolean }>(ShareVisibility, [
      '-p',
      'p_1',
      '--transcripts',
      'on',
      '--workspace',
      'on',
      '--json',
    ])
    expect(after).toMatchObject({ transcripts: true, workspace: true })
    expect(requests.filter((r) => r.method === 'PUT').map((r) => [r.path, r.body])).toEqual([
      ['/projects/p_1/public-transcript', { enabled: true }],
      ['/projects/p_1/public-workspace', { enabled: true }],
    ])
  })
})
