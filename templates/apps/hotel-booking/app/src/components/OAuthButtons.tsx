import { OAuthButtons as MoleculeOAuthButtons } from '@molecule/app-auth-ui-react'

import { oauthConfig } from '../config.js'

/**
 * Thin wrapper around the shared `OAuthButtons` that injects this
 * app's `oauthConfig`. The shared package handles the "or continue with"
 * divider, brand logos, and accessibility labels.
 */
export function OAuthButtons() {
  return <MoleculeOAuthButtons oauthConfig={oauthConfig} />
}
