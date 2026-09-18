/**
 * Polished video card — 16:9 thumbnail with duration badge and hover overlay,
 * title in bold sm, view-count + relative-time meta row underneath.
 *
 * Translated from team-chat's MessagePreviewCard surface treatment, with the
 * visual richness of personal-finance/AccountTile (border accent + hover lift).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RecordingCardData {
  id: string | number
  title: string
  thumbnail_url?: string | null
  duration_seconds: number
  view_count: number
  visibility?: 'public' | 'private' | 'team' | string
  status?: 'ready' | 'processing' | 'live' | string
  author_name?: string | null
  created_at?: string
  posterEmoji?: string
}

interface RecordingCardProps {
  recording: RecordingCardData
  variant?: 'grid' | 'list'
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const statusColor: Record<string, string> = {
  ready: 'bg-emerald-500',
  processing: 'bg-amber-500',
  live: 'bg-red-500 animate-pulse',
}

const visibilityIcon: Record<string, string> = {
  public: 'public',
  private: 'lock',
  team: 'group',
}

export function RecordingCard({ recording, variant = 'grid' }: RecordingCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const status = recording.status ?? 'ready'
  const visibility = recording.visibility ?? 'private'

  return (
    <Link
      to={`/recordings/${recording.id}`}
      className={cm.cn(
        'group block rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden border border-outline-variant',
        variant === 'list' && 'flex',
      )}
    >
      <div
        className={cm.cn(
          'relative overflow-hidden bg-gradient-to-br from-[var(--color-brand-deep-a)] via-[var(--color-brand-deep-b)] to-[var(--color-brand-gradient-from)]',
          variant === 'grid' ? 'aspect-video w-full' : 'aspect-video w-56 flex-shrink-0',
        )}
      >
        {recording.thumbnail_url ? (
          <img
            src={recording.thumbnail_url}
            alt={recording.title}
            className={cm.cn(
              'absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105',
            )}
          />
        ) : (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'absolute inset-0 text-7xl',
            )}
          >
            <span aria-hidden="true">{recording.posterEmoji ?? '🎬'}</span>
          </div>
        )}
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-90',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(14),
              cm.h(14),
              'rounded-full bg-surface/95 text-[var(--color-brand-gradient-from)] shadow-xl',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-3xl')}>play_arrow</span>
          </span>
        </div>
        <span
          className={cm.cn(
            'absolute bottom-2 right-2 rounded-md bg-foreground/75 text-white text-[11px] font-mono font-semibold px-2 py-0.5',
          )}
        >
          {formatDuration(recording.duration_seconds)}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            'absolute top-2 left-2 rounded-full bg-foreground/55 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1',
          )}
        >
          <span
            className={cm.cn(
              cm.w(2),
              cm.h(2),
              cm.roundedFull,
              statusColor[status] ?? 'bg-border-secondary',
            )}
          />
          {t(`recording.status.${status}`, {}, { defaultValue: status })}
        </span>
      </div>
      <div className={cm.cn(cm.sp('p', 4), cm.flex1, cm.stack(1))}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'text-on-surface line-clamp-2 leading-snug',
          )}
        >
          {recording.title}
        </h3>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>visibility</span>
            {t(
              'recording.viewCount',
              { count: recording.view_count },
              { defaultValue: '{{count}} views' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>
              {visibilityIcon[visibility] ?? 'lock'}
            </span>
            {formatRelative(recording.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}
