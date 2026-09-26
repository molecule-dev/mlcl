/**
 * The TL;DR beside each section of a post, written at build time.
 *
 * A static site has no server to summarize on request, so the summaries are
 * generated once, when the site is built, and shipped in the page — the switch
 * under a post's title only shows and hides them. Each one is a single sentence
 * (at most 25 words) written from that section's own text, so a summary can
 * only tell a reader what the section already says.
 *
 * How it works: the AI chat bond is the project's Anthropic key
 * (`ANTHROPIC_API_KEY`, server-side only — this runs in the build, never in the
 * browser), and `@molecule/api-ai-summarization-llm` composes it into a
 * summarizer that enforces the word cap in code rather than trusting the model
 * to obey it. `summarizeCached` keeps every answer in `.cache/summaries.json`,
 * keyed by the section's content, so a rebuild only pays for sections that
 * actually changed.
 *
 * Nothing here may break a build. A missing key, a rate limit or a provider
 * outage means the site is built without summaries — the posts still render and
 * every page still works, because a reader who cannot see a summary is better
 * off than a site that failed to build. The reason is logged.
 */
import { join } from 'node:path'

import { provider as anthropic } from '@molecule/api-ai-anthropic'
import { setProvider as setSummarizer } from '@molecule/api-ai-summarization'
import {
  countWords,
  createFileSummaryCache,
  provider as summarizer,
  summarizeCached,
} from '@molecule/api-ai-summarization-llm'
import { bond } from '@molecule/api-bond'

/** Sections shorter than this are not worth a summary — the paragraph is one already. */
const MIN_WORDS = 80

/**
 * The model that writes the summaries. A TL;DR of a paragraph needs no frontier
 * model: Haiku costs an eighth of the Anthropic bond's default (Opus), and a
 * build summarizes every long section of every post.
 */
const MODEL = 'claude-haiku-4-5'

/** The hard cap on a summary, in words: one complete sentence. */
const MAX_WORDS = 25

/** Where summaries are cached between builds, relative to the app root. */
const CACHE_FILE = join('.cache', 'summaries.json')

let ready = false

/**
 * Bond the AI summarizer: the `ai` chat bond first, then the summarizer that
 * composes it. Bonded once per process, on the first post that needs it.
 */
function bondSummarizer(): void {
  if (ready) return
  bond('ai', 'anthropic', anthropic)
  setSummarizer(summarizer)
  ready = true
}

/**
 * One sentence about each section of a post, keyed by the section's first block
 * index (`sectionStarts()` in src/pages.ts).
 *
 * Sections below `MIN_WORDS` are skipped, and so is any section the model could
 * not summarize — a summary that runs past the cap comes back with
 * `withinCap: false` and is not stored, so the next build tries it again.
 *
 * @param root - The app root (where `.cache/summaries.json` lives).
 * @param slug - The post's slug, for the log lines.
 * @param sections - Each section: the index of its first block, and its text.
 * @returns The summaries, empty when the AI is unavailable.
 */
export async function sectionSummaries(
  root: string,
  slug: string,
  sections: Array<{ index: number; text: string }>,
): Promise<Record<number, string>> {
  const wanted = sections.filter((section) => countWords(section.text) >= MIN_WORDS)
  if (wanted.length === 0) return {}
  // No key, no model: the site builds without summaries (the posts and every
  // page still work). Checked here so a keyless build or test never dials out.
  if (!process.env.ANTHROPIC_API_KEY) return {}
  const summaries: Record<number, string> = {}
  try {
    bondSummarizer()
    const cache = createFileSummaryCache(join(root, CACHE_FILE))
    for (const section of wanted) {
      const result = await summarizeCached(
        { text: section.text, format: 'tldr', maxWords: MAX_WORDS, model: MODEL },
        { cache },
      )
      summaries[section.index] = result.summary
    }
    cache.save()
    return summaries
  } catch (error) {
    // A build without summaries is a working site; a build that fails is not.
    console.warn(
      `[summaries] ${slug}: no section summaries this build — ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    return {}
  }
}
