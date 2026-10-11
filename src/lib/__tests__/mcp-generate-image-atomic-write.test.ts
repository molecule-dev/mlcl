// @vitest-environment node
/**
 * `generate_image` with `n > 1` must either write the whole set or nothing.
 *
 * Only the base `output_file` was pre-checked; the suffixed paths (`-2`, `-3`,
 * `-4`) were checked INSIDE the write loop, so a call whose second path already
 * existed wrote image 1, then threw — the tool reported a failure (its contract
 * is that it never overwrites anything) while having left a partial set on disk
 * under the name the caller was told was refused. The paths are now all resolved
 * and checked before the first byte is written.
 *
 * These tests drive the REAL stdio server through a linked in-memory transport
 * with the hosted service stubbed, so the filesystem is the assertion.
 *
 * @module
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK + execa. */
const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

/**
 * The hosted service's stand-in: two 1-byte png images, one call counted.
 *
 * `onCall` is the hook a test uses to simulate ANOTHER writer landing during the
 * round-trip — the window between the tool's `existsSync` checks and its writes.
 */
const hosted = vi.hoisted(() => ({
  calls: 0,
  onCall: null as null | (() => void),
  /**
   * Which payload the double answers with EMPTY: `'pdf'` for the pdf service,
   * `'image'` for every other one. A 2xx that carries the field with no bytes is
   * the shape a shrunken rewrite, a proxy's 200 or a service bug leaves.
   */
  emptyPayload: null as null | 'pdf' | 'image',
}))

/**
 * A path whose exclusive create SUCCEEDS and whose data write then fails — the
 * shape a full disk leaves (see the `writeNewFileSync` doc): the kernel creates
 * the empty file first, so the failure must not leave it behind.
 */
const failingWrite = vi.hoisted(() => ({ path: null as string | null }))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realWriteFileSync = actual.writeFileSync as (p: unknown, ...rest: unknown[]) => void
  return {
    ...actual,
    writeFileSync(p: unknown, data: unknown, opts?: unknown): void {
      if (typeof p === 'string' && failingWrite.path !== null && p === failingWrite.path) {
        // Create the file exactly as `O_CREAT|O_EXCL` would, then fail the data
        // write — verified against Node: the created file STAYS on disk when
        // the write throws (nothing unlinks it).
        realWriteFileSync(p, Buffer.alloc(0), opts)
        const error = new Error('ENOSPC: no space left on device, write') as NodeJS.ErrnoException
        error.code = 'ENOSPC'
        throw error
      }
      realWriteFileSync(p, data, opts)
    },
  }
})

vi.mock('../../../mcp/src/services.js', () => ({
  /** A real class: `serviceResult` matches it with `instanceof`. */
  ServiceCallError: class ServiceCallError extends Error {},
  callHostedService: async (service: string) => {
    hosted.calls += 1
    hosted.onCall?.()
    if (service === 'pdf') {
      return {
        data: hosted.emptyPayload === 'pdf' ? '' : Buffer.from('%PDF-fake').toString('base64'),
        pageCount: 1,
      }
    }
    const empty = hosted.emptyPayload === 'image'
    return {
      images: [
        { base64: empty ? '' : Buffer.from('one').toString('base64') },
        { base64: empty ? '' : Buffer.from('two').toString('base64') },
      ],
    }
  },
  createApiKeyIntoEnv: async () => ({}),
  listProjects: async () => [],
}))

beforeEach(() => {
  hosted.onCall = null
  hosted.emptyPayload = null
  // Every test's assertions about how many times the service was asked are
  // meaningless against a counter that keeps running across tests: the
  // collision case below asserts an ABSOLUTE `toBe(1)`, and a suite that ran it
  // after any other service call read that earlier total instead of its own —
  // passing or failing on the order the file happened to run in. Each test now
  // starts from its own zero, and the delta-style assertions elsewhere (which
  // capture `before`) are unaffected.
  hosted.calls = 0
})

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}

