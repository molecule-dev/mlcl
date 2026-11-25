import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

import { afterEach, expect, it, vi } from 'vitest'

import { type CheckInput, type CheckStepResult, runCheckLocal } from '../check.js'

const roots: string[] = []

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    // On Linux a killed grandchild can still be waiting for init to reap it.
    return (
      process.platform !== 'linux' ||
      !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, 'utf8'))
    )
  } catch (error) {
    if (['ESRCH', 'ENOENT'].includes((error as NodeJS.ErrnoException).code ?? '')) return false
    throw error
  }
}

function assertStopped(root: string, name = 'server'): void {
  const pid = Number(readFileSync(join(root, `${name}.pid`), 'utf8'))
  expect(processIsRunning(pid), `${name} ${pid} is still running`).toBe(false)
}

afterEach(async () => {
  vi.useRealTimers()
  for (const root of roots.splice(0)) {
    writeFileSync(join(root, 'release'), '')
    const pids = ['server', 'assertion', 'worker']
      .map((name) => join(root, `${name}.pid`))
      .filter(existsSync)
      .map((path) => Number(readFileSync(path, 'utf8')))
    await vi.waitFor(() => expect(pids.filter(processIsRunning)).toEqual([]))
    rmSync(root, { recursive: true, force: true })
  }
})

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected a TCP fixture port')
  return address.port
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function fixture({
  port,
  mode = 'http',
  scripts = { start: 'node server.cjs' },
}: { port?: number; mode?: string; scripts?: Record<string, string> } = {}): Promise<{
  root: string
  input: CheckInput
}> {
  if (port === undefined) {
    const reservation = createServer()
    port = await listen(reservation)
    await close(reservation)
  }
  const root = mkdtempSync(join(tmpdir(), 'mlcl-serve-'))
  roots.push(root)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts }))
  writeFileSync(
    join(root, 'server.cjs'),
    `
    const { fork } = require('node:child_process')
    const { createServer } = require('node:http')
    const fs = require('node:fs')
    const mode = ${JSON.stringify(mode)}
    fs.writeFileSync('server.pid', String(process.pid))
    if (mode === 'exit-tree') {
      const worker = fork('worker.cjs', [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
      worker.once('message', () => {
        console.error('fixture startup failed after spawning a worker')
        process.exit(23)
      })
    } else if (mode === 'exit' || (mode === 'built' && !fs.existsSync('built'))) {
      console.error('fixture startup failed before listening')
      process.exitCode = 23
    } else {
      process.on('SIGTERM', () => {
        fs.writeFileSync('server-got-term', '')
        if (mode !== 'stubborn') process.exit(0)
      })
      let polls = 0
      const server = createServer((request, response) => {
        if (mode === 'never') return
        if (request.url === '/ready?probe=1') {
          if (mode === 'first-stalls' && ++polls === 1) return
          fs.writeFileSync('readiness-request', '')
          response.statusCode = 503
          if (mode === 'first-stalls') setTimeout(() => response.end('HTTP is ready'), 150)
          else response.end('HTTP is ready')
        } else if (request.url === '/behavior') {
          response.end('fixture behavior')
        }
      })
      server.listen(${port}, '127.0.0.1', () => {
        console.log('fixture server is listening')
        fs.writeFileSync('listening', '')
      })
      setInterval(() => { if (fs.existsSync('release')) process.exit(0) }, 20)
    }
  `,
  )
  writeFileSync(
    join(root, 'assertion.cjs'),
    `
    const assert = require('node:assert/strict')
    const fs = require('node:fs')
    fs.writeFileSync('assertion.pid', String(process.pid))
    if (process.argv[2] === 'wait') {
      process.on('SIGTERM', () => {})
      setInterval(() => { if (fs.existsSync('release')) process.exit(0) }, 20)
    } else {
      assert(fs.existsSync('readiness-request'), 'readiness URL was not requested')
      fetch('http://127.0.0.1:${port}/behavior').then(async (response) => {
        assert.equal(await response.text(), process.argv[2] ? 'wrong' : 'fixture behavior', 'fixture assertion failed')
        console.log('fixture assertion passed')
      })
    }
  `,
  )
  writeFileSync(
    join(root, 'worker.cjs'),
    `
    const fs = require('node:fs')
    fs.writeFileSync('worker.pid', String(process.pid))
    process.on('SIGTERM', () => fs.writeFileSync('worker-got-term', ''))
    setInterval(() => { if (fs.existsSync('release')) process.exit(0) }, 20)
    process.send('ready')
  `,
  )
  return {
    root,
    input: {
      steps: ['serve'],
      ready: `http://localhost:${port}/ready?probe=1`,
      run: 'node assertion.cjs',
    },
  }
}

