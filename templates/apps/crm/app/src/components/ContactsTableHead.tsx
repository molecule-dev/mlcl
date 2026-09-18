import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ContactsTableHead() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <thead>
      <tr className={cm.fvce3a8f60}>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('form.name', {}, { defaultValue: 'Name' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('form.company', {}, { defaultValue: 'Company' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('form.phone', {}, { defaultValue: 'Phone' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('contactsTableHead.lastActivity', {}, { defaultValue: 'Last Activity' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.status', {}, { defaultValue: 'Status' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            cm.textRight,
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.actions', {}, { defaultValue: 'Actions' })}
        </th>
      </tr>
    </thead>
  )
}
export { ContactsTableHead }