const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

let dir: string
let callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
let closeClient: () => Promise<void>

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-generate-image-'))
  process.env.DO_NOT_TRACK = '1'

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'generate-image-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  delete process.env.DO_NOT_TRACK
  if (dir) rmSync(dir, { recursive: true, force: true })
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-generate-image] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

describe('generate_image — an n > 1 set lands whole or not at all', () => {
  it('writes NOTHING when a later image path already exists', async (ctx) => {
    if (skipped(ctx)) return

    const target = join(dir, 'collide.png')
    // The SECOND output's path is taken; the base name is fresh.
    writeFileSync(join(dir, 'collide-2.png'), 'already here')

    const result = await callTool('generate_image', {
      prompt: 'a logo',
      output_file: target,
      n: 2,
    })

    expect(result.isError, 'a colliding name is refused').toBe(true)
    expect(textOf(result)).toContain('already exists')
    // The refusal is whole: the first image must not have been written under a
    // name the caller was told was not used.
    expect(existsSync(target), 'no partial set behind a failed call').toBe(false)
    expect(existsSync(join(dir, 'collide-1.png'))).toBe(false)
    expect(hosted.calls, 'the service was still asked for the images').toBe(1)
  })

  it('leaves no partial file behind when a write fails mid-set', async (ctx) => {
    if (skipped(ctx)) return

    // `O_CREAT|O_EXCL` creates the empty file BEFORE the bytes are written, so a
    // data write that then fails (a full disk) leaves a partial file at the
    // caller's own output name — one this tool refuses on the next attempt
    // ("already exists. Pick a fresh name") and that the whole-set rollback
    // cannot see, because it only removes the paths it finished writing.
    const target = join(dir, 'poisoned.png')
    failingWrite.path = target
    try {
      const result = await callTool('generate_image', {
        prompt: 'a logo',
        output_file: target,
        n: 2,
      })

      expect(result.isError, 'a failed write fails the call').toBe(true)
      expect(existsSync(target), 'no partial file under the refused name').toBe(false)
      expect(existsSync(join(dir, 'poisoned-2.png'))).toBe(false)
    } finally {
      failingWrite.path = null
    }
  })

  it('writes the whole set when every path is free (no over-tightening)', async (ctx) => {
    if (skipped(ctx)) return

    const target = join(dir, 'fresh.png')
    const result = await callTool('generate_image', {
      prompt: 'a logo',
      output_file: target,
      n: 2,
    })

    expect(result.isError).toBeFalsy()
    expect(existsSync(target)).toBe(true)
    expect(existsSync(join(dir, 'fresh-2.png'))).toBe(true)
  })

  it('writes under the requested name whatever the extension’s case', async (ctx) => {
    if (skipped(ctx)) return

    // The .png check above is CASE-INSENSITIVE (`extname(target).toLowerCase()`),
    // so an uppercase extension is accepted — and the stem that feeds the
    // suffixed names must be derived the same way. `basename(target, '.png')`
    // matches its suffix case-SENSITIVELY, so it left 'Shouty.PNG' whole and
    // every path became `Shouty.PNG…png`: image 1 landed at `Shouty.PNG.png`
    // (nothing at the name the caller asked for, so a second call with the same
    // output_file passed the "never overwritten" check and clobbered it) and the
    // documented `-2` suffix named a third file again.
    const target = join(dir, 'Shouty.PNG')
    const result = await callTool('generate_image', {
      prompt: 'a logo',
      output_file: target,
      n: 2,
    })

    expect(result.isError).toBeFalsy()
    expect(existsSync(target), 'image 1 lands at the name the caller gave').toBe(true)
    expect(existsSync(join(dir, 'Shouty-2.png'))).toBe(true)
    expect(existsSync(join(dir, 'Shouty.PNG.png')), 'no second .png glued on').toBe(false)
  })
})

