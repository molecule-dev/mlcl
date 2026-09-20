import { Flags } from '@oclif/core'

import { readCredentials } from '../lib/platform.js'

export const projectFlag = Flags.string({
  char: 'p',
  description: 'molecule.dev project id',
  required: true,
})

export function requireAuth(): void {
  if (!readCredentials() && !process.env.MOLECULE_TOKEN) {
    throw new Error('Not logged in — run `mlcl login` first (or set MOLECULE_TOKEN for CI).')
  }
}
