import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

interface OnboardingTask {
  id: string
  label: string
  status: 'done' | 'in_progress' | 'todo'
  category: string
}

interface OnboardingJourney {
  id: string
  employee_name: string
  employee_initial: string
  role: string
  department: string
  start_date: string
  buddy_name: string
  progress_pct: number
  checklist_total: number
  checklist_done: number
  next_item: string
  tasks: OnboardingTask[]
}

const STATUS_ICON: Record<OnboardingTask['status'], string> = {
  done: 'check_circle',
  in_progress: 'pending',
  todo: 'radio_button_unchecked',
}

const STATUS_COLOR: Record<OnboardingTask['status'], string> = {
  done: 'text-success',
  in_progress: 'text-warning',
  todo: 'text-on-surface-variant/60',
}

export function Onboarding() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [journeys, setJourneys] = useState<OnboardingJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const load = useCallback((): Promise<void> => {
    setLoading(true)
    return http
      .get('/api/onboarding')
      .then((res) => {
        const list = unwrapList<OnboardingJourney>(res)
        setJourneys(list)
        const inProgress = list.find((j) => j.progress_pct < 100)
        setActiveId(inProgress?.id ?? list[0]?.id ?? null)
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const active = journeys.find((j) => j.id === activeId) ?? null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}>
          {t('onboarding.eyebrow', {}, { defaultValue: 'New hires' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('onboarding.heading', {}, { defaultValue: 'Onboarding journeys' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'onboarding.subheading',
            {},
            { defaultValue: 'Templated checklists, buddy assignments, and progress at a glance.' },
          )}
        </p>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <LoadErrorBanner message={error} onRetry={load} />
      ) : (
        <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
          <ul className={cm.cn('lg:col-span-5 stack gap-3 flex flex-col')}>
            {journeys.length === 0 ? (
              <li
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant',
                )}
              >
                {t(
                  'onboarding.empty',
                  {},
                  { defaultValue: 'No onboarding journeys yet — add an employee to start one.' },
                )}
              </li>
            ) : (
              journeys.map((j) => {
                const active = j.id === activeId
                return (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(j.id)}
                      className={cm.cn(
                        cm.sp('p', 5),
                        'w-full text-left rounded-2xl border transition-all',
                        active
                          ? 'bg-primary/5 border-primary shadow-sm'
                          : 'bg-surface-container-lowest border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md',
                      )}
                    >
                      <div className={cm.flex({ align: 'center', gap: 'md' })}>
                        <span
                          className={cm.cn(
                            'grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary-dark text-lg font-extrabold tracking-tight',
                          )}
                        >
                          {j.employee_initial}
                        </span>
                        <div className={cm.cn('min-w-0 flex-1')}>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('bold'),
                              'text-on-surface',
                            )}
                          >
                            {j.employee_name}
                          </p>
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {j.role} · {j.department}
                          </p>
                        </div>
                        <span
                          className={cm.cn(
                            cm.textSize('lg'),
                            'font-extrabold tabular-nums tracking-tight',
                            j.progress_pct === 100 ? 'text-success' : 'text-primary-dark',
                          )}
                        >
                          {j.progress_pct}%
                        </span>
                      </div>
                      <div className={cm.cn(cm.sp('mt', 4))}>
                        <div
                          className={cm.cn(
                            'h-2 overflow-hidden rounded-full bg-surface-container-low',
                          )}
                        >
                          <div
                            className={cm.cn('h-full rounded-full bg-primary transition-all')}
                            style={{ width: `${j.progress_pct}%` }}
                          />
                        </div>
                      </div>
                      <p
                        className={cm.cn(
                          cm.sp('mt', 3),
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t(
                          'onboarding.startsLabel',
                          { date: j.start_date },
                          { defaultValue: 'Starts {{date}}' },
                        )}{' '}
                        ·{' '}
                        {t(
                          'onboarding.buddyLabel',
                          { name: j.buddy_name },
                          { defaultValue: 'Buddy {{name}}' },
                        )}
                      </p>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'lg:col-span-7 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            {active ? (
              <>
                <header
                  className={cm.flex({
                    align: 'center',
                    justify: 'between',
                    wrap: 'wrap',
                    gap: 'sm',
                  })}
                >
                  <div>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('onboarding.detailEyebrow', {}, { defaultValue: 'Checklist' })}
                    </p>
                    <h2
                      className={cm.cn(
                        cm.sp('mt', 1),
                        cm.textSize('xl'),
                        'font-extrabold tracking-tight text-on-surface',
                      )}
                    >
                      {active.employee_name}
                    </h2>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'onboarding.checklistProgress',
                        { done: active.checklist_done, total: active.checklist_total },
                        { defaultValue: '{{done}} / {{total}} done' },
                      )}{' '}
                      · {t('onboarding.nextLabel', {}, { defaultValue: 'next:' })}{' '}
                      <span className={cm.cn('font-semibold text-on-surface')}>
                        {active.next_item}
                      </span>
                    </p>
                  </div>
                  {active.progress_pct === 100 ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'inline-flex items-center gap-2 rounded-full bg-success/10 text-success text-[10px] font-black uppercase tracking-widest',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[14px]')}
                        aria-hidden="true"
                      >
                        celebration
                      </span>
                      {t('common.complete', {}, { defaultValue: 'Complete' })}
                    </span>
                  ) : null}
                </header>
                {active.tasks.length === 0 ? (
                  <p
                    className={cm.cn(
                      cm.sp('mt', 6),
                      cm.textCenter,
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'onboarding.completeMessage',
                      {},
                      { defaultValue: 'All onboarding tasks done. Welcome aboard.' },
                    )}
                  </p>
                ) : (
                  <ol className={cm.cn(cm.sp('mt', 6), cm.stack(2))}>
                    {active.tasks.map((task) => (
                      <li
                        key={task.id}
                        className={cm.cn(
                          cm.sp('p', 3),
                          cm.flex({ align: 'center', gap: 'md' }),
                          'rounded-xl bg-surface-container-low border border-outline-variant/20',
                        )}
                      >
                        <span
                          className={cm.cn(
                            'material-symbols-outlined text-[22px]',
                            STATUS_COLOR[task.status],
                          )}
                          aria-hidden="true"
                        >
                          {STATUS_ICON[task.status]}
                        </span>
                        <div className={cm.cn('min-w-0 flex-1')}>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              'font-semibold text-on-surface',
                              task.status === 'done' ? 'line-through opacity-60' : '',
                            )}
                          >
                            {task.label}
                          </p>
                          <p
                            className={cm.cn(
                              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                            )}
                          >
                            {task.category}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            ) : (
              <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
                {t(
                  'onboarding.pickJourney',
                  {},
                  { defaultValue: 'Pick a journey to view its checklist.' },
                )}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
