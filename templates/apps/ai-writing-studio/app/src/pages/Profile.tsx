import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DocumentCard, type DocumentCardData } from '../components/DocumentCard.js'

interface ProfilePayload {
  name: string
  handle: string
  email: string
  stats: {
    published: number
    drafts: number
    total: number
  }
  published: Array<{
    id: string
    title: string
    excerpt: string
    status: string
    wordCount: number
    readingMinutes: number
    seoScore: number | null
    updatedAt: string
  }>
}

function toRelative(updatedAt: string): string {
  const then = new Date(updatedAt).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - then)
  const diffDays = Math.floor(diffMs / (24 * 60 * 60_000))
  if (diffDays < 1) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ProfilePayload>('/profile')
      .then((res) => {
        if (cancelled) return
        setProfile(res.data ?? null)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('profile.loadError', {}, { defaultValue: 'Could not load your profile.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const published: DocumentCardData[] =
    profile?.published?.map((d) => ({
      id: d.id,
      title: d.title,
      excerpt: d.excerpt,
      status: 'published',
      wordCount: d.wordCount,
      updatedRelative: toRelative(d.updatedAt),
      seoScore: d.seoScore ?? undefined,
    })) ?? []

  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-5xl', cm.mxAuto, cm.stack(8))}>
        <section
          className={cm.cn(
            cm.sp('p', 8),
            cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
            'rounded-2xl bg-gradient-to-br from-primary-container/40 via-surface to-surface border border-outline-variant',
          )}
        >
          <div
            className={cm.cn(
              'w-24 h-24 rounded-full bg-primary-container text-on-primary-container border-4 border-surface shadow-md flex items-center justify-center',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('font-serif font-extrabold text-3xl')}>
              {(profile?.name?.[0] ?? '·').toUpperCase()}
            </span>
          </div>
          <div className={cm.cn(cm.stack(2), 'flex-1 min-w-[260px]')}>
            <h1
              className={cm.cn('text-3xl font-extrabold tracking-tight font-serif text-on-surface')}
            >
              {profile?.name ?? t('profile.loading', {}, { defaultValue: 'Loading your profile…' })}
            </h1>
            {profile?.handle ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-mono')}>
                {profile.handle}
              </p>
            ) : null}
            {profile?.email ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{profile.email}</p>
            ) : null}
            {profile ? (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                  cm.sp('mt', 2),
                )}
              >
                <Stat
                  label={t('status.published', {}, { defaultValue: 'Published' })}
                  value={profile.stats.published.toLocaleString()}
                />
                <Stat
                  label={t('profile.stat.drafts', {}, { defaultValue: 'Drafts' })}
                  value={profile.stats.drafts.toLocaleString()}
                />
                <Stat
                  label={t('nav.total', {}, { defaultValue: 'Total' })}
                  value={profile.stats.total.toLocaleString()}
                />
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <section className={cm.stack(4)}>
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              menu_book
            </span>
            {t('profile.publishedTitle', {}, { defaultValue: 'Published works' })}
          </h2>
          {profile === null ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('profile.loadingPublished', {}, { defaultValue: 'Loading published documents…' })}
            </p>
          ) : published.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                'rounded-xl border border-outline-variant bg-surface text-center',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                aria-hidden="true"
              >
                drafts
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
                {t(
                  'profile.noPublished',
                  {},
                  {
                    defaultValue: 'No published documents yet — your work will appear here.',
                  },
                )}
              </p>
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
              {published.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

interface StatProps {
  label: string
  value: string
}

function Stat({ label, value }: StatProps) {
  const cm = getClassMap()
  return (
    <div>
      <p className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>{value}</p>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.textMuted,
          'uppercase tracking-widest',
        )}
      >
        {label}
      </p>
    </div>
  )
}

export default Profile
export { Profile as ProfilePage }
