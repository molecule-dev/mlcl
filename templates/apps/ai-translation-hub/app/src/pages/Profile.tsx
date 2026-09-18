import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface UserProfile {
  id?: string
  name?: string
  email?: string
  username?: string
}

interface StatRow {
  key: string
  defaultLabel: string
  value: string
  icon: string
}

interface ApiSegmentRow {
  id?: unknown
  status?: unknown
  target_text?: unknown
  source_lang?: unknown
  target_lang?: unknown
}

function initialsFromName(name?: string, email?: string): string {
  const source = name && name.length > 0 ? name : (email ?? '?')
  const local = source.split('@')[0] ?? source
  const parts = local.split(/[\s.\-_+]/).filter(Boolean)
  if (parts.length === 0) return source.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user: authUserRaw } = useAuth()
  const authUser = authUserRaw as UserProfile | null
  const [user, setUser] = useState<UserProfile | null>(null)
  const [segCount, setSegCount] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [pairCounts, setPairCounts] = useState<Map<string, number>>(new Map())
  const [wordsTotal, setWordsTotal] = useState(0)
  const [projectCount, setProjectCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const sessionId = authUser?.id ? String(authUser.id) : null
    Promise.all([
      sessionId
        ? http.get(`/users/${encodeURIComponent(sessionId)}`).catch(() => null)
        : Promise.resolve(null),
      http.get('/segments').catch(() => null),
      http.get('/projects').catch(() => null),
    ])
      .then(([uRes, sRes, pRes]) => {
        if (cancelled) return
        const profile = unwrapSingle<UserProfile>(uRes)
        if (profile) setUser(profile)
        else if (authUser) setUser(authUser as UserProfile)
        const segs = unwrapList<ApiSegmentRow>(sRes)
        setSegCount(segs.length)
        setApprovedCount(segs.filter((s) => String(s.status ?? '') === 'approved').length)
        setWordsTotal(
          segs.reduce(
            (sum, s) =>
              sum +
              String(s.target_text ?? '')
                .split(/\s+/)
                .filter(Boolean).length,
            0,
          ),
        )
        const pc = new Map<string, number>()
        for (const s of segs) {
          const src = String(s.source_lang ?? 'EN').toLowerCase()
          const tgt = String(s.target_lang ?? '').toLowerCase()
          if (!tgt) continue
          const k = `${src}->${tgt}`
          pc.set(k, (pc.get(k) ?? 0) + 1)
        }
        setPairCounts(pc)
        const projects = unwrapList(pRes)
        setProjectCount(projects.length)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authUser, http])

  const acceptRate = segCount > 0 ? Math.round((approvedCount / segCount) * 100) : 0
  const stats: ReadonlyArray<StatRow> = [
    {
      key: 'segments',
      defaultLabel: 'Segments translated',
      value: segCount.toLocaleString(),
      icon: 'translate',
    },
    { key: 'accept_rate', defaultLabel: 'Accept rate', value: `${acceptRate}%`, icon: 'thumb_up' },
    {
      key: 'projects',
      defaultLabel: 'Projects',
      value: projectCount.toLocaleString(),
      icon: 'folder_copy',
    },
    {
      key: 'words',
      defaultLabel: 'Words translated',
      value: wordsTotal.toLocaleString(),
      icon: 'speed',
    },
  ]
  const pairs: Array<{ source: string; target: string }> = Array.from(pairCounts.keys()).map(
    (k) => {
      const [s, target] = k.split('->')
      return { source: s, target }
    },
  )
  const displayName =
    user?.name && user.name.length > 0
      ? user.name
      : (user?.email ?? t('profile.guest', {}, { defaultValue: 'Workspace member' }))
  const initials = initialsFromName(user?.name, user?.email)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('6xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('profile.eyebrow', {}, { defaultValue: 'Linguist profile' })}
        title={displayName}
        subtitle={
          user?.email ?? t('profile.subtitle', {}, { defaultValue: 'Workspace contributor' })
        }
      />

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      )}

      {/* Hero pane */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-[1.75rem] bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              cm.fontWeight('bold'),
              'text-3xl rounded-full bg-surface/20 backdrop-blur-md text-on-primary',
            )}
          >
            {initials}
          </span>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-primary-fixed/80',
              )}
            >
              {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
            </p>
            <h2 className={cm.cn(cm.textSize('3xl'), 'mt-2 font-extrabold tracking-tighter')}>
              {displayName}
            </h2>
            {pairs.length > 0 && (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                  cm.sp('mt', 3),
                )}
              >
                {pairs.slice(0, 5).map((p, i) => (
                  <LanguagePairBadge
                    key={`${p.source}-${p.target}-${i}`}
                    source={p.source}
                    target={p.target}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
          )}
        />
      </section>

      {/* Stat grid */}
      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}>
        {stats.map((s) => (
          <div
            key={s.key}
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-xl border border-surface-container/50 shadow-sm',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
              <span
                className={cm.cn('material-symbols-outlined text-[18px] text-primary')}
                aria-hidden="true"
              >
                {s.icon}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`profile.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tabular-nums')}>{s.value}</p>
          </div>
        ))}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
        )}
      >
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('profile.pairsHeading', {}, { defaultValue: 'Active language pairs' })}
        </h3>
        {pairs.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'profile.pairsEmpty',
              {},
              {
                defaultValue:
                  'No language pairs yet — translate your first segment to see them here.',
              },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            {pairs.map((p, i) => (
              <LanguagePairBadge
                key={`${p.source}-${p.target}-${i}`}
                source={p.source}
                target={p.target}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Profile
export { Profile as ProfilePage }
