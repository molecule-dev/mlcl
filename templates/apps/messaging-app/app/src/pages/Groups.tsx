import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapList } from '../lib/unwrap.js'

interface Group {
  id: string
  name: string
  description: string
  member_count: number
  avatar_index: number
  unread_count: number
  encrypted: boolean
  last_active_at: string
}

export function Groups() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/groups')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Group>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('groups.loadError', {}, { defaultValue: 'Failed to load groups.' }))
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
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('groups.heading', {}, { defaultValue: 'Groups' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('groups.subheading', { count: list.length }, { defaultValue: '{{count}} groups' })}
          </p>
        </div>
        <Link
          to="/groups/new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('groups.newLabel', {}, { defaultValue: 'New group' })}
        </Link>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('groups.empty', {}, { defaultValue: 'No groups yet — create one to get started.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {list.map((g) => (
            <li key={g.id}>
              <Link
                to={`/groups/${g.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(12),
                    cm.w(12),
                    'rounded-full text-white shrink-0',
                  )}
                  style={{ backgroundColor: AVATAR_BG[g.avatar_index % AVATAR_BG.length] }}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    group
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
                    <p
                      className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}
                    >
                      {g.name}
                    </p>
                    {g.encrypted && (
                      <span
                        className={'material-symbols-outlined text-base'}
                        style={{ opacity: 0.5 }}
                        aria-label={t(
                          'common.endToEndEncrypted',
                          {},
                          { defaultValue: 'End-to-end encrypted' },
                        )}
                      >
                        lock
                      </span>
                    )}
                  </div>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}>
                    {g.description}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {g.member_count} {t('groups.membersLabel', {}, { defaultValue: 'members' })}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {new Date(g.last_active_at).toLocaleDateString()}
                  </p>
                </div>
                {g.unread_count > 0 && (
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('px', 2),
                      'rounded-full bg-primary text-white shrink-0',
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                    )}
                    style={{ minWidth: '24px', height: '24px' }}
                  >
                    {g.unread_count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
