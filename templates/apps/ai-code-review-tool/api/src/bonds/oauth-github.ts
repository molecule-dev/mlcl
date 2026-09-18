/**
 * OauthGithub bond setup
 *
 * Wires @molecule/api-oauth-github to the bond registry as oauth provider.
 * `verify` powers the callback exchange (POST /users/log-in/oauth);
 * `getAuthorizeUrl` powers the initiation redirect
 * (GET /users/oauth/github) — both halves of the login flow.
 */

import { bond } from '@molecule/api-bond'
import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-github'

export function setupOauthGithub(): void {
  bond('oauth', serverName, { serverName, verify, getAuthorizeUrl })
}
