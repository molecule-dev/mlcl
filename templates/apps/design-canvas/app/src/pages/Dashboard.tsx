import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { ActivityKind } from '../components/ActivityFeedItem.js'
import { ActivityFeedItem } from '../components/ActivityFeedItem.js'
import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'
import { ProjectCard } from '../components/ProjectCard.js'
import { ProjectHeroCard } from '../components/ProjectHeroCard.js'

const CURSOR_PALETTE = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981']
const PALETTE_THUMBNAILS = ['#ede9fe', '#fce7f3', '#cffafe', '#fef3c7', '#dcfce7']
const PALETTE_ICONS = ['palette', 'phone_iphone', 'tune', 'draw', 'monitoring', 'apps']
const PALETTE_FOLDERS = [
  'Brand · Northwind',
  'Product Design',
  'Design Ops',
  'Marketing',
  'Personal',
]

interface ProjectSummary {
  id: string
  title: string
  folder?: string
  thumbnailColor: string
  visibility?: 'private' | 'shared' | 'public'
  iconName?: string
  updatedLabel: string
  collaborators: Array<{ id: string; name: string; avatarColor: string; online?: boolean }>
}

interface NotificationRow {
  id: string
  kind: string
  actor_name: string | null
  actor_color: string | null
  sentence: string | null
  target_label: string | null
  target_href: string | null
  preview: string | null
  bucket: string
  unread: boolean
  created_at: string | null
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'just now'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 'just now'
  const sec = Math.max(1, Math.round(ms / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr} hr ago`
  const d = Math.round(hr / 24)
  return `${d} days ago`
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [activity, setActivity] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState<string>('All projects')
  const [creating, setCreating] = useState(false)
  const [cursorColor, setCursorColor] = useState<string>('#7c3aed')
  const [savingCursor, setSavingCursor] = useState(false)
  const autoCreatedRef = useRef(false)

  const loadAll = async (cancelledRef?: { v: boolean }) => {
    setLoading(true)
    try {
      const [projRes, profileRes, notifRes] = await Promise.all([
        http.get('/api/projects'),
        http.get('/api/profile/me').catch(() => null),
        http.get('/api/notifications').catch(() => null),
      ])
      if (cancelledRef?.v) return
      const remote = ((projRes as { data?: unknown }).data ?? []) as Array<{
        id: string
        name: string
        updated_at?: string
        team_id?: string | null
        thumbnail_color?: string | null
      }>
      setProjects(
        remote.map((p, idx) => ({
          id: p.id,
          title: p.name,
          folder: PALETTE_FOLDERS[idx % PALETTE_FOLDERS.length],
          thumbnailColor: p.thumbnail_color ?? PALETTE_THUMBNAILS[idx % PALETTE_THUMBNAILS.length],
          visibility: p.team_id ? 'shared' : 'private',
          iconName: PALETTE_ICONS[idx % PALETTE_ICONS.length],
          updatedLabel: relativeTime(p.updated_at),
          collaborators: [{ id: 'me', name: 'You', avatarColor: '#7c3aed', online: true }],
        })),
      )

      const profile = profileRes
        ? (((profileRes as { data?: unknown }).data ?? null) as {
            prefs?: { cursorColor?: string }
          } | null)
        : null
      if (profile?.prefs?.cursorColor) setCursorColor(profile.prefs.cursorColor)

      const notifs = notifRes
        ? (((notifRes as { data?: unknown }).data ?? []) as NotificationRow[])
        : []
      setActivity(notifs.slice(0, 5))
    } catch (_error) {
      // network/API failure on load: clear projects and let loading spinner resolve
      if (!cancelledRef?.v) setProjects([])
    } finally {
      if (!cancelledRef?.v) setLoading(false)
    }
  }

  useEffect(() => {
    const ref = { v: false }
    loadAll(ref)
    return () => {
      ref.v = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const createProject = async (): Promise<void> => {
    if (creating) return
    setCreating(true)
    try {
      const res = await http.post('/api/projects', {
        name: t('dashboard.untitledProject', {}, { defaultValue: 'Untitled project' }),
      })
      const created = (res as { data?: { id?: string } }).data ?? null
      if (created?.id) {
        navigate(`/editor/${created.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  // Honor ?new=1 from the sidebar shortcut: trigger New project once.
  useEffect(() => {
    if (autoCreatedRef.current) return
    if (params.get('new') !== '1') return
    autoCreatedRef.current = true
    void (async () => {
      await createProject()
      params.delete('new')
      setParams(params, { replace: true })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const pickCursorColor = async (color: string) => {
    setCursorColor(color)
    setSavingCursor(true)
    try {
      await http.patch('/api/profile/me', { prefs: { cursorColor: color } })
    } finally {
      setSavingCursor(false)
    }
  }

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        const matchesSearch =
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          (p.folder ?? '').toLowerCase().includes(search.toLowerCase())
        const matchesFolder = folder === 'All projects' || p.folder === folder
        return matchesSearch && matchesFolder
      }),
    [projects, search, folder],
  )

  const folders = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of projects) {
      counts.set(p.folder ?? 'Personal', (counts.get(p.folder ?? 'Personal') ?? 0) + 1)
    }
    const list: Array<{ name: string; icon: string; count: number; active: boolean }> = [
      {
        name: 'All projects',
        icon: 'space_dashboard',
        count: projects.length,
        active: folder === 'All projects',
      },
    ]
    for (const f of PALETTE_FOLDERS) {
      list.push({
        name: f,
        icon: 'folder',
        count: counts.get(f) ?? 0,
        active: folder === f,
      })
    }
    return list
  }, [projects, folder])

  const hero = filtered[0] ?? projects[0]

