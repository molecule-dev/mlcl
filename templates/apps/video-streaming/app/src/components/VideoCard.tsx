import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VideoCardData {
  id: string
  title: string
  channel_id: string
  channel_name: string
  channel_avatar_index?: number
  duration_seconds: number
  view_count: number
  published_at: string
  cover_index: number
  thumbnail_url?: string | null
  live?: boolean
  watch_progress_seconds?: number
}

interface VideoCardProps {
  video: VideoCardData
  /** Optional eyebrow chip (used by the watch-up-next rail). */
  eyebrow?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #db2777 50%, #9d174d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #155e75 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f43f5e 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #c026d3 100%)',
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
]

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days > 365) return `${Math.floor(days / 365)}y ago`
  if (days > 30) return `${Math.floor(days / 30)}mo ago`
  if (days > 0) return `${days}d ago`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

/**
 * Editorial video tile — gradient thumbnail with `play_circle` glyph,
 * live/duration chips bottom-right, watch-progress sliver at the
 * bottom edge, channel avatar + meta beneath. Rounded-2xl thumbnail
 * with hover scale.
 *
 * Translated from podcast's ShowGrid card pattern (gradient cover +
 * material glyph + hover play disk overlay) recoloured with Spool's
 * violet/rose palette and adapted for video duration + view metadata.
 */
export function VideoCard({ video, eyebrow }: VideoCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const thumbGradient = COVER_GRADIENTS[video.cover_index % COVER_GRADIENTS.length]
  const avatarGradient =
    AVATAR_GRADIENTS[(video.channel_avatar_index ?? video.cover_index) % AVATAR_GRADIENTS.length]
  const progress =
    video.watch_progress_seconds && video.duration_seconds > 0
      ? Math.min(1, video.watch_progress_seconds / video.duration_seconds)
      : 0

  return (
    <Link to={`/watch/${video.id}`} className={cm.cn('group block')}>
      <div className={cm.cn('relative')}>
        <div
          className={cm.cn(
            'relative aspect-video rounded-2xl overflow-hidden shadow-md group-hover:shadow-2xl group-hover:shadow-on-surface/15 transition-all flex items-center justify-center',
          )}
          style={{ background: thumbGradient }}
          aria-hidden="true"
        >
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt=""
              className={cm.cn(
                'absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300',
              )}
            />
          ) : (
            <span
              className={cm.cn(
                'material-symbols-outlined text-[64px] text-white/35 group-hover:scale-110 transition-transform',
              )}
            >
              play_circle
            </span>
          )}

          {eyebrow && (
            <span
              className={cm.cn(
                'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-surface/85 text-on-surface shadow',
              )}
            >
              {eyebrow}
            </span>
          )}

          {video.live ? (
            <span
              className={cm.cn(
                'absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-error text-on-error shadow-lg',
              )}
            >
              <span
                className={cm.cn('w-1.5 h-1.5 rounded-full bg-surface animate-pulse')}
                aria-hidden="true"
              />
              {t('status.live', {}, { defaultValue: 'Live' })}
            </span>
          ) : (
            <span
              className={cm.cn(
                'absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums bg-foreground/75 text-white shadow',
              )}
            >
              {fmtDuration(video.duration_seconds)}
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
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
          </div>

          {progress > 0 && (
            <div className={cm.cn('absolute inset-x-0 bottom-0 h-[3px] bg-foreground/40')}>
              <div
                className={cm.cn('h-full bg-primary')}
                style={{ width: `${progress * 100}%` }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      <div className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.sp('mt', 3))}>
        <div
          className={cm.cn('w-9 h-9 rounded-full shrink-0 flex items-center justify-center shadow')}
          style={{ background: avatarGradient }}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined text-[18px] text-white/90')}>
            person
          </span>
        </div>
        <div className={cm.cn('flex-1 min-w-0')}>
          <h3
            className={cm.cn(
              'text-sm font-semibold tracking-tight text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors',
            )}
          >
            {video.title}
          </h3>
          <p className={cm.cn('text-xs text-on-surface-variant mt-1 truncate')}>
            {video.channel_name}
          </p>
          <div
            className={cm.cn(
              'flex items-center gap-1.5 mt-0.5 text-[11px] text-on-surface-variant',
            )}
          >
            <span className={cm.cn('tabular-nums')}>
              {t(
                'common.countViews',
                { count: fmtViews(video.view_count) },
                { defaultValue: '{{count}} views' },
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span>{timeAgo(video.published_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export type { VideoCardData }
