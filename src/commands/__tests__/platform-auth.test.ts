/**
 * Every platform call carries the signed-in token. The tarball upload and the log stream are raw
 * `fetch` calls beside the shared request helper; they once sent only a token passed in explicitly,
 * which no command passes, so `mlcl import upload` and `mlcl logs --follow` got 401 for every
 * signed-in user (2026-11-18).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { listProjects, streamLogs, uploadImportTarball } from '../../lib/platform.js'

describe('platform calls send the signed-in token', () => {
  let server: Server
  let dir: string
  const seen: Array<{ url: string; authorization: string | undefined }> = []

  beforeEach(async () => {
    seen.length = 0
    server = createServer((req, res) => {
      seen.push({ url: req.url ?? '', authorization: req.headers.authorization })
      req.resume()
      req.on('end', () => {
        if (req.headers.authorization === undefined) {
          res.writeHead(401, { 'content-type': 'application/json' })
          res.end('{"error":"unauthorized"}')
          return
        }
        if ((req.url ?? '').endsWith('/logs/stream')) {
          res.writeHead(200, { 'content-type': 'text/event-stream' })
          res.end('data: {"timestamp":"t","level":"info","message":"hello"}\n\n')
          return
        }
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end((req.url ?? '').startsWith('/projects?') || req.url === '/projects' ? '[]' : '{}')
      })
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    dir = mkdtempSync(join(tmpdir(), 'mlcl-platform-auth-'))
    writeFileSync(join(dir, 'repo.tar.gz'), Buffer.from([0x1f, 0x8b]))
    delete process.env.MOLECULE_TOKEN
  })

  afterEach(async () => {
    delete process.env.MOLECULE_API_URL
    delete process.env.MOLECULE_TOKEN
    delete process.env.MLCL_CREDENTIALS_FILE
    rmSync(dir, { recursive: true, force: true })
    await new Promise<void>((r) => server.close(() => r()))
  })

  const signInWithSavedCredentials = (): void => {
    const file = join(dir, 'credentials.json')
    writeFileSync(file, JSON.stringify({ token: 'tok_saved' }))
    process.env.MLCL_CREDENTIALS_FILE = file
  }

  it('the tarball upload sends the saved login token', async () => {
    signInWithSavedCredentials()
    await uploadImportTarball('p1', join(dir, 'repo.tar.gz'))
    expect(seen).toEqual([
      { url: '/projects/p1/git-import-upload', authorization: 'Bearer tok_saved' },
    ])
  })

  it('the log stream sends the saved login token', async () => {
    signInWithSavedCredentials()
    const lines: string[] = []
    await streamLogs('p1', (line) => lines.push(line.message))
    expect(seen).toEqual([{ url: '/projects/p1/logs/stream', authorization: 'Bearer tok_saved' }])
    expect(lines).toEqual(['hello'])
  })

  it('MOLECULE_TOKEN wins over the saved login, and an explicit token wins over both', async () => {
    signInWithSavedCredentials()
    process.env.MOLECULE_TOKEN = 'tok_env'
    await uploadImportTarball('p1', join(dir, 'repo.tar.gz'))
    await uploadImportTarball('p1', join(dir, 'repo.tar.gz'), 'tok_explicit')
    expect(seen.map((s) => s.authorization)).toEqual(['Bearer tok_env', 'Bearer tok_explicit'])
  })

  it('signed out: no authorization header, and the 401 surfaces (counterexample)', async () => {
    process.env.MLCL_CREDENTIALS_FILE = join(dir, 'absent.json')
    await expect(uploadImportTarball('p1', join(dir, 'repo.tar.gz'))).rejects.toMatchObject({
      status: 401,
      message: 'unauthorized',
    })
    expect(seen).toEqual([{ url: '/projects/p1/git-import-upload', authorization: undefined }])
  })

  it('a refused upload or stream carries the server reason, not only its status', async () => {
    signInWithSavedCredentials()
    server.removeAllListeners('request')
    server.on('request', (req, res) => {
      req.resume()
      req.on('end', () => {
        res.writeHead(501, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'File upload is not available here — connect a repository instead.',
            errorKey: 'git.error.uploadUnavailable',
          }),
        )
      })
    })
    await expect(uploadImportTarball('p1', join(dir, 'repo.tar.gz'))).rejects.toMatchObject({
      status: 501,
      errorKey: 'git.error.uploadUnavailable',
      message: 'File upload is not available here — connect a repository instead.',
    })
    await expect(streamLogs('p1', () => undefined)).rejects.toMatchObject({
      status: 501,
      errorKey: 'git.error.uploadUnavailable',
    })
  })

  it('the shared request helper keeps the same precedence', async () => {
    signInWithSavedCredentials()
    await listProjects().catch(() => undefined)
    expect(seen[0]?.authorization).toBe('Bearer tok_saved')
  })
})
