/**
 * OauthGoogle bond setup
 *
 * Wires @molecule/api-oauth-google to the bond registry as a NAMED
 * multi-provider entry. Multiple OAuth providers (google, github, gitlab,
 * twitter, ...) coexist in the `oauth` category — the bond name is the
 * server name (`google`, `github`, etc.), not a singleton.
 *
 * To add another provider: copy this file as `oauth-<name>.ts`, change the
 * import to `@molecule/api-oauth-<name>`, and rename the function.
 *
 * Required env: OAUTH_GOOGLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_SECRET.
 */

import { bond } from '@molecule/api-bond'
import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-google'

export function setupOauthGoogle(): void {
  bond('oauth', serverName, { serverName, verify, getAuthorizeUrl })
}
