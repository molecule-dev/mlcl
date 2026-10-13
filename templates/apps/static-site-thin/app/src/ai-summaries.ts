/**
 * The TL;DR beside each section of a post, written at build time.
 *
 * A static site has no server to summarize on request, so the summaries are
 * generated once, when the site is built, and shipped in the page — the switch
 * under a post's title only shows and hides them. Each one is a single sentence
 * (at most 25 words) written from that section's own text, so a summary can
 * only tell a reader what the section already says.
 *
 * How it works: the AI chat bond is the project's DeepSeek key
 * (`DEEPSEEK_API_KEY`, server-side only — this runs in the build, never in the
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

import { provider as deepseek } from '@molecule/api-ai-deepseek'
import { setProvider as setSummarizer } from '@molecule/api-ai-summarization'
import {
  countWords,
  createFileSummaryCache,
  provider as summarizer,
  summarizeCached,
} from '@molecule/api-ai-summarization-llm'
import { bond } from '@molecule/api-bond'

/**
 * Sections with fewer PROSE words than this are not worth a summary — the
 * paragraph is one already. Prose only: fenced code is not counted, so a
 * cheatsheet section of one sentence and five commands is short.
 *
 * The build applies this to EVERY summary, generated or passed in by hand
 * (`worthSummary`, used by src/build.ts): a short section shows no TL;DR,
 * however its summary was written.
 */
export const MIN_WORDS = 80

/**
 * A section's prose words: fenced code blocks removed, inline code kept as
 * words, markdown markers (#, >, *, _, |, -) not counted.
 *
 * @param text - The section's markdown.
 * @returns The number of prose words.
 */
export function proseWords(text: string): number {
  return countWords(
    text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`\n]*)`/g, '$1')
      .replace(/[#>*_|-]/g, ' '),
  )
}

/**
 * Whether a section is long enough to carry a TL;DR (`MIN_WORDS` prose words).
 *
 * @param text - The section's markdown.
 * @returns True when the section gets a summary.
 */
export function worthSummary(text: string): boolean {
  return proseWords(text) >= MIN_WORDS
}

/**
 * The model that writes the summaries. A TL;DR of a paragraph needs no frontier
 * model, and a build summarizes every long section of every post, so the
 * cheapest capable one: DeepSeek V4.1 Flash.
 */
const MODEL = 'deepseek-flash'

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
  bond('ai', 'deepseek', deepseek)
  setSummarizer(summarizer)
  ready = true
}

/**
 * One sentence about each section of a post, keyed by the section's first block
 * index (`sectionStarts()` in src/post-notes.ts).
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
  const wanted = sections.filter((section) => worthSummary(section.text))
  if (wanted.length === 0) return {}
  // No key, no model: the site builds without summaries (the posts and every
  // page still work). Checked here so a keyless build or test never dials out.
  if (!process.env.DEEPSEEK_API_KEY) return {}
  const summaries: Record<number, string> = {}
  let cache: ReturnType<typeof createFileSummaryCache>
  try {
    bondSummarizer()
    cache = createFileSummaryCache(join(root, CACHE_FILE))
  } catch (error) {
    // A build without summaries is a working site; a build that fails is not.
    console.warn(`[summaries] ${slug}: no section summaries this build — ${message(error)}`)
    return {}
  }
  // Each section on its own, with one retry: one failed call (a rate limit, a
  // timeout) used to throw away the WHOLE post's summaries, cached ones
  // included, and the next deploy published a post with none. Now a failure costs only that section, the cache keeps every
  // answer that came back, and the build says how many are missing.
  const missed: number[] = []
  for (const section of wanted) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await summarizeCached(
          { text: section.text, format: 'tldr', maxWords: MAX_WORDS, model: MODEL },
          { cache },
        )
        // Over the cap or unfinished (no full stop, ends on "and"/"the"…): the
        // summarizer's fallback, not a TL;DR. Leave the section without one; the
        // next build asks again. Publishing it showed readers a sentence that
        // stops mid-phrase.
        if (result.withinCap !== false) summaries[section.index] = result.summary
        break
      } catch (error) {
        if (attempt === 1) {
          missed.push(section.index)
          console.warn(
            `[summaries] ${slug}: section at block ${section.index} has no summary this build — ${message(error)}`,
          )
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1500))
        }
      }
    }
  }
  cache.save()
  if (missed.length > 0) {
    console.warn(
      `[summaries] ${slug}: ${missed.length} of ${wanted.length} long sections have NO summary — rebuild before deploying (answers that came back are cached, so a rebuild only asks for these).`,
    )
  }
  return summaries
}

/** An error's message, for a log line. */
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
