import { TEMPLATE_TREE_ARCHIVE, TEMPLATE_TREE_KEPT } from './template-tree.js'

/** The npm template payload budget, checked against npm's actual pack manifest. */
export interface TemplatePackManifest {
  size: number
  unpackedSize: number
  files: { path: string; size: number }[]
}

/**
 * Leave headroom above the compressed fleet, while rejecting the 2.1.41 layout and the 2.2.13 one,
 * whose 29,413 files (27,638 of them flagship files) npm took about 20 s to unpack on a first
 * `npx mlcl`. Each flagship now ships as its tree manifest (template-tree.ts).
 */
export const TEMPLATE_PACKAGE_BUDGET = {
  packedBytes: 85_000_000,
  unpackedBytes: 250_000_000,
  files: 4_000,
} as const

/**
 * The shared ESLint files the installed package reads from `templates/shared/`:
 *
 * - the config template. Each flagship workspace's `eslint.config.js` is a byte copy of it (the
 *   workspace's sync-eslint-rules); the package leaves those copies out
 *   (templates/apps/.npmignore) and scaffoldEslint writes the template back.
 * - the generated-resource-clients rule, which `mlcl resources` copies into a workspace whose
 *   config predates @molecule/eslint-config and still imports it from `./eslint-rules/`
 *   (resource-client-lint.ts).
 */
export const TEMPLATE_SHARED_ESLINT = [
  'templates/shared/eslint.config.js.tpl',
  'templates/shared/prefer-generated-resource-clients.mjs',
] as const

/**
 * A workspace's synced ESLint config, or an `eslint-rules/` copy from before
 * @molecule/eslint-config: the package must carry neither.
 */
const WORKSPACE_ESLINT_COPY =
  /^templates\/apps\/[^/]+\/(?:api|app)\/(?:eslint\.config\.js|eslint-rules\/)/

/**
 * Size plus representation checks: exclusion without restoration data cannot pass. The
 * representation checks read each flagship as a scaffold sees it: the files in its tree manifest.
 *
 * @param pack - npm's pack manifest.
 * @param trees - Each packed flagship's manifest paths, by slug (decodeTemplateTree).
 * @param registered - Template slugs advertised by the packaged template index.
 * @returns The issues found.
 */
export function templatePackageIssues(
  pack: TemplatePackManifest,
  trees: Record<string, readonly string[]> = {},
  registered: readonly string[] = [],
): string[] {
  const issues: string[] = []
  for (const [label, actual, limit] of [
    ['packed bytes', pack.size, TEMPLATE_PACKAGE_BUDGET.packedBytes],
    ['unpacked bytes', pack.unpackedSize, TEMPLATE_PACKAGE_BUDGET.unpackedBytes],
    ['files', pack.files.length, TEMPLATE_PACKAGE_BUDGET.files],
  ] as const) {
    if (!Number.isFinite(actual) || actual > limit)
      issues.push(`template package budget: ${actual} ${label} exceeds ${limit}`)
  }
  const plain = new Set([...TEMPLATE_TREE_KEPT, TEMPLATE_TREE_ARCHIVE])
  const loose = pack.files
    .map((f) => /^templates\/apps\/[^/]+\/(.+)$/.exec(f.path))
    .filter((m): m is RegExpExecArray => m !== null && !plain.has(m[1]))
  if (loose.length)
    issues.push(
      `${loose.length} flagship files shipped outside their ${TEMPLATE_TREE_ARCHIVE} (npm unpacks each one on install; prepack's template-trees step writes the manifest), first: ${loose[0][0]}`,
    )
  const outer = new Set(pack.files.map(({ path }) => path))
  for (const path of outer) {
    const slug = /^templates\/apps\/([^/]+)\/[^/]+$/.exec(path)?.[1]
    if (slug && path.endsWith(`/${TEMPLATE_TREE_ARCHIVE}`) && !Object.hasOwn(trees, slug))
      issues.push(`template tree manifest not inspected: ${path}`)
  }
  for (const slug of registered) {
    const root = `templates/apps/${slug}/`
    for (const file of [...TEMPLATE_TREE_KEPT, TEMPLATE_TREE_ARCHIVE]) {
      if (!outer.has(root + file)) issues.push(`flagship ${slug} missing ${file}`)
    }
    if (Object.hasOwn(trees, slug) && !trees[slug].includes('app/package.json'))
      issues.push(`flagship ${slug} tree missing app/package.json`)
  }
  const shipped = new Set([
    ...[...outer].filter((p) => !p.endsWith(`/${TEMPLATE_TREE_ARCHIVE}`)),
    ...Object.entries(trees).flatMap(([slug, rels]) =>
      rels.map((rel) => `templates/apps/${slug}/${rel}`),
    ),
  ])
  // templates/apps/.npmignore leaves each workspace's ESLint config out; scaffoldEslint
  // writes the shared template into every flagship api/ and app/ instead.
  if ([...shipped].some((f) => /^templates\/apps\/[^/]+\/(api|app)\/package\.json$/.test(f)))
    for (const shared of TEMPLATE_SHARED_ESLINT)
      if (!shipped.has(shared))
        issues.push(`template ESLint copies missing their shared source: ${shared}`)
  for (const file of shipped) {
    if (WORKSPACE_ESLINT_COPY.test(file))
      issues.push(
        `template workspace ESLint copy shipped (scaffoldEslint writes the config from templates/shared; leave it out in templates/apps/.npmignore): ${file.replace(/^templates\/apps\/[^/]+\//, '*/')}`,
      )
    const locales = /^templates\/apps\/([^/]+)\/app\/src\/locales\/(.+)$/.exec(file)
    if (!locales) continue
    const [, app, rel] = locales
    if (rel.includes('/') && !rel.startsWith('en/'))
      issues.push(`uncompressed non-English template locale: ${file}`)
    if (!shipped.has(`templates/apps/${app}/locales.json.br`))
      issues.push(`template locales missing restoration archive: ${app}`)
  }
  return [...new Set(issues)]
}
