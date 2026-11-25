/**
 * The packages `mlcl create --packages` names.
 *
 * The flag takes `@molecule/*` names separated by commas, spaces or both (`--packages a,b`,
 * `--packages a b`, `--packages a --packages b`), with or without the `@molecule/` scope, as
 * `mlcl docs` takes them. A name the registry does not list is refused before anything is
 * written: a misspelled one used to reach `npm install` and fail there, and one without the
 * scope was dropped, so the stack silently got the default provider instead.
 *
 * oclif hands a flag that takes several values every word up to the next flag, so a project name
 * written after the list (`--packages @molecule/api-auth my-app`) arrives with it. The last word,
 * written on its own, is the project name when it names no package and no name came before the
 * flag.
 *
 * @module
 */

/** What a `--packages` list names. */
export interface CreatePackages {
  /** The `@molecule/*` packages, scoped, in the order given, each once. */
  packages: string[]
  /** The project name: the one given before the flag, or the word after the list that is not a package. */
  name: string | undefined
  /** Words that name no package in the registry. */
  unknown: string[]
}

/**
 * Read a `--packages` list.
 *
 * @param values - The flag's values as oclif parsed them: one per word up to the next flag.
 * @param name - The project name given before the flag, if any.
 * @param known - The registry's package names.
 * @returns The packages, the project name and the words that name no package.
 */
export function readCreatePackages(
  values: readonly string[] | undefined,
  name: string | undefined,
  known: ReadonlySet<string>,
): CreatePackages {
  const packages: string[] = []
  const unknown: string[] = []
  let projectName = name
  const words = values ?? []
  words.forEach((value, index) => {
    const last = index === words.length - 1
    for (const word of value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)) {
      const scoped = word.startsWith('@') ? word : `@molecule/${word}`
      if (known.has(scoped)) {
        if (!packages.includes(scoped)) packages.push(scoped)
      } else if (projectName === undefined && last && index > 0 && !value.includes(',')) {
        projectName = word
      } else {
        unknown.push(word)
      }
    }
  })
  return { packages, name: projectName, unknown }
}
