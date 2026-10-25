/**
 * SEC3 regression — every generated project must ship secure-by-default
 * vulnerability scanning, and mlcl must scaffold it from a single source into
 * BOTH scaffold paths.
 *
 * What "secure-by-default" means concretely here, and what each test guards:
 *   - a security CI workflow with two hard gates: `npm audit --audit-level=moderate`
 *     and a gitleaks working-tree secret scan;
 *   - Dependabot (npm + github-actions);
 *   - a `.gitleaks.toml` allowlist that extends the built-in rule set;
 *   - a SECURITY.md that documents the (deliberate) eslint-plugin-security
 *     decision — the clause the verbatim explicitly allows ("or document why not").
 *
 * These fail if `scaffoldSecurityWorkflow` is removed or weakened (e.g. the audit
 * level is relaxed below `moderate`, or a gate is dropped), if it is unwired from
 * either the flagship `--template` fast path (`copyTemplateInstance`) or the
 * custom package-driven path (`create.ts`), or if a workflow file regresses into
 * malformed YAML (tab indentation).
 */
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  copyTemplateInstance,
  readTemplateSetupSqlVersions,
  scaffoldSecurityWorkflow,
} from '../scaffold.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES_APPS = join(ROOT, 'templates', 'apps')

let workdir: string

beforeEach(async () => {
  workdir = await mkdtemp(join(tmpdir(), 'mlcl-sec3-'))
})

afterEach(async () => {
  await rm(workdir, { recursive: true, force: true })
})

/**
 * Lightweight YAML sanity without a parser dependency (mlcl's standalone CI
 * doesn't install one): YAML forbids tab indentation, so a stray tab is the most
 * common way a templated workflow silently breaks the user's pipeline.
 */
function assertNoTabIndentation(yaml: string, label: string): void {
  const offending = yaml.split('\n').filter((line) => /^\s*\t/.test(line))
  expect(offending, `${label}: YAML must not use tab indentation`).toEqual([])
}

