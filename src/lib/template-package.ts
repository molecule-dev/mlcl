/** The npm template payload budget, checked against npm's actual pack manifest. */
export interface TemplatePackManifest {
  size: number
  unpackedSize: number
  files: { path: string; size: number }[]
}

/** Leave headroom above the compressed fleet, while rejecting the 2.1.41 layout. */
export const TEMPLATE_PACKAGE_BUDGET = {
  packedBytes: 85_000_000,
  unpackedBytes: 250_000_000,
  files: 32_000,
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

/** Size plus representation checks: exclusion without restoration data cannot pass. */
export function templatePackageIssues(pack: TemplatePackManifest): string[] {
  const issues: string[] = []
  for (const [label, actual, limit] of [
    ['packed bytes', pack.size, TEMPLATE_PACKAGE_BUDGET.packedBytes],
    ['unpacked bytes', pack.unpackedSize, TEMPLATE_PACKAGE_BUDGET.unpackedBytes],
    ['files', pack.files.length, TEMPLATE_PACKAGE_BUDGET.files],
  ] as const) {
    if (!Number.isFinite(actual) || actual > limit)
      issues.push(`template package budget: ${actual} ${label} exceeds ${limit}`)
  }
  const shipped = new Set(pack.files.map((f) => f.path))
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
