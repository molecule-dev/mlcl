import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function HeroSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.sp('px', 6), 'py-24 md:py-36 border-b border-outline-variant/10')}>
      <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.textCenter)}>
        <h1
          className={cm.cn(
            cm.sp('mb', 8),
            'font-headline text-6xl md:text-8xl lg:text-9xl tracking-tight leading-[0.9] text-on-surface',
          )}
        >
          {t('heroSection.headline', {}, { defaultValue: 'Human stories & ideas.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xl'),
            cm.maxW('2xl'),
            cm.mxAuto,
            cm.sp('mb', 10),
            'font-body md:text-2xl text-on-surface-variant italic',
          )}
        >
          {t(
            'heroSection.subtitle',
            {},
            { defaultValue: 'A place to read, write, and deepen your understanding' },
          )}
        </p>
        <Link to="/signup" className={cm.fvd454b8c2}>
          {t('heroSection.cta', {}, { defaultValue: 'Start reading' })}
        </Link>
      </div>
    </section>
  )
}

export default HeroSection
export { HeroSection }
