import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function BotDeployAnalyticsTeaser() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { id } = useParams<{ id: string }>()
  return (
    <footer
      className={cm.cn(
        cm.sp('mt', 12),
        cm.sp('p', 8),
        cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
        'bg-gradient-to-br from-on-background to-inverse-surface rounded-[2rem] text-white md:flex-row gap-6 overflow-hidden relative',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h3
          id="botDeployAnalyticsTeaser-title"
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'font-headline',
          )}
        >
          {t('botDeployAnalyticsTeaser.title', {}, { defaultValue: 'Monitor Performance' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.maxW('sm'), 'text-white/60')}>
          {t(
            'botDeployAnalyticsTeaser.description',
            {},
            {
              defaultValue:
                'Once deployed, you can track user interactions, satisfaction rates, and common queries in your real-time dashboard.',
            },
          )}
        </p>
        <Link
          className={cm.cn(
            'mt-6 px-8 py-3 bg-tertiary-fixed text-on-tertiary-fixed font-bold rounded-full text-sm hover:scale-105 transition-transform',
          )}
          to={id ? `/bots/${id}/analytics` : '/bots'}
        >
          {t('botDeployAnalyticsTeaser.viewAnalytics', {}, { defaultValue: 'View Analytics' })}
        </Link>
      </div>
      <div className={cm.cn(cm.w('full'), 'relative md:w-auto z-10')}>
        <img
          className={cm.cn(
            cm.w('full'),
            'md:w-80 h-48 object-cover rounded-2xl shadow-2xl rotate-3 transform hover:rotate-0 transition-all duration-700',
          )}
          alt="abstract bright colored data visualization charts and graphs on a high tech interface screen with dark background"
          src="https://picsum.photos/seed/BotDeployAnalyticsTeaser-1/1200/800"
        />
      </div>
      {/* Background decorative elements */}
      <div
        className={cm.cn(
          cm.w(64),
          cm.h(64),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-primary/20 blur-[100px]',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w(32),
          cm.h(32),
          cm.roundedFull,
          'absolute top-0 left-1/2 bg-tertiary/20 blur-[80px]',
        )}
      ></div>
    </footer>
  )
}

export default BotDeployAnalyticsTeaser
export { BotDeployAnalyticsTeaser }
