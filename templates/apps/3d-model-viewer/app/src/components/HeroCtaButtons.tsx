import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function HeroCtaButtons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [, setDemoOpen] = useState(false)
  return (
    <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 4 }), cm.sp('mt', 2))}>
      <Link
        className={cm.cn(
          'primary-gradient text-on-primary px-8 py-3 rounded-xl text-base font-semibold shadow-ambient hover:shadow-lg transform hover:scale-[0.98] transition-all',
        )}
        to="/signup"
      >
        {t('heroCta.getStarted', {}, { defaultValue: 'Get Started' })}
      </Link>
      <button
        onClick={() => setDemoOpen(true)}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('px', 8),
          cm.sp('py', 3),
          cm.textSize('base'),
          cm.fontWeight('medium'),
          'ghost-border bg-surface-container-low text-on-surface hover:bg-surface-container rounded-xl transition-all',
        )}
      >
        <span className="material-symbols-outlined" data-icon="play_circle">
          play_circle
        </span>
        {t('heroCta.watchDemo', {}, { defaultValue: 'Watch Demo' })}
      </button>
    </div>
  )
}

export default HeroCtaButtons
export { HeroCtaButtons }
