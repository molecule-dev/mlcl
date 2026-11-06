/** One package's entry in `npm pack --json` output. */
export interface NpmPackResult {
  filename: string
  files: Array<{ path: string; size: number }>
  size: number
  unpackedSize: number
}

function isPack(value: unknown): value is NpmPackResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { files?: unknown }).files)
  )
}

/**
 * Read the single package result from `npm pack --json`, whichever shape the installed npm prints:
 * npm 11 an array of results (older versions one bare object), npm 12 the same result keyed by
 * package name. An empty, multi-package or malformed document throws instead of yielding a result.
 *
 * @param raw - The command's stdout.
 * @returns The one pack result, with its file list.
 */
export function singlePackResult(raw: string): NpmPackResult {
  const parsed: unknown = JSON.parse(raw)
  const packs = Array.isArray(parsed)
    ? parsed
    : isPack(parsed)
      ? [parsed]
      : typeof parsed === 'object' && parsed !== null
        ? Object.values(parsed)
        : []
  if (packs.length !== 1) throw new Error(`npm pack --json returned ${packs.length} results`)
  const pack: unknown = packs[0]
  if (!isPack(pack)) throw new Error('npm pack --json did not return a file list')
  return pack
}