type CheckResult = Extract<Awaited<ReturnType<typeof runCheckLocal>>, { ok: boolean }>

async function runServe(
  { root, input }: Awaited<ReturnType<typeof fixture>>,
  options?: Parameters<typeof runCheckLocal>[2],
): Promise<CheckResult & { serve: CheckStepResult; log: string }> {
  const result = await runCheckLocal(root, input, options)
  expect(result).toHaveProperty('results')
  if ('error' in result) throw new Error(result.error)
  const serve = result.results.find(({ kind }) => kind === 'serve')
  expect(serve).toBeDefined()
  if (!serve) throw new Error('The check did not return a serve result')
  expect(serve.durationMs).toBeGreaterThanOrEqual(0)
  expect(serve.logPath).toBe(join(root, 'node_modules', '.cache', 'mlcl-check', 'serve.log'))
  return { ...result, serve, log: readFileSync(serve.logPath, 'utf8') }
}

/** Wait for live work without hiding a fixture's early check failure behind a timeout. */
async function waitUntilStarted(
  root: string,
  file: string,
  result: Promise<unknown>,
): Promise<void> {
  let settled = false
  const started = async (): Promise<void> => {
    for (let i = 0; i < 200 && !settled; i++) {
      if (existsSync(join(root, file))) return
      await pause(25)
    }
    if (!settled) throw new Error(`Fixture did not write ${file}`)
  }
  try {
    await Promise.race([
      started(),
      result.then(() => {
        throw new Error(`Check finished before ${file}`)
      }),
    ])
  } finally {
    settled = true
  }
}

it('starts npm start, accepts an HTTP 503 as ready, runs the assertion in the root and stops the service', async () => {
  const project = await fixture()
  const { ok, serve, log, report } = await runServe(project)
  expect(ok).toBe(true)
  expect(serve.status).toBe('passed')
  expect(report).toMatch(/PASS serve \S+s/)
  expect(log).toContain('fixture assertion passed')
  expect(log).toContain('fixture server is listening')
  assertStopped(project.root)
  assertStopped(project.root, 'assertion')
  expect(existsSync(join(project.root, 'server-got-term'))).toBe(true)
})

it('reports the failed assertion and stops a server that ignores SIGTERM', async () => {
  const project = await fixture({ mode: 'stubborn' })
  project.input.run = 'node assertion.cjs fail'
  const { ok, serve, log, report } = await runServe(project)
  expect(ok).toBe(false)
  expect(serve.status).toBe('failed')
  expect(serve.errors.join('\n')).toContain('fixture assertion failed')
  expect(log).toContain('fixture assertion failed')
  expect(report).toContain(`full log: ${serve.logPath}`)
  assertStopped(project.root)
  assertStopped(project.root, 'assertion')
  expect(existsSync(join(project.root, 'server-got-term'))).toBe(true)
})

it('reports an early startup exit and its output without running the assertion', async () => {
  const project = await fixture({ mode: 'exit' })
  const { ok, serve, log } = await runServe(project)
  expect(ok).toBe(false)
  expect(serve.status).toBe('failed')
  expect(serve.errors.join('\n')).toContain('fixture startup failed before listening')
  expect(log).toContain('fixture startup failed before listening')
  expect(existsSync(join(project.root, 'assertion.pid'))).toBe(false)
  assertStopped(project.root)
})

it('reaps a startup worker that ignores SIGTERM after the start script exits', async () => {
  const project = await fixture({ mode: 'exit-tree' })
  const { serve } = await runServe(project)
  expect(serve.status).toBe('failed')
  expect(serve.errors.join('\n')).toContain('fixture startup failed after spawning a worker')
  expect(existsSync(join(project.root, 'worker-got-term'))).toBe(true)
  expect(existsSync(join(project.root, 'assertion.pid'))).toBe(false)
  assertStopped(project.root)
  assertStopped(project.root, 'worker')
})

it('continues polling after a stalled readiness request and accepts a slow response', async () => {
  const project = await fixture({ mode: 'first-stalls' })
  const { serve } = await runServe(project)
  expect(serve.status).toBe('passed')
  assertStopped(project.root)
})

