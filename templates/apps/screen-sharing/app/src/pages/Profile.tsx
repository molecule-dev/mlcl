import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { RecordingCardData } from '../components/RecordingCard.js'
import { RecordingCard } from '../components/RecordingCard.js'

interface RecordingRow {
  id: string
  title: string
  thumbnail_url?: string | null
  duration_ms?: number | null
  view_count?: number | null
  visibility?: 'private' | 'workspace' | 'public' | 'password'
  status?: string | null
  created_at?: string | null
}

interface ProfileData {
  bio: string
  jobTitle: string
}

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
}

interface UserReadEnvelope {
  props?: UserRow
}

interface SettingsPayload {
  screenSharing?: Record<string, unknown>
  screenSharingProfile?: Partial<ProfileData>
}

interface SettingsEnvelope {
  settings?: SettingsPayload
}

function extractSettings(payload: unknown): SettingsPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as SettingsEnvelope
  return data.settings ?? (payload as SettingsPayload)
}

const DEFAULT_PROFILE: ProfileData = {
  bio: '',
  jobTitle: '',
}

function extractUser(payload: unknown): UserRow | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as UserReadEnvelope & UserRow
  if (data.props && typeof data.props === 'object') return data.props
  if ('id' in data && typeof (data as UserRow).id === 'string') return data as UserRow
  return null
}

function unwrapList(payload: unknown): RecordingRow[] {
  if (Array.isArray(payload)) return payload as RecordingRow[]
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data as RecordingRow[]
  }
  return []
}

function rowToCard(r: RecordingRow): RecordingCardData {
  return {
    id: r.id,
    title: r.title || 'Untitled recording',
    thumbnail_url: r.thumbnail_url ?? null,
    duration_seconds: Math.round((r.duration_ms ?? 0) / 1000),
    view_count: r.view_count ?? 0,
    visibility:
      r.visibility === 'public' ? 'public' : r.visibility === 'workspace' ? 'team' : 'private',
    status: r.status === 'processing' ? 'processing' : 'ready',
    created_at: r.created_at ?? undefined,
    posterEmoji: '🎬',
  }
}

