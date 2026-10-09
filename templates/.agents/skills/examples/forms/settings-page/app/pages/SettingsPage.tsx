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

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((p: Profile) => {
        setOriginal(p)
        setDraft(p)
      })
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
    const updated = (await res.json()) as Profile
    setOriginal(updated)
    setDraft(updated)
    setStatus('saved')
  }

  if (!draft) return <p>{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>

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