  return (
    <DesignCanvasLayout
      eyebrow={t('dashboard.eyebrow', {}, { defaultValue: 'Workspace · Northwind Studio' })}
      title={t('dashboard.title', {}, { defaultValue: 'Your projects' })}
      actions={
        <>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]',
              )}
            >
              search
            </span>
            <input
              type="search"
              data-mol-id="dashboard-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'dashboard.searchPlaceholder',
                {},
                { defaultValue: 'Search projects' },
              )!}
              className={cm.cn(
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'w-72 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all outline-none',
              )}
            />
          </div>
          <Link
            to="/templates"
            data-mol-id="dashboard-templates-link"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
            )}
          >
            {t('dashboard.startFromTemplate', {}, { defaultValue: 'Start from template' })}
          </Link>
          <button
            type="button"
            onClick={createProject}
            disabled={creating}
            data-mol-id="dashboard-new-project"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('nav.newProject', {}, { defaultValue: 'New project' })}
          </button>
        </>
      }
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-start')}>
        <aside className={cm.cn('col-span-3 sticky top-24', cm.stack(2))}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(2),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/30',
            )}
            data-mol-id="dashboard-folders"
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.foldersLabel', {}, { defaultValue: 'Folders' })}
            </span>
            {folders.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setFolder(f.name)}
                data-mol-id={`dashboard-folder-${f.name.replace(/\s+/g, '-')}`}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  f.active
                    ? 'bg-primary-fixed/40 text-on-primary-container rounded-lg'
                    : 'text-on-surface-variant hover:bg-surface-container/60 rounded-lg transition-colors',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>{f.icon}</span>
                  {t(`dashboard.folders.${f.name}`, {}, { defaultValue: f.name })}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(3),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/30',
            )}
            data-mol-id="dashboard-cursor-palette"
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.cursorPaletteLabel', {}, { defaultValue: 'Your cursor color' })}
            </span>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              {CURSOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => void pickCursorColor(color)}
                  disabled={savingCursor}
                  data-mol-id={`dashboard-cursor-${color}`}
                  aria-label={t(
                    'dashboard.cursorColor',
                    { color },
                    { defaultValue: 'Pick cursor color {{color}}' },
                  )!}
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    'border-2 transition-transform hover:scale-110 disabled:opacity-60',
                  )}
                  style={{
                    backgroundColor: color,
                    borderColor: color === cursorColor ? 'var(--color-text)' : 'transparent',
                  }}
                ></button>
              ))}
            </div>
            <span
              data-mol-id="dashboard-cursor-current"
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {cursorColor.toUpperCase()}
            </span>
          </div>
        </aside>

        <section className={cm.cn('col-span-9', cm.stack(8))}>
          {hero && (
            <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
              <ProjectHeroCard
                project={{
                  id: hero.id,
                  title: hero.title,
                  activeCollaborators: hero.collaborators.filter((c) => c.online).length,
                  updatedLabel: hero.updatedLabel,
                  projectCode: hero.folder?.toUpperCase(),
                  activeTool: t('dashboard.heroActiveTool', {}, { defaultValue: 'Pen tool' })!,
                }}
              />
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', justify: 'between' }),
                  cm.sp('p', 6),
                  cm.stack(4),
                  'lg:col-span-4 bg-surface-container-lowest rounded-[2rem] shadow-sm border border-outline-variant/30',
                )}
                data-mol-id="dashboard-activity-card"
              >
                <div className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
                  </span>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {t('dashboard.activityTitle', {}, { defaultValue: 'What changed today' })}
                  </h3>
                </div>
                {activity.length === 0 ? (
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                    data-mol-id="dashboard-activity-empty"
                  >
                    {t(
                      'dashboard.activityEmpty',
                      {},
                      { defaultValue: 'No recent activity yet — invite a teammate to start.' },
                    )}
                  </p>
                ) : (
                  <div className={cm.stack(3)} data-mol-id="dashboard-activity-list">
                    {activity.map((item) => (
                      <ActivityFeedItem
                        key={item.id}
                        item={{
                          id: item.id,
                          kind: (item.kind as ActivityKind) ?? 'comment',
                          actorName: item.actor_name ?? APP_NAME,
                          actorColor: item.actor_color ?? '#7c3aed',
                          sentence: item.sentence ?? '',
                          target: item.target_label ?? undefined,
                          targetHref: item.target_href ?? undefined,
                          preview: item.preview ?? undefined,
                          timeLabel: relativeTime(item.created_at),
                          unread: item.unread,
                        }}
                      />
                    ))}
                  </div>
                )}
                <Link
                  to="/notifications"
                  data-mol-id="dashboard-activity-view-all"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'text-primary hover:underline',
                  )}
                >
                  {t('dashboard.activityViewAll', {}, { defaultValue: 'See all notifications' })}
                  <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          )}

          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
              data-mol-id="dashboard-grid-title"
            >
              {loading
                ? t('dashboard.loadingTitle', {}, { defaultValue: 'Loading projects…' })
                : t(
                    'dashboard.gridTitle',
                    { count: filtered.length },
                    { defaultValue: '{{count}} projects' },
                  )}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant',
              )}
            >
              {t('dashboard.sortedBy', {}, { defaultValue: 'Sorted by recently updated' })}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div
              data-mol-id="dashboard-empty"
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
                draw
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'))}>
                {t('dashboard.empty.title', {}, { defaultValue: 'No matching projects' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {t(
                  'dashboard.empty.body',
                  {},
                  { defaultValue: 'Try a different search or start a fresh canvas.' },
                )}
              </p>
            </div>
          ) : (
            <div
              className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}
              data-mol-id="dashboard-projects-grid"
            >
              {filtered.map((p) => (
                <div key={p.id} data-mol-id={`dashboard-project-${p.id}`}>
                  <ProjectCard project={p} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DesignCanvasLayout>
  )
}

export default Dashboard
