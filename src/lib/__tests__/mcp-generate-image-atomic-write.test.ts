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
  /**
   * Answer the SPEECH service with a body that carries no `audio` field at all
   * (the image shape). Off by default: the field-MISSING gate and the
   * decoded-length gate are two different branches of `decodeServicePayload`,
   * and a double that always omits the field can only ever reach the first one.
   */
  stripsAudio: false,
  /**
   * Answer every payload field with a NON-EMPTY string that decodes to ZERO
   * bytes (`'x'` — one base64 character is an incomplete group, so the decoder
   * ignores it). The length-based gates all pass this, and the tools then write
   * a 0-byte artifact and report success — the failure the "empty payload" gate
   * above exists to prevent, reached by a different shape.
   */
  undecodablePayload: false,
  /**
   * Answer the embeddings service with a 2xx body that carries NO `embeddings`
   * field — the shape an empty body (`data = {}` in services.ts), a shrunken
   * rewrite or a service bug leaves. The embed gate must report it as the
   * failure it is instead of dereferencing the missing array.
   */
  stripEmbeddings: false,
}))

/**
 * A path whose exclusive create SUCCEEDS and whose data write then fails — the
 * shape a full disk leaves (see the `writeNewFileSync` doc): the kernel creates
 * the empty file first, so the failure must not leave it behind.
 */
const failingWrite = vi.hoisted(() => ({ path: null as string | null }))

/**
 * Every path `writeFileSync` was asked to write, in order — the only observable
 * that tells the whole-set PRE-CHECK apart from the rollback.
 *
 * The tool's contract is that the planned paths are all resolved and checked
 * "before the first byte is written", and the end state cannot say that: a
 * version that writes image 1, fails on the taken image-2 path and rolls image 1
 * back leaves the SAME empty target and the same "already exists" message as one
 * that refused up front — so every `existsSync` assertion still held while the
 * first byte really was written. Recording the writes makes "never wrote it" the
 * assertion instead.
 */
const writes = vi.hoisted(() => ({ paths: [] as string[] }))

/**
 * A path whose REMOVAL fails — the shape an EPERM/EBUSY/EIO cleanup leaves, and
 * the reason the whole-set rollback must not let its own failure replace the
 * write failure the client is owed.
 */
const failingRemove = vi.hoisted(() => ({ path: null as string | null }))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realWriteFileSync = actual.writeFileSync as (p: unknown, ...rest: unknown[]) => void
  const realRmSync = actual.rmSync as (p: unknown, ...rest: unknown[]) => void
  return {
    ...actual,
    writeFileSync(p: unknown, data: unknown, opts?: unknown): void {
      // Recorded for every write, the injected-failure branch included: see
      // `writes` — a path this call was refused never reaches here at all.
      if (typeof p === 'string') writes.paths.push(p)
      if (typeof p === 'string' && failingWrite.path !== null && p === failingWrite.path) {
        // Fail the FIRST write to this path and no later one: a guarded writer's
        // RESTORE is a second write to the same path, and it is exactly the
        // behavior under test (text_to_speech puts the previous bytes back), so
        // it has to be allowed to land.
        failingWrite.path = null
        // Create the file exactly as `O_CREAT|O_EXCL` would (or truncate it,
        // for the default 'w' flag), then fail the data write — verified against
        // Node: the created file STAYS on disk when the write throws (nothing
        // unlinks it).
        realWriteFileSync(p, Buffer.alloc(0), opts)
        const error = new Error('ENOSPC: no space left on device, write') as NodeJS.ErrnoException
        error.code = 'ENOSPC'
        throw error
      }
      realWriteFileSync(p, data, opts)
    },
    rmSync(p: unknown, ...rest: unknown[]): void {
      if (typeof p === 'string' && failingRemove.path !== null && p === failingRemove.path) {
        const error = new Error('EPERM: operation not permitted, unlink') as NodeJS.ErrnoException
        error.code = 'EPERM'
        throw error
      }
      return realRmSync(p, ...rest)
    },
  }
})

