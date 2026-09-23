import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GradeBadge } from '../components/GradeBadge.js'
import { type ApiAssignment, dueLabel, letterFor } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

export function AssignmentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [assignment, setAssignment] = useState<ApiAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/assignments/${id}`)
      .then((res) => {
        if (cancelled) return
        const a = unwrapSingle<ApiAssignment>(res)
        if (!a) {
          setError(t('assignmentDetail.notFound', {}, { defaultValue: 'Assignment not found.' }))
        } else {
          setAssignment(a)
        }
      })
      .catch(() =>
        setError(
          t('assignmentDetail.loadError', {}, { defaultValue: 'Failed to load assignment.' }),
        ),
      )
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const submit = async () => {
    if (!assignment) return
    setSubmitting(true)
    setStatusMessage(null)
    try {
      const res = await http.post(`/api/assignments/${assignment.id}/submit`, {})
      const updated = unwrapSingle<ApiAssignment>(res)
      if (updated) {
        setAssignment(updated)
      } else {
        setAssignment({
          ...assignment,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
      }
      setStatusMessage(
        t(
          'assignmentDetail.submitted',
          {},
          { defaultValue: 'Submission recorded — your teacher has been notified.' },
        ),
      )
      void track({
        name: 'assignment.submitted',
        properties: { assignmentId: assignment.id, status: 'submitted' },
      })
    } catch (error) {
      logError('assignmentDetail.submit', error)
      setStatusMessage(
        t(
          'assignmentDetail.submitError',
          {},
          { defaultValue: 'We couldn’t record that submission. Try again in a moment.' },
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
        data-mol-id="page-assignment-detail"
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !assignment) {
    return (
      <div
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
        data-mol-id="page-assignment-detail"
      >
        <p>
          {error ?? t('assignmentDetail.notFound', {}, { defaultValue: 'Assignment not found.' })}
        </p>
        <Link to="/assignments" className={cm.cn('text-primary font-semibold')}>
          {t('assignmentDetail.backLink', {}, { defaultValue: 'Back to assignments' })}
        </Link>
      </div>
    )
  }

  const grade =
    assignment.status === 'graded' && assignment.points != null
      ? letterFor(Number(assignment.points))
      : undefined
  const statusPill =
    assignment.status === 'submitted'
      ? {
          label: t('assignmentDetail.statusSubmitted', {}, { defaultValue: 'Submitted' }),
          className: 'bg-success-light text-success',
        }
      : assignment.status === 'graded'
        ? {
            label: t('assignmentDetail.statusGraded', {}, { defaultValue: 'Graded' }),
            className: 'bg-violet-100 text-violet-700',
          }
        : assignment.status === 'overdue'
          ? {
              label: t('status.overdue', {}, { defaultValue: 'Overdue' }),
              className: 'bg-rose-100 text-error',
            }
          : {
              label: t('assignmentDetail.statusDue', {}, { defaultValue: 'Due soon' }),
              className: 'bg-warning-light text-warning',
            }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))}
      data-mol-id="page-assignment-detail"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/assignments" className={cm.cn('hover:text-primary font-semibold')}>
          {t('assignmentDetail.backLink', {}, { defaultValue: 'Assignments' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span className={cm.cn('text-on-surface font-bold truncate')}>{assignment.title}</span>
      </div>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden',
        )}
      >
        <div className={cm.cn('relative z-10')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-on-primary/80',
            )}
          >
            {t(
              'assignmentDetail.eyebrow',
              { course: assignment.course_name ?? '' },
              { defaultValue: '{{course}}' },
            )}
          </p>
          <h1
            data-mol-id="assignment-detail-title"
            className={cm.cn(
              cm.sp('mt', 2),
              'text-4xl md:text-5xl font-extrabold tracking-tighter',
            )}
          >
            {assignment.title}
          </h1>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
              cm.sp('mt', 4),
              cm.textSize('sm'),
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'bg-surface/20 backdrop-blur-md font-bold',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                schedule
              </span>
              {t(
                'assignmentDetail.due',
                { due: dueLabel(assignment.due_date) },
                { defaultValue: 'Due {{due}}' },
              )}
            </span>
            {assignment.points != null && (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  'bg-surface/20 backdrop-blur-md font-bold',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  scoreboard
                </span>
                {t(
                  'assignmentDetail.points',
                  { points: assignment.points },
                  { defaultValue: '{{points}} pts' },
                )}
              </span>
            )}
          </div>
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
        />
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'col-span-12 lg:col-span-8 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-6',
          )}
        >
          <div>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('assignmentDetail.instructions', {}, { defaultValue: 'Instructions' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                'text-on-surface-variant leading-relaxed whitespace-pre-line',
              )}
            >
              {assignment.description ??
                t(
                  'assignmentDetail.noInstructions',
                  {},
                  { defaultValue: 'No additional instructions provided.' },
                )}
            </p>
          </div>

          <div>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('assignmentDetail.submitTitle', {}, { defaultValue: 'Submit your work' })}
            </h2>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 8),
                cm.sp('mt', 3),
                'rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-on-surface-variant text-center',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-5xl text-primary/70')}
                aria-hidden="true"
              >
                cloud_upload
              </span>
              <p className={cm.cn(cm.textSize('base'), 'font-bold text-on-surface')}>
                {assignment.status === 'submitted' || assignment.status === 'graded'
                  ? t(
                      'assignmentDetail.alreadySubmitted',
                      {},
                      { defaultValue: 'You’ve already submitted this assignment.' },
                    )
                  : t(
                      'assignmentDetail.dropPrompt',
                      {},
                      { defaultValue: 'Drop your PDF or photo packet here' },
                    )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'max-w-sm')}>
                {t(
                  'assignmentDetail.dropBody',
                  {},
                  {
                    defaultValue:
                      'Use Choose files to attach your work — we’ll record the submission timestamp once you confirm.',
                  },
                )}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className={cm.cn('hidden')}
                aria-hidden="true"
                onChange={() => {
                  // File contents aren't uploaded yet; submit registers the
                  // submission timestamp and updates status to 'submitted'.
                  void submit()
                }}
              />
              <button
                type="button"
                data-mol-id="assignment-submit"
                disabled={
                  submitting || assignment.status === 'submitted' || assignment.status === 'graded'
                }
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click()
                  else void submit()
                }}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.sp('mt', 4),
                  cm.textSize('sm'),
                  'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  attach_file
                </span>
                {submitting
                  ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                  : t('assignmentDetail.dropButton', {}, { defaultValue: 'Choose files' })}
              </button>
              {statusMessage && (
                <p
                  data-mol-id="assignment-submit-status"
                  className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-primary font-semibold')}
                >
                  {statusMessage}
                </p>
              )}
            </div>
          </div>
        </section>

        <aside
          className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'col-span-12 lg:col-span-4')}
        >
          <div
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('assignmentDetail.statusTitle', {}, { defaultValue: 'Submission status' })}
            </h3>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 4))}>
              <span
                data-mol-id="assignment-status-pill"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  'text-[10px] font-black uppercase tracking-widest',
                  statusPill.className,
                )}
              >
                {statusPill.label}
              </span>
              {grade && <GradeBadge letter={grade} percentage={Number(assignment.points)} />}
            </div>
            {assignment.submitted_at && (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 3),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(
                  'assignmentDetail.submittedAt',
                  { when: new Date(assignment.submitted_at).toLocaleString() },
                  { defaultValue: 'Submitted {{when}}' },
                )}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default AssignmentDetail
export { AssignmentDetail as AssignmentDetailPage }
