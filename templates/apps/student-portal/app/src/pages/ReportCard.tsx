import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GradeBadge, type GradeLetter } from '../components/GradeBadge.js'
import { letterFor } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ReportCardCourse {
  course_id: string
  course_name: string
  subject?: string | null
  score: number
  letter_grade: string
}

interface ReportCardResponse {
  courses: ReportCardCourse[]
  generatedAt: string
}

interface AttendanceSummary {
  total: number
  present: number
  tardy: number
  absent: number
  excused: number
  presentRate: number
}

interface GpaResponse {
  gpa: number
  percent?: number
  count: number
}

const TERM = 'Spring 2026'

function commentFor(score: number, courseName: string): string {
  if (score >= 95) return `Outstanding work in ${courseName}. Keep raising the bar.`
  if (score >= 90) return `Strong understanding in ${courseName}. Keep showing your steps.`
  if (score >= 80) return `Solid effort in ${courseName}. A small push and you’re in A territory.`
  if (score >= 70) return `Steady progress in ${courseName}; review the latest rubric notes.`
  return `Let's set up a tutoring session for ${courseName} this week.`
}

export function ReportCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [card, setCard] = useState<ReportCardResponse | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [gpa, setGpa] = useState<GpaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/grades/report-card').then((r) => unwrapSingle<ReportCardResponse>(r)),
      http.get('/api/attendance/summary').then((r) => unwrapSingle<AttendanceSummary>(r)),
      http.get('/api/grades/gpa').then((r) => unwrapSingle<GpaResponse>(r)),
    ])
      .then(([c, a, g]) => {
        if (cancelled) return
        if (c) setCard(c)
        if (a) setAttendance(a)
        if (g) setGpa(g)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const downloadPdf = () => {
    setDownloadStatus(t('reportCard.downloading', {}, { defaultValue: 'Generating PDF…' }))
    // Open in a new tab so the browser handles the download. We keep
    // the click handler so we can record a friendly status message.
    const url = '/api/grades/report-card/pdf'
    window.open(url, '_blank', 'noopener,noreferrer')
    setDownloadStatus(
      t('reportCard.downloaded', {}, { defaultValue: 'Report card opened in a new tab.' }),
    )
  }

  const presentPct = attendance ? Math.round(attendance.presentRate * 100) : 0
  const courses = card?.courses ?? []
  const usingFallback = !loading && courses.length === 0

  // For demo grades we show q1 = q2 = final = computed letter, since the
  // baseline grade table doesn't break out term subgrades.
  type Row = ReportCardCourse & {
    q1: GradeLetter
    q2: GradeLetter
    final: GradeLetter
    comment: string
    teacher: string
  }
  const rows: Row[] = courses.map((c) => ({
    ...c,
    q1: letterFor(c.score),
    q2: letterFor(c.score),
    final: letterFor(c.score),
    comment: commentFor(c.score, c.course_name),
    teacher: '—',
  }))

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-report-card">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/grades" className={cm.cn('hover:text-primary font-semibold')}>
          {t('reportCard.backLink', {}, { defaultValue: 'Grades' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span className={cm.cn('text-on-surface font-bold')}>
          {t('reportCard.crumb', {}, { defaultValue: 'Report card' })}
        </span>
      </div>

      <header
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden md:flex-row md:items-end md:justify-between',
        )}
      >
        <div className={cm.cn('relative z-10')}>
          <p className={cm.cn('font-bold text-xs uppercase tracking-widest opacity-80')}>
            {t(
              'reportCard.eyebrow',
              { term: TERM },
              { defaultValue: 'End of semester · {{term}}' },
            )}
          </p>
          <h1 className={cm.cn('mt-2 text-4xl md:text-5xl font-extrabold tracking-tighter')}>
            {t('reportCard.title', {}, { defaultValue: 'Report card' })}
          </h1>
          <p className={cm.cn('mt-2 text-sm opacity-90 max-w-xl leading-relaxed')}>
            {t(
              'reportCard.subtitle',
              {},
              {
                defaultValue:
                  'A formal end-of-semester transcript with weighted course grades, attendance, and a printable PDF download.',
              },
            )}
          </p>
          <button
            type="button"
            data-mol-id="report-card-download"
            onClick={downloadPdf}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.sp('mt', 4),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-full bg-surface/20 backdrop-blur-md font-semibold hover:bg-surface/30 transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              download
            </span>
            {t('reportCard.download', {}, { defaultValue: 'Download PDF' })}
          </button>
          {downloadStatus && (
            <p
              data-mol-id="report-card-download-status"
              className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'opacity-80')}
            >
              {downloadStatus}
            </p>
          )}
        </div>
        <div className={cm.cn('relative z-10 grid grid-cols-2 gap-6 md:gap-10')}>
          <div>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest opacity-80')}>
              {t('reportCard.cumulativeGpa', {}, { defaultValue: 'Cumulative GPA' })}
            </p>
            <p
              data-mol-id="report-card-gpa"
              className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums mt-1')}
            >
              {gpa ? gpa.gpa.toFixed(2) : '—'}
            </p>
            <p className={cm.cn('text-xs opacity-80')}>/ 4.0</p>
          </div>
          <div>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest opacity-80')}>
              {t('reportCard.attendance', {}, { defaultValue: 'Attendance' })}
            </p>
            <p
              data-mol-id="report-card-attendance"
              className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums mt-1')}
            >
              {attendance ? `${presentPct}%` : '—'}
            </p>
            <p className={cm.cn('text-xs opacity-80')}>
              {attendance
                ? t(
                    'reportCard.attendanceCaption',
                    { absent: attendance.absent },
                    { defaultValue: '{{absent}} absent days' },
                  )
                : t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          </div>
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
        />
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm overflow-x-auto',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : usingFallback ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('reportCard.empty', {}, { defaultValue: 'No grades on file yet.' })}
          </p>
        ) : (
          <table className={cm.cn('w-full text-left')}>
            <thead>
              <tr
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-low',
                )}
              >
                <th className={cm.sp('p', 3)}>{t('nav.course', {}, { defaultValue: 'Course' })}</th>
                <th className={cm.sp('p', 3)}>
                  {t('reportCard.col.q1', {}, { defaultValue: 'Q1' })}
                </th>
                <th className={cm.sp('p', 3)}>
                  {t('reportCard.col.q2', {}, { defaultValue: 'Q2' })}
                </th>
                <th className={cm.sp('p', 3)}>
                  {t('reportCard.col.final', {}, { defaultValue: 'Final' })}
                </th>
                <th className={cm.cn(cm.sp('p', 3), cm.textRight)}>
                  {t('reportCard.col.comment', {}, { defaultValue: 'Comment' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {rows.map((row) => (
                <tr
                  key={row.course_id}
                  data-mol-id={`report-card-row-${row.course_id}`}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.sp('p', 3)}>
                    <p className={cm.cn('font-semibold text-on-surface')}>{row.course_name}</p>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {row.subject ?? ''}
                    </p>
                  </td>
                  <td className={cm.sp('p', 3)}>
                    <GradeBadge letter={row.q1} size="sm" />
                  </td>
                  <td className={cm.sp('p', 3)}>
                    <GradeBadge letter={row.q2} size="sm" />
                  </td>
                  <td className={cm.sp('p', 3)}>
                    <GradeBadge letter={row.final} percentage={row.score} />
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('p', 3),
                      cm.textSize('sm'),
                      cm.textRight,
                      'text-on-surface-variant max-w-md',
                    )}
                  >
                    {row.comment}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={cm.cn('bg-primary/10 font-extrabold')}>
                <td colSpan={3} className={cm.cn(cm.sp('p', 3), 'text-on-surface text-sm')}>
                  {t('reportCard.gpaRow', { term: TERM }, { defaultValue: 'Final GPA · {{term}}' })}
                </td>
                <td className={cm.sp('p', 3)} colSpan={2}>
                  <span className={cm.cn('text-2xl tabular-nums text-primary')}>
                    {gpa ? `${gpa.gpa.toFixed(2)} / 4.0` : '—'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  )
}

export default ReportCard
export { ReportCard as ReportCardPage }
