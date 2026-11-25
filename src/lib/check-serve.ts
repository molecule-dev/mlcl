import { type ClientRequest, get } from 'node:http'
import { createServer } from 'node:net'

import { type CheckCommand, spawnCheckCommand, stopCheckCommand } from './check-process.js'

/** How long the start script has to produce an HTTP response. */
export const SERVE_READY_TIMEOUT_MS = 15_000
const SERVE_POLL_MS = 75

/** Check TCP port availability even if the listener does not speak HTTP. */
function checkPort(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = createServer((socket) => socket.destroy())
    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') reject(new Error(`Port ${port} is already in use.`))
      else if (host === '::1' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code ?? ''))
        resolve() // localhost still works via IPv4 on systems without IPv6 loopback.
      else reject(new Error(`Could not check port ${port} on ${host}: ${error.message}`))
    })
    probe.listen({ host, port, exclusive: true }, () => {
      probe.close((error) => (error ? reject(error) : resolve()))
    })
  })
}

/** A response's headers are enough. Keep polling even if a previous connection stalls. */
function waitForAnswer(url: URL, hosts: readonly string[], signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const requests = new Set<ClientRequest>()
    const finish = (error?: unknown): void => {
      clearInterval(poller)
      clearTimeout(deadline)
      signal.removeEventListener('abort', abort)
      for (const request of requests) request.destroy()
      if (error === undefined) resolve()
      else reject(error)
    }
    const abort = (): void => finish(signal.reason)
    const poll = (): void => {
      try {
        for (const hostname of hosts) {
          // Pin localhost to loopback, preserve the Host header and stop at the response headers.
          const request = get(url, { hostname, headers: { host: url.host }, agent: false })
          requests.add(request)
          request.once('response', () => finish())
          request.once('information', () => finish())
          request.once('upgrade', (_response, socket) => {
            socket.destroy()
            finish()
          })
          request.once('close', () => requests.delete(request))
          request.once('error', (_error) => {
            // Refused or broken connections are retried on the next poll.
          })
        }
      } catch (error) {
        finish(error)
      }
    }
    const poller = setInterval(poll, SERVE_POLL_MS)
    const deadline = setTimeout(
      () =>
        finish(
          new Error(
            `The service did not answer at ${url.host}${url.pathname} within ${SERVE_READY_TIMEOUT_MS / 1000}s.`,
          ),
        ),
      SERVE_READY_TIMEOUT_MS,
    )
    signal.addEventListener('abort', abort, { once: true })
    poll()
  })
}

type CommandExit = Awaited<CheckCommand['exited']>

function exitMessage(exit: CommandExit): string {
  if (exit.error) return `could not start (${exit.error.message})`
  if (exit.signal) return `was stopped by ${exit.signal}`
  return `exited with status ${exit.code}`
}

function waitForExit(command: CheckCommand, signal: AbortSignal): Promise<CommandExit> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const abort = (): void => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    void command.exited.then((exit) => {
      signal.removeEventListener('abort', abort)
      resolve(exit)
    })
  })
}

function outputOf(command: CheckCommand | undefined): string {
  if (!command) return ''
  const { stdout, stderr } = command.output()
  return [stdout, stderr].filter(Boolean).join('\n')
}

/** Start one npm script and keep it alive while running the caller's assertion. */
export async function runServeCheck(
  step: { dir: string; command: string; ready: URL; run: string },
  signal: AbortSignal,
): Promise<{ error?: Error; diagnostic: string; log: string }> {
  const hosts = step.ready.hostname === 'localhost' ? ['127.0.0.1', '::1'] : ['127.0.0.1']
  const port = Number(step.ready.port || 80)
  const overflow = new AbortController()
  const running = AbortSignal.any([signal, overflow.signal])
  const onOverflow = (error: Error): void => overflow.abort(error)
  let server: CheckCommand | undefined
  let assertion: CheckCommand | undefined
  let error: Error | undefined
  try {
    signal.throwIfAborted()
    for (const host of hosts) await checkPort(host, port)
    signal.throwIfAborted()

    server = spawnCheckCommand(step.command, step.dir, onOverflow)
    const startup = new AbortController()
    void server.exited.then((exit) => {
      startup.abort(new Error(`The start script ${exitMessage(exit)} before the service answered.`))
    })
    await waitForAnswer(step.ready, hosts, AbortSignal.any([running, startup.signal]))

    running.throwIfAborted()
    assertion = spawnCheckCommand(step.run, step.dir, onOverflow)
    const exit = await waitForExit(assertion, running)
    if (exit.code !== 0) error = new Error(`The assertion ${exitMessage(exit)}.`)
  } catch (cause) {
    error = cause instanceof Error ? cause : new Error(String(cause))
  } finally {
    const commands = [assertion, server].filter((command) => command !== undefined)
    const cleanup = await Promise.allSettled(commands.map(stopCheckCommand))
    const failed = cleanup.find((result) => result.status === 'rejected')
    if (failed) {
      const message = `Could not stop a serve process: ${String(failed.reason)}`
      error = error ? new Error(`${error.message}\n${message}`) : new Error(message)
    }
  }

  const serverOutput = outputOf(server)
  const assertionOutput = outputOf(assertion)
  const log = [
    error?.message,
    serverOutput && `Start script output:\n${serverOutput}`,
    assertionOutput && `Assertion output:\n${assertionOutput}`,
  ]
    .filter(Boolean)
    .join('\n')
  return { error, diagnostic: assertion ? assertionOutput : serverOutput, log }
}
