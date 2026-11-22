/**
 * Ranking the example slices (`templates/.agents/skills/examples/<category>/<name>/`, each a
 * working, tested feature to copy and adapt) for a request such as "let people log in with
 * Google".
 *
 * mlcl owns this module: `mlcl examples` and the MCP `find_example` tool use it, and the
 * Molecule harness's own `find_example` tool runs a byte-identical copy, so one query finds the
 * same slices in every harness. It is pure and reads no files.
 *
 * @module
 */

import { phraseInText } from './text-match.js'

/** The fields of an example slice that ranking reads. */
export interface ExampleSearchEntry {
  category: string
  feature: string
  /** Where the slice lives: `.agents/skills/examples/<category>/<feature>`. */
  path: string
  name: string
  intent: string
  keywords: string[]
  /** Whole, multiword feature phrases the slice explicitly matches in plan steps. */
  planPhrases?: string[]
}

/**
 * Extract the known search fields from a README's YAML frontmatter.
 * @param md - The README markdown content.
 * @returns The parsed frontmatter fields (best-effort).
 */
export function parseExampleFrontmatter(
  md: string,
): Partial<Pick<ExampleSearchEntry, 'name' | 'intent' | 'keywords' | 'planPhrases'>> {
  const block = md.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!block) return {}
  const fm = block[1]
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  // `intent` is usually a block scalar (`intent: |`) with indented bullet lines.
  const blockIntent = fm.match(/^intent:\s*\|?\s*\n((?:[ \t]+.*\n?)+)/m)
  let intent: string
  if (blockIntent) {
    intent = blockIntent[1]
      .split('\n')
      .map((l) =>
        l
          .trim()
          .replace(/^-\s*/, '')
          .replace(/^["']|["']$/g, ''),
      )
      .filter(Boolean)
      .join('; ')
  } else {
    intent = fm.match(/^intent:\s*(.+)$/m)?.[1]?.trim() ?? ''
  }
  const list = (value = ''): string[] =>
    value
      .split(',')
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
  const keywords = list(fm.match(/^keywords:\s*\[([^\]]*)\]/m)?.[1])
  const planPhrases = list(fm.match(/^planPhrases:\s*\[([^\]]*)\]/m)?.[1]).filter((phrase) =>
    /\S+\s+\S+/.test(phrase),
  )
  return { name, intent, keywords, planPhrases }
}

// Function words plus the PROCESS verbs a plan step is made of ("verify the
// built site", "adapt vite.config.ts", "extend the parser", "exercise the
// reader flow"). None of them says what a slice is about; counting them let
// two of them in a long intent clear the score floor (backlog G4).
const STOPWORDS = new Set([
  'a',
  'adapt',
  'add',
  'an',
  'and',
  'app',
  'build',
  'check',
  'click',
  'confirm',
  'create',
  'end',
  'ensure',
  'exercise',
  'extend',
  'for',
  'i',
  'in',
  'let',
  'make',
  'me',
  'my',
  'needed',
  'of',
  'only',
  'open',
  'run',
  'so',
  'sure',
  'that',
  'the',
  'then',
  'this',
  'to',
  'use',
  'users',
  'verify',
  'want',
  'wire',
  'with',
  // the rest of a plan step's scaffolding — verbs of adaptation and function
  // words; none says what a slice is about
  'able',
  'adjust',
  'after',
  'again',
  'all',
  'already',
  'also',
  'alongside',
  'any',
  'before',
  'behavior',
  'behaviour',
  'both',
  'but',
  'can',
  'default',
  'do',
  'does',
  'down',
  'during',
  'each',
  'emit',
  'etc',
  'every',
  'existing',
  'expose',
  'from',
  'get',
  'has',
  'have',
  'here',
  'how',
  'if',
  'into',
  'just',
  'least',
  'less',
  'like',
  'more',
  'most',
  'must',
  'need',
  'needs',
  'never',
  'new',
  'no',
  'not',
  'off',
  'once',
  'one',
  'other',
  'our',
  'out',
  'over',
  'own',
  'people',
  'per',
  'preserve',
  'put',
  'requested',
  'respecting',
  'retain',
  'same',
  'see',
  'set',
  'should',
  'show',
  'some',
  'still',
  'such',
  'supplied',
  'than',
  'their',
  'them',
  'there',
  'these',
  'they',
  'those',
  'through',
  'up',
  'used',
  'user',
  'using',
  'very',
  'via',
  'was',
  'we',
  'well',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'why',
  'will',
  'within',
  'without',
  'would',
  'you',
  'your',
  // function words and file extensions a plan step is full of
  'are',
  'as',
  'at',
  'be',
  'by',
  'is',
  'it',
  'its',
  'on',
  'or',
  'ts',
  'tsx',
  'js',
  'mjs',
  'cjs',
  'md',
  'json',
  'css',
  'html',
])

