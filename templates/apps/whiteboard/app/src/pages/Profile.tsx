import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface UserProfile {
  id: string
  email?: string
  name?: string
  username?: string
}

interface BoardRow {
  id: string
  title?: string
  background?: string | null
  is_public?: boolean
  updated_at?: string
}

const CURSOR_PALETTE = ['#5b5bf7', '#00c4a8', '#a855f7', '#f97316', '#ec4899', '#84cc16', '#06b6d4']

const CURSOR_KEY = 'whiteboard:cursorColor'

function relativeTime(value?: string): string {
  if (!value) return ''
  const ts = new Date(value).getTime()
  const diffMs = Date.now() - ts
  if (diffMs < 60_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.round(diffMs / 3_600_000)}h ago`
  return `${Math.round(diffMs / 86_400_000)}d ago`
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [savedColor, setSavedColor] = useState<string>(() => {
    if (typeof window === 'undefined') return CURSOR_PALETTE[0]!
    return window.localStorage.getItem(CURSOR_KEY) ?? CURSOR_PALETTE[0]!
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await http.get<BoardRow[]>('/api/boards')
        if (!cancelled) setBoards(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const stats = useMemo(() => {
    const count = boards.length
    const publicCount = boards.filter((b) => b.is_public).length
    return [
      { label: 'boards', value: count, icon: 'space_dashboard' },
      { label: 'publicBoards', value: publicCount, icon: 'public' },
      { label: 'privateBoards', value: count - publicCount, icon: 'lock' },
    ]
  }, [boards])

  const handleSelectColor = (color: string) => {
    setSavedColor(color)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURSOR_KEY, color)
    }
  }

  const recentBoards = boards.slice(0, 6)
  const displayName = user?.name || user?.username || user?.email || 'Anonymous'

  return (
    <WhiteboardLayout
      eyebrow={t('profile.eyebrow', {}, { defaultValue: 'Public collaborator card' })}
      title={t('profile.title', {}, { defaultValue: 'Your profile' })}
      actions={
        <Link
          to="/settings"
          data-mol-id="profile-edit-link"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
          )}
        >
          {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
        </Link>
      }
    >
      <div className={cm.stack(6)}>
        {error && (
          <div
            role="alert"
            data-mol-id="profile-error"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
          <section
            data-mol-id="profile-hero"
            className={cm.cn(
              'col-span-8 relative overflow-hidden',
              cm.sp('p', 8),
              cm.stack(6),
              'bg-gradient-to-br from-primary to-primary-hover rounded-[2rem] text-white',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'relative z-10')}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(20),
                  cm.h(20),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'text-3xl bg-surface/20 backdrop-blur-md border-4 border-surface/40',
                )}
                style={{ color: savedColor }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-white/70',
                  )}
                >
                  {user?.email ?? ''}
                </span>
                <h2
                  data-mol-id="profile-name"
                  className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tighter')}
                >
                  {displayName}
                </h2>
              </div>
            </div>
          </section>

          <aside className={cm.cn('col-span-4', cm.stack(4))}>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('profile.cursorEyebrow', {}, { defaultValue: 'Your cursor color' })}
              </span>
              <div
                data-mol-id="profile-cursor-palette"
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}
              >
                {CURSOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`cursor-color-${color}`}
                    data-mol-id={`profile-color-${color.replace('#', '')}`}
                    onClick={() => handleSelectColor(color)}
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      'border-4 transition-transform hover:scale-110',
                    )}
                    style={{
                      backgroundColor: color,
                      borderColor: color === savedColor ? 'var(--color-text)' : 'transparent',
                    }}
                  ></button>
                ))}
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'profile.cursorBody',
                  {},
                  {
                    defaultValue:
                      'Saved on this device — teammates see this color next to your live cursor.',
                  },
                )}
              </p>
            </div>
            <div
              data-mol-id="profile-stats"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('profile.statsEyebrow', {}, { defaultValue: 'Your activity' })}
              </span>
              <div className={cm.stack(2)}>
                {stats.map((s) => (
                  <div
                    key={s.label}
                    data-mol-id={`profile-stat-${s.label}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-[18px] text-primary')}>
                        {s.icon}
                      </span>
                      {t(
                        `profile.stat.${s.label}`,
                        {},
                        {
                          defaultValue:
                            s.label === 'boards'
                              ? 'Boards owned'
                              : s.label === 'publicBoards'
                                ? 'Public boards'
                                : 'Private boards',
                        },
                      )}
                    </span>
                    <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className={cm.cn('col-span-12', cm.stack(5))}>
            <h3
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t(
                'profile.recentBoards',
                { name: displayName },
                { defaultValue: 'Boards {{name}} recently touched' },
              )}
            </h3>
            {recentBoards.length === 0 ? (
              <div
                data-mol-id="profile-empty-boards"
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/40 text-on-surface-variant',
                )}
              >
                {t(
                  'profile.noBoards',
                  {},
                  { defaultValue: 'No boards yet — create one to get started.' },
                )}
              </div>
            ) : (
              <div
                data-mol-id="profile-board-grid"
                className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}
              >
                {recentBoards.map((b) => (
                  <Link
                    key={b.id}
                    to={`/board/${b.id}`}
                    data-mol-id={`profile-board-${b.id}`}
                    className={cm.cn(
                      cm.stack(0),
                      'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:-translate-y-1 transition-transform overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn(cm.h(28))}
                      style={{
                        background:
                          b.background ??
                          `linear-gradient(135deg, ${savedColor}33 0%, ${savedColor}11 100%)`,
                      }}
                    ></div>
                    <div className={cm.cn(cm.sp('p', 4), cm.stack(1))}>
                      <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'truncate')}>
                        {b.title || 'Untitled Board'}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {relativeTime(b.updated_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </WhiteboardLayout>
  )
}

export default Profile
