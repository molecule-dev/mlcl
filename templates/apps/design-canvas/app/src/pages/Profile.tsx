import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'
import { ProjectCard } from '../components/ProjectCard.js'

interface ProfilePrefs {
  displayName?: string
  bio?: string
  location?: string
  pronouns?: string
  publicUrl?: string
  cursorColor?: string
  theme?: 'light' | 'dark' | 'system'
}

interface ProfileResponse {
  id: string
  name: string | null
  email: string | null
  username: string | null
  planKey: string
  prefs: ProfilePrefs
  stats: {
    projects: number
    shapes: number
    exports: number
    unreadNotifications: number
  }
}

interface ProjectRow {
  id: string
  name: string
  width: number
  height: number
  thumbnail_color: string | null
  updated_at: string
}

const DEFAULT_PALETTE = ['#ede9fe', '#fce7f3', '#cffafe', '#fef3c7', '#dcfce7']

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 'just now'
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const d = Math.round(hr / 24)
  return `${d} days ago`
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfilePrefs & { name: string }>({
    name: '',
    displayName: '',
    bio: '',
    location: '',
    pronouns: '',
    publicUrl: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/api/profile/me'), http.get('/api/projects')])
      .then(([profResp, projResp]) => {
        if (cancelled) return
        const prof = ((profResp as { data?: unknown }).data ?? null) as ProfileResponse | null
        const projs = ((projResp as { data?: unknown }).data ?? []) as ProjectRow[]
        setProfile(prof)
        setProjects(projs)
        if (prof) {
          setDraft({
            name: prof.name ?? '',
            displayName: prof.prefs?.displayName ?? '',
            bio: prof.prefs?.bio ?? '',
            location: prof.prefs?.location ?? '',
            pronouns: prof.prefs?.pronouns ?? '',
            publicUrl: prof.prefs?.publicUrl ?? '',
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null)
          setProjects([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const stats = profile?.stats ?? {
    projects: 0,
    shapes: 0,
    exports: 0,
    unreadNotifications: 0,
  }

  const STATS = [
    {
      key: 'projects',
      label: 'Projects',
      value: String(stats.projects),
      icon: 'rocket_launch',
      accent: '#7c3aed',
    },
    {
      key: 'shapes',
      label: 'Shapes drawn',
      value: String(stats.shapes),
      icon: 'extension',
      accent: '#ec4899',
    },
    {
      key: 'exports',
      label: 'Exports',
      value: String(stats.exports),
      icon: 'download',
      accent: '#06b6d4',
    },
  ]

  const portfolio = useMemo(
    () =>
      projects.slice(0, 4).map((p, idx) => ({
        id: p.id,
        title: p.name,
        folder: 'Personal',
        thumbnailColor: p.thumbnail_color ?? DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length],
        visibility: 'private' as const,
        iconName: 'palette',
        updatedLabel: relativeTime(p.updated_at),
        collaborators: [
          {
            id: profile?.id ?? 'me',
            name: profile?.name ?? 'You',
            avatarColor: '#7c3aed',
            online: true,
          },
        ],
      })),
    [projects, profile],
  )

  const saveProfile = async () => {
    setSavingProfile(true)
    setSaveStatus(null)
    try {
      const resp = await http.patch('/api/profile/me', {
        name: draft.name || undefined,
        prefs: {
          displayName: draft.displayName,
          bio: draft.bio,
          location: draft.location,
          pronouns: draft.pronouns,
          publicUrl: draft.publicUrl,
        },
      })
      const updated = ((resp as { data?: unknown }).data ?? null) as ProfileResponse | null
      if (updated) {
        setProfile((p) => (p ? { ...p, ...updated } : updated))
      }
      setSaveStatus(t('profile.saved', {}, { defaultValue: 'Profile saved' })!)
    } catch (_error) {
      // save failure shown to user via setSaveStatus below; no additional logging needed
      setSaveStatus(t('profile.saveFailed', {}, { defaultValue: 'Could not save profile' })!)
    } finally {
      setSavingProfile(false)
    }
  }

  const displayName =
    profile?.prefs?.displayName ??
    profile?.name ??
    t('profile.fallbackName', {}, { defaultValue: 'Your profile' })!
  const bio =
    profile?.prefs?.bio ??
    t(
      'profile.bioFallback',
      {},
      {
        defaultValue:
          'Tell collaborators what you design, the systems you love, and how to brief you well.',
      },
    )!

  return (
    <DesignCanvasLayout
      eyebrow={t('profile.eyebrow', {}, { defaultValue: 'Designer profile' })}
      title={displayName}
      actions={
        <button
          onClick={() => setEditing((v) => !v)}
          type="button"
          data-mol-id="profile-edit-toggle"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>
            {editing ? 'close' : 'edit'}
          </span>
          {editing
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
        </button>
      }
    >
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      ) : (
        <div className={cm.cn(cm.stack(8))}>
          <article
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg' }),
              cm.sp('p', 8),
              'rounded-[2rem] bg-gradient-to-br from-primary via-primary-hover to-secondary text-white relative overflow-hidden',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(24),
                cm.h(24),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'shrink-0 text-white text-3xl border-4 border-surface/30',
              )}
              style={{ backgroundColor: profile?.prefs?.cursorColor ?? 'var(--color-primary)' }}
            >
              {(displayName.trim() || 'A').charAt(0).toUpperCase()}
            </span>
            <div className={cm.cn(cm.flex1, cm.stack(2), 'relative z-10')}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-white/70',
                )}
              >
                {profile?.email ?? t('profile.role', {}, { defaultValue: 'Designer' })}
              </span>
              <h2
                className={cm.cn('text-4xl font-extrabold tracking-tighter')}
                data-mol-id="profile-display-name"
              >
                {displayName}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-white/85 max-w-xl leading-relaxed',
                )}
                data-mol-id="profile-bio"
              >
                {bio}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}>
                {profile?.prefs?.location && (
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest bg-surface/15 backdrop-blur-md',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[14px]')}>
                      location_on
                    </span>
                    {profile.prefs.location}
                  </span>
                )}
                {profile?.prefs?.publicUrl && (
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest bg-surface/15 backdrop-blur-md',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[14px]')}>link</span>
                    {profile.prefs.publicUrl}
                  </span>
                )}
              </div>
            </div>
          </article>

          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void saveProfile()
              }}
              data-mol-id="profile-edit-form"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
              )}
            >
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
              </h3>
              <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    {t('form.displayName', {}, { defaultValue: 'Display name' })}
                  </span>
                  <input
                    type="text"
                    name="displayName"
                    data-mol-id="profile-input-displayName"
                    value={draft.displayName ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, displayName: e.target.value, name: e.target.value }))
                    }
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline-variant/40 bg-surface',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    {t('form.location', {}, { defaultValue: 'Location' })}
                  </span>
                  <input
                    type="text"
                    name="location"
                    data-mol-id="profile-input-location"
                    value={draft.location ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline-variant/40 bg-surface',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    {t('profile.fields.pronouns', {}, { defaultValue: 'Pronouns' })}
                  </span>
                  <input
                    type="text"
                    name="pronouns"
                    data-mol-id="profile-input-pronouns"
                    value={draft.pronouns ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, pronouns: e.target.value }))}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline-variant/40 bg-surface',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    {t('profile.fields.publicUrl', {}, { defaultValue: 'Public URL' })}
                  </span>
                  <input
                    type="text"
                    name="publicUrl"
                    data-mol-id="profile-input-publicUrl"
                    value={draft.publicUrl ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, publicUrl: e.target.value }))}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline-variant/40 bg-surface',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(1), 'col-span-2')}>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    {t('form.bio', {}, { defaultValue: 'Bio' })}
                  </span>
                  <textarea
                    rows={3}
                    name="bio"
                    data-mol-id="profile-input-bio"
                    value={draft.bio ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline-variant/40 bg-surface',
                    )}
                  />
                </label>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  data-mol-id="profile-save"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-60',
                  )}
                >
                  {savingProfile
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
                {saveStatus && (
                  <span
                    data-mol-id="profile-save-status"
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {saveStatus}
                  </span>
                )}
              </div>
            </form>
          )}

          <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))} data-mol-id="profile-stats">
            {STATS.map((stat) => (
              <article
                key={stat.key}
                data-mol-id={`profile-stat-${stat.key}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(2),
                  'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform',
                  cm.accentCard({ tone: 'custom' }),
                )}
                style={{ ['--mol-accent' as string]: stat.accent }}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest',
                    cm.accentCardLabel({ tone: 'custom' }),
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    style={{ color: stat.accent }}
                  >
                    {stat.icon}
                  </span>
                  {t(`profile.stat.${stat.key}.label`, {}, { defaultValue: stat.label })}
                </span>
                <span className={cm.cn('text-4xl font-extrabold tracking-tighter text-on-surface')}>
                  {stat.value}
                </span>
              </article>
            ))}
          </div>

          <section className={cm.cn(cm.stack(4))}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h3
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('profile.recentWork', {}, { defaultValue: 'Recent work' })}
              </h3>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                data-mol-id="profile-view-all-projects"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                {t('profile.viewAll', {}, { defaultValue: 'View all projects' })}
              </button>
            </div>
            {portfolio.length === 0 ? (
              <p
                data-mol-id="profile-portfolio-empty"
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
                )}
              >
                {t(
                  'profile.portfolioEmpty',
                  {},
                  { defaultValue: 'No projects yet — create one from the Templates gallery.' },
                )}
              </p>
            ) : (
              <div
                className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}
                data-mol-id="profile-portfolio"
              >
                {portfolio.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </DesignCanvasLayout>
  )
}

export default Profile
