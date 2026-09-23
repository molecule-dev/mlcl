import { createDefaultAuthClientWithHttpSync } from '@molecule/app-bonds-default-react'

import { authConfig } from '../config.js'

// WithHttpSync (not the plain createDefaultAuthClient): the app's pages fetch
// through the bonded http client WITHOUT an Authorization header (credential
// is the httpOnly session cookie). That works once the cookie is settled, but
// right after login/register the dashboard's first data fetches race the
// cookie rotation and come back 401 (they self-heal a moment later — noisy,
// and wrong for any request in flight during a refresh). The WithHttpSync
// variant mirrors the auth client's in-memory token onto the http client on
// login/register/refresh/logout so every request carries the CURRENT bearer.
export const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync(authConfig)
