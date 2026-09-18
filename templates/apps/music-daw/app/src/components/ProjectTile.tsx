import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Project {
  id: string
  name: string
  bpm: number
  time_signature: string
  cover_index: number
  duration_seconds: number
  track_count: number
  last_edited?: string
  is_pinned?: boolean
}

interface ProjectGridProps {
  projects: Project[]
  /** Limit number of cards rendered. */
  limit?: number
  /** ID of the currently-active session — gets the "live" pulse pip. */
  activeId?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
]

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Cover-art grid for project tiles — gradient cover with animated
 * waveform "bars" glyph, hover play overlay, BPM/duration chip strip,
 * pinned + live indicators.
 *
 * Translated from music-streaming's PlaylistGrid.tsx — same overall
 * shape (gradient cover + glyph + hover play disk), recoloured per
 * Fugue's track lane palette and re-spec'd for DAW project metadata
 * (BPM, time signature, duration, track count).
 */
export function ProjectGrid({ projects, limit, activeId }: ProjectGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = typeof limit === 'number' ? projects.slice(0, limit) : projects

  if (visible.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.sp('py', 16),
          cm.textCenter,
          'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
          aria-hidden="true"
        >
          folder_open
        </span>
        <p className={cm.cn(cm.sp('mt', 4), 'text-base font-semibold text-on-surface')}>
          {t('projectGrid.emptyTitle', {}, { defaultValue: 'No projects yet' })}
        </p>
        <p className={cm.cn(cm.sp('mt', 1), 'text-sm text-on-surface-variant')}>
          {t(
            'projectGrid.emptyBody',
            {},
            { defaultValue: 'Spin up a new arrangement to get started.' },
          )}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.grid({ gap: 'lg' }),
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      )}
    >
      {visible.map((p) => {
        const gradient = COVER_GRADIENTS[p.cover_index % COVER_GRADIENTS.length]
        const isActive = activeId === p.id
        return (
          <Link key={p.id} to={`/projects/${p.id}`} className={cm.cn('group block')}>
            <div className={cm.cn('relative')}>
              <div
                className={cm.cn(
                  'aspect-square rounded-2xl shadow-md group-hover:shadow-2xl group-hover:shadow-on-surface/15 transition-all overflow-hidden flex items-center justify-center relative',
                )}
                style={{ background: gradient }}
                aria-hidden="true"
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-[80px] text-white/40 group-hover:scale-110 transition-transform',
                  )}
                >
                  graphic_eq
                </span>
                {p.is_pinned && (
                  <span
                    className={cm.cn(
                      'absolute top-2 left-2 w-7 h-7 rounded-full bg-foreground/40 backdrop-blur-md text-white flex items-center justify-center',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      push_pin
                    </span>
                  </span>
                )}
                {isActive && (
                  <span
                    className={cm.cn(
                      'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-error text-on-error shadow flex items-center gap-1',
                    )}
                  >
                    <span
                      className={cm.cn('w-1.5 h-1.5 rounded-full bg-on-error animate-pulse')}
                      aria-hidden="true"
                    />
                    {t('status.live', {}, { defaultValue: 'Live' })}
                  </span>
                )}
                <div
                  className={cm.cn(
                    'absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end pb-3 pr-3',
                  )}
                >
                  <div
                    className={cm.cn(
                      'w-12 h-12 rounded-full bg-surface shadow-lg flex items-center justify-center',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[28px] text-on-surface')}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={cm.cn('mt-3')}>
              {p.last_edited && (
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {p.last_edited}
                </p>
              )}
              <h3
                className={cm.cn(
                  'text-sm font-extrabold tracking-tight text-on-surface line-clamp-1 mt-0.5 group-hover:text-primary transition-colors',
                )}
              >
                {p.name}
              </h3>
              <div
                className={cm.cn(
                  'flex items-center gap-2 mt-1.5 text-[11px] text-on-surface-variant font-mono tabular-nums',
                )}
              >
                <span>{p.bpm} BPM</span>
                <span aria-hidden="true">·</span>
                <span>{p.time_signature}</span>
                <span aria-hidden="true">·</span>
                <span>{fmtDuration(p.duration_seconds)}</span>
              </div>
              <p className={cm.cn('text-[11px] text-on-surface-variant mt-0.5')}>
                {t(
                  'projectGrid.trackCount',
                  { count: p.track_count },
                  { defaultValue: '{{count}} tracks' },
                )}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