/** Assert the four security artifacts exist at `root` and are well-formed. */
async function expectSecurityArtifacts(root: string, label: string): Promise<void> {
  const wf = join(root, '.github', 'workflows', 'security.yml')
  const dependabot = join(root, '.github', 'dependabot.yml')
  const gitleaks = join(root, '.gitleaks.toml')
  const securityMd = join(root, 'SECURITY.md')

  for (const file of [wf, dependabot, gitleaks, securityMd]) {
    expect(existsSync(file), `${label}: ${file} must exist`).toBe(true)
  }

  // Workflow: the two hard gates, plus a working-tree (not git-history) secret scan.
  const wfText = await readFile(wf, 'utf-8')
  assertNoTabIndentation(wfText, `${label}: security.yml`)
  expect(wfText, `${label}: audit gate at moderate+`).toContain('npm audit --audit-level=moderate')
  expect(wfText, `${label}: gitleaks secret scan`).toMatch(/gitleaks/)
  expect(wfText, `${label}: scans working tree (--no-git)`).toContain('--no-git')
  expect(wfText).toMatch(/jobs:/)
  expect(wfText).toMatch(/\baudit:/)
  expect(wfText).toMatch(/secret-scan:/)

  // Dependabot: npm + github-actions ecosystems.
  const depText = await readFile(dependabot, 'utf-8')
  assertNoTabIndentation(depText, `${label}: dependabot.yml`)
  expect(depText).toMatch(/package-ecosystem:\s*['"]?npm['"]?/)
  expect(depText).toMatch(/package-ecosystem:\s*['"]?github-actions['"]?/)

  // gitleaks config inherits the built-in rule set.
  expect(await readFile(gitleaks, 'utf-8')).toContain('useDefault = true')

  // SECURITY.md documents the eslint-plugin-security decision and the local
  // audit command (the "vulnerability scans" the user asked for).
  const md = await readFile(securityMd, 'utf-8')
  expect(md, `${label}: documents eslint-plugin-security decision`).toMatch(
    /eslint-plugin-security/,
  )
  expect(md).toContain('npm audit --audit-level=moderate')

  // Local pre-commit secret scan: a dependency-free Node scanner + a husky v9
  // hook that runs it. These ship unconditionally on every scaffold path so a
  // secret is blocked locally BEFORE it reaches history (not just caught in CI).
  const scanner = join(root, 'scripts', 'precommit-secret-scan.mjs')
  const hook = join(root, '.husky', 'pre-commit')
  expect(existsSync(scanner), `${label}: ${scanner} must exist`).toBe(true)
  expect(existsSync(hook), `${label}: ${hook} must exist`).toBe(true)
  const scannerText = await readFile(scanner, 'utf-8')
  // Verbatim canonical scanner: dependency-free, scans only STAGED added lines,
  // and carries the high-confidence secret rules.
  expect(scannerText, `${label}: scanner is dependency-free`).toContain("from 'node:child_process'")
  // The scanner passes its git argv as an array (the MOL_PRECOMMIT_BASE pin
  // made the base conditional), so the staged-only property lives in the
  // individual flags, not in one `git diff --cached` string.
  expect(scannerText).toContain("'--cached'")
  expect(scannerText).toContain("'--diff-filter=ACM'")
  expect(scannerText).toMatch(/Anthropic API key/)
  // Hook runs the scanner (husky v9 plain-command format).
  expect(await readFile(hook, 'utf-8')).toContain('node scripts/precommit-secret-scan.mjs')
}

/**
 * The pre-commit hook only fires once husky is wired into the ROOT package.json:
 * an exact-pinned `husky` devDependency + a `prepare: husky` script (which sets
 * `core.hooksPath` on the user's first `git init` + `npm install`).
 */
async function expectHuskyWired(root: string, label: string): Promise<void> {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf-8'))
  expect(pkg.devDependencies?.husky, `${label}: husky devDep pinned exact`).toBe('9.1.7')
  expect(pkg.scripts?.prepare, `${label}: prepare runs husky`).toMatch(/(^|&&\s*)husky\s*$/)
}

describe('SEC3 — scaffolded security scanning', () => {
  it('scaffoldSecurityWorkflow writes audit + secret-scan + dependabot + SECURITY.md', async () => {
    await scaffoldSecurityWorkflow(workdir, 'my-app')
    await expectSecurityArtifacts(workdir, 'scaffoldSecurityWorkflow')
    // Project name flows into the templated files.
    expect(await readFile(join(workdir, '.gitleaks.toml'), 'utf-8')).toContain('my-app')
    // No root package.json on a bare-dir call → the husky patch is a graceful
    // no-op (it must not throw and must not fabricate a package.json).
    expect(existsSync(join(workdir, 'package.json'))).toBe(false)
  })

  it('the flagship --template fast path (copyTemplateInstance) ships the workflow + husky', async () => {
    const entries = await readdir(TEMPLATES_APPS, { withFileTypes: true })
    const slug = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
      .map((e) => e.name)
      .find((name) => existsSync(join(TEMPLATES_APPS, name, 'app', 'package.json')))
    expect(slug, 'at least one flagship template must exist').toBeTruthy()

    const dest = join(workdir, 'tpl-project')
    const templateDir = join(TEMPLATES_APPS, slug!)
    await copyTemplateInstance(
      templateDir,
      dest,
      'tpl-project',
      await readTemplateSetupSqlVersions(templateDir),
    )
    await expectSecurityArtifacts(dest, `copyTemplateInstance(${slug!})`)
    // The flagship root package.json gets husky + prepare wired in.
    await expectHuskyWired(dest, `copyTemplateInstance(${slug!})`)
  })

  it('the custom package-driven path (create.ts) is wired to scaffoldSecurityWorkflow', async () => {
    // The custom path's true project root is `projectPath` in create.ts; a full
    // `mlcl create` run is too heavy for a unit test, so guard the wiring at the
    // source so it cannot be silently removed.
    const createSrc = await readFile(join(ROOT, 'src', 'commands', 'create.ts'), 'utf-8')
    expect(createSrc).toMatch(/scaffoldSecurityWorkflow\(projectPath/)
  })
})
