/**
 * `mlcl examples [query… | <category>/<name>]`: find a working example slice for a feature, then
 * print it.
 *
 * A query ranks the slices the way the Molecule harness's `find_example` tool does
 * (`src/lib/example-search.ts`). A slug prints that slice's README (what it does, where each file
 * goes, the packages and variables it needs) and its file list; `--file` prints one file and
 * `--all` every file. With no argument it lists every slice.
 *
 * @module
 */

import { Args, Command, Flags } from '@oclif/core'
import { CLI_COMMAND } from '#cli-command'

import { rankExamples } from '../lib/example-search.js'
import {
  exampleSliceDir,
  exampleSliceFiles,
  exampleSlug,
  loadExampleSlices,
  readExampleSliceFile,
} from '../lib/examples.js'
import { getTemplatesDir } from '../lib/scaffold.js'

/** The most slices a query lists. */
const MATCH_LIMIT = 6

/**
 * A slice's intent, cut to one line.
 *
 * @param intent - The intent from its frontmatter.
 * @returns At most 140 characters of it.
 */
function oneLine(intent: string): string {
  return intent.length > 140 ? `${intent.slice(0, 139).trimEnd()}…` : intent
}

export default class Examples extends Command {
  static override description =
    'Find a working example slice for a feature (a query), or print one (its <category>/<name>): the README maps each file to where it goes in the project'

  static override examples = [
    '<%= config.bin %> examples let people log in with Google',
    '<%= config.bin %> examples auth/oauth-google-login',
    '<%= config.bin %> examples auth/oauth-google-login --file api/bonds/oauth-google.ts',
    '<%= config.bin %> examples',
  ]

  static override args = {
    query: Args.string({
      description:
        'What the feature does, in plain words, or a slice to print (auth/oauth-google-login)',
    }),
  }

  static override strict = false

  static override flags = {
    file: Flags.string({
      description: "Print one of the slice's files (a path its file list shows)",
    }),
    all: Flags.boolean({ description: "Print the slice's README and every file", default: false }),
    json: Flags.boolean({ description: 'Output machine-readable JSON', default: false }),
  }

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(Examples)
    const query = (argv as string[]).join(' ').trim()
    const templatesDir = getTemplatesDir()
    const dir = query ? exampleSliceDir(templatesDir, query) : null
    if (dir) {
      this.printSlice(dir, query.replace(/\/+$/, ''), flags)
      return
    }
    if (flags.file || flags.all)
      this.error(`"${query}" is not a slice. Run ${CLI_COMMAND} examples to list them.`, {
        exit: 2,
      })

    const slices = loadExampleSlices(templatesDir)
    if (!query) {
      if (flags.json) {
        this.log(
          JSON.stringify(
            slices.map((slice) => ({
              slug: exampleSlug(slice),
              name: slice.name,
              intent: slice.intent,
            })),
            null,
            2,
          ),
        )
        return
      }
      this.log(`${slices.length} example slices:\n`)
      for (const slice of slices) this.log(`  ${exampleSlug(slice)} — ${oneLine(slice.intent)}`)
      this.log(`\nFind one for a feature: ${CLI_COMMAND} examples <what it does>`)
      return
    }

    const matches = rankExamples(slices, query, MATCH_LIMIT)
    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            query,
            matches: matches.map((slice) => ({
              slug: exampleSlug(slice),
              name: slice.name,
              intent: slice.intent,
            })),
          },
          null,
          2,
        ),
      )
      return
    }
    if (matches.length === 0) {
      this.log(
        `No example slice matched "${query}". Build it from the packages \`${CLI_COMMAND} search <capability>\` finds, or list every slice with \`${CLI_COMMAND} examples\`.`,
      )
      return
    }
    this.log(
      `Example slices for "${query}" (copy and adapt one rather than writing it from scratch):\n`,
    )
    for (const slice of matches) this.log(`  ${exampleSlug(slice)} — ${oneLine(slice.intent)}`)
    this.log(
      `\nPrint one, with the file map of where each file goes: ${CLI_COMMAND} examples ${exampleSlug(matches[0])}`,
    )
  }

  /**
   * Print a slice: its README and file list, one file, or everything.
   *
   * @param dir - The slice's directory.
   * @param slug - The slice's `<category>/<name>`.
   * @param flags - The parsed flags.
   * @param flags.file - One file to print.
   * @param flags.all - Print every file.
   * @param flags.json - Print JSON.
   */
  private printSlice(
    dir: string,
    slug: string,
    flags: { file?: string; all: boolean; json: boolean },
  ): void {
    const files = exampleSliceFiles(dir)
    if (flags.file) {
      const text = readExampleSliceFile(dir, flags.file)
      if (text === null)
        this.error(`${slug} has no file ${flags.file}. Its files: ${files.join(', ')}`, { exit: 2 })
      this.log(flags.json ? JSON.stringify({ slug, file: flags.file, text }, null, 2) : text)
      return
    }
    const readme = readExampleSliceFile(dir, 'README.md') ?? ''
    const contents = flags.all
      ? Object.fromEntries(files.map((file) => [file, readExampleSliceFile(dir, file) ?? '']))
      : undefined
    if (flags.json) {
      this.log(JSON.stringify({ slug, readme, files, ...(contents ? { contents } : {}) }, null, 2))
      return
    }
    this.log(`# ${slug}\n\n${readme.trimEnd()}\n`)
    if (contents) {
      for (const [file, text] of Object.entries(contents))
        this.log(`## ${file}\n\n${text.trimEnd()}\n`)
      return
    }
    this.log(
      `Files (print one with ${CLI_COMMAND} examples ${slug} --file <path>, or all with --all):`,
    )
    for (const file of files) this.log(`  ${file}`)
  }
}
