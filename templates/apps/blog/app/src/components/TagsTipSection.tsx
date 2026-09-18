import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function TagsTipSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-2xl editorial-shadow md:flex-row',
      )}
    >
      <div className={cm.cn(cm.flex1, cm.stack(4))}>
        <div
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'inline-flex items-center bg-primary-container text-on-primary-container uppercase tracking-wider',
          )}
        >
          {t('tagsTipSection.badge', {}, { defaultValue: "Editor's Tip" })}
        </div>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.textPrimary)}>
          {t('tagsTipSection.heading', {}, { defaultValue: 'Consistency leads to discovery' })}
        </h3>
        <p className={cm.cn(cm.maxW('xl'), cm.textMuted, 'leading-relaxed')}>
          {t(
            'tagsTipSection.body',
            {},
            {
              defaultValue:
                'Merging similar tags into primary categories helps your readers find related content more easily. Aim for descriptive, broad tags for high-level navigation and specific tags for niche topics.',
            },
          )}
        </p>
      </div>
      <div
        className={cm.cn(cm.w('full'), cm.h(40), 'md:w-64 rounded-xl overflow-hidden shadow-2xl')}
      >
        <img
          alt=""
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          data-alt="Minimal aesthetic workspace with a white laptop, ceramic cup, and a stack of clean notebooks on a textured gray desk"
          src="https://picsum.photos/seed/TagsTipSection-1/1200/800"
        />
      </div>
    </div>
  )
}

export default TagsTipSection
export { TagsTipSection }
