/**
 * Which blocks of a post an AI wrote — from the coding-agent transcripts the
 * post was written with.
 *
 * Put a post's transcript exports in `content/transcripts/<slug>/` (Claude
 * Code `/export` text or session `.jsonl`, Codex Markdown export or rollout
 * `.jsonl`, a Molecule IDE conversation's JSON — any mix). The build then
 * writes `dist/<slug>/provenance.json`: each top-level block of the post as
 * `human` or `ai`, with the prompt (as the person typed it) and the model
 * behind every `ai` block, plus the post's AI word share. A post without a
 * transcripts folder gets no file; files in the folder that are not
 * transcripts are skipped.
 *
 * The attribution is `@molecule/api-text-provenance` with its word-overlap bond;
 * the transcripts are read by `@molecule/api-agent-transcript-autodetect`. To
 * show provenance on a page, call `postProvenance()` from src/pages.ts —
 * `spans[i]` lines up with `markdownBlocks(post.markdown)[i]`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  canReadTranscript,
  readTranscript,
  setProvider as setTranscriptReader,
} from '@molecule/api-agent-transcript'
import { provider as anyTranscript } from '@molecule/api-agent-transcript-autodetect'
import { attributeText, setProvider as setAttribution } from '@molecule/api-text-provenance'
import { provider as wordOverlap } from '@molecule/api-text-provenance-overlap'

setTranscriptReader(anyTranscript)
setAttribution(wordOverlap)

/** One block of the post, in page order. `prompt` and `model` are on every ai span. */
export interface ProvenanceSpan {
  /** The block's markdown: a paragraph, heading, list or code block. */
  text: string
  origin: 'human' | 'ai'
  /** The person's message the AI was answering, as typed. */
  prompt?: string
  /** The model that wrote it, as the transcript names it. */
  model?: string
}

/** What `/<slug>/provenance.json` holds. */
export interface Provenance {
  /** 0..1, the share of the post's words the AI wrote. */
  aiShare: number
  words: number
  aiWords: number
  /** The distinct prompts behind the ai spans, in page order. */
  prompts: string[]
  spans: ProvenanceSpan[]
}

/**
 * A post's top-level blocks: front matter dropped, split on blank lines, never
 * inside a code fence.
 *
 * @param markdown - The post file, front matter included or not.
 * @returns The blocks, in order.
 */
export function markdownBlocks(markdown: string): string[] {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  const blocks: string[] = []
  let lines: string[] = []
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(`{3}|~{3})/.test(line)) inFence = !inFence
    if (!inFence && line.trim() === '') {
      if (lines.length > 0) blocks.push(lines.join('\n'))
      lines = []
    } else {
      lines.push(line)
    }
  }
  if (lines.length > 0) blocks.push(lines.join('\n'))
  return blocks
}

/**
 * Attribute one post from its markdown and the folder holding its transcripts.
 *
 * @param markdown - The post file's text.
 * @param transcriptDir - The folder of transcript exports.
 * @returns The post's provenance.
 */
export function postProvenance(markdown: string, transcriptDir: string): Provenance {
  const blocks = markdownBlocks(markdown)
  const files = readdirSync(transcriptDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()
  const sessions = files
    .map((name) => ({ text: readFileSync(join(transcriptDir, name), 'utf8'), fileName: name }))
    .filter((input) => canReadTranscript(input))
    .map((input) => readTranscript(input))
  const result = attributeText({ paragraphs: blocks, sessions })
  return {
    aiShare: result.aiShare,
    words: result.words,
    aiWords: result.aiWords,
    prompts: result.prompts,
    spans: result.paragraphs.map((p): ProvenanceSpan => {
      const text = blocks[p.index] ?? ''
      return p.origin === 'ai'
        ? { text, origin: 'ai', prompt: p.prompt, model: p.model }
        : { text, origin: 'human' }
    }),
  }
}
