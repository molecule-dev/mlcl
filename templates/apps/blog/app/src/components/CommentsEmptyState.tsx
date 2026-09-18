import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function CommentsEmptyState() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.textCenter,
        cm.sp('px', 6),
        'mt-20 py-20 bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20 hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 6),
          'bg-surface-container-highest',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('4xl'),
            'material-symbols-outlined text-on-surface-variant/40',
          )}
          data-icon="verified_user"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          verified_user
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          "font-['Newsreader'] text-on-surface",
        )}
      >
        {t('commentsEmptyState.heading', {}, { defaultValue: 'No Comments Yet' })}
      </h3>
      <p className={cm.cn(cm.maxW('sm'), cm.mxAuto, 'text-on-surface-variant')}>
        {t(
          'commentsEmptyState.description',
          {},
          { defaultValue: 'There are no comments to show right now.' },
        )}
      </p>
    </section>
  )
}

export default CommentsEmptyState
export { CommentsEmptyState }