vi.mock('../../../mcp/src/services.js', () => ({
  /** A real class: `serviceResult` matches it with `instanceof`. */
  ServiceCallError: class ServiceCallError extends Error {},
  callHostedService: async (service: string) => {
    hosted.calls += 1
    hosted.onCall?.()
    const payload = (encoded: string): string => {
      if (hosted.undecodablePayload) return 'x'
      return encoded
    }
    if (service === 'pdf') {
      return {
        data:
          hosted.emptyPayload === 'pdf' ? '' : payload(Buffer.from('%PDF-fake').toString('base64')),
        pageCount: 1,
      }
    }
    if (service === 'embeddings') {
      return hosted.stripEmbeddings
        ? { model: 'text-embedding-3-small', usage: {} }
        : {
            embeddings: [
              [0.1, 0.2],
              [0.3, 0.4],
            ],
            model: 'text-embedding-3-small',
            usage: { total_tokens: 2 },
          }
    }
    if (service === 'speech') {
      // The speech service's OWN shape. Without this branch every non-pdf
      // service fell through to the image body, so `text_to_speech` never had
      // an `audio` field and the decoded-length gate could not be reached for
      // it at all (`stripsAudio` is the "no field" case that branch used to
      // stand in for).
      if (hosted.stripsAudio) return { contentType: 'audio/mpeg' }
      return {
        audio:
          hosted.emptyPayload === 'image' ? '' : payload(Buffer.from('heard').toString('base64')),
        contentType: 'audio/mpeg',
      }
    }
    const empty = hosted.emptyPayload === 'image'
    return {
      images: [
        { base64: empty ? '' : payload(Buffer.from('one').toString('base64')) },
        { base64: empty ? '' : payload(Buffer.from('two').toString('base64')) },
      ],
    }
  },
  createApiKeyIntoEnv: async () => ({}),
  listProjects: async () => [],
}))

