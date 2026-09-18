import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ContactInfoCardProps {
  contact: { phone: string | null; email: string; address: string | null }
}
function ContactInfoCard({ contact }: ContactInfoCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded shadow-sm')}>
      <h2
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mb', 6),
          'font-black uppercase tracking-[0.15em] text-on-surface-variant',
        )}
      >
        {t('contactInfoCard.sectionTitle', {}, { defaultValue: 'Contact Information' })}
      </h2>
      <div className={cm.stack(5)}>
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface/50')}
          >
            {t('form.phone', {}, { defaultValue: 'Phone' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'col-span-2 text-on-surface',
            )}
          >
            {contact.phone ?? t('common.emptyValue', {}, { defaultValue: '—' })}
          </span>
        </div>
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface/50')}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'col-span-2 text-on-surface',
            )}
          >
            {contact.email}
          </span>
        </div>
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface/50')}
          >
            {t('form.address', {}, { defaultValue: 'Address' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'col-span-2 text-on-surface leading-relaxed',
            )}
          >
            {contact.address ?? t('common.emptyValue', {}, { defaultValue: '—' })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ContactInfoCard
export { ContactInfoCard }
