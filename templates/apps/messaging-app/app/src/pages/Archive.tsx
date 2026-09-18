import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapList } from '../lib/unwrap.js'

interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string
  initials: string
  avatar_index: number
  last_message: string
  archived_at: string
}

export function Archive() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [convos, setConvos] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/conversations?archived=true')
      .then((res) => {
        if (!cancelled) setConvos(unwrapList<Conversation>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('archive.loadError', {}, { defaultValue: 'Failed to load archive.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('archive.eyebrow', {}, { defaultValue: 'Archived' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('common.archive', {}, { defaultValue: 'Archive' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'archive.subheading',
            { count: convos.length },
            { defaultValue: '{{count}} archived conversations' },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : convos.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('archive.empty', {}, { defaultValue: 'No archived conversations.' })}
        </p>
      ) : (
        <ul className={'space-y-1'}>
          {convos.map((c) => (
            <li key={c.id}>
              <Link
                to={`/conversations/${c.id}`}
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
                    'rounded-full text-white shrink-0',
                    cm.fontWeight('semibold'),
                  )}
                  style={{ backgroundColor: AVATAR_BG[c.avatar_index % AVATAR_BG.length] }}
                >
                  {c.type === 'group' ? (
                    <span className="material-symbols-outlined" aria-hidden="true">
                      group
                    </span>
                  ) : (
                    c.initials
                  )}
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
                    {c.name}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      'truncate',
                      cm.sp('mt', 1),
                    )}
                  >
                    {c.last_message}
                  </p>
                </div>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0')}>
                  {t(
                    'archive.archivedOn',
                    { date: new Date(c.archived_at).toLocaleDateString() },
                    { defaultValue: 'Archived {{date}}' },
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
