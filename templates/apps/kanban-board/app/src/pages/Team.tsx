import { useCallback, useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { KpiTile } from '../components/KpiTile.js'

interface BoardRow {
  id: string
  owner_id: string
  name: string
  is_archived: boolean
  updated_at: string
}

interface CardRow {
  id: string
  board_id: string
  is_archived: boolean
}

interface AuthUser {
  id?: string
  name?: string
  email?: string
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<AuthUser>()

  const [boards, setBoards] = useState<BoardRow[]>([])
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [boardsRes, cardsRes] = await Promise.allSettled([
        http.get('/api/boards'),
        http.get('/api/cards?archived=all'),
      ])
      if (boardsRes.status === 'fulfilled') {
        const list = unwrap<BoardRow[]>(boardsRes.value) ?? []
        setBoards(Array.isArray(list) ? list : [])
      }
      if (cardsRes.status === 'fulfilled') {
        const list = unwrap<CardRow[]>(cardsRes.value) ?? []
        setCards(Array.isArray(list) ? list : [])
      }
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totalCards = cards.length
  const openCards = cards.filter((c) => !c.is_archived).length
  const shippedCards = cards.filter((c) => c.is_archived).length
  const activeBoards = boards.filter((b) => !b.is_archived).length

  const initial = (user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase()
  const displayName = user?.name?.trim() || user?.email || t('nav.you', {}, { defaultValue: 'You' })

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(8))}>
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark">
          {t('team.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} \u00b7 People' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('team.heading', {}, { defaultValue: 'Your team' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'team.subline',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a personal workspace today \u2014 every board belongs to you.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}>
        <KpiTile
          icon="group"
          label={t('team.kpis.total', {}, { defaultValue: 'Total members' })}
          value={1}
          accent="primary"
        />
        <KpiTile
          icon="view_kanban"
          label={t('team.kpis.boards', {}, { defaultValue: 'Active boards' })}
          value={activeBoards}
          accent="primary"
        />
        <KpiTile
          icon="task_alt"
          label={t('team.kpis.shipped', {}, { defaultValue: 'Cards shipped' })}
          value={shippedCards}
          accent="success"
        />
        <KpiTile
          icon="pending_actions"
          label={t('team.kpis.open', {}, { defaultValue: 'Open cards' })}
          value={openCards}
          accent="warning"
        />
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.cn('flex items-center justify-between mb-4')}>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight text-on-surface')}>
            {t('team.directory.heading', {}, { defaultValue: 'Directory' })}
          </h2>
          <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">
            {t(
              'team.directory.totalCards',
              { count: totalCards },
              { defaultValue: '{{count}} cards owned' },
            )}
          </span>
        </header>
        {loading && !user ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
            {t('team.loading', {}, { defaultValue: 'Loading directory\u2026' })}
          </p>
        ) : (
          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-xl bg-surface-container-low/40 border border-outline-variant/20',
            )}
            data-testid="team-member-self"
          >
            <div className={cm.cn('flex items-start justify-between')}>
              <div className={cm.cn('flex items-center gap-3')}>
                <span className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-bold text-lg flex items-center justify-center ring-2 ring-surface-container-lowest">
                  {initial}
                </span>
                <div>
                  <p
                    className="font-bold text-on-surface leading-tight"
                    data-testid="team-self-name"
                  >
                    {displayName}
                  </p>
                  <p className="text-[11px] text-on-surface-variant font-semibold">
                    {user?.email ?? t('team.noEmail', {}, { defaultValue: 'Owner' })}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary">
                {t('team.roleOwner', {}, { defaultValue: 'Owner' })}
              </span>
            </div>
          </article>
        )}
      </section>
    </div>
  )
}

export default Team
