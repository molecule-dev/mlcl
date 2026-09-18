import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { unwrapList, unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectGrid } from '../components/ProjectTile.js'
import { SampleTable } from '../components/SampleTable.js'

interface ProjectRow {
  id: string
  name: string
  bpm: number
  time_signature: string
  cover_index: number
  duration_seconds: number
  track_count: number
  is_pinned?: boolean
  created_at?: string
  updatedAt?: string | null
  is_public?: boolean
}

interface SampleRow {
  id: string
  name: string
  pack: string
  bpm: number
  key: string
  duration_seconds: number
  category: string
  cover_index: number
  is_loop?: boolean
  user_id?: string | null
  is_public?: boolean
}

interface PreferencesRow {
  handle?: string
  bio?: string
  city?: string
}

type Translate = ReturnType<typeof useTranslation>['t']

function formatRelative(ts: string | null | undefined, t: Translate): string {
  if (!ts) return ''
  const then = new Date(ts).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('common.justNow', {}, { defaultValue: 'Just now' })
  if (minutes < 60)
    return t('common.minutesAgo', { count: minutes }, { defaultValue: '{{count}}m ago' })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('common.hoursAgo', { count: hours }, { defaultValue: '{{count}}h ago' })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('common.yesterday', {}, { defaultValue: 'Yesterday' })
  if (days < 7) return t('common.daysAgo', { count: days }, { defaultValue: '{{count}}d ago' })
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return t('common.weeksAgo', { count: weeks }, { defaultValue: '{{count}}w ago' })
  return new Date(ts).toLocaleDateString()
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const user = useUser<UserProfile>()
  const http = useHttpClient()
  const [prefs, setPrefs] = useState<PreferencesRow>({})
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [samples, setSamples] = useState<SampleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      http.get<unknown>('/api/preferences'),
      http.get<unknown>('/api/projects'),
      http.get<unknown>('/api/samples'),
    ]).then((results) => {
      if (cancelled) return
      const [prefsRes, projRes, sampleRes] = results
      if (prefsRes.status === 'fulfilled') {
        setPrefs(unwrapSingle<PreferencesRow>(prefsRes.value.data) ?? {})
      }
      if (projRes.status === 'fulfilled') {
        setProjects(unwrapList<ProjectRow>(projRes.value.data))
      }
      if (sampleRes.status === 'fulfilled') {
        setSamples(unwrapList<SampleRow>(sampleRes.value.data))
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const u = user as (UserProfile & { username?: string; createdAt?: string }) | null
  const displayName =
    u?.name ?? u?.username ?? u?.email ?? t('profile.defaultName', {}, { defaultValue: 'Producer' })
  const handle =
    prefs.handle?.trim() || u?.username || (u?.email ? u.email.split('@')[0] : 'producer')
  const bio =
    prefs.bio?.trim() ||
    t(
      'profile.defaultBio',
      {},
      {
        defaultValue:
          'Crafting sounds in the studio. Your bio shows up here once you set it in Settings.',
      },
    )
  const ownedSamples = samples.filter((s) => s.user_id && s.user_id === u?.id)
  const publicSamples = samples.filter((s) => s.user_id && s.is_public)
  const joinedYear = u?.createdAt ? new Date(u.createdAt).getFullYear() : new Date().getFullYear()

  const totalDurationSec = projects.reduce((sum, p) => sum + (p.duration_seconds ?? 0), 0)
  const totalTracks = projects.reduce((sum, p) => sum + (p.track_count ?? 0), 0)

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-10')}>
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white shadow-2xl')}
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #ec4899 100%)',
          minHeight: '260px',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end min-h-[260px]',
          )}
        >
          <div className={cm.cn('lg:col-span-8')}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
              {t('profile.eyebrow', {}, { defaultValue: 'Producer profile' })}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mt-2',
              )}
            >
              {displayName}
            </h1>
            <p
              className={cm.cn(
                'text-[12px] text-white/85 font-mono uppercase tracking-widest mt-1',
              )}
            >
              @{handle}
              {prefs.city ? ` · ${prefs.city}` : ''}
              {' · '}
              {t('profile.joined', { year: joinedYear }, { defaultValue: 'joined {{year}}' })}
            </p>
            <p className={cm.cn('text-base text-white/85 leading-relaxed max-w-xl mt-4')}>{bio}</p>
            <div className={cm.cn('flex items-center gap-3 mt-5')}>
              <Link
                to="/settings"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-[14px] bg-surface text-on-surface hover:bg-surface/90 transition-colors shadow-lg',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  edit
                </span>
                {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
              </Link>
              <Link
                to="/projects"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-[14px] border border-surface/30 hover:bg-surface/10 transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  folder
                </span>
                {t('nav.projects', {}, { defaultValue: 'Projects' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn('lg:col-span-4 grid grid-cols-2 gap-3')}>
            <ProfileStat
              label={t('nav.projects', {}, { defaultValue: 'Projects' })}
              value={String(projects.length)}
            />
            <ProfileStat
              label={t('profile.stat.tracks', {}, { defaultValue: 'Tracks' })}
              value={String(totalTracks)}
            />
            <ProfileStat
              label={t('profile.stat.minutes', {}, { defaultValue: 'Minutes' })}
              value={fmtCount(Math.round(totalDurationSec / 60))}
            />
            <ProfileStat
              label={t('profile.stat.samples', {}, { defaultValue: 'Samples' })}
              value={String(ownedSamples.length)}
            />
          </div>
        </div>
      </section>

      <section>
        <div className={cm.cn('flex items-end justify-between mb-5')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('profile.publishedHeading', {}, { defaultValue: 'Your projects' })}
          </h2>
          <Link
            to="/projects"
            className={cm.cn('text-sm font-semibold text-primary hover:underline')}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
          </Link>
        </div>
        {loading ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t('profile.loadingProjects', {}, { defaultValue: 'Loading projects…' })}
          </p>
        ) : projects.length === 0 ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t(
              'profile.noProjects',
              {},
              { defaultValue: 'No projects yet — create one to get started.' },
            )}
          </p>
        ) : (
          <ProjectGrid
            projects={projects.slice(0, 8).map((p) => ({
              ...p,
              last_edited: formatRelative(p.updatedAt ?? p.created_at, t),
            }))}
          />
        )}
      </section>

      <section>
        <h2 className={cm.cn('text-xl font-extrabold tracking-tight mb-5')}>
          {t('profile.samplesHeading', {}, { defaultValue: 'Your samples' })}
        </h2>
        {loading ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t('profile.loadingSamples', {}, { defaultValue: 'Loading samples…' })}
          </p>
        ) : ownedSamples.length === 0 ? (
          <p className={cm.cn('text-sm', cm.textMuted)}>
            {t(
              'profile.noSamples',
              {},
              {
                defaultValue:
                  "You haven't saved any samples yet — visit the library and add some to your collection.",
              },
            )}
          </p>
        ) : (
          <SampleTable samples={ownedSamples.slice(0, 6)} />
        )}
      </section>

      {publicSamples.length > 0 && (
        <section>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight mb-5')}>
            {t('profile.publicSamplesHeading', {}, { defaultValue: 'Shared with the community' })}
          </h2>
          <SampleTable samples={publicSamples.slice(0, 6)} />
        </section>
      )}
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('px-4 py-3 rounded-xl bg-surface/12 backdrop-blur-md')}>
      <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
        {label}
      </p>
      <p className={cm.cn('text-2xl font-extrabold tabular-nums text-white mt-0.5')}>{value}</p>
    </div>
  )
}
