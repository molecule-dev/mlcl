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
  for (const file of shipped) {
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
