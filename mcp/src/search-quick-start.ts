/**
 * The first `search_packages` hits carry their README's Quick Start.
 *
 * Asked which package to use and how to call it, both harnesses searched and then read one or two
 * READMEs only to copy their Quick Start into the answer: a model turn per README (harness eval
 * `find`, 2026-11-23; Codex took four tool calls where the agent without Molecule took one). A
 * README read costs about 0.2 s; a model turn costs seconds. The snippet answers "how do I call
 * it"; the full doc (`read_package_doc`) stays the place to read before writing code against it.
 *
 * Each README comes from the caller's reader (the installed copy, else npm), bounded by
 * {@link QUICK_START_WAIT_MS} in all, so a slow or offline registry costs search that much at most
 * and never its answer.
 *
 * @module
 */

/** How many of the first hits get their Quick Start: enough for a core and its first providers. */
export const QUICK_START_HITS = 3

/** The longest a search waits for those READMEs. */
export const QUICK_START_WAIT_MS = 1500

/**
 * The code of a README's Quick Start: the first fenced block under its `## Quick Start` heading.
 *
 * @param readme - A generated package README.
 * @returns The block's code without its fence, or undefined when the README has none.
 */
export function quickStartOf(readme: string): string | undefined {
  const section = /^## Quick Start\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(readme)?.[1]
  const code = section && /^```[^\n]*\n([\s\S]*?)^```/m.exec(section)?.[1]
  return code ? code.replace(/\n+$/, '') : undefined
}

/**
 * Add `quickStart` to the first {@link QUICK_START_HITS} entries of a search result.
 *
 * @param json - The search result: the JSON array `mlcl search --json` prints.
 * @param readReadme - Reads a package's README by its name without the `@molecule/` scope;
 *   undefined or a rejection means none.
 * @param waitMs - The bound on all the reads together.
 * @returns The same JSON with the snippets added; unchanged when it is not an array.
 */
export async function withQuickStarts(
  json: string,
  readReadme: (short: string) => Promise<string | undefined>,
  waitMs: number = QUICK_START_WAIT_MS,
): Promise<string> {
  let hits: unknown
  try {
    hits = JSON.parse(json)
  } catch (_error) {
    // Not the JSON result (a CLI message): pass it through as the CLI printed it.
    return json
  }
  if (!Array.isArray(hits)) return json
  const first = hits
    .slice(0, QUICK_START_HITS)
    .filter(
      (hit): hit is { name: string } & Record<string, unknown> =>
        typeof hit === 'object' && hit !== null && typeof hit.name === 'string',
    )
  if (first.length === 0) return json
  let expire = (): void => {}
  const deadline = new Promise<undefined>((resolve) => {
    expire = () => resolve(undefined)
  })
  const timer = setTimeout(() => expire(), waitMs)
  await Promise.all(
    first.map(async (hit) => {
      const read = readReadme(hit.name.replace(/^@molecule\//, '')).catch(() => undefined)
      const readme = await Promise.race([read, deadline])
      const quickStart = readme && quickStartOf(readme)
      if (quickStart) hit.quickStart = quickStart
    }),
  )
  clearTimeout(timer)
  return JSON.stringify(hits, null, 2)
}
