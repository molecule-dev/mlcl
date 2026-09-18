import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { VideoCardData } from './VideoCard.js'
import { VideoCard } from './VideoCard.js'

interface VideoGridProps {
  videos: VideoCardData[]
  /** Limit number of cards rendered. */
  limit?: number
  /** Optional eyebrow chip applied to the first card (used for "Up next" highlight). */
  highlightFirstEyebrow?: string
  /** Empty-state caption. */
  emptyMessage?: string
}

/**
 * Responsive video grid — 1/2/3/4 columns by breakpoint per the
 * Spool DESIGN.md spec ("4 desktop / 3 laptop / 2 tablet / 1 mobile").
 * Used by Home, Subscriptions, Trending, Search results, Watch
 * recommendations, Channel video tabs, and PlaylistDetail.
 *
 * Translated from podcast's ShowGrid wrapping pattern but with a
 * video-card aspect ratio (16:9 instead of 1:1) and the Spool grid
 * column counts.
 */
export function VideoGrid({ videos, limit, highlightFirstEyebrow, emptyMessage }: VideoGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = typeof limit === 'number' ? videos.slice(0, limit) : videos

  if (visible.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {emptyMessage ?? t('videoGrid.empty', {}, { defaultValue: 'Nothing here yet.' })}
      </p>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.grid({ gap: 'lg' }),
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      )}
    >
      {visible.map((video, idx) => (
        <VideoCard
          key={video.id}
          video={video}
          eyebrow={idx === 0 ? highlightFirstEyebrow : undefined}
        />
      ))}
    </div>
  )
}
