/**
 * Recording grid tile — 16:9 thumbnail with gradient overlay, duration pill
 * bottom-right, play button on hover, title/timestamp/host metadata below.
 *
 * Translated from blog/ArticleListItem.tsx (editorial card pattern) and
 * the polished §3.x media-tile recipes — solid radius, subtle shadow,
 * hover lift, frosted-glass duration pill.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RecordingTileProps {
  id: string
  title: string
  hostName: string
  recordedAtLabel: string
  durationMinutes: number
  thumbnailUrl?: string
  onPlay: () => void
  onShare?: () => void
}

export function RecordingTile({
  title,
  hostName,
  recordedAtLabel,
  durationMinutes,
  thumbnailUrl,
  onPlay,
  onShare,
}: RecordingTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <article
      className={cm.cn(
        'group bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all',
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={t('recordingTile.play', {}, { defaultValue: 'Play recording' })}
        className={
          'relative w-full aspect-video block bg-gradient-to-br from-primary via-primary-dark to-secondary overflow-hidden'
        }
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className={
              'w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity'
            }
          />
        ) : (
          <>
            <div
              className={
                'absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-surface/15 blur-3xl'
              }
            />
            <div
              className={'absolute left-6 top-6 w-20 h-20 rounded-full bg-secondary/30 blur-2xl'}
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className={'absolute inset-0 flex items-center justify-center'}>
          <span
            className={
              'w-14 h-14 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform'
            }
          >
            <span className="material-symbols-outlined text-3xl text-primary">play_arrow</span>
          </span>
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            'absolute bottom-3 right-3 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-full bg-foreground/60 backdrop-blur-md text-white',
          )}
        >
          {t(
            'common.minutesMin',
            { minutes: durationMinutes },
            { defaultValue: '{{minutes}} min' },
          )}
        </span>
      </button>
      <div className={cm.cn(cm.sp('p', 5), cm.stack(2))}>
        <h3
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('semibold'),
            'text-on-surface line-clamp-2',
          )}
        >
          {title}
        </h3>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span>{hostName}</span>
          <span>{recordedAtLabel}</span>
        </div>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('mt', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            <span className={'material-symbols-outlined text-base'}>share</span>
            <span>{t('common.share', {}, { defaultValue: 'Share' })}</span>
          </button>
        )}
      </div>
    </article>
  )
}