describe('render_pdf — the output name is created, never replaced', () => {
  it('refuses a name another writer took DURING the render', async (ctx) => {
    if (skipped(ctx)) return

    // `render_pdf` checks `existsSync(target)` BEFORE it calls the hosted
    // service, so the check and the write are separated by the whole render
    // round-trip (seconds): a concurrent call with the same output_file — or any
    // other writer — takes the name in that window. A truncating write then
    // silently replaced the winner's document under a name the tool had already
    // promised was free.
    const target = join(dir, 'raced.pdf')
    hosted.onCall = () => writeFileSync(target, 'rival bytes')

    const result = await callTool('render_pdf', { html: '<h1>hi</h1>', output_file: target })

    expect(result.isError, 'a name taken during the render is refused').toBe(true)
    expect(textOf(result)).toContain('already exists')
    expect(readFileSync(target, 'utf-8')).toBe('rival bytes')
  })
})

describe('text_to_speech — a 2xx body must carry audio before anything is written', () => {
  it('answers an audio-less body with the tool’s own failure, not a raw TypeError', async (ctx) => {
    if (skipped(ctx)) return
    // Every non-pdf service in the double above answers with the IMAGE shape,
    // which has no `audio` field — exactly what a shrunken rewrite, a proxy's
    // 200 or a service bug leaves. Without the shape gate the handler reached
    // `Buffer.from(undefined, 'base64')` and the client was handed Node's
    // "The first argument must be of type string …" instead of the failure
    // every sibling tool reports, and nothing said the audio never arrived.
    const target = join(dir, 'speech.mp3')

    const result = await callTool('text_to_speech', { text: 'hello', output_file: target })

    expect(result.isError, 'an answer carrying no audio is a failure').toBe(true)
    expect(textOf(result)).toContain('no audio data')
    expect(existsSync(target), 'a failed call writes nothing').toBe(false)
  })
})

describe('a 2xx body carrying an EMPTY payload is the failure it is', () => {
  // Gating on the TYPE alone (`typeof data === 'string'`) accepted `{"data": ""}`:
  // `Buffer.from('', 'base64')` decoded it to zero bytes, so the tool wrote a
  // 0-byte document under the caller's chosen name and reported success — and
  // because these tools never replace their output, the retry was refused as
  // "already exists" too. The failure has to be reported before the write.
  it('render_pdf reports the empty body and leaves no 0-byte file behind', async (ctx) => {
    if (skipped(ctx)) return
    hosted.emptyPayload = 'pdf'
    const target = join(dir, 'empty-render.pdf')

    const result = await callTool('render_pdf', { html: '<h1>hi</h1>', output_file: target })

    expect(result.isError, 'an answer carrying no bytes is a failure').toBe(true)
    expect(textOf(result)).toContain('no PDF data')
    expect(existsSync(target), 'nothing may be written under the caller’s name').toBe(false)
  })

  it('generate_image treats an empty base64 as no image at all', async (ctx) => {
    if (skipped(ctx)) return
    hosted.emptyPayload = 'image'
    const target = join(dir, 'empty-image.png')

    const result = await callTool('generate_image', { prompt: 'a logo', output_file: target })

    expect(result.isError, 'empty bytes are not an image').toBe(true)
    expect(textOf(result)).toContain('no image data')
    expect(existsSync(target)).toBe(false)
    expect(existsSync(join(dir, 'empty-image-2.png'))).toBe(false)
  })
})

