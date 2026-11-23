/**
 * What `mlcl add` says about using the package it added: the API the app's code calls, and the
 * environment variables the package reads.
 *
 * A provider is called through its core, and the provider's README mostly repeats the core's
 * types, so the core is the API to read. In the 2026-11-23 add eval, an agent that had already
 * read `@molecule/api-uploads` was sent on to `@molecule/api-uploads-filesystem`'s README as well,
 * one more model turn for nothing it used.
 *
 * @module
 */

import chalk from 'chalk'

import { t } from './i18n.js'
import { getRawRegistry } from './registry.js'

/**
 * The lines `mlcl add` prints about using a package once it is in.
 *
 * @param name - The added package.
 * @returns The API to read (the core a provider implements, else the package itself), then the
 *   environment variables the package reads, when it reads any (optional ones marked).
 */
export function afterAddGuidance(name: string): string[] {
  const entry = getRawRegistry().packages[name]
  const core = entry?.implements
  const lines = [
    core
      ? t('commands.add.messages.useCore', {
          core,
          command: chalk.cyan(`npx mlcl docs ${core}`),
        })
      : t('commands.add.messages.readDocs', { command: chalk.cyan(`npx mlcl docs ${name}`) }),
  ]
  const secrets = entry?.secrets ?? []
  if (secrets.length > 0) {
    const names = secrets.map((secret) =>
      secret.required === false
        ? t('commands.add.messages.envVarOptional', { name: secret.name })
        : secret.name,
    )
    lines.push(t('commands.add.messages.envVars', { names: names.join(', ') }))
  }
  return lines
}
