import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Key = {
  id: string
  name: string
  masked: string
  scopes: string[]
  created_at: string
  last_used_at?: string | null
}

export function ApiKeysPage() {
  const { t } = useTranslation()
  const [keys, setKeys] = useState<Key[]>([])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [justCreated, setJustCreated] = useState<{ plaintext: string; id: string } | null>(null)

  useEffect(() => {
    fetch('/api/api-keys')
      .then((r) => r.json())
      .then(setKeys)
  }, [])

  async function create(): Promise<void> {
    setCreating(true)
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setCreating(false)
    if (!res.ok) return
    const body = (await res.json()) as { id: string; plaintext: string }
    setJustCreated(body)
    setName('')
    // Re-fetch list to include the new key (without plaintext).
    const updated = await fetch('/api/api-keys').then((r) => r.json())
    setKeys(updated)
  }

  async function revoke(id: string): Promise<void> {
    if (
      !confirm(
        t('apiKeys.confirmRevoke', undefined, {
          defaultValue: 'Revoke this key? Existing integrations will stop working.',
        }),
      )
    ) {
      return
    }
    await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    setKeys((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div
      className={cm.flex({ direction: 'col', gap: 'lg' })}
      style={{ maxWidth: '32rem', padding: '1.5rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('apiKeys.title', undefined, { defaultValue: 'API keys' })}
      </h1>

      {justCreated ? (
        <div className={cm.alert({ variant: 'warning' })} role="alert">
          <p>
            <strong>
              {t('apiKeys.copyNow', undefined, {
                defaultValue: 'Copy this key now — it will not be shown again.',
              })}
            </strong>
          </p>
          <code className={cm.cn(cm.textSize('sm'), 'font-mono')}>{justCreated.plaintext}</code>
          <button
            onClick={() => setJustCreated(null)}
            className={cm.button({ variant: 'outline', size: 'sm' })}
          >
            {t('apiKeys.dismiss', undefined, { defaultValue: 'I copied it' })}
          </button>
        </div>
      ) : null}

      <div className={cm.flex({ direction: 'row', gap: 'sm' })}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('apiKeys.namePlaceholder', undefined, {
            defaultValue: 'Name (e.g. CLI, CI server)',
          })}
          className={cm.input()}
          style={{ flex: 1 }}
        />
        <button
          onClick={create}
          disabled={creating || !name}
          className={cm.button({ variant: 'solid' })}
        >
          {t('apiKeys.create', undefined, { defaultValue: 'New key' })}
        </button>
      </div>

      <table className={cm.table}>
        <thead>
          <tr>
            <th>{t('apiKeys.col.name', undefined, { defaultValue: 'Name' })}</th>
            <th>{t('apiKeys.col.token', undefined, { defaultValue: 'Token' })}</th>
            <th>{t('apiKeys.col.lastUsed', undefined, { defaultValue: 'Last used' })}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id}>
              <td>{k.name}</td>
              <td>
                <code>{k.masked}</code>
              </td>
              <td>
                {k.last_used_at
                  ? new Date(k.last_used_at).toLocaleString()
                  : t('apiKeys.never', undefined, { defaultValue: 'Never' })}
              </td>
              <td>
                <button
                  onClick={() => revoke(k.id)}
                  className={cm.button({ variant: 'ghost', size: 'sm' })}
                >
                  {t('apiKeys.revoke', undefined, { defaultValue: 'Revoke' })}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