it('stops a server that accepts connections but never answers within the readiness deadline', async () => {
  const project = await fixture({ mode: 'never' })
  const { ok, serve, log } = await runServe(project)
  expect(ok).toBe(false)
  expect(serve.status).toBe('failed')
  expect(serve.errors.join('\n')).toMatch(/did not answer.*15/)
  expect(serve.errors.join('\n')).toContain('fixture server is listening')
  expect(log).toContain('fixture server is listening')
  expect(serve.durationMs).toBeGreaterThanOrEqual(15_000)
  expect(existsSync(join(project.root, 'assertion.pid'))).toBe(false)
  assertStopped(project.root)
})

it('fails on an occupied TCP port before starting anything and leaves its listener alone', async () => {
  const other = createServer((socket) => socket.destroy())
  const port = await listen(other)
  try {
    const project = await fixture({ port })
    const { ok, serve, log } = await runServe(project)
    expect(ok).toBe(false)
    expect(serve.status).toBe('failed')
    expect(serve.errors.join('\n')).toContain(`Port ${port} is already in use`)
    expect(log).toContain(`Port ${port} is already in use`)
    expect(serve.durationMs).toBeLessThan(5_000)
    expect(existsSync(join(project.root, 'server.pid'))).toBe(false)
    expect(existsSync(join(project.root, 'assertion.pid'))).toBe(false)
    expect(other.listening).toBe(true)
  } finally {
    await close(other)
  }
})

it('runs serve after build and uses dev when start is absent', async () => {
  const project = await fixture({
    mode: 'built',
    scripts: {
      build: `node -e "setTimeout(() => require('node:fs').writeFileSync('built', ''), 300)"`,
      dev: 'node server.cjs',
    },
  })
  project.input.steps = 'serve,build'
  const { results } = await runServe(project)
  expect(results).toMatchObject([
    { kind: 'build', status: 'passed' },
    { kind: 'serve', status: 'passed' },
  ])
  assertStopped(project.root)
})

it('runs the named npm script instead of the default and accepts a numeric loopback URL', async () => {
  const project = await fixture({
    scripts: { start: 'exit 99', 'test:serve preview': 'node server.cjs' },
  })
  project.input.start = 'test:serve preview'
  project.input.ready = String(project.input.ready).replace('localhost', '127.0.0.1')
  expect((await runServe(project)).serve.status).toBe('passed')
  assertStopped(project.root)
})

it('stops the service when the check budget expires during readiness', async () => {
  const project = await fixture({ mode: 'never' })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const running = runServe(project, { budgetMs: 1_000 })
  await waitUntilStarted(project.root, 'listening', running)
  await vi.advanceTimersByTimeAsync(1_000)
  const { serve } = await running
  expect(serve.status).toBe('timeout')
  assertStopped(project.root)
})

it('stops the active assertion and server on cancellation', async () => {
  const project = await fixture({ mode: 'stubborn' })
  project.input.run = 'node assertion.cjs wait'
  const controller = new AbortController()
  const running = runServe(project, { signal: controller.signal })
  await waitUntilStarted(project.root, 'assertion.pid', running)
  controller.abort()
  const { ok, serve } = await running
  expect(ok).toBe(false)
  expect(serve.errors.join('\n')).toMatch(/cancel/i)
  assertStopped(project.root)
  assertStopped(project.root, 'assertion')
})

it.each([
  { input: {}, message: /needs.*ready.*run/i },
  { input: { run: 'node assertion.cjs' }, message: /needs.*ready/i },
  { input: { ready: 'http://localhost:1234/ready' }, message: /needs.*run/i },
  {
    input: { ready: 'http://localhost.example.com:1234/ready', run: 'node assertion.cjs' },
    message: /ready.*localhost.*127\.0\.0\.1/i,
  },
])(
  'refuses an invalid serve request before launching the project ($input)',
  async ({ input, message }) => {
    const { root } = await fixture()
    const result = await runCheckLocal(root, { steps: ['serve'], ...input })
    expect(result).toEqual({ error: expect.stringMatching(message) })
    expect(existsSync(join(root, 'server.pid'))).toBe(false)
  },
)

it('keeps serve opt-in even when readiness and assertion inputs are present', async () => {
  const { root, input } = await fixture()
  const result = await runCheckLocal(root, { ...input, steps: undefined })
  expect(result).toMatchObject({
    ok: true,
    results: [{ kind: 'typecheck' }, { kind: 'lint' }, { kind: 'build' }],
  })
  expect(existsSync(join(root, 'server.pid'))).toBe(false)
})
