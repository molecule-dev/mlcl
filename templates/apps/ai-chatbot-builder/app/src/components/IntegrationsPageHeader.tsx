import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  search: string
  onSearchChange: (v: string) => void
}
function IntegrationsPageHeader({ search, onSearchChange }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        'md:flex-row md:items-end gap-6',
      )}
      data-mol-id="header-section"
    >
      <div className={cm.maxW('xl')}>
        <h2
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mb', 3),
            'font-extrabold font-headline tracking-tight text-on-surface',
          )}
        >
          {t('integrationsPageHeader.heading', {}, { defaultValue: 'Connect your workflow' })}
        </h2>
        <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
          {t(
            'integrationsPageHeader.description',
            {},
            {
              defaultValue:
                "Expand your bot's capabilities by integrating with the tools your team already uses. Seamlessly sync data, trigger workflows, and engage users across platforms.",
            },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.w('full'), 'relative md:w-80 group')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'absolute inset-y-0 left-4 pointer-events-none',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors',
            )}
          >
            search
          </span>
        </div>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('pl', 12),
            cm.sp('pr', 4),
            cm.textSize('sm'),
            'bg-surface-container-high border-none rounded-2xl py-3.5 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/50',
          )}
          placeholder={t(
            'integrationsPageHeader.searchPlaceholder',
            {},
            { defaultValue: 'Search integrations...' },
          )}
          aria-label={t(
            'integrationsPageHeader.searchPlaceholder',
            {},
            { defaultValue: 'Search integrations...' },
          )}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </section>
  )
}

export default IntegrationsPageHeader
export { IntegrationsPageHeader }
