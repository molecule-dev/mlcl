/**
 * A feature added to an app after it was created: its whole files, and its parts of the files the
 * app already has.
 *
 * `mlcl create` writes an app's pages for the optional features its stack brings (see
 * `optional-features.ts`) and records them in `package.json` (`molecule.templateFeatures`). An app
 * created with no settings page that later adds the settings panel package needs the page, the
 * drawer, the route and the header menu that opens it: the files the create would have written.
 * They come from rendering the app templates twice, with the recorded features and with the new
 * ones. A file only the second rendering has is written when the app lacks it. A file both have is
 * merged three ways (`git merge-file`: the first rendering is the base, the app's file is ours, the
 * second rendering theirs), so the app's own edits stay; a file whose merge conflicts is left as
 * it is and reported with the change to make. A second provider of a feature the app has (another
 * OAuth provider) renders the two with the providers before and after. An app created before the record existed, or from a
 * flagship template, has no record and is left alone.
 *
 * @module
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

import { copyTemplateFiles } from './scaffold.js'
import type { InferredPackage } from './schema.js'

/**
 * The template variables naming the providers of each named bond category
 * (`OAUTH_PROVIDERS: "'github', 'google'"`), from the stack's packages' `bondWiring`, in registry
 * order: the order `mlcl inject` rewrites the app config's lists in, so a create, an inject and
 * an add write the same line.
 *
 * @param names - The stack's package names.
 * @param packages - The registry packages.
 * @returns One variable per category with a named provider in the stack.
 */
export function providerTemplateVars(
  names: readonly string[],
  packages: readonly InferredPackage[],
): Record<string, string> {
  const stack = new Set(names)
  const vars: Record<string, string> = {}
  for (const pkg of packages) {
    if (!stack.has(pkg.name)) continue
    const bondWiring = pkg.molecule?.bondWiring as
      { type?: string; bondCategory?: string } | undefined
    if (bondWiring?.type !== 'named' || !bondWiring.bondCategory) continue
    const key = `${bondWiring.bondCategory.toUpperCase()}_PROVIDERS`
    const shortName = pkg.name.split('-').pop()!
    vars[key] = vars[key] ? `${vars[key]}, '${shortName}'` : `'${shortName}'`
  }
  return vars
}

/** What adding features did to an app's files, each path relative to the app. */
export interface FeatureFileChanges {
  /** Files the app lacked, written whole. */
  created: string[]
  /** The app's files that took the features' parts. */
  merged: string[]
  /** The app's files whose edits overlap the features' parts: unchanged, with the diff to apply. */
  conflicted: { path: string; diff: string }[]
}

/** Every file under a directory, relative to it. */
async function filesUnder(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) out.push(relative(dir, join(entry.parentPath, entry.name)))
  }
  return out.sort()
}

/**
 * `git merge-file` of the features' change into the app's file.
 *
 * @returns The merged text, or undefined when the edits overlap or git cannot run.
 */
function mergeThreeWay(ours: string, base: string, theirs: string): string | undefined {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-feature-merge-'))
  try {
    const paths = { ours: join(dir, 'ours'), base: join(dir, 'base'), theirs: join(dir, 'theirs') }
    writeFileSync(paths.ours, ours)
    writeFileSync(paths.base, base)
    writeFileSync(paths.theirs, theirs)
    const result = spawnSync('git', ['merge-file', '-p', paths.ours, paths.base, paths.theirs], {
      encoding: 'utf8',
    })
    return result.status === 0 ? result.stdout : undefined
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** The unified diff from one rendering to the other, for a file the app must change by hand. */
function renderingDiff(path: string, before: string, after: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-feature-diff-'))
  try {
    writeFileSync(join(dir, 'before'), before)
    writeFileSync(join(dir, 'after'), after)
    const result = spawnSync(
      'git',
      ['diff', '--no-index', '--no-color', '--', join(dir, 'before'), join(dir, 'after')],
      { encoding: 'utf8' },
    )
    return (result.stdout ?? '')
      .split('\n')
      .filter((line) => !/^(diff --git|index |--- |\+\+\+ )/.test(line))
      .join('\n')
      .replace(/^/, `${path}\n`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Write the files and parts of files the added features bring into an app.
 *
 * @param input - The app and its features.
 * @param input.appDir - The app's directory (an app project, or `app/` of a full-stack one).
 * @param input.framework - The app's framework (its `molecule.framework`).
 * @param input.projectName - The project's name, as the create wrote it.
 * @param input.before - The features the app's files have (`molecule.templateFeatures`).
 * @param input.after - The features its stack brings now.
 * @param input.varsBefore - The template variables its files were written with (the named
 *   providers: `OAUTH_PROVIDERS`).
 * @param input.varsAfter - The ones its stack has now.
 * @returns What changed.
 */
export async function writeAddedFeatureFiles(input: {
  appDir: string
  framework: string
  projectName: string
  before: ReadonlySet<string>
  after: ReadonlySet<string>
  varsBefore?: Record<string, string>
  varsAfter?: Record<string, string>
}): Promise<FeatureFileChanges> {
  const changes: FeatureFileChanges = { created: [], merged: [], conflicted: [] }
  const sameFeatures =
    input.after.size === input.before.size &&
    [...input.after].every((feature) => input.before.has(feature))
  if (sameFeatures && JSON.stringify(input.varsBefore) === JSON.stringify(input.varsAfter))
    return changes
  const scratch = mkdtempSync(join(tmpdir(), 'mlcl-feature-files-'))
  try {
    const old = join(scratch, 'old')
    const next = join(scratch, 'new')
    await copyTemplateFiles(old, input.framework, input.projectName, input.varsBefore, input.before)
    await copyTemplateFiles(next, input.framework, input.projectName, input.varsAfter, input.after)
    for (const path of await filesUnder(next)) {
      const theirs = await readFile(join(next, path), 'utf8')
      const base = existsSync(join(old, path)) ? await readFile(join(old, path), 'utf8') : undefined
      if (base === theirs) continue
      const target = join(input.appDir, path)
      const exists = existsSync(target)
      if (base === undefined) {
        // A file of the added feature. One the app already has is its own.
        if (exists) continue
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, theirs)
        changes.created.push(path)
        continue
      }
      // A file the app deleted stays deleted.
      if (!exists) continue
      const ours = readFileSync(target, 'utf8')
      if (ours === theirs) continue
      const merged = ours === base ? theirs : mergeThreeWay(ours, base, theirs)
      if (merged === undefined) {
        changes.conflicted.push({ path, diff: renderingDiff(path, base, theirs) })
        continue
      }
      await writeFile(target, merged)
      changes.merged.push(path)
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  return changes
}
