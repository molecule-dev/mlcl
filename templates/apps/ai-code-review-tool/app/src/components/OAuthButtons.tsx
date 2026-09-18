import { useNavigate } from 'react-router'

import { OAuthButtons as MoleculeOAuthButtons } from '@molecule/app-auth-ui-react'

import { oauthConfig } from '../config.js'

/**
 * Thin wrapper around the shared `OAuthButtons` that injects this
 * app's `oauthConfig`. The shared package handles the "or continue with"
 * divider, brand logos, accessibility labels, and the OAuth CALLBACK on
 * this page (exchanging `?code&state`, rendering a visible error when the
 * exchange is rejected); on success we route into the app.
 */
export function OAuthButtons() {
  const navigate = useNavigate()
  return (
    <MoleculeOAuthButtons
      oauthConfig={oauthConfig}
      onSuccess={() => navigate('/dashboard', { replace: true })}
    />
  )
}
