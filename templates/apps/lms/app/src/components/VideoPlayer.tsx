import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Lesson video stage on the course-detail page.
 *
 * The schema has no video assets, so this is a deliberate "no media
 * yet" placeholder rather than a fake stock image with non-functional
 * controls. When video infrastructure ships, this component should
 * accept a `videoUrl` / `posterUrl` prop and render the real player.
 */
function VideoPlayer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        'relative aspect-video rounded-xl overflow-hidden shadow-md border border-outline-variant/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
      )}
      data-mol-id="video-player"
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 3 }),
          'absolute inset-0 text-white text-center px-8',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-[64px] opacity-70')}
          data-icon="play_circle"
        >
          play_circle
        </span>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t('videoPlayer.placeholderTitle', {}, { defaultValue: 'No video for this lesson yet' })}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'opacity-70 max-w-md')}>
          {t(
            'videoPlayer.placeholderDescription',
            {},
            {
              defaultValue:
                'Read the lesson notes below — video content will appear here once your instructor uploads it.',
            },
          )}
        </p>
      </div>
    </div>
  )
}

export default VideoPlayer
export { VideoPlayer }
