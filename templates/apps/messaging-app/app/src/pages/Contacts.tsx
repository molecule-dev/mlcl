import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Contact {
  id: string
  name: string
  initials: string
  avatar_index: number
  presence: 'online' | 'away' | 'offline'
  status: string | null
  safety_number_verified: boolean
  blocked: boolean
  added_at: string
}

const PRESENCE_COLOR: Record<Contact['presence'], string> = {
  online: 'var(--color-presence-online)',
  away: 'var(--color-presence-away)',
  offline: 'var(--color-presence-offline)',
}

// Avatar fills carry WHITE initials, so each is the step of its hue where white
// clears 4.5:1 — the 500-level originals measured 2.15-4.23:1 and the initials
// were the least readable text in the list. Verified with scripts/contrast.mjs.

export function Contacts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/contacts')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Contact>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('contacts.loadError', {}, { defaultValue: 'Failed to load contacts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = addEmail.trim()
    if (!email || adding) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await http.post('/api/contacts', { email })
      const created = unwrapSingle<Contact>(res)
      if (created?.id) {
        setList((prev) => (prev.some((c) => c.id === created.id) ? prev : [created, ...prev]))
        setAddEmail('')
        setShowAdd(false)
      }
    } catch (error) {
      logError('contacts.addContact', error)
      setAddError(
        error instanceof Error && error.message
          ? error.message
          : t('contacts.addError', {}, { defaultValue: 'Could not add contact.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('contacts.heading', {}, { defaultValue: 'Contacts' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'contacts.subheading',
              { count: list.length },
              { defaultValue: '{{count}} contacts' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd((v) => !v)
            setAddError(null)
          }}
          aria-expanded={showAdd}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md hover:bg-primary/90 transition-colors',
          )}
        >
          + {t('contacts.addLabel', {}, { defaultValue: 'Add contact' })}
        </button>
      </header>

      {showAdd && (
        <form
          onSubmit={submitAdd}
          className={cm.cn(cm.card(), cm.sp('p', 4), 'space-y-2')}
          data-mol-id="add-contact-form"
        >
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('contacts.addEmailLabel', {}, { defaultValue: 'Their email address' })}
            </span>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
                placeholder={t(
                  'contacts.addEmailPlaceholder',
                  {},
                  { defaultValue: 'name@example.com' },
                )}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.flex1,
                  'border border-outline-variant rounded-md',
                )}
              />
              <button
                type="submit"
                disabled={adding || !addEmail.trim()}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50 shrink-0',
                )}
              >
                {adding
                  ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                  : t('common.add', {}, { defaultValue: 'Add' })}
              </button>
            </div>
          </label>
          {addError && (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {addError}
            </p>
          )}
        </form>
      )}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'contacts.empty',
            {},
            { defaultValue: 'No contacts yet — add one to start chatting.' },
          )}
        </p>
      ) : (
        <ul className={'space-y-1'}>
          {list.map((c) => (
            <li key={c.id}>
              <Link
                to={`/contacts/${c.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(11),
                    cm.w(11),
                    'rounded-full text-white shrink-0 relative',
                    cm.fontWeight('semibold'),
                  )}
                  style={{ backgroundColor: AVATAR_BG[c.avatar_index % AVATAR_BG.length] }}
                >
                  {c.initials}
                  <span
                    className={'absolute bottom-0 right-0 rounded-full border-2 border-surface'}
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: PRESENCE_COLOR[c.presence],
                    }}
                    aria-hidden="true"
                  />
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
                      {c.name}
                    </p>
                    {c.safety_number_verified && (
                      <span
                        className={'material-symbols-outlined text-base text-success'}
                        aria-label={t(
                          'contacts.verifiedAria',
                          {},
                          { defaultValue: 'Safety number verified' },
                        )}
                      >
                        verified
                      </span>
                    )}
                  </div>
                  {c.status && (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'italic truncate',
                        cm.sp('mt', 1),
                      )}
                    >
                      "{c.status}"
                    </p>
                  )}
                </div>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0')}>
                  {t(`contacts.presence.${c.presence}`, {}, { defaultValue: c.presence })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
