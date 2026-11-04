import { describe, expect, it } from 'vitest'

import { compactDeclarationComments, cutAtMemberBoundary } from '../declaration-fit.js'

const config = `interface ClientConfig {
  /**
   * Base URL of the API. Every request path is resolved against it, e.g. \`/users\`
   * becomes \`https://api.example.com/users\`.
   *
   * @example
   * \`\`\`ts
   * createClient({ baseURL: 'https://api.example.com' })
   * \`\`\`
   */
  baseURL: string
  /**
   * Wraps each auth request body before it is sent, e.g. \`{ user: body }\` for
   * an API that expects an envelope. Defaults to sending the body as is.
   * @param body - The body the client built.
   * @returns The body to send.
   */
  requestBody?: (body: Record<string, unknown>) => unknown
  // Section: deprecated settings
  /**
   * Old name of baseURL.
   * @deprecated Use \`baseURL\`.
   */
  url?: string
}`

describe('compactDeclarationComments', () => {
  it('summary: keeps each member with one line of its JSDoc, deprecations included', () => {
    const out = compactDeclarationComments(config, 'summary')
    expect(out).toBe(`interface ClientConfig {
  /** Base URL of the API. */
  baseURL: string
  /** Wraps each auth request body before it is sent, e.g. \`{ user: body }\` for an API that expects an envelope. */
  requestBody?: (body: Record<string, unknown>) => unknown
  // Section: deprecated settings
  /** Old name of baseURL. @deprecated Use \`baseURL\`. */
  url?: string
}`)
  })

  it('summary: caps a long first sentence', () => {
    const long = `interface A {\n  /** ${'word '.repeat(80)}end. */\n  a: string\n}`
    const out = compactDeclarationComments(long, 'summary') ?? ''
    const comment = out.split('\n')[1].trim()
    expect(comment.length).toBeLessThanOrEqual(160 + '/**  */'.length)
    expect(comment).toMatch(/…\s\*\/$/)
  })

  it('drop: removes every comment and the lines they stood on, code unchanged', () => {
    expect(compactDeclarationComments(config, 'drop')).toBe(`interface ClientConfig {
  baseURL: string
  requestBody?: (body: Record<string, unknown>) => unknown
  url?: string
}`)
  })

  it('drop: a trailing comment goes, the code on its line stays', () => {
    expect(
      compactDeclarationComments('interface A {\n  a: string // the a\n  b: number\n}', 'drop'),
    ).toBe('interface A {\n  a: string\n  b: number\n}')
  })

  it('never reads a template literal type as a comment', () => {
    const text =
      'interface Links {\n  /** Home page. More text. */\n  home: `https://${string}/x//y`\n  next: `${number}//${string}`\n}'
    expect(compactDeclarationComments(text, 'drop')).toBe(
      'interface Links {\n  home: `https://${string}/x//y`\n  next: `${number}//${string}`\n}',
    )
    expect(compactDeclarationComments(text, 'summary')).toBe(
      'interface Links {\n  /** Home page. */\n  home: `https://${string}/x//y`\n  next: `${number}//${string}`\n}',
    )
  })

  it('refuses a rewrite that would change the code', () => {
    // The scanner, without the parser's context, reads the regular expression's `/*` as a comment opener.
    const text =
      'class Matcher {\n  /** Tests a value. */\n  test(value: string): boolean {\n    return /a\\/*b/.test(value)\n  }\n}'
    expect(compactDeclarationComments(text, 'drop')).toBeNull()
  })

  it('leaves a declaration without comments as it is', () => {
    const text = 'type Pair = { left: string; right: string }'
    expect(compactDeclarationComments(text, 'summary')).toBe(text)
    expect(compactDeclarationComments(text, 'drop')).toBe(text)
  })
})

describe('cutAtMemberBoundary', () => {
  const members = Array.from({ length: 10 }, (_, i) => `  member${i}: string`)
  const text = `interface Wide {\n${members.join('\n')}\n  member9(): void\n}`

  it('keeps whole members up to the limit and names the rest once each', () => {
    const limit = text.indexOf('member4') + 'member4: string'.length
    const cut = cutAtMemberBoundary(text, limit)
    expect(cut?.text.endsWith('member4: string')).toBe(true)
    expect(cut?.text).not.toContain('member5')
    expect(cut?.omitted).toEqual(['member5', 'member6', 'member7', 'member8', 'member9'])
  })

  it('cuts between the members of an object type alias', () => {
    const cut = cutAtMemberBoundary(
      'type T = {\n  a: string\n  b: string\n  c: string\n}',
      'type T = {\n  a: string\n  b'.length,
    )
    expect(cut).toEqual({ text: 'type T = {\n  a: string', omitted: ['b', 'c'] })
  })

  it('names signatures that have no name', () => {
    const cut = cutAtMemberBoundary(
      'interface F {\n  a: string\n  (x: number): string\n  [key: string]: unknown\n}',
      'interface F {\n  a: string'.length,
    )
    expect(cut?.omitted).toEqual(['(call signature)', '[index signature]'])
  })

  it('returns null for a declaration without members to cut between', () => {
    expect(cutAtMemberBoundary("type U = 'a' | 'b' | 'c'", 10)).toBeNull()
    expect(cutAtMemberBoundary(text, 5)).toBeNull()
  })
})
