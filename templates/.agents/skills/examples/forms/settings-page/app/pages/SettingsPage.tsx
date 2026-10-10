import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Profile = {
  id: string
  name: string
  email: string
  timezone: string
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function SettingsPage() {
  const { t } = useTranslation()
  const [original, setOriginal] = useState<Profile | null>(null)
  const [draft, setDraft] = useState<Profile | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    // The profile is loaded ONCE, not per locale. `useTranslation`'s `t` changes
    // identity on a locale switch (it is memoized on the locale), so a `[t]`
    // dependency re-ran this load and refilled the form from the server —
    // silently discarding whatever the user had typed but not saved yet (the
    // same clobber the markdown-blog editor guards against). The failure is a
    // FLAG translated at render instead, so the message still follows a locale
    // switch without re-fetching (see the i18n docs' render-time guidance).
    let cancelled = false
    // `res.ok` gates the body: a 401 (signed out) or 500 still resolves with a
    // JSON body (`{ error }`), which `r.json()` parses happily — so without this
    // the ERROR OBJECT became the profile, the form rendered empty, and the
    // `.catch` below (the only place the failure is surfaced) never ran.
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: unknown) => {
        if (cancelled) return
        // The same rule the save below applies to its own 2xx: a 200 proves the
        // route ANSWERED, not that the body is a profile. An endpoint with no
        // fixture answers 200 with an empty object (the mock API server's
        // unmatchedFixtureResponse, a rewritten answer), and installing that as
        // the draft rendered the form blank with no error — and Save would then
        // PATCH those blank values over the real profile. Without a usable body,
        // surface the load failure instead.
        const p = (body ?? {}) as Partial<Profile>
        if (
          typeof p.name !== 'string' ||
          typeof p.email !== 'string' ||
          typeof p.timezone !== 'string'
        ) {
          setLoadFailed(true)
          setStatus('error')
          return
        }
        setOriginal(p as Profile)
        setDraft(p as Profile)
      })
      .catch(() => {
        // Without this the draft stays null and the page shows "Loading…"
        // forever — surface the failure instead.
        if (cancelled) return
        setLoadFailed(true)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dirty = useMemo(() => {
    if (!original || !draft) return false
    return (
      original.name !== draft.name ||
      original.email !== draft.email ||
      original.timezone !== draft.timezone
    )
  }, [original, draft])

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!draft || !dirty) return
    setStatus('saving')
    setError(null)
    // Every failure path sets the `error` status (which also clears the
    // saving flag) — a rejected fetch (offline, server restart) must not
    // leave the form stuck on "Saving…" with the button disabled forever.
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          timezone: draft.timezone,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? t('settings.saveFailed', undefined, { defaultValue: 'Save failed' }))
        setStatus('error')
        return
      }
      // A 2xx proves the route ACCEPTED the save, not that the body is a
      // profile: an endpoint with no fixture answers 200 with an empty object
      // (the mock API server's unmatchedFixtureResponse), and installing that
      // as the draft blanked the form the moment "Saved" appeared. The values
      // we sent were accepted either way — fall back to them.
      const body = (await res.json().catch(() => null)) as Partial<Profile> | null
      const usable =
        body &&
        typeof body.name === 'string' &&
        typeof body.email === 'string' &&
        typeof body.timezone === 'string'
      const updated: Profile = usable ? (body as Profile) : { ...draft }
      setOriginal(updated)
      setDraft(updated)
      setStatus('saved')
    } catch (_error) {
      setError(t('settings.saveFailed', undefined, { defaultValue: 'Save failed' }))
      setStatus('error')
    }
  }

  if (!draft) {
    return status === 'error' && loadFailed ? (
      <p className={cm.textError}>
        {t('settings.loadFailed', undefined, {
          defaultValue: 'Could not load your profile — refresh to try again.',
        })}
      </p>
    ) : (
      <p>{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
    )
  }

  return (
    <form
      onSubmit={save}
      className={cm.flex({ direction: 'col', gap: 'md' })}
      style={{ maxWidth: '28rem', padding: '1.5rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('settings.title', undefined, { defaultValue: 'Account settings' })}
      </h1>
      <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <span>{t('settings.name', undefined, { defaultValue: 'Name' })}</span>
        <input
          required
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={cm.input({})}
        />
      </label>
      <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <span>{t('settings.email', undefined, { defaultValue: 'Email' })}</span>
        <input
          type="email"
          required
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          className={cm.input({})}
        />
      </label>
      <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <span>{t('settings.timezone', undefined, { defaultValue: 'Timezone' })}</span>
        <input
          value={draft.timezone}
          onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
          placeholder="America/Los_Angeles"
          className={cm.input({})}
        />
      </label>
      {status === 'saved' ? (
        <p className={cm.textSuccess}>
          {t('settings.saved', undefined, { defaultValue: 'Saved' })}
        </p>
      ) : null}
      {status === 'error' && error ? <p className={cm.textError}>{error}</p> : null}
      <button
        type="submit"
        disabled={!dirty || status === 'saving'}
        className={cm.button({ variant: 'solid' })}
      >
        {status === 'saving'
          ? t('settings.saving', undefined, { defaultValue: 'Saving…' })
          : t('settings.save', undefined, { defaultValue: 'Save changes' })}
      </button>
    </form>
  )
}
