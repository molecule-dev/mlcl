import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompaniesHeadingProps {
  count: number
}

function CompaniesHeading({ count }: CompaniesHeadingProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'end', justify: 'between' })}>
      <div>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('medium'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('companiesHeading.title', {}, { defaultValue: 'Companies' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'companiesHeading.subtitle',
            { count: count.toLocaleString() },
            { defaultValue: 'Managing {{count}} corporate entities' },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.flex({}), 'gap-2')}>
        <button
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'gap-1.5 py-1.5 bg-surface-container-lowest text-on-surface-variant border border-outline-variant/10 hover:bg-surface-container-high transition-colors',
          )}
          onClick={() => {
            // TODO: wire export endpoint when implemented
          }}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            file_download
          </span>
          {t('common.export', {}, { defaultValue: 'Export' })}
        </button>
        <button
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'gap-1.5 py-1.5 bg-surface-container-lowest text-on-surface-variant border border-outline-variant/10 hover:bg-surface-container-high transition-colors',
          )}
          onClick={() => {
            // TODO: wire layout switcher when implemented
          }}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>view_module</span>
          {t('common.layout', {}, { defaultValue: 'Layout' })}
        </button>
      </div>
    </div>
  )
}

export default CompaniesHeading
export { CompaniesHeading }