function deriveInitials(name: string, email: string): string {
  const candidate = (name || email || `${APP_NAME} user`).trim()
  if (!candidate) return '··'
  const parts = candidate.split(/[@\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const sessionUser = useUser<{ id: string; email?: string; name?: string }>()
  const userId = sessionUser?.id ?? ''

  const [user, setUser] = useState<UserRow | null>(null)
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE)
  const [savedProfile, setSavedProfile] = useState<ProfileData>(DEFAULT_PROFILE)
  const [displayName, setDisplayName] = useState('')
  const [savedDisplayName, setSavedDisplayName] = useState('')
  const [recordings, setRecordings] = useState<RecordingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      // Identity (name/email) comes from the user resource; the profile slice
      // (bio/job title) lives in oauthData, which the platform user resource
      // never returns on reads — it is served by the server-side
      // /api/settings channel instead.
      const [userRes, settingsRes, recRes] = await Promise.all([
        http.get<UserReadEnvelope>(`/api/users/${userId}`),
        http.get<SettingsEnvelope>('/api/settings'),
        http.get('/api/recordings'),
      ])
      const row = extractUser(userRes?.data)
      setUser(row)
      const stored = (extractSettings(settingsRes?.data)?.screenSharingProfile ??
        {}) as Partial<ProfileData>
      const merged: ProfileData = {
        bio: stored.bio ?? '',
        jobTitle: stored.jobTitle ?? '',
      }
      setProfile(merged)
      setSavedProfile(merged)
      const name = row?.name ?? sessionUser?.name ?? ''
      setDisplayName(name)
      setSavedDisplayName(name)
      setRecordings(unwrapList(recRes?.data))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('nav.failedToLoadProfile', {}, { defaultValue: 'Failed to load profile.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, userId, sessionUser?.name, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dirty = useMemo(
    () =>
      JSON.stringify(profile) !== JSON.stringify(savedProfile) || displayName !== savedDisplayName,
    [profile, savedProfile, displayName, savedDisplayName],
  )

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaveStatus('idle')
    try {
      // Display name is a first-class user field (PATCH /api/users/:id); the
      // bio/job-title slice goes through the server-side /api/settings
      // channel because oauthData is write-only on the user resource.
      await Promise.all([
        http.patch<UserReadEnvelope>(`/api/users/${userId}`, {
          name: displayName.trim() || null,
        }),
        http.patch<SettingsEnvelope>('/api/settings', {
          screenSharingProfile: profile,
        }),
      ])
      setSavedProfile(profile)
      setSavedDisplayName(displayName)
      setSaveStatus('saved')
      setEditing(false)
      track({
        name: 'profile.updated',
        properties: { user_id: userId, name_changed: displayName.trim() !== savedDisplayName },
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('common.saveFailed', {}, { defaultValue: 'Save failed.' }),
      )
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setProfile(savedProfile)
    setDisplayName(savedDisplayName)
    setEditing(false)
    setSaveStatus('idle')
    setError(null)
  }

  const totalViews = recordings.reduce((sum, r) => sum + (r.view_count ?? 0), 0)
  const publicRecordings = useMemo(
    () =>
      recordings
        .filter((r) => r.visibility === 'public')
        .slice(0, 3)
        .map(rowToCard),
    [recordings],
  )
  const allCards = useMemo(() => recordings.slice(0, 6).map(rowToCard), [recordings])
  const featuredCards = publicRecordings.length > 0 ? publicRecordings : allCards

  const fallbackName = user?.email ?? sessionUser?.email ?? ''
  const visibleName = (
    savedDisplayName ||
    displayName ||
    fallbackName.split('@')[0] ||
    `${APP_NAME} user`
  ).trim()
  const initials = deriveInitials(visibleName, fallbackName)

  return (
    <div data-mol-id="profile-page" className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}>
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] text-white shadow-xl shadow-[var(--color-brand-gradient-from)]/20',
          'bg-gradient-to-br from-[var(--color-brand-gradient-from)] via-[var(--color-brand-gradient-mid)] to-[var(--color-brand-gradient-to)]',
        )}
      >
        <div
          className={cm.cn(
            'pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl',
          )}
        />

        <div className={cm.cn(cm.flex({ align: 'center', gap: 5 }), 'relative flex-wrap')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              'rounded-full bg-surface/15 backdrop-blur-md text-3xl font-extrabold border border-surface/20 shrink-0',
            )}
          >
            {initials}
          </div>
          <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
            <span
              className={cm.cn(
                'inline-flex items-center gap-2 rounded-full bg-surface/15 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.25em] w-fit',
              )}
            >
              <span
                className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-emerald-300 animate-pulse')}
              />
              {t('profile.online', {}, { defaultValue: 'Active now' })}
            </span>
            <h1
              data-mol-id="profile-name"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight font-extrabold',
              )}
            >
              {visibleName}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/80')}>
              {fallbackName || t('profile.noEmail', {}, { defaultValue: 'No email on file' })}
            </p>
          </div>
          {!editing ? (
            <button
              type="button"
              data-mol-id="profile-edit"
              onClick={() => setEditing(true)}
              disabled={loading}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full bg-surface text-[var(--color-brand-gradient-from)] hover:bg-surface-secondary uppercase tracking-widest shrink-0 disabled:opacity-50',
              )}
            >
              {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            </button>
          ) : (
            <button
              type="button"
              data-mol-id="profile-cancel"
              onClick={handleCancel}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full bg-surface/20 text-white hover:bg-surface/30 uppercase tracking-widest shrink-0',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          )}
        </div>

        {editing ? (
          <form
            data-mol-id="profile-edit-form"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSave()
            }}
            className={cm.cn(cm.stack(3), cm.sp('mt', 4), 'relative')}
          >
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-semibold text-white/80',
                )}
              >
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </span>
              <input
                type="text"
                data-mol-id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full rounded-xl bg-surface/15 backdrop-blur-md text-white placeholder:text-white/60 outline-none border border-surface/20 focus:ring-2 focus:ring-white/40',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-semibold text-white/80',
                )}
              >
                {t('profile.field.jobTitle', {}, { defaultValue: 'Job title' })}
              </span>
              <input
                type="text"
                data-mol-id="profile-job-title"
                value={profile.jobTitle}
                onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full rounded-xl bg-surface/15 backdrop-blur-md text-white placeholder:text-white/60 outline-none border border-surface/20 focus:ring-2 focus:ring-white/40',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-semibold text-white/80',
                )}
              >
                {t('form.bio', {}, { defaultValue: 'Bio' })}
              </span>
              <textarea
                rows={3}
                data-mol-id="profile-bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'w-full rounded-xl bg-surface/15 backdrop-blur-md text-white placeholder:text-white/60 outline-none border border-surface/20 focus:ring-2 focus:ring-white/40',
                )}
              />
            </label>
            <button
              type="submit"
              data-mol-id="profile-save"
              disabled={!dirty || saving}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full bg-surface text-[var(--color-brand-gradient-from)] hover:bg-surface-secondary uppercase tracking-widest w-fit disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
            </button>
            {error ? (
              <p
                data-mol-id="profile-error"
                role="alert"
                className={cm.cn(cm.textSize('xs'), 'text-red-200')}
              >
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <>
            <p
              data-mol-id="profile-bio-display"
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 4),
                'relative text-white/85 max-w-2xl leading-relaxed',
              )}
            >
              {savedProfile.bio ||
                t(
                  'profile.bio.empty',
                  {},
                  { defaultValue: 'Add a bio to introduce yourself to your workspace.' },
                )}
            </p>
            {savedProfile.jobTitle ? (
              <p
                data-mol-id="profile-jobtitle-display"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 2),
                  'relative uppercase tracking-widest font-semibold text-white/70',
                )}
              >
                {savedProfile.jobTitle}
              </p>
            ) : null}
            {saveStatus === 'saved' ? (
              <p
                data-mol-id="profile-saved"
                role="status"
                className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'relative text-emerald-200')}
              >
                {t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' })}
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-3')}>
        <StatTile
          id="recordings"
          icon="movie"
          label={t('profile.stat.recordings', {}, { defaultValue: 'Recordings' })}
          value={recordings.length.toString()}
          accent="border-[var(--color-brand-gradient-from)]"
          tile="bg-violet-50 text-violet-600"
        />
        <StatTile
          id="views"
          icon="visibility"
          label={t('profile.stat.views', {}, { defaultValue: 'Total views' })}
          value={totalViews.toLocaleString()}
          accent="border-[var(--color-brand-gradient-to)]"
          tile="bg-cyan-50 text-cyan-600"
        />
        <StatTile
          id="public"
          icon="public"
          label={t('profile.stat.public', {}, { defaultValue: 'Public clips' })}
          value={recordings.filter((r) => r.visibility === 'public').length.toString()}
          accent="border-emerald-500"
          tile="bg-success-light text-success"
        />
      </section>

      <section className={cm.cn(cm.stack(3))}>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight text-on-surface')}>
            {t('profile.featured.title', {}, { defaultValue: 'Featured recordings' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest font-semibold',
            )}
          >
            {t('profile.featured.subtitle', {}, { defaultValue: 'From your library' })}
          </span>
        </header>
        {featuredCards.length === 0 ? (
          <p
            data-mol-id="profile-featured-empty"
            className={cm.cn(cm.textSize('sm'), cm.textMuted)}
          >
            {t(
              'profile.featured.empty',
              {},
              { defaultValue: 'No recordings yet — capture your first one to see it here.' },
            )}
          </p>
        ) : (
          <div
            data-mol-id="profile-featured"
            className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}
          >
            {featuredCards.map((rec) => (
              <RecordingCard key={rec.id} recording={rec} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatTile({
  id,
  icon,
  label,
  value,
  accent,
  tile,
}: {
  id: string
  icon: string
  label: string
  value: string
  accent: string
  tile: string
}) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={`profile-stat-${id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('p', 5),
        'rounded-2xl border-l-4 bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 transition-transform',
        accent,
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(11),
          cm.h(11),
          'rounded-xl shrink-0',
          tile,
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
      </div>
      <div>
        <div
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </div>
        <div className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
          {value}
        </div>
      </div>
    </div>
  )
}
