import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The summarizer's own answers, one per section, in call order.
const answers: Array<{ summary: string; withinCap?: boolean }> = []

vi.mock('@molecule/api-ai-summarization-llm', () => ({
  countWords: (s: string) => s.split(/\s+/).filter(Boolean).length,
  createFileSummaryCache: () => ({ save: () => undefined }),
  provider: {},
  summarizeCached: async () => answers.shift(),
}))
vi.mock('@molecule/api-ai-deepseek', () => ({ provider: {} }))
vi.mock('@molecule/api-ai-summarization', () => ({ setProvider: () => undefined }))
vi.mock('@molecule/api-bond', () => ({ bond: () => undefined }))

const { sectionSummaries } = await import('../ai-summaries.js')

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
})
