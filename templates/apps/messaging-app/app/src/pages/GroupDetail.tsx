import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Group {
  id: string
  name: string
  description: string
  member_count: number
  avatar_index: number
  encrypted: boolean
  safety_number: string
  disappearing_seconds: number
  shared_media_count: number
  created_at: string
  conversation_id: string | null
}

interface Member {
  id: string
  name: string
  initials: string
  avatar_index: number
  role: 'owner' | 'admin' | 'member'
}

const ROLE_COLOR: Record<Member['role'], string> = {
  owner: 'bg-error-container text-on-error-container',
  admin: 'bg-warning-container text-on-warning-container',
  member: 'bg-surface-container text-on-surface',
}

// Avatar fills carry WHITE initials, so each is the step of its hue where white
// clears 4.5:1 — the 500-level originals measured 2.15-4.23:1 and the initials
// were the least readable text in the list. Verified with scripts/contrast.mjs.

export function GroupDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/groups/${id}`), http.get(`/api/group-members?group_id=${id}`)])
      .then(([g, m]) => {
        if (cancelled) return
        setGroup(unwrapSingle<Group>(g))
        setMembers(unwrapList<Member>(m))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('groupDetail.loadError', {}, { defaultValue: 'Failed to load group.' }))
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
  if (!group)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('groupDetail.notFound', {}, { defaultValue: 'Group not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/groups"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('groupDetail.backLink', {}, { defaultValue: 'All groups' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6), cm.textCenter)}>
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full text-white',
          )}
          style={{
            width: '96px',
            height: '96px',
            backgroundColor: AVATAR_BG[group.avatar_index % AVATAR_BG.length],
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '48px' }}
            aria-hidden="true"
          >
            group
          </span>
        </div>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
          {group.name}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
          {group.description}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 2))}>
          {t(
            'groupDetail.memberCount',
            { count: group.member_count },
            { defaultValue: '{{count}} members' },
          )}{' '}
          ·{' '}
          {t(
            'groupDetail.createdAt',
            { date: new Date(group.created_at).toLocaleDateString() },
            { defaultValue: 'Created {{date}}' },
          )}
        </p>
        {group.conversation_id && (
          <Link
            to={`/conversations/${group.conversation_id}`}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-full',
              cm.mxAuto,
              'inline-flex',
            )}
            style={{ marginTop: '12px' }}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              chat
            </span>
            {t('groupDetail.openLabel', {}, { defaultValue: 'Open chat' })}
          </Link>
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
          {t('nav.members', {}, { defaultValue: 'Members' })}
        </h2>
        <ul className={'space-y-2'}>
          {members.map((m) => (
            <li key={m.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.h(8),
                  cm.w(8),
                  'rounded-full text-white shrink-0',
                  cm.fontWeight('semibold'),
                )}
                style={{
                  backgroundColor: AVATAR_BG[m.avatar_index % AVATAR_BG.length],
                  fontSize: '12px',
                }}
              >
                {m.initials}
              </div>
              <span className={cm.cn(cm.flex1, cm.textSize('sm'), cm.fontWeight('medium'))}>
                {m.name}
              </span>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  'rounded shrink-0',
                  ROLE_COLOR[m.role],
                )}
              >
                {t(`groupDetail.role.${m.role}`, {}, { defaultValue: m.role })}
              </span>
            </li>
          ))}
        </ul>
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
          {t('groupDetail.privacyHeading', {}, { defaultValue: 'Privacy' })}
        </h2>
        <KV
          label={t('groupDetail.encryptedLabel', {}, { defaultValue: 'Encryption' })}
          value={
            group.encrypted
              ? t('groupDetail.encryptionOn', {}, { defaultValue: 'End-to-end' })
              : t('status.off', {}, { defaultValue: 'Off' })
          }
        />
        <KV
          label={t('groupDetail.disappearingLabel', {}, { defaultValue: 'Disappearing messages' })}
          value={
            group.disappearing_seconds > 0
              ? `${group.disappearing_seconds}s`
              : t('status.off', {}, { defaultValue: 'Off' })
          }
        />
        <KV
          label={t('groupDetail.sharedMediaLabel', {}, { defaultValue: 'Shared media' })}
          value={t(
            'groupDetail.sharedMediaCount',
            { count: group.shared_media_count },
            { defaultValue: '{{count}} items' },
          )}
        />
        <code
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            'block font-mono',
            cm.sp('p', 3),
            cm.sp('mt', 2),
            'bg-surface-container rounded',
          )}
        >
          {group.safety_number}
        </code>
      </section>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</span>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{value}</span>
    </div>
  )
}
