---
id: oauth-buttons
intent: oauth-buttons
title: OAuth provider logos & social-login buttons
hooks: []
---

# OAuth provider logos & social-login buttons

**When to use:** any Login, Signup, SSO, or social-auth surface that shows "Continue with Google / GitHub / LinkedIn / Apple / Facebook / Microsoft / Discord / Twitter / GitLab" buttons.

**Rule:** the provider mark inside the button MUST come from the framework's companion molecule OAuth-logos package — never hand-roll it. The packages are published per framework binding:

- React: `@molecule/app-oauth-logos-react` — `<OAuthProviderLogo provider="google" />`
- Vue / Svelte / Solid / Angular / React Native: use `@molecule/app-oauth-logos-<framework>` when available; if the framework binding doesn't exist yet, create it (mirror the React package) rather than hand-rolling logos in the app.

The button chrome (width, padding, radius, border, label, disabled state) stays per-app and per-design. Only the logo element is shared — every provider must render a pixel-identical canonical brand mark across every app.

**Molecule-correct example (React):**

```tsx
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'

export function SocialLoginButtons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.grid({ cols: 2, gap: 'md' })}>
      <button
        type="button"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          /* per-app chrome — keep your stitch's background, border, radius, padding */
        )}
      >
        <OAuthProviderLogo provider="google" size={20} ariaLabel="" />
        <span>{t('login.google', {}, { defaultValue: 'Google' })}</span>
      </button>

      <button
        type="button"
        className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }))}
      >
        <OAuthProviderLogo provider="github" size={20} ariaLabel="" />
        <span>{t('login.github', {}, { defaultValue: 'GitHub' })}</span>
      </button>
    </div>
  )
}
```

**Individual components** when the dispatcher doesn't fit: `GitHubLogo`, `GoogleLogo`, `GitLabLogo`, `TwitterLogo` / `XLogo`, `AppleLogo`, `FacebookLogo`, `MicrosoftLogo`, `LinkedInLogo`, `DiscordLogo`. Each supports `size`, `mode="brand"` (default, official multi-color) or `mode="mono"` (uses `currentColor` for uniform button rows), `ariaLabel`, `title`, and `className`.

**For many providers + uniform button chrome** — prefer `OAuthButtons` from the framework's companion auth-ui package (`@molecule/app-auth-ui-<framework>`), which already uses the canonical logos internally:

```tsx
import { OAuthButtons } from '@molecule/app-auth-ui-react'
import { oauthConfig } from '../config.js'

;<OAuthButtons oauthConfig={oauthConfig} />
```

**Anti-patterns:**

- `src="https://picsum.photos/..."` as an OAuth logo — this is a random placeholder image, never appropriate in production
- `src="https://lh3.googleusercontent.com/aida-public/..."` or any other hosted "AI-generated" image as a provider mark
- Inline `<svg viewBox="0 0 24 24"><path d="M12 .297..."/></svg>` for a provider mark — the canonical path lives in the package; duplicating it guarantees drift
- `<span data-icon="google" class="material-symbols-outlined">google</span>` — material-symbols renders a Google text-search glyph, not the brand mark
- Reaching for the generic `@molecule/app-icons` bond for a provider — icon bonds are for UI affordances (chevrons, trashcans), not brand marks
- Different apps shipping visibly different OAuth icons — they must be pixel-identical across the ecosystem
