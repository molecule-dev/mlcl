/**
 * Word-boundary phrase matching for the AI lexical matchers.
 *
 * The keyword / intent-hint / exact-phrase bonuses in the lexical matchers (example
 * search, package lookup, intent matching) all reward a curated term appearing in the
 * user's text. Doing that with a raw substring test
 * (`text.includes(term)`) fires when a SHORT term is buried inside a larger,
 * unrelated word — and hands out a confident bonus that surfaces the wrong slice /
 * package:
 *   - `pay`   ⊂ `paypal`     → a PayPal request pointed at Stripe
 *   - `chat`  ⊂ `chatbot`    → an AI-chatbot request pointed at human messaging
 *   - `graph` ⊂ `graphql`    → a GraphQL API query surfacing a CHART widget as #1
 *   - `tag`   ⊂ `stage`      → "stage the deployment" surfacing a tagging resource
 *   - `grade` ⊂ `upgrade`, `order` ⊂ `reorder`, `form` ⊂ `transform`, …
 *
 * `phraseInText` matches on WORD boundaries instead. It uses alphanumeric
 * lookarounds rather than `\b` so multi-word / hyphenated / digit-leading terms
 * ("credit card", "e-commerce", "2fa") keep matching as whole phrases — `\b`'s
 * word-char-at-edge requirement mis-handles those.
 *
 * It DOES tolerate a trailing plural `s`, so a singular hint still matches a plural
 * query word: `chart`→`charts`, `breadcrumb`→`breadcrumbs`, `plan card`→`plan cards`.
 * That's a real inflection of the SAME word, distinct from a collision — the rejected
 * cases fail anyway (`graph`→`graphql`: the continuation is `ql`, not `s`; `tag`→`stage`,
 * `grade`→`upgrade`: the term sits mid-word, so the leading lookbehind rejects it).
 *
 * mlcl owns this module (`src/lib/text-match.ts`); the Molecule harness keeps a byte-identical
 * copy.
 *
 * @module
 */

/** Cache of compiled boundary regexes, keyed by the lowercased phrase. */
const phraseRegexCache = new Map<string, RegExp>()
/** The same regexes with the `g` flag, for {@link phraseCountInText}'s repeat scan. */
const phraseGlobalRegexCache = new Map<string, RegExp>()

/**
 * True if `phrase` occurs in `textLower` as a whole word / phrase — delimited by
 * a non-alphanumeric character or a string edge on both sides — NOT as an
 * incidental substring inside a larger word.
 *
 * @param textLower - The text to search. MUST already be lowercased by the caller
 *   (the matchers all keep a lowercased copy of the user text on hand, and this
 *   avoids re-lowercasing a potentially long string on every per-term call).
 * @param phrase - The word or phrase to find. Case-insensitive (lowercased here);
 *   may be multi-word or contain punctuation (regex-escaped before use).
 * @returns True on a whole-word/phrase match (tolerating a trailing plural `s`),
 *   false otherwise (incl. empty phrase).
 */
export function phraseInText(textLower: string, phrase: string): boolean {
  const p = phrase.toLowerCase()
  if (!p) return false
  let re = phraseRegexCache.get(p)
  if (!re) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // `s?` tolerates a plural query word (chart→charts); the trailing lookahead still
    // rejects a longer unrelated continuation (graph→graphql), and the leading
    // lookbehind rejects a mid-word hit (tag→stage, grade→upgrade).
    re = new RegExp(`(?<![a-z0-9])${escaped}s?(?![a-z0-9])`)
    phraseRegexCache.set(p, re)
  }
  return re.test(textLower)
}

/**
 * How many times `phrase` occurs in `textLower` on the same word boundaries
 * {@link phraseInText} matches — 0 when it does not occur at all.
 *
 * A README heading ranker weighs a term by how OFTEN it appears
 * in a section's body (a section that says `bodyNestedUnderUser` once is about
 * that error; a 61 KB `## API` reference that mentions `format` eleven times is
 * about everything), so it needs the count, not the boolean — and it must count on
 * the same boundaries, or `set` would score a section for every `settings`.
 *
 * @param textLower - The text to search. MUST already be lowercased by the caller.
 * @param phrase - The word or phrase to count. Case-insensitive.
 * @returns The number of whole-word/phrase occurrences (0 for an empty phrase).
 */
export function phraseCountInText(textLower: string, phrase: string): number {
  const p = phrase.toLowerCase()
  if (!p) return 0
  let re = phraseGlobalRegexCache.get(p)
  if (!re) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re = new RegExp(`(?<![a-z0-9])${escaped}s?(?![a-z0-9])`, 'g')
    phraseGlobalRegexCache.set(p, re)
  }
  re.lastIndex = 0
  // A zero-width-safe scan: every match consumes at least one character, so a
  // single `exec` loop cannot spin.
  let count = 0
  while (re.exec(textLower) !== null) count++
  return count
}
