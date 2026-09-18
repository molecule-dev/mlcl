import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function HeroSocialProof() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
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
          src="https://picsum.photos/seed/HeroSocialProof-1/1200/800"
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
          src="https://picsum.photos/seed/HeroSocialProof-2/1200/800"
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
          src="https://picsum.photos/seed/HeroSocialProof-3/1200/800"
        />
      </span>
      <span>
        {t('heroSocialProof.joinCreators', {}, { defaultValue: 'Join 10,000+ creators' })}
      </span>
    </div>
  )
}

export default HeroSocialProof
export { HeroSocialProof }
