// Phase 1 baseline — verbatim JSX of design-personal-finance-accounts.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AccountGrid from '../components/AccountGrid.js'
import AccountsPageHeader from '../components/AccountsPageHeader.js'
import AccountsTopNavBar from '../components/AccountsTopNavBar.js'
import AccountSummaryBar from '../components/AccountSummaryBar.js'
import BottomNavBar from '../components/BottomNavBar.js'
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

function Accounts() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const cm = getClassMap()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    http
      .get('/api/accounts')
      .then((res: unknown) => {
        const body = (res as { data?: unknown } | null)?.data ?? res
        setAccounts(Array.isArray(body) ? (body as Account[]) : [])
      })
      .catch(() =>
        setError(t('accounts.loadError', {}, { defaultValue: 'Failed to load accounts.' })),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  const totalAssets = accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accounts
    .filter((a) => a.balance < 0)
    .reduce((s, a) => s + Math.abs(a.balance), 0)
  const netWorth = totalAssets - totalLiabilities

  return (
    <div className={cm.cn(cm.page, 'text-on-surface')}>
      {/* SideNavBar (Desktop) */}
      <SideNavBar />
      {/* Main Content Shell */}
      <main className={cm.cn(cm.minH('screen'), 'md:pl-64')}>
        {/* TopNavBar */}
        <AccountsTopNavBar />
        {/* Canvas */}
        <div className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-7xl', cm.mxAuto)}>
          {/* Page Header */}
          {error && (
            <div role="alert" className={cm.alert({ variant: 'error' })}>
              <div className={cm.alertDescription}>{error}</div>
            </div>
          )}
          <AccountsPageHeader onAddAccount={() => navigate('/accounts/new')} />
          {/* Summary Bar */}
          <AccountSummaryBar
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
            netWorth={netWorth}
          />
          {/* Account Grid */}
          <AccountGrid
            accounts={accounts}
            loading={loading}
            onAccountClick={(id) => navigate(`/accounts/${id}`)}
            onDeleteAccount={(id) =>
              http
                .delete(`/api/accounts/${id}`)
                .then(() => setAccounts((as) => as.filter((a) => a.id !== id)))
            }
          />
        </div>
      </main>
      {/* BottomNavBar (Mobile) */}
      <BottomNavBar />
    </div>
  )
}

export default Accounts
export { Accounts, Accounts as AccountsPage }
