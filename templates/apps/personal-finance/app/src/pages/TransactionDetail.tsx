// Phase 1 baseline — verbatim JSX of design-personal-finance-transaction-detail.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LocationInsightCard from '../components/LocationInsightCard.js'
import SideNavBar from '../components/SideNavBar.js'
import SimilarTransactionsCard from '../components/SimilarTransactionsCard.js'
import TransactionActionButtons from '../components/TransactionActionButtons.js'
import TransactionDetailBreadcrumb from '../components/TransactionDetailBreadcrumb.js'
import TransactionDetailsCard from '../components/TransactionDetailsCard.js'
import TransactionDetailTopNavBar from '../components/TransactionDetailTopNavBar.js'
import TransactionHeaderCard from '../components/TransactionHeaderCard.js'
interface Transaction {
  id: string
  account_name: string
  amount: number
  type: string
  description: string
  date: string
  category_id: string
  category_name: string
  notes: string
  status: string
  tags: string[]
  recurring: boolean
  merchant_location: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Math.abs(amount),
  )
}

function TransactionDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [similar, setSimilar] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setError(null)
    http
      .get<Transaction>(`/api/transactions/${id}`)
      .then((res) => {
        const tx = ((res as { data?: unknown } | null)?.data ?? res) as Transaction
        if (!active) return
        setTransaction(tx)
        if (tx?.category_id) {
          http
            .get<Transaction[]>(`/api/transactions?category_id=${tx.category_id}&limit=5`)
            .then((r) => {
              if (!active) return
              const list = (r as { data?: unknown } | null)?.data ?? r
              setSimilar(
                Array.isArray(list) ? (list as Transaction[]).filter((row) => row.id !== id) : [],
              )
            })
            // "Similar transactions" is optional context — failure just leaves
            // the section empty.
            .catch(() => {})
        }
      })
      .catch(() => {
        if (active)
          setError(
            t('transactionDetail.fetchError', {}, { defaultValue: 'Transaction not found.' }),
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, http, t])

  async function handleDelete() {
    try {
      setDeleting(true)
      await http.delete(`/api/transactions/${id}`)
      navigate('/transactions')
    } catch (_error) {
      // Failure is surfaced to the user via the error banner.
      setError(
        t('transactionDetail.deleteError', {}, { defaultValue: 'Failed to delete transaction.' }),
      )
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn('text-on-background bg-background antialiased')}>
        <SideNavBar />
        <TransactionDetailTopNavBar />
        <main
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 12),
            'max-w-6xl',
            cm.mxAuto,
            'md:ml-64 py-32',
          )}
        >
          <div className={cm.cn(cm.textSize('sm'), 'text-foreground-tertiary')}>
            {t('transactionDetail.loading', {}, { defaultValue: 'Loading transaction...' })}
          </div>
        </main>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className={cm.cn('text-on-background bg-background antialiased')}>
        <SideNavBar />
        <TransactionDetailTopNavBar />
        <main className={cm.cn(cm.sp('p', 12), 'max-w-6xl', cm.mxAuto, 'md:ml-64')}>
          <TransactionDetailBreadcrumb />
          <div
            className={cm.cn(
              cm.sp('p', 10),
              cm.textCenter,
              'bg-surface-container-lowest rounded-[2rem] shadow-sm',
            )}
          >
            <p className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-on-surface')}>
              {error ??
                t('transactionDetail.notFound', {}, { defaultValue: 'Transaction not found' })}
            </p>
            <Link
              to="/transactions"
              className={cm.cn(
                cm.textPrimary,
                cm.fontWeight('bold'),
                cm.sp('py', 3),
                cm.sp('px', 8),
                'bg-surface-container-high font-manrope rounded-2xl',
              )}
            >
              {t(
                'transactionDetail.backToTransactions',
                {},
                { defaultValue: 'Back to Transactions' },
              )}
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cm.cn('text-on-background bg-background antialiased')}>
      <SideNavBar />
      <TransactionDetailTopNavBar />
      {/* Main Content Area */}
      <main className={cm.cn(cm.sp('p', 12), 'max-w-6xl', cm.mxAuto, 'md:ml-64')}>
        <TransactionDetailBreadcrumb />
        {showDeleteConfirm && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 8),
              cm.sp('p', 6),
              'bg-error-light border border-red-200 rounded-2xl',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-error')}>
              {t(
                'transactionDetail.deleteConfirmMessage',
                {},
                {
                  defaultValue:
                    'Are you sure you want to delete this transaction? This cannot be undone.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('ml', 6))}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'text-foreground-secondary rounded-xl hover:bg-surface-secondary transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50',
                )}
              >
                {deleting
                  ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting...' })
                  : t('transactionDetail.confirmDelete', {}, { defaultValue: 'Yes, Delete' })}
              </button>
            </div>
          </div>
        )}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-12 items-start')}>
          {/* Left Column: Primary Details */}
          <div className={cm.cn(cm.stack(8), 'lg:col-span-7')}>
            {/* Transaction Header Card */}
            <TransactionHeaderCard transaction={transaction} formatCurrency={formatCurrency} />
            {/* Details Card */}
            <TransactionDetailsCard transaction={transaction} />
          </div>
          {/* Right Column: Secondary Context & Actions */}
          <div className={cm.cn(cm.stack(8), 'lg:col-span-5')}>
            {/* Action Buttons */}
            <TransactionActionButtons
              onEdit={() => navigate('/transactions')}
              onDelete={() => setShowDeleteConfirm(true)}
            />
            {/* Similar Transactions */}
            <SimilarTransactionsCard similar={similar} formatCurrency={formatCurrency} />
            {/* Location Insight (Visual Anchor) */}
            <LocationInsightCard location={transaction.merchant_location} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default TransactionDetail
export { TransactionDetail, TransactionDetail as TransactionDetailPage }
