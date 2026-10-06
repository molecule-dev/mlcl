import { Flags } from '@oclif/core'

import { readCredentials } from '../lib/platform.js'

export const projectFlag = Flags.string({
  char: 'p',
  description: 'molecule.dev project id',
  required: true,
})

export function requireAuth(): void {
  if (!readCredentials() && !process.env.MOLECULE_TOKEN) {
    throw new Error(
      'Not logged in. Run `mlcl login`, or for CI and scripts set MOLECULE_TOKEN to a token from `mlcl token create`.',
    )
  }
}
