import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Contact {
  id: string
  contact_user_id: string
  name: string
  initials: string
  avatar_index: number
  presence: 'online' | 'away' | 'offline'
}

export function NewConversation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/contacts')
      .then((res) => {
        if (!cancelled) setContacts(unwrapList<Contact>(res))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts
  }, [contacts, search])

  const handleStart = async () => {
    if (!selected || starting) return
    setStarting(true)
    setError(null)
    try {
      const res = await http.post('/api/conversations', {
        type: 'direct',
        participant_ids: [selected.contact_user_id],
      })
      const created = unwrapSingle<{ id: string }>(res)
      if (created?.id) navigate(`/conversations/${created.id}`)
      else throw new Error('no id returned')
    } catch (error) {
      logError('newConversation.start', error)
      setError(
        t(
          'newConversation.startError',
          {},
          { defaultValue: 'Could not start the conversation. Try again.' },
        ),
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/inbox"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('newConversation.backLink', {}, { defaultValue: 'Back to inbox' })}
      </Link>

      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('newConversation.heading', {}, { defaultValue: 'New conversation' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'newConversation.subheading',
            {},
            { defaultValue: 'Pick a contact to start a private, encrypted conversation.' },
          )}
        </p>
      </header>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t(
          'newConversation.searchPlaceholder',
          {},
          { defaultValue: 'Search contacts…' },
        )}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />

      {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <ul className={'space-y-1'}>
          {visible.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelected(c)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  'block w-full rounded text-left',
                  selected?.id === c.id ? 'bg-primary-container' : 'hover:bg-surface-container',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(11),
                    cm.w(11),
                    'rounded-full text-white',
                    cm.fontWeight('semibold'),
                  )}
                  style={{ backgroundColor: AVATAR_BG[c.avatar_index % AVATAR_BG.length] }}
                >
                  {c.initials}
                </div>
                <span className={cm.cn(cm.flex1, cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {c.name}
                </span>
                {selected?.id === c.id && (
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">
                    check_circle
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className={cm.flex({ align: 'center', justify: 'end' })}>
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
              starting && 'opacity-50',
            )}
          >
            {starting
              ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
              : t('newConversation.startLabel', {}, { defaultValue: 'Start conversation →' })}
          </button>
        </div>
      )}
    </div>
  )
}
