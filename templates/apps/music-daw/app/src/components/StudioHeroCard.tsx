import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface StudioHeroProject {
  id: string
  name: string
  bpm: number
  time_signature: string
  track_count: number
  duration_seconds: number
  cover_index: number
  last_edited?: string
}

interface StudioHeroCardProps {
  /** Last-touched or pinned project. `null` shows the empty studio state. */
  project: StudioHeroProject | null
  /** Optional eyebrow ("Last session", "Currently arranging"). */
  eyebrow?: string
  /** Optional badge pill ("Auto-saved 3m ago"). */
  statusLabel?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 50%, #831843 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #155e75 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #9a3412 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #14532d 100%)',
  'linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #713f12 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #c026d3 100%)',
]

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Cinematic studio hero card — left column has eyebrow + huge project
 * name + transport meta strip (tracks · BPM · sig · duration) + Open
 * studio / View mixer CTAs, right column has a frosted-glass square
 * with a stylised waveform glyph and a floating play disk.
 *
 * Translated from music-streaming's NowPlayingHeroCard.tsx, swapping
 * the track/artist semantic for project/duration and recoloured with
 * Fugue's neon-violet → pink studio palette.
 */
export function StudioHeroCard({ project, eyebrow, statusLabel }: StudioHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!project) {
    return (
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white shadow-2xl')}
        style={{ background: COVER_GRADIENTS[0], minHeight: '320px' }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 p-10 flex flex-col justify-center min-h-[320px]')}>
          <p
            className={cm.cn('text-[11px] font-black uppercase tracking-widest text-white/70 mb-3')}
          >
            {t('studioHeroCard.idleEyebrow', {}, { defaultValue: 'Studio · Empty' })}
          </p>
          <h2 className={cm.cn('text-4xl font-extrabold tracking-tight mb-3')}>
            {t('studioHeroCard.idleHeadline', {}, { defaultValue: 'Start your first arrangement' })}
          </h2>
          <p className={cm.cn('text-base text-white/80 max-w-md leading-relaxed mb-8')}>
            {t(
              'studioHeroCard.idleBody',
              {},
              {
                defaultValue:
                  'Spin up a project, drop in samples, layer instruments. Every edit non-destructive — every save undoable.',
              },
            )}
          </p>
          <Link
            to="/projects"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 py-3 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg w-fit',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('studioHeroCard.idleCta', {}, { defaultValue: 'Create a project' })}
          </Link>
        </div>
      </section>
    )
  }

  const gradient = COVER_GRADIENTS[project.cover_index % COVER_GRADIENTS.length]
  const headerEyebrow =
    eyebrow ?? t('studioHeroCard.defaultEyebrow', {}, { defaultValue: 'Last session' })

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10',
      )}
      style={{ background: gradient, minHeight: '380px' }}
    >
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute right-12 top-12 w-20 h-20 rounded-full bg-foreground/10 blur-2xl',
        )}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[380px]',
        )}
      >
        <div className={cm.cn('lg:col-span-7')}>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
              )}
            >
              {headerEyebrow}
            </span>
            <span
              className={cm.cn('text-[11px] font-black uppercase tracking-widest text-white/80')}
            >
              {project.last_edited ?? t('studioHeroCard.justNow', {}, { defaultValue: 'Just now' })}
            </span>
            {statusLabel && (
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>

          <h2
            className={cm.cn(
              'text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mt-4',
            )}
          >
            {project.name}
          </h2>

          <div
            className={cm.cn(
              'mt-5 flex items-center gap-6 flex-wrap text-[13px] text-white/85 font-mono tabular-nums',
            )}
          >
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                view_stream
              </span>
              {t(
                'studioHeroCard.trackCount',
                { count: project.track_count },
                { defaultValue: '{{count}} tracks' },
              )}
            </span>
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                speed
              </span>
              {project.bpm} BPM
            </span>
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                timer
              </span>
              {project.time_signature}
            </span>
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                schedule
              </span>
              {fmtDuration(project.duration_seconds)}
            </span>
          </div>

          <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
            <Link
              to={`/projects/${project.id}`}
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3.5 mt-7 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                play_arrow
              </span>
              {t('studioHeroCard.openCta', {}, { defaultValue: 'Open studio' })}
            </Link>
            <Link
              to={`/projects/${project.id}/mix`}
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3.5 mt-7 font-semibold text-[15px] rounded-full border border-surface/30 hover:bg-surface/10 transition-colors',
              )}
            >
              {t('studioHeroCard.mixCta', {}, { defaultValue: 'View mixer' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                tune
              </span>
            </Link>
          </div>
        </div>

        <div className={cm.cn('lg:col-span-5 flex justify-center lg:justify-end')}>
          <div className={cm.cn('relative')}>
            <div
              className={cm.cn(
                'w-56 h-56 lg:w-64 lg:h-64 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center',
              )}
              style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)' }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-[120px] text-white/90')}>
                graphic_eq
              </span>
            </div>
            <div
              className={cm.cn(
                'absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-surface shadow-xl flex items-center justify-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[36px] text-on-surface')}>
                play_arrow
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
