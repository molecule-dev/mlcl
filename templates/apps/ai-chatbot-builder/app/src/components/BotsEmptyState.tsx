import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotsEmptyState() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        cm.sp('p', 16),
        cm.textCenter,
        'max-w-4xl',
        cm.mxAuto,
        'bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/20',
      )}
    >
      <div
        className={cm.cn(
          cm.w(48),
          cm.h(48),
          cm.sp('mb', 8),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-surface-container-highest overflow-hidden',
        )}
      >
        <img
          className={cm.cn(cm.w(32), cm.h(32), 'opacity-80 mix-blend-multiply')}
          alt=""
          data-alt="cute minimalist 3d robot character floating with a friendly digital face against a soft lavender background"
          src="https://picsum.photos/seed/BotsEmptyState-1/1200/800"
        />
      </div>
      <h2
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'text-on-surface tracking-tight',
        )}
      >
        {t('botsEmptyState.heading', {}, { defaultValue: 'No bots yet' })}
      </h2>
      <p
        className={cm.cn(
          cm.maxW('md'),
          cm.sp('mb', 10),
          cm.textSize('lg'),
          'text-on-surface-variant',
        )}
      >
        {t(
          'botsEmptyState.description',
          {},
          {
            defaultValue:
              'Every AI assistant begins with a single prompt. Start building your first intelligent agent to automate your workflow.',
          },
        )}
      </p>
      <Link
        to="/bots/new"
        className={cm.cn(
          'btn-gradient text-on-primary px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>rocket_launch</span>

        {t('botsEmptyState.createCta', {}, { defaultValue: 'Create your first bot' })}
      </Link>
    </section>
  )
}

export default BotsEmptyState
export { BotsEmptyState }
