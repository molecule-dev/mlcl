import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// Discord card. Backend connector is not implemented yet — the button
// is intentionally disabled and labelled "Coming soon" rather than
// firing a request that would silently 404.
export default function IntegrationCard() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'group bg-surface-container-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5',
      )}
      data-mol-id="card-discord"
    >
      <div
        className={cm.cn(
          cm.w(14),
          cm.h(14),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 5),
          'rounded-2xl bg-surface-container-high group-hover:scale-110 transition-transform',
        )}
      >
        <span
          className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-primary-container')}
        >
          forum
        </span>
      </div>
      <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('integrationCard.name', {}, { defaultValue: 'Discord' })}
      </h4>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mb', 6),
          'text-on-surface-variant leading-relaxed',
        )}
      >
        {t(
          'integrationCard.description',
          {},
          {
            defaultValue:
              'Deploy your AI chatbot as a bot user to engage with your server communities.',
          },
        )}
      </p>
      <button
        type="button"
        disabled
        title={t(
          'common.comingSoonHint',
          {},
          { defaultValue: 'This integration is not available yet.' },
        )}
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'rounded-xl bg-surface-container-high text-on-surface-variant cursor-not-allowed',
        )}
      >
        {t('common.comingSoon', {}, { defaultValue: 'Coming soon' })}
      </button>
    </article>
  )
}
export { IntegrationCard }
