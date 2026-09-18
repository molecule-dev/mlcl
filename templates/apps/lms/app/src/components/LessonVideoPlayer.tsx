import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Lesson-page video stage. Same honest-placeholder treatment as the
 * dashboard's `<VideoPlayer>` — no fake stock image, no fake play
 * button. When real video assets arrive, swap in a real player here.
 */
function LessonVideoPlayer({
  duration,
  videoUrl: _videoUrl,
}: {
  duration?: string
  videoUrl?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('mb', 4),
        'relative aspect-video rounded-xl overflow-hidden shadow-md border border-outline-variant/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
      )}
      data-mol-id="lesson-video-player"
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
          {t(
            'lessonVideoPlayer.placeholderTitle',
            {},
            { defaultValue: 'No video for this lesson yet' },
          )}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'opacity-70 max-w-md')}>
          {t(
            'lessonVideoPlayer.placeholderDescription',
            {},
            {
              defaultValue:
                'Read the lesson notes below — video will appear here once your instructor uploads it.',
            },
          )}
        </p>
      </div>
      {duration ? (
        <div
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute bottom-4 right-4 bg-foreground/60 backdrop-blur-md rounded text-white',
          )}
        >
          {t('lessonVideoPlayer.duration', { duration }, { defaultValue: '{{duration}}' })}
        </div>
      ) : null}
    </div>
  )
}

export default LessonVideoPlayer
export { LessonVideoPlayer }
