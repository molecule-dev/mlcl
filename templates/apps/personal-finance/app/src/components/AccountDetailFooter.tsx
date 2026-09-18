import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AccountDetailFooter({
  account,
}: {
  account: { id: string; name: string; type: string; account_number: string }
}) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    setLoading(true)
    try {
      await http.delete(`/api/accounts/${account.id}`)
      navigate('/accounts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('py', 12),
        'mt-20 border-t border-border col-span-12',
      )}
    >
      <div className={cm.cn(cm.flex(), 'gap-4')}>
        <button
          className={cm.cn(
            cm.sp('px', 8),
            cm.textPrimary,
            cm.fontWeight('bold'),
            cm.flex({ align: 'center' }),
            'py-3.5 bg-surface-container-high rounded-xl hover:bg-surface-container-highest transition-all gap-2',
          )}
          onClick={() => navigate(`/accounts/${account.account_number}/edit`)}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>edit</span>

          {t('accountDetailFooter.edit', {}, { defaultValue: 'Edit Account' })}
        </button>
        <button
          className={cm.cn(
            cm.sp('px', 8),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center' }),
            'py-3.5 text-tertiary hover:bg-tertiary/5 rounded-xl transition-all gap-2',
          )}
          onClick={handleRemove}
          disabled={loading}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>delete</span>

          {t('accountDetailFooter.remove', {}, { defaultValue: 'Remove Account' })}
        </button>
      </div>
      <p className={cm.cn(cm.textSize('xs'), 'text-foreground-tertiary')}>
        {t(
          'accountDetailFooter.accountInfo',
          {
            name: account.name,
            detail: account.account_number
              ? t(
                  'accountDetailFooter.accountEnding',
                  { suffix: account.account_number.slice(-4) },
                  { defaultValue: 'Account ending in ••••{{suffix}}' },
                )
              : account.type,
          },
          { defaultValue: '{{name}} • {{detail}}' },
        )}
      </p>
    </section>
  )
}

export default AccountDetailFooter
export { AccountDetailFooter }