/** Whole-word presence of a token (with a simple plural) in a text. */
function hasWord(text: string, tok: string): boolean {
  const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${esc}(s|es)?(?=$|[^a-z0-9])`).test(text)
}

/**
 * "log in" is the concept "login" (so are "sign in" / "sign up"): a slice named
 * `oauth-google-login` is named by a step that says "log in with Google", and the
 * stopword filter would otherwise drop the "in" and leave a bare "log".
 * @param text - Lowercased text.
 * @returns The text with those two-word verbs joined.
 */
function joinVerbPhrases(text: string): string {
  return text
    .replace(/\blog[ -]in\b/g, 'login')
    .replace(/\bsign[ -]in\b/g, 'signin')
    .replace(/\bsign[ -]up\b/g, 'signup')
}

/** Crude singular form for concept comparison ("tags" → "tag", "invoices" → "invoice"). */
function stem(tok: string): string {
  return tok.length > 3 ? tok.replace(/([^s])s$/, '$1') : tok
}

/**
 * The concepts a short text is made of: lowercase words split on space, `/`
 * and `-` (so `markdown-blog` is two concepts), stopwords dropped, singular.
 * @param text - A slice name, feature, or intent line.
 * @returns Distinct concept tokens.
 */
function conceptTokens(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^\da-z\s/-]/g, ' ')
        .split(/[\s/-]+/)
        .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
        .map(stem),
    ),
  ]
}

/**
 * Rank example slices for a desired outcome or a plan step.
 * @param examples - The slices to rank.
 * @param query - What the user wants (e.g. "let people log in with Google").
 * @param limit - Max results (default 6).
 * @returns The matching slices, best first (empty if nothing matches or there are none).
 */
export function rankExamples<T extends ExampleSearchEntry>(
  examples: readonly T[],
  query: string,
  limit = 6,
): T[] {
  if (examples.length === 0 || !query.trim()) return []
  // "log in" is the concept "login" for every comparison below, the curated keywords included:
  // compared with the raw query, the keyword `log` (audit-log) matched "let people log in with
  // Google" and offered the audit log as a sign-in example.
  const queryJoined = joinVerbPhrases(query.toLowerCase())
  const tokens = queryJoined
    .replace(/[^\da-z\s/-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
  if (tokens.length === 0) return []
  const queryStems = new Set(tokens.map(stem))
  // A long query is a plan step, not a one-line ask. A step touches many
  // concepts, so one shared word ("tags", "link", "section", "document") is
  // not evidence it is ABOUT the slice: rehearsal 5's plan pointed at
  // tags-input, comment-threads, pdf-invoices and passwordless-magic-link on
  // exactly one such word each (G4, second round). A step is matched only when
  // it names the slice (most of its name's concepts) or states one of the
  // slice's own intent lines / multi-word keywords whole. A short query is the
  // concept itself and keeps the looser rule below.
  const isPlanStep = tokens.length > 3

  const scored = examples.map((e) => {
    // Two haystacks: the slice's IDENTITY (name, feature, category, curated
    // keywords) and its free-text intent. A token found only in the intent prose
    // still scores, but a match must also touch the identity at least once —
    // otherwise two everyday words in a long intent ("confirm", "open", "run",
    // "end") turn a plan step like "verify the built site end to end" into a
    // confident pointer at email-verification (observed in every X0 rehearsal,
    // backlog G4). Concept overlap with what the slice IS, never with how its
    // intent happens to be phrased.
    const identity = joinVerbPhrases(
      [e.name, e.feature, e.category, ...e.keywords].join(' ').toLowerCase(),
    )
    const intentText = joinVerbPhrases((e.intent ?? '').toLowerCase())
    let score = 0
    let identityHits = 0
    let phraseHit = false
    for (const tok of tokens) {
      if (hasWord(identity, tok)) {
        score += 1
        identityHits += 1
      } else if (hasWord(intentText, tok)) score += 1
    }
    // Word-boundary match, NOT `queryJoined.includes(kw)`: a short keyword buried in a
    // larger word (chat⊂chatbot, pay⊂paypal) would hand out a confident +2 that clears
    // the score>=2 floor and points the executor at the wrong slice. See text-match.ts.
    for (const kw of e.keywords) {
      const kwTokens = kw.toLowerCase().split(/\s+/).filter(Boolean)
      if (kwTokens.every((t) => STOPWORDS.has(t))) continue
      if (phraseInText(queryJoined, joinVerbPhrases(kw.toLowerCase()))) {
        score += 2
        identityHits += 1
        if (kwTokens.length >= 2) phraseHit = true
      }
    }
    if (e.feature.replace(/-/g, ' ').includes(tokens.join(' '))) {
      score += 2
      identityHits += 1
      phraseHit = true
    }
    // An intent line the query states whole ("log in with google" ⊇ "Log in
    // with Google") is the slice's author anticipating this ask. Two concepts
    // at least — a one-word line ("Add AI") is no more than a keyword.
    if (!phraseHit) {
      for (const line of intentText.split('; ')) {
        const lineTokens = conceptTokens(line)
        if (lineTokens.length >= 2 && lineTokens.every((t) => queryStems.has(t))) {
          score += 2
          phraseHit = true
          break
        }
      }
    }
    // Does the query NAME the slice? More than half of the name's concepts
    // (`csv-import` is not named by "import … data"; `oauth-google-login` is
    // named by "google … log in").
    const nameTokens = conceptTokens(`${e.name} ${e.feature}`)
    const named = nameTokens.filter((t) => queryStems.has(t)).length
    const nameCovered = named > 0 && named * 2 > nameTokens.length
    // Or does it hit TWO of the slice's own one-word keywords? A list of
    // concepts ("blog articles comments favorites follow") is long like a plan
    // step but is about the slice it shares two curated keywords with — it
    // matched nothing (X1 sol-m02, 2026-10-14) while "blog" alone found
    // markdown-blog. One shared word in a long step stays the noise G4 guards.
    const keywordStems = new Set(
      e.keywords.filter((kw) => !/\s/.test(kw.trim())).map((kw) => stem(kw.toLowerCase())),
    )
    const keywordConcepts = [...keywordStems].filter((k) => queryStems.has(k)).length
    const grounded = isPlanStep
      ? phraseHit || nameCovered || keywordConcepts >= 2
      : identityHits >= 1
    return { e, score, grounded }
  })
  // Require score >= 2, not just > 0. A score of 1 means exactly ONE query token
  // incidentally appeared in the joined haystack with NO curated-keyword hit (+2)
  // and NO feature-phrase hit (+2) — a lone word overlap that is almost always
  // noise (e.g. "show charts" -> paginated-user-list, "map with markers" ->
  // csv-export, "send an SMS" -> transactional-emails). For the weak executor a
  // confident wrong pointer ("copy + adapt this slice") is worse than no match:
  // it adapts unrelated code instead of falling through to find_package /
  // build-from-scratch. Suppressing score-1 hits also lets the caller's
  // found === 0 branch fire trackCapabilityGap for genuinely-uncovered outcomes.
  // A real match hits a keyword or shares >= 2 tokens, so it clears this floor —
  // and is grounded in the slice's identity (see above).
  return scored
    .filter((s) => s.score >= 2 && s.grounded)
    .sort((a, b) => b.score - a.score || a.e.path.localeCompare(b.e.path))
    .slice(0, limit)
    .map((s) => s.e)
}
