// Phase 1 baseline — verbatim JSX of design-personal-finance-goals.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import GoalsBentoGrid from '../components/GoalsBentoGrid.js'
import GoalsEmptyStateCta from '../components/GoalsEmptyStateCta.js'
import GoalsFooter from '../components/GoalsFooter.js'
import GoalsPageHeader from '../components/GoalsPageHeader.js'
import SideNavBar from '../components/SideNavBar.js'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string
  color: string
  status: string
  monthly_contribution?: number
}

function Goals() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadGoals() {
      try {
        setLoading(true)
        setError(null)
        const res = await http.get('/api/goals')
        setGoals(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [])
      } catch (_error) {
        // Failure is surfaced to the user via the error banner below.
        setError(t('goals.loadError', {}, { defaultValue: 'Failed to load goals.' }))
      } finally {
        setLoading(false)
      }
    }
    loadGoals()
  }, [http, t])

  return (
    <div className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-background text-on-background')}>
      <SideNavBar />
      <main className={cm.cn(cm.flex1, cm.sp('p', 10), 'max-w-7xl', cm.mxAuto, 'md:ml-64')}>
        <GoalsPageHeader onAddGoal={() => navigate('/goals/new')} showForm={false} />
        {loading ? (
          <div
            className={cm.cn(cm.grid({ gap: 'xl' }), cm.sp('mb', 16), 'grid-cols-1 md:grid-cols-2')}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cm.cn(
                  cm.sp('p', 8),
                  'rounded-3xl',
                  'bg-surface-container-lowest shadow-sm animate-pulse',
                )}
                style={{ minHeight: 200 }}
              />
            ))}
          </div>
        ) : error ? (
          <div
            className={cm.cn(cm.sp('mb', 8), cm.sp('p', 4), 'text-error bg-error-light rounded-xl')}
          >
            {error}
          </div>
        ) : (
          <GoalsBentoGrid
            goals={goals}
            onDelete={async (id: string) => {
              try {
                await http.delete(`/api/goals/${id}`)
                setGoals((xs) => xs.filter((g) => g.id !== id))
              } catch (_error) {
                // Failure is surfaced to the user via the error banner.
                setError(t('goals.deleteError', {}, { defaultValue: 'Failed to delete goal.' }))
              }
            }}
          />
        )}
        {goals.length === 0 && !loading && (
          <GoalsEmptyStateCta onAddGoal={() => navigate('/goals/new')} />
        )}
        <GoalsFooter />
      </main>
    </div>
  )
}

export default Goals
export { Goals, Goals as GoalsPage }
