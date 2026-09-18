import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface HeroCopyProps {
  modelCount?: number | null
}
function HeroCopy({ modelCount }: HeroCopyProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.w('full'), cm.flex({ direction: 'col', gap: 8 }), 'lg:w-5/12')}>
      <h1
        className={cm.cn(
          cm.textSize('5xl'),
          'md:text-[3.5rem] leading-tight font-headline font-extrabold tracking-[-0.02em] text-on-surface',
        )}
      >
        {t('heroCopy.headline', {}, { defaultValue: 'Every surface tells a story' })}
      </h1>
      <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant font-body')}>
        {t(
          'heroCopy.description',
          {},
          {
            defaultValue:
              'The premium 3D model viewer designed for creators. Annotate, embed, and showcase your work with uncompromising visual fidelity.',
          },
        )}
      </p>
      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 4 }), cm.sp('mt', 2))}>
        <Link
          className={cm.cn(
            'primary-gradient text-on-primary px-8 py-3 rounded-xl text-base font-semibold shadow-ambient hover:shadow-lg transform hover:scale-[0.98] transition-all',
          )}
          to="/signup"
        >
          {t('heroCopy.getStarted', {}, { defaultValue: 'Get Started' })}
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 8),
            cm.sp('py', 3),
            cm.textSize('base'),
            cm.fontWeight('medium'),
            'ghost-border bg-surface-container-low text-on-surface hover:bg-surface-container rounded-xl transition-all',
          )}
          to="/models"
        >
          <span className="material-symbols-outlined" data-icon="play_circle">
            play_circle
          </span>
          {t('heroCopy.watchDemo', {}, { defaultValue: 'Watch Demo' })}
        </Link>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 4 }),
          cm.sp('mt', 4),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.flex(), '-space-x-2')}>
          <img
            alt=""
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'border-2 border-surface object-cover',
            )}
            data-alt="Close up portrait of a young woman with natural makeup looking at camera"
            src="https://picsum.photos/seed/HeroCopy-1/1200/800"
          />
          <img
            alt=""
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'border-2 border-surface object-cover',
            )}
            data-alt="Close up portrait of a young man with a slight smile looking at camera"
            src="https://picsum.photos/seed/HeroCopy-2/1200/800"
          />
          <img
            alt=""
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'border-2 border-surface object-cover',
            )}
            data-alt="Close up portrait of a smiling woman looking at camera"
            src="https://picsum.photos/seed/HeroCopy-3/1200/800"
          />
        </span>
        <span>
          {t(
            'heroCopy.joinCreators',
            { count: modelCount != null ? modelCount.toLocaleString() : '10,000' },
            { defaultValue: 'Join {{count}}+ creators' },
          )}
        </span>
      </div>
    </div>
  )
}

export default HeroCopy
export { HeroCopy }
