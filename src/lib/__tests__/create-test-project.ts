/**
 * Shared test helper that creates a self-contained test project with
 * symlinks to molecule packages. Each test file gets its own temp
 * directory — no pre-existing state required.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'

import { getRawRegistry } from '../registry.js'

/** Path to the public molecule repo's packages directory */
export const MOLECULE_PACKAGES = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'molecule',
  'packages',
)

/** All molecules used in test projects */
export const TEST_MOLECULES = [
  '@molecule/api-bond',
  '@molecule/api-database',
  '@molecule/api-database-postgresql',
  '@molecule/api-emails',
  '@molecule/api-emails-mailgun',
  '@molecule/api-logger',
  '@molecule/api-middleware-body-parser',
  '@molecule/api-middleware-cookie-parser',
  '@molecule/api-middleware-cors',
  '@molecule/api-oauth',
  '@molecule/api-oauth-github',
  '@molecule/api-oauth-gitlab',
  '@molecule/api-oauth-google',
  '@molecule/api-oauth-twitter',
  '@molecule/api-payments',
  '@molecule/api-payments-apple',
  '@molecule/api-payments-google',
  '@molecule/api-payments-stripe',
  '@molecule/api-push-notifications',
  '@molecule/api-resource',
  '@molecule/api-resource-device',
  '@molecule/api-resource-payment',
  '@molecule/api-resource-user',
  '@molecule/api-uploads',
  '@molecule/api-jwt',
  '@molecule/api-jwt-jsonwebtoken',
  '@molecule/api-password',
  '@molecule/api-password-bcrypt',
  '@molecule/api-two-factor',
  '@molecule/api-two-factor-otplib',
  '@molecule/api-utilities-validation',
]

/**
 * Create a temporary test project with package.json, tsconfig.json,
 * and symlinks to all @molecule packages in node_modules.
 *
 * Returns the absolute path to the temp project directory.
 * Caller is responsible for cleanup via `rm(path, { recursive: true, force: true })`.
 */
export async function createTestProject(): Promise<string> {
  const { packages } = getRawRegistry()
  const sources = await Promise.all(
    TEST_MOLECULES.map(async (name) => {
      const path = packages[name]?.path
      if (!path) throw new Error(`No source path is registered for test package ${name}`)
      const source = resolve(MOLECULE_PACKAGES, '..', path)
      if (!source.startsWith(MOLECULE_PACKAGES + sep)) {
        throw new Error(`Test package ${name} is outside the Molecule packages directory`)
      }
      const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
      if (manifest.name !== name)
        throw new Error(`Registered source for ${name} declares ${manifest.name}`)
      return { name, source }
    }),
  )
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-test-project-'))

  // Write package.json
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'test-project',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: Object.fromEntries(TEST_MOLECULES.map((m) => [m, '^1.0.0'])),
      },
      null,
      2,
    ),
  )

  // Write tsconfig.json
  await writeFile(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'Node16',
          moduleResolution: 'Node16',
          outDir: 'dist',
          rootDir: 'src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ['src'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2,
    ),
  )

  const moleculeDir = join(dir, 'node_modules', '@molecule')
  await mkdir(moleculeDir, { recursive: true })
  for (const { name, source } of sources) {
    await symlink(source, join(dir, 'node_modules', name))
  }

  return dir
}
