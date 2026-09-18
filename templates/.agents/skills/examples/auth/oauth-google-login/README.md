---
name: oauth-google-login
intent: |
  - "Let users sign in with Google"
  - "Add Google login / Google OAuth / sign in with Google"
  - "I want users to be able to log in to their account"
  - "Auth / login / signup with their existing Google account"
  - "Single sign-on with Google"
keywords: [google, oauth, sso, sign in, login, social login, auth]
---

# OAuth: Sign in with Google

**When to copy this example:** the user wants any Google-based sign-in.
Same pattern works for `github`, `gitlab`, `twitter` — swap the `-google`
in package names for the provider you want.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-oauth-google --workspace=api
npm install @molecule/app-oauth-logos-react --workspace=app
```

Optionally `@molecule/api-oauth-github`, `-gitlab`, `-twitter` for more providers.

## Files in this example

| Path                                    | What it does                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `api/bonds/oauth-google.ts`             | Backend bond — wires the provider into the `oauth` registry under the name `'google'`. Identical pattern for any other provider. |
| `app/components/SocialLoginButtons.tsx` | Frontend — renders the brand-correct OAuth buttons using `OAuthProviderLogo`. Uses `getClassMap()` for styling.                  |
| `app/locales/en/socialLoginButtons.ts`  | English copy for the buttons + tooltip.                                                                                          |

## Required env vars (the user must set these)

```
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
```

The OAuth dance is entirely server-side: the button links to the backend's
`/users/oauth/google` initiation route (which uses `OAUTH_GOOGLE_CLIENT_ID`), so the
frontend needs NO client-id env var. (If you ever add Google's client-side JS SDK, a
frontend var must be `VITE_`-prefixed to be exposed by Vite — never `REACT_APP_`.)

## How to adapt

1. Copy all three files into the user's project (paths inside `/workspace/`).
2. Wire `setupOauthGoogle()` from `api/bonds/oauth-google.ts` in `api/src/bonds/index.ts` (call it from `setupBonds()`).
3. Drop `<SocialLoginButtons />` into the user's login page.
4. Tell the user to set the env vars in `.env`.

## Anti-patterns (do NOT do these)

- Do not write OAuth flow yourself with `passport-google-oauth20`. The
  `@molecule/api-oauth-google` package already handles the redirect,
  callback, and token verification — use it.
- Do not import from a concrete provider (`@molecule/api-oauth-google`)
  inside resource handlers. Handlers should only `require('oauth', 'google')`
  through the bond system.
- Do not hand-roll OAuth logos as inline SVG paths. `OAuthProviderLogo`
  ships canonical brand marks already.
- Do not put Tailwind classes directly in the page. Use `getClassMap()`
  from `@molecule/app-ui`. The button styles in this example show the
  correct pattern.

## Verify it works

```bash
cd /workspace && npm run build
# Then in dev: click the Google button → Google consent screen → app callback
```
