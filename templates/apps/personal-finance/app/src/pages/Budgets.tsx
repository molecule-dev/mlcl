import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BottomNavBar from '../components/BottomNavBar.js'
import BudgetCategoryCard from '../components/BudgetCategoryCard.js'
import BudgetsFooter from '../components/BudgetsFooter.js'
import BudgetSummaryCard from '../components/BudgetSummaryCard.js'
import LiveSyncIndicator from '../components/LiveSyncIndicator.js'
import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'

interface Budget {
  id: string
  category_id: string
  category_name: string
  amount: number
  spent: number
  icon?: string
  description?: string
}
function Budgets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    http
      .get(`/api/budgets?month=${month}&year=${year}`)
      .then((res) =>
        setBudgets(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []),
      )
      .catch(() =>
        setError(t('budgets.loadError', {}, { defaultValue: 'Failed to load budgets.' })),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]) // http and t are stable refs; re-fetch is driven by month/year changes only

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0)
  const totalRemaining = totalBudgeted - totalSpent
  const utilizationPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  return (
    <div className={cm.cn(cm.minH('screen'), cm.surface, 'text-on-surface')}>
      <SideNavBar />
      <TopNavBar month={month} year={year} onPrev={prevMonth} onNext={nextMonth} />
      <main
        className={cm.cn(cm.sp('px', 12), cm.minH('screen'), 'md:ml-64 pt-24 pb-28 md:pb-12')}
        data-mol-id="main-content"
      >
        {error && (
          <div
            className={cm.cn(
              cm.sp('mb', 6),
              cm.sp('p', 4),
              cm.textSize('sm'),
              'bg-error-light text-error rounded-xl',
            )}
            role="alert"
          >
            {error}
          </div>
        )}
        <BudgetSummaryCard
          totalBudgeted={totalBudgeted}
          totalSpent={totalSpent}
          totalRemaining={totalRemaining}
          utilizationPct={utilizationPct}
          loading={loading}
        />
        <div
          className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}
          data-mol-id="budgets-toolbar"
        >
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'font-headline text-on-surface',
            )}
          >
            {t('budgets.categoriesHeading', {}, { defaultValue: 'Category budgets' })}
          </h2>
          <button
            type="button"
            data-mol-id="budgets-add-button"
            onClick={() => navigate('/budgets/new')}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.cursorPointer,
              'bg-primary text-on-primary rounded-xl',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              add
            </span>{' '}
            {t('budgets.addBudget', {}, { defaultValue: 'Add Budget' })}
          </button>
        </div>
        {budgets.length === 0 && !loading && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
            {t(
              'budgets.empty',
              {},
              { defaultValue: 'No budgets yet for this month — add one to start tracking.' },
            )}
          </p>
        )}
        <section
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}
          data-mol-id="category-grid"
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-2xl animate-pulse',
                  )}
                  style={{ minHeight: 200 }}
                  aria-hidden="true"
                />
              ))
            : budgets.map((b) => (
                <BudgetCategoryCard
                  key={b.id}
                  name={b.category_name}
                  icon={b.icon || 'category'}
                  description={b.description || ''}
                  spent={b.spent || 0}
                  amount={b.amount}
                  pct={b.amount > 0 ? Math.round(((b.spent || 0) / b.amount) * 100) : 0}
                  status={
                    (b.spent || 0) > b.amount
                      ? t('budgets.overBudget', {}, { defaultValue: 'Over Budget' })
                      : t('budgets.onTrack', {}, { defaultValue: 'On Track' })
                  }
                />
              ))}
        </section>
        <BudgetsFooter />
      </main>
      {/* Mobile Navigation (Fixed Bottom) */}
      <BottomNavBar />
      <LiveSyncIndicator />
    </div>
  )
}

export default Budgets
export { Budgets, Budgets as BudgetsPage }
