import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The summarizer's own answers, one per call, in call order; an Error is thrown.
const answers: Array<{ summary: string; withinCap?: boolean } | Error> = []

vi.mock('@molecule/api-ai-summarization-llm', () => ({
  countWords: (s: string) => s.split(/\s+/).filter(Boolean).length,
  createFileSummaryCache: () => ({ save: () => undefined }),
  provider: {},
  summarizeCached: async () => {
    const next = answers.shift()
    if (next instanceof Error) throw next
    return next
  },
}))
vi.mock('@molecule/api-ai-deepseek', () => ({ provider: {} }))
vi.mock('@molecule/api-ai-summarization', () => ({ setProvider: () => undefined }))
vi.mock('@molecule/api-bond', () => ({ bond: () => undefined }))

const { proseWords, sectionSummaries } = await import('../ai-summaries.js')

const long = (word: string): string => Array.from({ length: 90 }, () => word).join(' ')

describe('sectionSummaries', () => {
  beforeEach(() => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key')
    answers.length = 0
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('leaves out a summary the summarizer could not finish within the cap', async () => {
    // The fallback for a section every attempt ran long on: publishing it put a
    // sentence that stops mid-phrase beside the text (X0 x282, x302).
    answers.push(
      { summary: 'The first section explains the idea.', withinCap: true },
      { summary: 'The second section walks through the steps of the', withinCap: false },
    )
    const root = mkdtempSync(join(tmpdir(), 'summaries-'))
    const out = await sectionSummaries(root, 'post', [
      { index: 0, text: long('alpha') },
      { index: 4, text: long('beta') },
    ])
    expect(out).toEqual({ 0: 'The first section explains the idea.' })
  })

  it('a failed call costs only its own section, and is retried once', async () => {
    // One rate-limited call used to throw away every summary of the post, and
    // the next deploy published it with none (X0 x386).
    answers.push(
      new Error('429 rate limited'),
      { summary: 'The first section explains the idea.', withinCap: true },
      new Error('timeout'),
      new Error('timeout'),
      { summary: 'The third section closes it.', withinCap: true },
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const root = mkdtempSync(join(tmpdir(), 'summaries-'))
    const out = await sectionSummaries(root, 'post', [
      { index: 0, text: long('alpha') },
      { index: 4, text: long('beta') },
      { index: 9, text: long('gamma') },
    ])
    expect(out).toEqual({
      0: 'The first section explains the idea.',
      9: 'The third section closes it.',
    })
    expect(
      warn.mock.calls.some(([line]) => /1 of 3 long sections have NO summary/.test(String(line))),
    ).toBe(true)
    warn.mockRestore()
  })
})

describe('proseWords', () => {
  it('does not count fenced code, so a command cheatsheet section is short (X0 x391)', () => {
    const commands = Array.from(
      { length: 30 },
      (_, i) => `git log --oneline --graph --all --decorate -n ${i}`,
    ).join('\n')
    const section = `### Show the history\n\nA compact graph of every branch.\n\n\`\`\`sh\n${commands}\n\`\`\``
    expect(proseWords(section)).toBe(9)
  })
})
