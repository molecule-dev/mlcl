/**
 * `mlcl docs <package…>`: read a `@molecule/*` package's docs without printing a whole generated
 * README.
 *
 * The installed copy is read first, walking up from the current directory as Node resolves
 * packages, so its type declarations are searchable too; a package that is not installed is read
 * from npm. A README over 16 KB prints its overview and section index, `--section` prints one
 * section, and `--search` prints the bounded matching lines, examples and declarations. This is
 * how the Molecule harness's own doc tool reads (`src/lib/package-doc-view.ts`).
 *
 * @module
 */

import { Args, Command, Flags } from '@oclif/core'

import { localPackageDoc, npmRegistryUrl } from '../lib/package-doc-files.js'
import { parseDocSearch, searchPackageDoc } from '../lib/package-doc-search.js'
import { packageDocView } from '../lib/package-doc-view.js'

/** The most packages one call reads. */
const MAX_PACKAGES = 8

/** How long the npm request for a package that is not installed may take. */
const NPM_TIMEOUT_MS = 15_000

/** One package's docs, as `--json` prints them. */
interface PackageDocResult {
  package: string
  source: 'installed' | 'npm' | null
  version?: string
  found: boolean
  text: string
}

/**
 * A package's published README and latest version, from the npm registry npm is configured with.
 *
 * @param name - The package name without its scope.
 * @returns The README and version, or null when npm has no README for it.
 */
async function publishedReadme(name: string): Promise<{ readme: string; version?: string } | null> {
  const response = await fetch(`${npmRegistryUrl()}@molecule%2F${name}`, {
    signal: AbortSignal.timeout(NPM_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`npm answered ${response.status} for @molecule/${name}`)
  const packument = (await response.json()) as {
    readme?: unknown
    'dist-tags'?: { latest?: unknown }
  }
  const readme = typeof packument.readme === 'string' ? packument.readme : ''
  if (!readme.trim() || readme.startsWith('ERROR: No README data found')) return null
  const latest = packument['dist-tags']?.latest
  return { readme, ...(typeof latest === 'string' ? { version: latest } : {}) }
}

export default class Docs extends Command {
  static override description =
    "Read a @molecule/* package's docs: the whole README when short, its overview and section index when long, one --section, or --search matches"

  static override examples = [
    '<%= config.bin %> docs @molecule/api-database',
    '<%= config.bin %> docs api-database --section findMany',
    '<%= config.bin %> docs @molecule/api-payments-stripe --search webhook',
    '<%= config.bin %> docs api-database app-ui --json',
  ]

  static override args = {
    packages: Args.string({
      description: `Package names, with or without the @molecule/ scope (up to ${MAX_PACKAGES})`,
      required: true,
    }),
  }

  static override strict = false

  static override flags = {
    section: Flags.string({
      description: 'A heading, or an exported function or type, to print in full',
      exclusive: ['search'],
    }),
    search: Flags.string({
      description:
        'A literal term to find in the README and type declarations (repeat for up to 6)',
      multiple: true,
    }),
    json: Flags.boolean({
      description: 'Print one JSON array, one entry per package',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(Docs)
    const names = (argv as string[]).map((name) => name.trim().replace(/^@molecule\//, ''))
    if (names.length > MAX_PACKAGES)
      this.error(`Read at most ${MAX_PACKAGES} packages at once.`, { exit: 2 })
    for (const name of names) {
      // npm's name shape, one path segment: the name is joined into node_modules paths.
      if (!/^[a-z0-9][a-z0-9._-]*$/.test(name))
        this.error(`"${name}" is not a @molecule package name.`, { exit: 2 })
    }
    let search: string[] | undefined
    if (flags.search) {
      try {
        search = parseDocSearch(flags.search.length === 1 ? flags.search[0] : flags.search)
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error), { exit: 2 })
      }
    }

    const results: PackageDocResult[] = []
    for (const name of names) results.push(await this.readOne(name, flags.section, search))

    if (flags.json) {
      this.log(JSON.stringify(results, null, 2))
    } else {
      for (const result of results) {
        const from =
          result.source === 'installed'
            ? 'installed copy'
            : result.source === 'npm'
              ? `npm${result.version ? `, ${result.version}` : ''}`
              : 'not found'
        this.log(`# @molecule/${result.package} (${from})\n\n${result.text.trimEnd()}\n`)
      }
    }
    if (results.some((result) => !result.found)) this.exit(1)
  }

  /**
   * Read one package's docs.
   *
   * @param name - The package name without its scope.
   * @param section - The section to print, if any.
   * @param search - The search terms, if any.
   * @returns The result for that package.
   */
  private async readOne(
    name: string,
    section: string | undefined,
    search: string[] | undefined,
  ): Promise<PackageDocResult> {
    const local = localPackageDoc(name, process.cwd())
    let readme = local?.readme
    let version: string | undefined
    if (!readme) {
      try {
        const published = await publishedReadme(name)
        readme = published?.readme
        version = published?.version
      } catch (error) {
        return {
          package: name,
          source: null,
          found: false,
          text: `Could not read @molecule/${name} from npm: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
    }
    if (!readme) {
      return {
        package: name,
        source: null,
        found: false,
        text: `@molecule/${name} is not installed here and npm has no README for it. \`npx mlcl search <capability>\` lists the packages.`,
      }
    }
    const source = local ? 'installed' : 'npm'
    if (search) {
      const result = searchPackageDoc(readme, search, local?.declarations ?? [], local?.note)
      return {
        package: name,
        source,
        ...(version ? { version } : {}),
        found: true,
        text: result.doc,
      }
    }
    const view = packageDocView(readme, {
      section,
      sectionHint: `npx mlcl docs @molecule/${name} --section "<heading>"`,
    })
    return {
      package: name,
      source,
      ...(version ? { version } : {}),
      found: view.found,
      text: view.text,
    }
  }
}
