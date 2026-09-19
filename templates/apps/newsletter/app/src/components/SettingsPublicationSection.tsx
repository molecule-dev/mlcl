import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PublicationSettings {
  id: string
  publication_name: string
  from_name: string
}

/**
 * Publication identity section of the Settings page — the publication name
 * and the from-name issues are delivered under (e.g. "The Dispatch" /
 * "Maya at Dispatch"). Owns its load/save against
 * GET/PUT /api/settings/publication so it stays independent of the
 * account-form save flow.
 */
function SettingsPublicationSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [publicationName, setPublicationName] = useState('')
  const [fromName, setFromName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<PublicationSettings | { data: PublicationSettings }>('/api/settings/publication')
      .then((res) => {
        if (!active) return
        const body = res.data
        const row =
          body && typeof body === 'object' && 'data' in body
            ? body.data
            : (body as PublicationSettings)
        setPublicationName(row?.publication_name ?? '')
        setFromName(row?.from_name ?? '')
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [http])

  async function handleSave() {
    setLoading(true)
    setMessage(null)
    try {
      await http.put('/api/settings/publication', {
        publication_name: publicationName.trim() || 'Newsletter',
        from_name: fromName.trim() || 'The Editor',
      })
      setMessage({
        type: 'success',
        text: t('settingsPublication.saved', {}, { defaultValue: 'Publication updated.' }),
      })
    } catch (e) {
      setMessage({
        type: 'error',
        text:
          e instanceof Error
            ? e.message
            : t(
                'settingsPublication.saveFailed',
                {},
                { defaultValue: 'Failed to update publication.' },
              ),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      data-mol-id="settings-publication-section"
      className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}
    >
      <div className={cm.sp('mb', 6)}>
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
          {t('settingsPublication.title', {}, { defaultValue: 'Publication' })}
        </h3>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'settingsPublication.subtitle',
            {},
            { defaultValue: 'The name readers see, and the from-name issues arrive from.' },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
        <div>
          <label
            htmlFor="publication-name"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
          >
            {t('settingsPublication.publicationName', {}, { defaultValue: 'Publication name' })}
          </label>
          <input
            id="publication-name"
            type="text"
            data-mol-id="settings-publication-name"
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'mt-2 rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary outline-none',
              cm.textSize('sm'),
            )}
            value={publicationName}
            onChange={(e) => setPublicationName(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="publication-from-name"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
          >
            {t('settingsPublication.fromName', {}, { defaultValue: 'From name' })}
          </label>
          <input
            id="publication-from-name"
            type="text"
            data-mol-id="settings-publication-from-name"
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'mt-2 rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary outline-none',
              cm.textSize('sm'),
            )}
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'mt-6')}>
        <button
          type="button"
          data-mol-id="settings-publication-save"
          disabled={loading}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50',
          )}
          onClick={() => void handleSave()}
        >
          {loading
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('settingsPublication.save', {}, { defaultValue: 'Save publication' })}
        </button>
        {message && (
          <span
            role="status"
            className={cm.cn(
              cm.textSize('xs'),
              message.type === 'success' ? 'text-[var(--color-status-published)]' : 'text-error',
            )}
          >
            {message.text}
          </span>
        )}
      </div>
    </section>
  )
}

export default SettingsPublicationSection
export { SettingsPublicationSection }
