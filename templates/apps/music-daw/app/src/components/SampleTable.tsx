import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Sample {
  id: string
  name: string
  pack: string
  bpm: number
  key: string
  duration_seconds: number
  category: string
  cover_index: number
  is_loop?: boolean
  added_at?: string
}

interface SampleTableProps {
  samples: Sample[]
  /** Currently-previewing id — gets the violet pulse + filled play disk. */
  previewId?: string
  /** Hide the BPM column on narrow viewports. Defaults to true. */
  showBpm?: boolean
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

const CATEGORY_COLOR: Record<string, string> = {
  drums: 'text-rose-400',
  bass: 'text-amber-400',
  synth: 'text-violet-400',
  vocal: 'text-cyan-400',
  fx: 'text-emerald-400',
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Editorial sample-library table — uppercase 10px column headers,
 * hover row tint, inline preview disk, key + BPM tags, loop badge,
 * tabular monospaced duration.
 *
 * Translated from music-streaming's TrackTable.tsx pattern (uppercase
 * tracking-widest headers, hover row, divide-y separators), recoloured
 * with Fugue's lane-color category palette and re-spec'd for sample
 * metadata (key, BPM, pack, loop indicator).
 */
export function SampleTable({ samples, previewId, showBpm = true }: SampleTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (samples.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('sampleTable.empty', {}, { defaultValue: 'No samples in this section yet.' })}
      </p>
    )
  }

  return (
    <div className={cm.cn('overflow-hidden rounded-2xl bg-surface-container-lowest')}>
      <div
        className={cm.cn(
          'hidden md:flex items-center gap-4 px-4 py-3 border-b border-outline-variant text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        <span className={cm.cn('w-10 shrink-0')} aria-hidden="true" />
        <span className={cm.cn('flex-1 min-w-0')}>
          {t('sampleTable.colName', {}, { defaultValue: 'Sample' })}
        </span>
        <span className={cm.cn('hidden lg:block w-32 shrink-0')}>
          {t('sampleTable.colPack', {}, { defaultValue: 'Pack' })}
        </span>
        <span className={cm.cn('hidden lg:block w-20 shrink-0')}>
          {t('sampleTable.colKey', {}, { defaultValue: 'Key' })}
        </span>
        {showBpm && (
          <span className={cm.cn('hidden md:block w-20 shrink-0 tabular-nums')}>
            {t('sampleTable.colBpm', {}, { defaultValue: 'BPM' })}
          </span>
        )}
        <span className={cm.cn('w-16 shrink-0 text-right')}>
          <span
            className={cm.cn('material-symbols-outlined text-base align-middle')}
            aria-hidden="true"
          >
            schedule
          </span>
        </span>
      </div>

      <ul className={cm.cn('divide-y divide-outline-variant/50')}>
        {samples.map((s) => {
          const gradient = COVER_GRADIENTS[s.cover_index % COVER_GRADIENTS.length]
          const isPreviewing = previewId === s.id
          const categoryColor = CATEGORY_COLOR[s.category] ?? 'text-primary'
          return (
            <li
              key={s.id}
              className={cm.cn(
                'group flex items-center gap-4 px-4 py-3 hover:bg-surface-container transition-colors',
                isPreviewing ? 'bg-surface-container/40' : '',
              )}
            >
              <Link
                to={`/samples/${s.id}`}
                className={cm.cn(
                  'w-10 h-10 rounded-md shrink-0 flex items-center justify-center relative shadow',
                )}
                style={{ background: gradient }}
                aria-label={t(
                  'sampleTable.previewAria',
                  { name: s.name },
                  { defaultValue: 'Preview {{name}}' },
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-[18px] text-white/70 group-hover:hidden',
                  )}
                >
                  graphic_eq
                </span>
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-[20px] text-white hidden group-hover:inline',
                  )}
                >
                  play_arrow
                </span>
                {isPreviewing && (
                  <span
                    className={cm.cn(
                      'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse',
                    )}
                    aria-hidden="true"
                  />
                )}
              </Link>
              <div className={cm.cn('flex-1 min-w-0')}>
                <Link
                  to={`/samples/${s.id}`}
                  className={cm.cn(
                    'text-sm font-semibold truncate block',
                    isPreviewing ? 'text-primary' : 'text-on-surface',
                  )}
                >
                  {s.name}
                </Link>
                <p
                  className={cm.cn(
                    'text-[11px] truncate',
                    categoryColor,
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider',
                  )}
                >
                  {s.category}
                  {s.is_loop && (
                    <span
                      className={cm.cn(
                        'ml-2 inline-flex items-center px-1.5 py-px rounded text-[9px] font-black uppercase tracking-widest bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {t('sampleTable.loopBadge', {}, { defaultValue: 'Loop' })}
                    </span>
                  )}
                </p>
              </div>
              <span
                className={cm.cn(
                  'hidden lg:block w-32 shrink-0 truncate text-sm text-on-surface-variant',
                )}
              >
                {s.pack}
              </span>
              <span
                className={cm.cn(
                  'hidden lg:block w-20 shrink-0 text-sm font-mono tabular-nums text-on-surface',
                )}
              >
                {s.key}
              </span>
              {showBpm && (
                <span
                  className={cm.cn(
                    'hidden md:block w-20 shrink-0 text-sm font-mono tabular-nums text-on-surface-variant',
                  )}
                >
                  {s.bpm}
                </span>
              )}
              <span
                className={cm.cn(
                  'w-16 shrink-0 text-right text-xs text-on-surface-variant font-mono tabular-nums',
                )}
              >
                {fmtDuration(s.duration_seconds)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
