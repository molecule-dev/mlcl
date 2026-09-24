import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import FinanceShell from '../components/FinanceShell.js'

const ICON_OPTIONS = [
  'savings',
  'flag',
  'house',
  'directions_car',
  'flight',
  'school',
  'celebration',
  'health_and_safety',
]

function AddGoal() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('1000')
  const [currentAmount, setCurrentAmount] = useState('0')
  const [targetDate, setTargetDate] = useState('')
  const [icon, setIcon] = useState('savings')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('addGoal.nameRequired', {}, { defaultValue: 'Goal name is required.' }))
      return
    }
    const target = Number(targetAmount)
    const current = Number(currentAmount)
    if (Number.isNaN(target) || target <= 0) {
      setError(
        t('addGoal.targetInvalid', {}, { defaultValue: 'Target amount must be greater than 0.' }),
      )
      return
    }
    if (Number.isNaN(current) || current < 0) {
      setError(
        t('addGoal.currentInvalid', {}, { defaultValue: 'Current amount cannot be negative.' }),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await http.post('/api/goals', {
        name: name.trim(),
        target_amount: target,
        current_amount: current,
        target_date: targetDate ? targetDate : null,
        icon,
      })
      void track({ name: 'goal.created', properties: { target_amount: target } })
      navigate('/goals')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('addGoal.createError', {}, { defaultValue: 'Failed to create goal.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      data-mol-id="add-goal"
      className={cm.cn(
        'bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <FinanceShell>
        <div className={cm.cn('bg-surface-container')}>
          <header className={cm.cn(cm.sp('px', 12), cm.sp('py', 8))}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('3xl'),
                'font-headline text-on-surface',
              )}
            >
              {t('addGoal.title', {}, { defaultValue: 'New saving goal' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'addGoal.subtitle',
                {},
                { defaultValue: 'Set a target and track contributions toward it.' },
              )}
            </p>
          </header>
          <section
            className={cm.cn(cm.sp('px', 12), cm.sp('pb', 12), cm.flex({ justify: 'center' }))}
          >
            <form
              onSubmit={handleSubmit}
              data-mol-id="add-goal-form"
              className={cm.cn(
                cm.w('full'),
                'max-w-2xl',
                cm.sp('p', 10),
                cm.stack(6),
                'bg-surface-container-lowest rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)]',
              )}
            >
              {error && (
                <div role="alert" className={cm.alert({ variant: 'error' })}>
                  <div className={cm.alertDescription} data-mol-id="add-goal-error">
                    {error}
                  </div>
                </div>
              )}

              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t('addGoal.nameLabel', {}, { defaultValue: 'Goal name' })}
                </span>
                <input
                  data-mol-id="add-goal-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                  placeholder={t('addGoal.namePlaceholder', {}, { defaultValue: 'Emergency fund' })}
                  required
                />
              </label>

              <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest',
                    )}
                  >
                    {t('addGoal.targetLabel', {}, { defaultValue: 'Target amount' })}
                  </span>
                  <input
                    data-mol-id="add-goal-target"
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                    required
                  />
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest',
                    )}
                  >
                    {t('addGoal.currentLabel', {}, { defaultValue: 'Current amount' })}
                  </span>
                  <input
                    data-mol-id="add-goal-current"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                  />
                </label>
              </div>

              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t('addGoal.targetDateLabel', {}, { defaultValue: 'Target date (optional)' })}
                </span>
                <input
                  data-mol-id="add-goal-target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded-lg')}
                />
              </label>

              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                >
                  {t('addGoal.iconLabel', {}, { defaultValue: 'Icon' })}
                </span>
                <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
                  {ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      data-mol-id={`add-goal-icon-${opt}`}
                      onClick={() => setIcon(opt)}
                      className={cm.cn(
                        cm.sp('p', 3),
                        'rounded-xl bg-surface-container-low',
                        icon === opt ? 'ring-2 ring-primary' : '',
                      )}
                    >
                      <span className="material-symbols-outlined">{opt}</span>
                    </button>
                  ))}
                </div>
              </label>

              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('pt', 4))}
              >
                <button
                  type="button"
                  data-mol-id="add-goal-cancel"
                  className={cm.cn(cm.sp('px', 6), cm.sp('py', 3), cm.fontWeight('semibold'))}
                  onClick={() => navigate('/goals')}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-mol-id="add-goal-submit"
                  disabled={submitting}
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.cursorPointer,
                    'bg-primary text-on-primary rounded-xl disabled:opacity-50',
                  )}
                >
                  {submitting
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('addGoal.submit', {}, { defaultValue: 'Create goal' })}
                </button>
              </div>
            </form>
          </section>
        </div>
      </FinanceShell>
    </div>
  )
}

export default AddGoal
export { AddGoal, AddGoal as AddGoalPage }
