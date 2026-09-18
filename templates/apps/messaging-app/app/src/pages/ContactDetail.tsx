import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Contact {
  id: string
  contact_user_id: string
  name: string
  initials: string
  avatar_index: number
  presence: 'online' | 'away' | 'offline'
  status: string | null
  phone: string
  safety_number: string
  safety_number_verified: boolean
  blocked: boolean
  disappearing_seconds: number
  shared_media_count: number
  added_at: string
}

export function ContactDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Start (or resume — the API dedupes) a direct conversation with this
  // contact, then jump into it. The conversation id is minted server-side,
  // so this cannot be a plain <Link>.
  const handleMessage = async () => {
    if (!contact || starting) return
    setStarting(true)
    setStartError(null)
    try {
      const res = await http.post('/api/conversations', {
        type: 'direct',
        participant_ids: [contact.contact_user_id],
      })
      const created = unwrapSingle<{ id: string }>(res)
      if (created?.id) navigate(`/conversations/${created.id}`)
      else throw new Error('no id returned')
    } catch (error) {
      logError('contactDetail.startConversation', error)
      setStartError(
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

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/contacts/${id}`)
      .then((res) => {
        if (!cancelled) setContact(unwrapSingle<Contact>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('contactDetail.loadError', {}, { defaultValue: 'Failed to load contact.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!contact)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('contactDetail.notFound', {}, { defaultValue: 'Contact not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/contacts"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('contactDetail.backLink', {}, { defaultValue: 'All contacts' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6), cm.textCenter)}>
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full text-white',
            cm.fontWeight('bold'),
          )}
          style={{
            width: '96px',
            height: '96px',
            backgroundColor: AVATAR_BG[contact.avatar_index % AVATAR_BG.length],
            fontSize: '32px',
          }}
        >
          {contact.initials}
        </div>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
          {contact.name}
        </h1>
        {contact.status && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant',
              'italic',
              cm.sp('mt', 1),
            )}
          >
            "{contact.status}"
          </p>
        )}
        <div
          className={cm.flex({ align: 'center', gap: 'sm', justify: 'center' })}
          style={{ marginTop: '12px' }}
        >
          <button
            type="button"
            onClick={handleMessage}
            disabled={starting}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              chat
            </span>
            {starting
              ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
              : t('contactDetail.messageLabel', {}, { defaultValue: 'Message' })}
          </button>
        </div>
        {startError && (
          <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error', cm.sp('mt', 2))}>
            {startError}
          </p>
        )}
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
          )}
        >
          {t('contactDetail.infoHeading', {}, { defaultValue: 'Info' })}
        </h2>
        <KV label={t('form.phone', {}, { defaultValue: 'Phone' })} value={contact.phone} mono />
        <KV
          label={t('contactDetail.addedAt', {}, { defaultValue: 'Added' })}
          value={new Date(contact.added_at).toLocaleDateString()}
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
            )}
          >
            {t('contactDetail.safetyHeading', {}, { defaultValue: 'Safety number' })}
          </h2>
          {contact.safety_number_verified ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                'text-success',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                verified
              </span>
              {t('contactDetail.verifiedLabel', {}, { defaultValue: 'Verified' })}
            </span>
          ) : (
            <span className={cm.cn(cm.textSize('xs'), 'text-warning')}>
              {t('contactDetail.unverifiedLabel', {}, { defaultValue: 'Not verified' })}
            </span>
          )}
        </div>
        <code
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            'block font-mono',
            cm.sp('p', 3),
            'bg-surface-container rounded',
          )}
        >
          {contact.safety_number}
        </code>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'contactDetail.safetyNote',
            {},
            {
              defaultValue:
                'Compare these digits in person or over a trusted channel to verify the encryption key.',
            },
          )}
        </p>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
          )}
        >
          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </h2>
        <KV
          label={t(
            'contactDetail.disappearingLabel',
            {},
            { defaultValue: 'Disappearing messages' },
          )}
          value={
            contact.disappearing_seconds > 0
              ? `${contact.disappearing_seconds}s`
              : t('status.off', {}, { defaultValue: 'Off' })
          }
        />
        <KV
          label={t('contactDetail.sharedMediaLabel', {}, { defaultValue: 'Shared media' })}
          value={t(
            'contactDetail.sharedMediaCount',
            { count: contact.shared_media_count },
            { defaultValue: '{{count}} items' },
          )}
        />
      </section>
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</span>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), mono ? 'font-mono' : '')}>
        {value}
      </span>
    </div>
  )
}