beforeEach(() => {
  hosted.onCall = null
  hosted.emptyPayload = null
  hosted.stripsAudio = false
  hosted.undecodablePayload = false
  hosted.stripEmbeddings = false
  failingRemove.path = null
  // Each test's write record is its own — see `writes`.
  writes.paths.length = 0
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
    // The other path this call would have touched is `<stem>-2.png` (the naming
    // scheme is `<stem>.png`, `<stem>-2.png`, …, never `-1`) — it was there
    // before the call and must still hold the same bytes: the refusal wrote
    // nothing, and it did not clobber the file that caused it.
    expect(readFileSync(join(dir, 'collide-2.png'), 'utf-8')).toBe('already here')
    expect(hosted.calls, 'the service was still asked for the images').toBe(1)
    // …and the refusal happened BEFORE the first byte: every planned path is
    // resolved and checked up front, so the free one is never written at all.
    // The end state cannot say that — a version that wrote image 1, failed on
    // the taken path and rolled image 1 back leaves exactly the disk state and
    // the same "already exists" message asserted above — so the WRITE RECORD is
    // the assertion. Deleting the pre-check (`for (const { path } of planned) if
    // (existsSync(path)) throw`) writes the target here first and this fails.
    expect(
      writes.paths,
      'a refused set must never be written, not even for a moment (the rollback is not the contract)',
    ).not.toContain(target)
  })

  it('rolls back the images already written when a later write fails mid-set', async (ctx) => {
    if (skipped(ctx)) return

    // `O_CREAT|O_EXCL` creates the empty file BEFORE the bytes are written, so a
    // data write that then fails (a full disk) leaves a partial file at the
    // caller's own output name — one this tool refuses on the next attempt
    // ("already exists. Pick a fresh name") and that the whole-set rollback
    // cannot see, because it only removes the paths it finished writing.
    //
    // The failure is injected on the SECOND image, after the first has landed:
    // that is the mid-set case the rollback exists for. (Failing the FIRST
    // write — what this test used to do — left the rollback's `written` list
    // empty, so nothing was ever removed and the assertions could not fail.)
    const target = join(dir, 'poisoned.png')
    const second = join(dir, 'poisoned-2.png')
    failingWrite.path = second
    try {
      const result = await callTool('generate_image', {
        prompt: 'a logo',
        output_file: target,
        n: 2,
      })

      expect(result.isError, 'a failed write fails the call').toBe(true)
      expect(existsSync(second), 'no partial file under the failed write’s own name').toBe(false)
      expect(existsSync(target), 'image 1 must be rolled back with the failed set').toBe(false)
    } finally {
      failingWrite.path = null
    }
  })

  it('reports the WRITE failure, not its own cleanup failure, when a rollback cannot remove a file', async (ctx) => {
    if (skipped(ctx)) return

    // The rollback mirrors writeNewFileSync's own cleanup: a failed removal
    // (EPERM/EBUSY/EIO — the same conditions that made the write fail) must not
    // abort the loop, leave the files after it behind, or REPLACE the error the
    // client is owed. Unguarded, the client was told 'EPERM … unlink' for a call
    // whose real failure was a full disk, and a partial set survived under names
    // its retry is then refused as "already exists".
    const target = join(dir, 'cleanup-blocked.png')
    const second = join(dir, 'cleanup-blocked-2.png')
    failingWrite.path = second // image 2's data write fails (ENOSPC)
    failingRemove.path = target // …and the rollback of image 1 cannot unlink it
    try {
      const result = await callTool('generate_image', {
        prompt: 'a logo',
        output_file: target,
        n: 2,
      })

      expect(result.isError, 'the write failure still fails the call').toBe(true)
      const message = textOf(result)
      expect(message, 'the client is told the WRITE failed').toContain('ENOSPC')
      expect(message, 'a cleanup failure must never replace the real error').not.toContain('EPERM')
    } finally {
      failingWrite.path = null
      failingRemove.path = null
      rmSync(target, { force: true })
      rmSync(second, { force: true })
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
    // The double answers the speech service with a body carrying NO `audio`
    // field — exactly what a shrunken rewrite, a proxy's 200 or a service bug
    // leaves. Without the shape gate the handler reached
    // `Buffer.from(undefined, 'base64')` and the client was handed Node's
    // "The first argument must be of type string …" instead of the failure
    // every sibling tool reports, and nothing said the audio never arrived.
    hosted.stripsAudio = true
    const target = join(dir, 'speech.mp3')

    const result = await callTool('text_to_speech', { text: 'hello', output_file: target })

    expect(result.isError, 'an answer carrying no audio is a failure').toBe(true)
    expect(textOf(result)).toContain('no audio data')
    expect(existsSync(target), 'a failed call writes nothing').toBe(false)
  })

  it('restores the previous audio when the write fails part-way through', async (ctx) => {
    if (skipped(ctx)) return
    // `text_to_speech` is the one file-writing tool that REPLACES what is at the
    // path (its own output is regenerated on demand), and it did so with a bare
    // `writeFileSync` — whose `w` flag TRUNCATES first. A write that then failed
    // (a full disk, EIO) left the caller's previous file as a zero-length or
    // half-written fragment while the call reported the failure: a failed
    // operation damaged the state it was supposed to leave alone. The audio the
    // payload decodes to IS what the tool writes, so the file must come back.
    const target = join(dir, 'speech-existing.mp3')
    writeFileSync(target, 'previous audio bytes')
    failingWrite.path = target
    try {
      const result = await callTool('text_to_speech', { text: 'hello', output_file: target })

      expect(result.isError, 'a failed write fails the call').toBe(true)
      expect(
        readFileSync(target, 'utf-8'),
        'a failed write must leave the file that was already there',
      ).toBe('previous audio bytes')
    } finally {
      failingWrite.path = null
      rmSync(target, { force: true })
    }
  })

  it('writes real audio (the positive twin — the gate must not reject a payload)', async (ctx) => {
    if (skipped(ctx)) return
    // Without this the two failure tests above are satisfied by a handler that
    // refuses EVERY speech answer; the gate has to admit the shape the service
    // actually sends.
    const target = join(dir, 'speech-ok.mp3')

    const result = await callTool('text_to_speech', { text: 'hello', output_file: target })

    expect(result.isError, 'a payload carrying audio is a success').toBeFalsy()
    expect(readFileSync(target, 'utf-8'), 'the decoded bytes are written').toBe('heard')
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

  it('a NON-EMPTY payload that decodes to nothing is the same failure', async (ctx) => {
    if (skipped(ctx)) return
    // The gate's own shape: `data.length === 0` / `base64.length > 0` test the
    // STRING, and a string is not bytes. Node's base64 decoder ignores a
    // trailing incomplete group, so `"x"` is non-empty and decodes to ZERO
    // bytes — the length gate passed it, the tool wrote a 0-byte artifact under
    // the caller's chosen name and reported success, and the name was then
    // taken (the retry is refused as "already exists"). Every tool that writes
    // a service payload is reached this way.
    hosted.undecodablePayload = true

    const pdfTarget = join(dir, 'undecodable.pdf')
    const pdf = await callTool('render_pdf', { html: '<h1>hi</h1>', output_file: pdfTarget })
    expect(pdf.isError, 'a payload that decodes to nothing is a failure').toBe(true)
    expect(textOf(pdf)).toContain('no PDF data')
    expect(existsSync(pdfTarget), 'no 0-byte PDF under the caller’s name').toBe(false)

    const speechTarget = join(dir, 'undecodable.mp3')
    const speech = await callTool('text_to_speech', { text: 'hello', output_file: speechTarget })
    expect(speech.isError, 'a payload that decodes to nothing is a failure').toBe(true)
    expect(textOf(speech)).toContain('no audio data')
    expect(existsSync(speechTarget), 'no 0-byte audio under the caller’s name').toBe(false)

    const imageTarget = join(dir, 'undecodable.png')
    const image = await callTool('generate_image', {
      prompt: 'a logo',
      output_file: imageTarget,
      n: 2,
    })
    expect(image.isError, 'a payload that decodes to nothing is a failure').toBe(true)
    expect(textOf(image)).toContain('no image data')
    expect(existsSync(imageTarget), 'no 0-byte png under the caller’s name').toBe(false)
    expect(existsSync(join(dir, 'undecodable-2.png')), 'no second 0-byte png').toBe(false)
  })
})

describe('embed_text — a 2xx body must carry the vectors it reports', () => {
  it('answers a body without embeddings with the tool’s own failure, not a raw TypeError', async (ctx) => {
    if (skipped(ctx)) return
    // callHostedService hands every 2xx body through verbatim (`{}` for an empty
    // one — services.ts answers `data = {}` there), and a shrunken rewrite, a
    // proxy's 200 or a service bug can leave the `embeddings` field absent. With
    // summary_only the handler read `result.embeddings.length` off `undefined`
    // and the client was handed Node's "Cannot read properties of undefined …"
    // naming neither the tool nor the metered round trip it paid for — where
    // every sibling payload gate reports "The service returned no … data".
    hosted.stripEmbeddings = true
    try {
      const summarized = await callTool('embed_text', {
        input: 'hello',
        summary_only: true,
        directory: dir,
      })
      expect(summarized.isError, 'an answer carrying no vectors is a failure').toBe(true)
      expect(textOf(summarized)).toContain('no embedding data')

      // The pass-through branch is the same call with the same hole: a body with
      // no embeddings reported success and handed the caller the bare non-answer.
      const passed = await callTool('embed_text', { input: 'hello', directory: dir })
      expect(passed.isError, 'the pass-through branch refuses the same body').toBe(true)
      expect(textOf(passed)).toContain('no embedding data')
    } finally {
      hosted.stripEmbeddings = false
    }
  })

  it('reports the vectors a real answer carries (no over-tightening)', async (ctx) => {
    if (skipped(ctx)) return
    const summarized = await callTool('embed_text', {
      input: 'hello',
      summary_only: true,
      directory: dir,
    })
    expect(summarized.isError).toBeFalsy()
    const summary = JSON.parse(textOf(summarized)) as {
      vectors: number
      dimensions: number
      model: string
    }
    expect(summary.vectors).toBe(2)
    expect(summary.dimensions).toBe(2)
    expect(summary.model).toBe('text-embedding-3-small')

    const passed = await callTool('embed_text', { input: 'hello', directory: dir })
    expect(passed.isError).toBeFalsy()
    expect(textOf(passed)).toContain('"embeddings"')
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

describe('transform_image refuses a taken output name BEFORE the metered call', () => {
  // The tool writes under the extension of the format the service PRODUCED, not
  // under the caller's `output_file` extension — so a pipeline that converts
  // (`convert`/`optimize` with a `format`) names a different file. Only
  // `output_file` was checked up front; the written path's own existence check
  // sat after the transform, so a taken one billed the caller for a call that
  // was certain to fail.
  it('refuses when the CONVERTED name is taken, without asking the service', async (ctx) => {
    if (skipped(ctx)) return
    const input = join(dir, 'input-for-convert.png')
    writeFileSync(input, 'not really a png')
    // The pipeline converts to png, so the tool writes `<stem>.png` — the name
    // that is taken. `output_file` itself (`.jpg`) is free, which is why the
    // old up-front check passed.
    writeFileSync(join(dir, 'converted.png'), 'already here')
    const before = hosted.calls

    const result = await callTool('transform_image', {
      input_file: input,
      output_file: join(dir, 'converted.jpg'),
      ops: [{ op: 'convert', format: 'png' }],
    })

    expect(result.isError, 'a taken output name is refused').toBe(true)
    expect(textOf(result)).toContain('already exists')
    expect(hosted.calls, 'the service is never asked to run a doomed transform').toBe(before)
    expect(
      readFileSync(join(dir, 'converted.png'), 'utf-8'),
      'the existing file is untouched',
    ).toBe('already here')
  })

  it('still runs the transform when the CONVERTED name is free (no over-tightening)', async (ctx) => {
    if (skipped(ctx)) return
    // The refusal above must be about the TAKEN name, never about converting at
    // all: the same call with a free `<stem>.png` has to reach the service.
    const input = join(dir, 'input-for-convert-free.png')
    writeFileSync(input, 'not really a png')
    const before = hosted.calls

    const result = await callTool('transform_image', {
      input_file: input,
      output_file: join(dir, 'convert-free.jpg'),
      ops: [{ op: 'convert', format: 'png' }],
    })

    // The transform double answers the image service with the image-generation
    // shape (no `data`), so the call reports no image data — what matters is
    // that it was ASKED, i.e. the free converted name was not refused as taken.
    expect(textOf(result)).not.toContain('already exists')
    expect(hosted.calls, 'a free converted name must not be refused').toBe(before + 1)
  })
})
