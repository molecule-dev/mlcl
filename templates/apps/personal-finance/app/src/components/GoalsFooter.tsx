import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function GoalsFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 12),
        cm.sp('py', 8),
        'mt-20 border-t border-border',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('goalsFooter.insightTitle', {}, { defaultValue: 'Financial Insight' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'goalsFooter.savingsMessage',
              { percent: '24%' },
              {
                defaultValue:
                  "You're currently saving {{percent}} more than last month. Keep it up!",
              },
            )}
          </p>
        </div>
      </div>
      <div className={cm.flex({ gap: 'md' })}>
        <button
          className={cm.cn(cm.sp('p', 2), 'text-foreground-tertiary hover:text-primary')}
          onClick={() =>
            navigator.share
              ? navigator.share({
                  title: t('goalsFooter.insightTitle', {}, { defaultValue: 'Financial Insight' }),
                  text: t(
                    'goalsFooter.savingsShareText',
                    { percent: '24%' },
                    { defaultValue: "You're currently saving {{percent}} more than last month." },
                  ),
                })
              : navigator.clipboard.writeText(window.location.href)
          }
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="share">
            share
          </span>
        </button>
        <button
          className={cm.cn(cm.sp('p', 2), 'text-foreground-tertiary hover:text-primary')}
          onClick={() => window.print()}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="print">
            print
          </span>
        </button>
      </div>
    </footer>
  )
}

export default GoalsFooter
export { GoalsFooter }
