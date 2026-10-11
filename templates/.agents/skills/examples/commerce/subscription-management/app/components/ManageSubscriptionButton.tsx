import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * Whether `value` may be assigned to `window.location.href`.
 *
 * The sink is a navigation: `javascript:` runs script in this page's origin
 * (XSS), `data:` and `blob:` load attacker-authored documents, and a
 * protocol-relative `//evil.example` leaves the site entirely while looking
 * like a path. So exactly two shapes are accepted, both of which the billing
 * route can legitimately answer with:
 *
 * - an ABSOLUTE `http:`/`https:` URL (Stripe's portal link is one), or
 * - a URL that resolves against THIS page's origin — the relative path shape.
 *
 * A relative value is RESOLVED rather than prefix-matched, because the URL
 * parser treats `\` exactly like `/` for a special scheme: `/\evil.example`
 * starts with a single `/` and not with `//`, so a `startsWith` check calls it
 * "a path" while the browser navigates to `https://evil.example/` — off-site,
 * from a value the check was supposed to refuse. Resolution is the same rule
 * the browser will apply, so nothing that escapes this origin can pass.
 *
 * Everything else is refused and reported like any other failed portal open.
 *
 * @param value - The `url` field of the portal response.
 * @returns True when the URL is a navigable http(s) destination.
 */
function isNavigableHttpUrl(value: string): boolean {
  // A scheme prefix makes the value absolute — and only http(s) is navigable.
  if (/^[a-zA-Z][\w+.-]*:/.test(value)) {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch (_error) {
      // A malformed absolute URL — refuse it rather than navigate.
      return false
    }
  }
  try {
    const parsed = new URL(value, window.location.origin)
    return parsed.origin === window.location.origin
  } catch (_error) {
    // Not resolvable as a URL at all (a stray string) — refuse it rather than
    // navigate.
    return false
  }
}

export function ManageSubscriptionButton() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(): Promise<void> {
    setLoading(true)
    setError(null)
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart) must not leave the button disabled forever; the catch
    // surfaces the failure instead of a silently dead button.
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (!res.ok) {
        setError(
          t('billing.portalFailed', undefined, {
            defaultValue: 'Could not open the billing portal — try again.',
          }),
        )
        return
      }
      // `res.ok` proves only that the route answered. The body is not a
      // contract: a route that is mounted without its handler (or a mock API
      // server with no fixture for it) answers 200 with an empty object, and
      // `window.location.href = undefined` navigates the browser to
      // `/undefined` — the error state below is never reached. Validate the
      // value before it becomes a navigation target.
      //
      // "Validate" means the SCHEME too, not just "a non-empty string": this
      // assignment is a navigation sink, and `location.href = 'javascript:…'`
      // runs that script in THIS origin (an XSS the host page cannot see
      // coming), while `data:` and a bare `//evil.example` send the reader
      // somewhere the app never meant to. The body is already treated as
      // untrusted a line above (a proxy can rewrite a failure into a 200), so
      // the URL it carries gets the same treatment: only an absolute http(s)
      // URL — the shape Stripe's billing portal answers with — is navigated
      // to. Resolved against the page's origin so a same-origin path (the
      // relative form) still counts.
      const { url } = (await res.json().catch(() => ({}))) as { url?: unknown }
      if (typeof url !== 'string' || !isNavigableHttpUrl(url)) {
        setError(
          t('billing.portalFailed', undefined, {
            defaultValue: 'Could not open the billing portal — try again.',
          }),
        )
        return
      }
      window.location.href = url
    } catch (_error) {
      setError(
        t('billing.portalFailed', undefined, {
          defaultValue: 'Could not open the billing portal — try again.',
        }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <button onClick={open} disabled={loading} className={cm.button({ variant: 'outline' })}>
        {loading
          ? t('billing.opening', undefined, { defaultValue: 'Opening…' })
          : t('billing.manage', undefined, { defaultValue: 'Manage subscription' })}
      </button>
      {error ? <p className={cm.textError}>{error}</p> : null}
    </div>
  )
}