describe('the size caps the descriptions advertise are enforced', () => {
  it('merge_pdfs refuses a file over 8 MB before the service is asked', async (ctx) => {
    if (skipped(ctx)) return
    const big = join(dir, 'big.pdf')
    writeFileSync(big, Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(9 * 1024 * 1024)]))
    const before = hosted.calls

    const result = await callTool('merge_pdfs', {
      input_files: [big],
      output_file: join(dir, 'merged.pdf'),
    })

    expect(result.isError, 'an over-size input is refused').toBe(true)
    expect(textOf(result)).toContain('the limit is 8 MB per file')
    expect(hosted.calls, 'the service is never asked to merge it').toBe(before)
  })

  it('merge_pdfs refuses a set that totals over 24 MB', async (ctx) => {
    if (skipped(ctx)) return
    const seven = join(dir, 'seven.pdf')
    writeFileSync(seven, Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(7 * 1024 * 1024)]))
    const before = hosted.calls

    // 4 × 7 MB = 28 MB: every file is under the 8 MB per-file cap, so only the
    // TOTAL cap can refuse this.
    const result = await callTool('merge_pdfs', {
      input_files: [seven, seven, seven, seven],
      output_file: join(dir, 'merged-total.pdf'),
    })

    expect(result.isError, 'an over-total input is refused').toBe(true)
    expect(textOf(result)).toContain('the limit is 24 MB')
    expect(hosted.calls).toBe(before)
  })

  it('transform_image refuses an input over 8 MB before the service is asked', async (ctx) => {
    if (skipped(ctx)) return
    const big = join(dir, 'big.png')
    writeFileSync(big, Buffer.alloc(9 * 1024 * 1024))
    const before = hosted.calls

    const result = await callTool('transform_image', {
      input_file: big,
      output_file: join(dir, 'transformed.png'),
      ops: [{ op: 'resize', width: 10 }],
    })

    expect(result.isError, 'an over-size input is refused').toBe(true)
    expect(textOf(result)).toContain('the limit is 8 MB')
    expect(hosted.calls).toBe(before)
  })
})

describe('a missing output directory is refused BEFORE the metered call', () => {
  // `writeNewFileSync` creates the file with O_EXCL and cannot create a
  // directory, so an output path under a directory that does not exist failed
  // the WRITE — after the render/transcode/merge had been paid for (each is
  // metered and seconds long) — with a raw `ENOENT: no such file or directory`
  // that names neither the tool's contract nor the fix. generate_image and
  // text_to_speech refuse the same path up front; every tool that writes
  // through that helper must.
  const outputIn = (name: string): string => join(dir, 'nope', name)

  it('render_pdf', async (ctx) => {
    if (skipped(ctx)) return
    const before = hosted.calls
    const result = await callTool('render_pdf', {
      html: '<h1>hi</h1>',
      output_file: outputIn('missing.pdf'),
    })
    expect(result.isError, 'a path that cannot be written is refused').toBe(true)
    expect(textOf(result)).toContain('does not exist')
    expect(hosted.calls, 'the service is never asked to render into it').toBe(before)
  })

  it('merge_pdfs', async (ctx) => {
    if (skipped(ctx)) return
    const input = join(dir, 'input-for-merge.pdf')
    writeFileSync(input, '%PDF-1.4\n')
    const before = hosted.calls
    const result = await callTool('merge_pdfs', {
      input_files: [input],
      output_file: outputIn('missing-merge.pdf'),
    })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('does not exist')
    expect(hosted.calls, 'the service is never asked to merge into it').toBe(before)
  })

  it('watermark_pdf', async (ctx) => {
    if (skipped(ctx)) return
    const input = join(dir, 'input-for-watermark.pdf')
    writeFileSync(input, '%PDF-1.4\n')
    const before = hosted.calls
    const result = await callTool('watermark_pdf', {
      input_file: input,
      text: 'draft',
      output_file: outputIn('missing-watermark.pdf'),
    })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('does not exist')
    expect(hosted.calls, 'the service is never asked to watermark into it').toBe(before)
  })

  it('transform_image', async (ctx) => {
    if (skipped(ctx)) return
    const input = join(dir, 'input-for-transform.png')
    writeFileSync(input, 'not really a png')
    const before = hosted.calls
    const result = await callTool('transform_image', {
      input_file: input,
      output_file: outputIn('missing-transform.png'),
      ops: [{ op: 'resize', width: 10 }],
    })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('does not exist')
    expect(hosted.calls, 'the service is never asked to transform into it').toBe(before)
  })
})
