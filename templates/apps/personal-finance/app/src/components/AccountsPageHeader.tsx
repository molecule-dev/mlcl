import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AccountsPageHeader({ onAddAccount }: { onAddAccount?: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
        'md:flex-row md:items-end',
      )}
      data-mol-id="accounts-header"
    >
      <div>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'font-label uppercase tracking-[0.2em] text-foreground-secondary block',
          )}
          data-mol-id="meta-label"
        >
          {t('accountsPageHeader.subtitle', {}, { defaultValue: 'Financial Overview' })}
        </span>
        <h2
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold font-headline tracking-tight text-on-surface',
          )}
          data-mol-id="page-title"
        >
          {t('accountsPageHeader.title', {}, { defaultValue: 'Your Accounts' })}
        </h2>
      </div>
      <button
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.fontWeight('bold'),
          'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
        )}
        data-mol-id="add-account-btn"
        onClick={onAddAccount}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="add">
          add
        </span>
        {t('accountsPageHeader.addButton', {}, { defaultValue: 'Add Account' })}
      </button>
    </div>
  )
}

export default AccountsPageHeader
export { AccountsPageHeader }
