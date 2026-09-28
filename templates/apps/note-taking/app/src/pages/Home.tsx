import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type VersoNote, VersoNoteCard } from '../components/VersoNoteCard.js'
import { formatUpdatedAt, useDefaultWorkspace, useWorkspacePages } from '../lib/api.js'

const MAX_RECENTS = 6

/**
 * Home / today screen — real greeting from the auth user, real recent
 * notes pulled from `/api/pages?workspace_id=...`. Empty state offers a
 * CTA to start the first note.
 */
export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()
  const { workspace, loading: wsLoading, error: wsError } = useDefaultWorkspace()
  const { pages, loading, error: pagesError, createPage } = useWorkspacePages(workspace?.id)
  const fetchError = wsError ?? pagesError

  const greetingName =
    user?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    t('home.guest', {}, { defaultValue: 'friend' })

  const sorted = useMemo(
    () => [...pages].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [pages],
  )

  const recents: VersoNote[] = useMemo(
    () =>
      sorted.slice(0, MAX_RECENTS).map((p) => ({
        id: p.id,
        title: p.title || t('status.untitled', {}, { defaultValue: 'Untitled' }),
        excerpt: '',
        updatedAtLabel: formatUpdatedAt(p.updated_at),
        notebook: workspace?.name,
        tags: [],
        backlinkCount: 0,
        wordCount: 0,
        pinned: p.is_favorited,
      })),
    [sorted, workspace?.name, t],
  )

  const favorites: VersoNote[] = useMemo(
    () =>
      sorted
        .filter((p) => p.is_favorited)
        .slice(0, 4)
        .map((p) => ({
          id: p.id,
          title: p.title || t('status.untitled', {}, { defaultValue: 'Untitled' }),
          excerpt: '',
          updatedAtLabel: formatUpdatedAt(p.updated_at),
          notebook: workspace?.name,
          tags: [],
          backlinkCount: 0,
          wordCount: 0,
          pinned: true,
        })),
    [sorted, workspace?.name, t],
  )

  const handleNewNote = async () => {
    if (!workspace?.id) return
    const created = await createPage({
      title: t('status.untitled', {}, { defaultValue: 'Untitled' }),
    })
    void track({ name: 'note.created', properties: { id: created.id } })
    navigate(`/notes/${created.id}`)
  }

  const showLoading = wsLoading || loading

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), 'mx-auto w-full max-w-7xl')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
          'gap-4 mb-8',
        )}
      >
        <div>
          <p
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
            )}
          >
            {t('status.today', {}, { defaultValue: 'Today' })}
          </p>
          <h1
            data-testid="home-greeting"
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
            style={{
              fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {t(
              'home.greeting',
              { name: greetingName },
              { defaultValue: 'Welcome back, {{name}}.' },
            )}
          </h1>
          <p className={cm.cn(cm.sp('mt', 2), 'text-base text-on-surface-variant max-w-xl')}>
            {t(
              'home.subtitle',
              {},
              { defaultValue: 'Pick up where you left off, or start a fresh note.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2.5),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl text-sm font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              search
            </span>
            <span>{t('common.search', {}, { defaultValue: 'Search' })}</span>
          </Link>
          <button
            type="button"
            onClick={handleNewNote}
            data-testid="new-note-button"
            disabled={!workspace?.id}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl text-sm font-bold text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              add
            </span>
            <span>{t('home.newNoteCta', {}, { defaultValue: 'New note' })}</span>
          </button>
        </div>
      </header>

      {/* Stats row — real counts */}
      {fetchError ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'mb-6 rounded-2xl border border-error/40 bg-error/5 text-on-surface',
          )}
        >
          {t(
            'home.loadError',
            { message: fetchError.message },
            { defaultValue: 'Could not load your notes: {{message}}' },
          )}
        </div>
      ) : null}
      <section className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4 mb-10')}>
        <Stat
          icon="description"
          label={t('form.notes', {}, { defaultValue: 'Notes' })}
          value={pages.length}
        />
        <Stat
          icon="push_pin"
          label={t('home.stats.pinned.label', {}, { defaultValue: 'Pinned' })}
          value={pages.filter((p) => p.is_favorited).length}
          tone="amber"
        />
        <Stat
          icon="schedule"
          label={t('home.stats.updatedToday.label', {}, { defaultValue: 'Updated today' })}
          value={pages.filter((p) => isSameDay(p.updated_at)).length}
          tone="emerald"
        />
        <Stat
          icon="folder_open"
          label={t('home.stats.notebook.label', {}, { defaultValue: 'Notebook' })}
          value={workspace?.name ? 1 : 0}
          tone="violet"
        />
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6 items-start')}>
        <div className={cm.cn('lg:col-span-2 space-y-4')}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn('text-2xl font-bold tracking-tight text-on-surface')}
              style={{
                fontFamily:
                  'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {t('home.recentHeading', {}, { defaultValue: 'Recently updated' })}
            </h2>
            <Link
              to="/notes"
              className={cm.cn(
                'inline-flex min-h-[40px] items-center text-sm font-semibold text-primary hover:opacity-80 transition-opacity',
              )}
            >
              {t('home.viewAll', {}, { defaultValue: 'View all notes' })}
            </Link>
          </div>
          <div className={cm.cn('space-y-3')} data-testid="home-recents">
            {showLoading && recents.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl border border-dashed border-outline-variant text-center text-on-surface-variant text-sm',
                )}
              >
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </div>
            ) : recents.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'rounded-2xl border border-dashed border-outline-variant text-center',
                )}
              >
                <p className={cm.cn('text-on-surface-variant')}>
                  {t('home.empty', {}, { defaultValue: 'No notes yet — start your first one.' })}
                </p>
                <button
                  type="button"
                  onClick={handleNewNote}
                  className={cm.cn(
                    'mt-3 inline-flex min-h-[40px] items-center text-sm font-bold text-primary hover:opacity-80 transition-opacity',
                  )}
                >
                  {t('home.startFirst', {}, { defaultValue: 'Start your first note →' })}
                </button>
              </div>
            ) : (
              recents.map((note) => <VersoNoteCard key={note.id} note={note} />)
            )}
          </div>
        </div>

        <aside className={cm.cn('space-y-4')}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn('text-2xl font-bold tracking-tight text-on-surface')}
              style={{
                fontFamily:
                  'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {t('home.favoritesHeading', {}, { defaultValue: 'Pinned' })}
            </h2>
          </div>
          <div className={cm.cn('space-y-3')} data-testid="home-favorites">
            {favorites.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant text-sm',
                )}
              >
                {t(
                  'home.noFavorites',
                  {},
                  { defaultValue: 'Pin a note in the editor to keep it here.' },
                )}
              </div>
            ) : (
              favorites.map((note) => <VersoNoteCard key={note.id} note={note} density="compact" />)
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: string
  label: string
  value: number | string
  tone?: 'amber' | 'emerald' | 'violet'
}) {
  const cm = getClassMap()
  const toneAccent =
    tone === 'amber'
      ? 'var(--color-amber-500)'
      : tone === 'emerald'
        ? 'var(--color-emerald-500)'
        : tone === 'violet'
          ? 'var(--color-violet-500)'
          : 'var(--color-primary)'
  const toneText =
    tone === 'amber'
      ? 'text-warning'
      : tone === 'emerald'
        ? 'text-success'
        : tone === 'violet'
          ? 'text-violet-600'
          : 'text-primary'
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: toneAccent }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-3')}>
        <span
          className={cm.cn('material-symbols-outlined text-[20px]', toneText)}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        <span className={cm.cn(cm.accentCardLabel({ tone: 'custom' }))}>{label}</span>
      </div>
      <p
        className={cm.cn('text-3xl font-extrabold tabular-nums text-on-surface')}
        style={{
          fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
        }}
      >
        {value}
      </p>
    </div>
  )
}

function isSameDay(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default Home
