// Phase 1 baseline — verbatim JSX of design-personal-finance-account-detail.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AccountDetailFooter from '../components/AccountDetailFooter.js'
import AccountDetailTopNavBar from '../components/AccountDetailTopNavBar.js'
import AccountHeaderCard from '../components/AccountHeaderCard.js'
import AccountRecentTransactions from '../components/AccountRecentTransactions.js'
import AddTransactionFab from '../components/AddTransactionFab.js'
import BalanceHistoryCard from '../components/BalanceHistoryCard.js'
import MonthlyCashFlowCard from '../components/MonthlyCashFlowCard.js'
import SideNavBar from '../components/SideNavBar.js'
interface Account {
  id: string
  name: string
  type: string
  institution: string
  account_number: string
  balance: number
  currency: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  date: string
  category_name: string
}

function AccountDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/accounts/${id}`),
      http.get(`/api/transactions?account_id=${id}&limit=10`),
    ])
      .then(([accRes, txRes]: [unknown, unknown]) => {
        if (!active) return
        setAccount(((accRes as { data?: unknown } | null)?.data ?? accRes) as Account | null)
        const txData = (txRes as { data?: unknown } | null)?.data ?? txRes
        setTransactions(Array.isArray(txData) ? (txData as Transaction[]) : [])
      })
      .catch(() => {
        if (active) setError(t('accountDetail.notFound', {}, { defaultValue: 'Account not found' }))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, http, t])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'bg-background text-on-background selection:bg-primary-fixed-dim',
        )}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            'border-4 border-primary border-t-transparent animate-spin',
          )}
        />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'bg-background text-on-background selection:bg-primary-fixed-dim',
        )}
      >
        <div className={cm.cn(cm.textCenter, cm.stack(4))}>
          <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {error ?? t('accountDetail.notFound', {}, { defaultValue: 'Account not found' })}
          </p>
          <Link
            to="/accounts"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary rounded-xl',
            )}
          >
            {t('accountDetail.backToAccounts', {}, { defaultValue: 'Back to Accounts' })}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn('bg-background text-on-background selection:bg-primary-fixed-dim')}>
      <SideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'md:ml-64')}>
        <AccountDetailTopNavBar account={account} />
        <div
          className={cm.cn(cm.sp('px', 12), cm.sp('py', 8), 'max-w-7xl', cm.mxAuto, cm.stack(8))}
        >
          <div className={cm.grid({ cols: 12, gap: 'xl' })}>
            <AccountHeaderCard account={account} />
            <MonthlyCashFlowCard transactions={transactions} />
            <BalanceHistoryCard />
            <AccountRecentTransactions transactions={transactions} currency={account.currency} />
            <AccountDetailFooter account={account} />
          </div>
        </div>
      </main>
      <AddTransactionFab onClick={() => navigate('/transactions/new?accountId=' + id)} />
    </div>
  )
}

export default AccountDetail
export { AccountDetail, AccountDetail as AccountDetailPage }
