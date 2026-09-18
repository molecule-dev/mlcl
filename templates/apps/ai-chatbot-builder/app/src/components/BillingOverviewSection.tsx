import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function BillingOverviewSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="billing-overview-section-placeholder"
      style={{
        padding: 'calc(6 * 0.25rem)',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: 'var(--md-sys-color-amber-400)',
        backgroundColor: '${tailwindScaleToHex($1,$2)}',
        borderRadius: '0.25rem',
      }}
    >
      <h3
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 1))}
        style={{ color: '${tailwindScaleToHex($1,$2)}' }}
      >
        {t(
          'billing-overview-section.placeholder-title',
          {},
          { defaultValue: 'BillingOverviewSection' },
        )}
      </h3>
      <p
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          color: '${tailwindScaleToHex($1,$2)}',
        }}
      >
        {t(
          'billing-overview-section.placeholder-desc',
          {},
          { defaultValue: 'Needs regeneration.' },
        )}
      </p>
    </div>
  )
}

export { BillingOverviewSection }
