import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NodeStatCard } from '../components/NodeStatCard.js'

interface MapRow {
  id: string
  title: string
  is_public: boolean
  is_shared?: boolean
  node_count?: number
}

interface CollaboratorRow {
  id: string
  map_id: string
  accepted_at: string | null
}

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'YO'

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [maps, setMaps] = useState<MapRow[]>([])
  const [totalCollabs, setTotalCollabs] = useState(0)
  const [loading, setLoading] = useState(true)

  const displayName = user?.name || user?.email?.split('@')[0] || 'You'
  const initials = initialsFor(displayName)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get<MapRow[]>('/maps?scope=mine'), http.get<MapRow[]>('/maps?scope=shared')])
      .then(async ([mineRes, sharedRes]) => {
        if (cancelled) return
        const mine = mineRes?.data ?? []
        const shared = sharedRes?.data ?? []
        setMaps(mine)
        // Count distinct collaborators across the user's owned maps.
        const collabSet = new Set<string>()
        await Promise.all(
          mine.slice(0, 50).map(async (m) => {
            try {
              const res = await http.get<CollaboratorRow[]>(`/collaborators?map_id=${m.id}`)
              for (const c of res?.data ?? []) {
                if (c.accepted_at) collabSet.add(c.id)
              }
            } catch (_error) {
              // best-effort per-map fetch; a single failure should not block the stats render
            }
          }),
        )
        if (!cancelled) setTotalCollabs(collabSet.size + shared.length)
      })
      .catch(() => {
        if (cancelled) return
        setMaps([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const totalNodes = maps.reduce((acc, m) => acc + (m.node_count ?? 0), 0)
  const totalMaps = maps.length

  return (
    <div className={cm.stack(8)}>
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-xl',
        )}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden
        />
        <div
          className={cm.cn(
            'absolute -left-24 -top-24 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.sp('p', 10),
            'relative flex-wrap',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(24),
              cm.h(24),
              'rounded-3xl bg-surface/20 backdrop-blur-md text-3xl font-extrabold text-on-primary',
            )}
          >
            {initials}
          </div>
          <div className={cm.cn(cm.stack(2), 'flex-1 min-w-[200px]')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'self-start bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest rounded-full',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                verified
              </span>
              {t('nav.profile', {}, { defaultValue: 'Profile' })}
            </span>
            <h1
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tighter')}
              data-mol-id="profile-name"
            >
              {displayName}
            </h1>
            {user?.email && (
              <p
                className={cm.cn(cm.textSize('lg'), 'text-on-primary/85')}
                data-mol-id="profile-email"
              >
                {user.email}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('profile.statsTitle', {}, { defaultValue: 'Mapping stats' })}
        </h2>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 8))}>
            {t('profile.loading', {}, { defaultValue: 'Loading your stats…' })}
          </p>
        ) : (
          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-3')}
            data-mol-id="profile-stats"
          >
            <NodeStatCard
              icon="account_tree"
              label={t('profile.stat.maps', {}, { defaultValue: 'Maps created' })}
              value={totalMaps}
              type="default"
            />
            <NodeStatCard
              icon="hub"
              label={t('profile.stat.nodes', {}, { defaultValue: 'Nodes branched' })}
              value={totalNodes}
              type="idea"
            />
            <NodeStatCard
              icon="group"
              label={t('profile.stat.collabs', {}, { defaultValue: 'Collaborations' })}
              value={totalCollabs}
              type="task"
            />
          </div>
        )}
      </section>
    </div>
  )
}

export default Profile
