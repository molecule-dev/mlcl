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

import { fetchPublishedReadme, localPackageDoc, npmRegistryUrl } from '../lib/package-doc-files.js'
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
 * A package's published README and latest version, from the registry npm uses in the current
 * directory ({@link npmRegistryUrl}).
 *
 * @param name - The package name without its scope.
 * @returns The README and version, or null when npm has no README for it.
 */
async function publishedReadme(name: string): Promise<{ readme: string; version?: string } | null> {
  return fetchPublishedReadme(name, {
    timeoutMs: NPM_TIMEOUT_MS,
    registry: npmRegistryUrl(process.env, process.cwd()),
  })
}

/** npm's name shape, one path segment: a word outside it cannot be a package name. */
const PACKAGE_NAME = /^[a-z0-9][a-z0-9._-]*$/

/**
 * A word that names a package: the scope, or npm's name shape with a hyphen, which every
 * `@molecule/*` name has (`api-database`, `eslint-config`). `translations` in an unquoted
 * `--section Editing translations` is a word of the heading.
 *
 * @param word - One argument.
 * @returns Whether it names a package.
 */
function namesPackage(word: string): boolean {
  const name = word.replace(/^@molecule\//, '')
  return PACKAGE_NAME.test(name) && (word.startsWith('@molecule/') || name.includes('-'))
}

/**
 * A section name the shell split into words. `mlcl docs api-uploads --section Quick Start` reached
 * the command as the section `Quick` and a second package `Start`, which it refused (harness eval
 * `add`, 2026-11-25, Codex). The words right after the section's value that do not name a package
 * ({@link namesPackage}) continue it.
 *
 * @param raw - The command's raw arguments.
 * @param section - The parsed `--section` value.
 * @param positional - The parsed package arguments.
 * @returns The section and the package arguments without the words that belong to it.
 */
function joinSplitSection(
  raw: readonly string[],
  section: string | undefined,
  positional: readonly string[],
): { section: string | undefined; names: string[] } {
  const names = [...positional]
  const at = raw.findIndex((arg) => arg === '--section' || arg.startsWith('--section='))
  if (section === undefined || at < 0) return { section, names }
  const words: string[] = []
  for (let i = raw[at] === '--section' ? at + 2 : at + 1; i < raw.length; i++) {
    const word = raw[i]
    if (word.startsWith('-') || namesPackage(word)) break
    words.push(word)
    names.splice(names.lastIndexOf(word), 1)
  }
  return { section: [section, ...words].join(' '), names }
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
    const split = joinSplitSection(this.argv, flags.section, argv as string[])
    const section = split.section
    const names = split.names.map((name) => name.trim().replace(/^@molecule\//, ''))
    if (names.length === 0)
      this.error('Name a package to read: npx mlcl docs @molecule/<name> --section "<heading>"', {
        exit: 2,
      })
    if (names.length > MAX_PACKAGES)
      this.error(`Read at most ${MAX_PACKAGES} packages at once.`, { exit: 2 })
    for (const name of names) {
      // npm's name shape, one path segment: the name is joined into node_modules paths.
      if (!PACKAGE_NAME.test(name))
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
    for (const name of names) results.push(await this.readOne(name, section, search))

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
