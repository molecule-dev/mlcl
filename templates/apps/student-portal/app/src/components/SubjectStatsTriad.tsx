import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiAssignment, letterFor } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

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

export interface TriadStat {
  icon: string
  iconTint: string
  label: string
  value: string
  caption?: string
  accent?: 'primary' | 'secondary' | 'tertiary'
}

export interface SubjectStatsTriadProps {
  stats?: readonly TriadStat[]
}

/** The card's accent bar color, read by `cm.accentCard({ tone: 'custom' })`. */
const ACCENT_VAR: Record<NonNullable<TriadStat['accent']>, string> = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  tertiary: 'var(--color-tertiary)',
}

export function SubjectStatsTriad({ stats }: SubjectStatsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [pending, setPending] = useState({ total: 0, due48: 0, overdue: 0 })
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [gpa, setGpa] = useState<GpaResponse | null>(null)

  useEffect(() => {
    if (stats) return
    let cancelled = false
    Promise.all([
      http.get('/api/assignments').then((r) => unwrapList<ApiAssignment>(r)),
      http.get('/api/attendance/summary').then((r) => unwrapSingle<AttendanceSummary>(r)),
      http.get('/api/grades/gpa').then((r) => unwrapSingle<GpaResponse>(r)),
    ])
      .then(([as, sum, g]) => {
        if (cancelled) return
        const now = Date.now()
        const due48 = as.filter((a) => {
          if (a.status === 'submitted' || a.status === 'graded') return false
          if (!a.due_date) return false
          const dueMs = new Date(a.due_date).getTime()
          return dueMs - now > 0 && dueMs - now < 48 * 3600000
        }).length
        const overdue = as.filter((a) => a.status === 'overdue').length
        const total = as.filter((a) => a.status !== 'graded' && a.status !== 'submitted').length
        setPending({ total, due48, overdue })
        if (sum) setAttendance(sum)
        if (g) setGpa(g)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, stats])

  const data: readonly TriadStat[] =
    stats ??
    ([
      {
        icon: 'assignment',
        iconTint: 'text-primary',
        label: t('subjectStatsTriad.assignmentsLabel', {}, { defaultValue: 'Pending Assignments' }),
        value: String(pending.total),
        caption: t(
          'subjectStatsTriad.assignmentsCaption',
          { due48: pending.due48, overdue: pending.overdue },
          { defaultValue: '{{due48}} due in 48h, {{overdue}} overdue' },
        ),
        accent: 'primary',
      },
      {
        icon: 'how_to_reg',
        iconTint: 'text-secondary',
        label: t('subjectStatsTriad.attendanceLabel', {}, { defaultValue: 'Attendance' }),
        value: attendance ? `${Math.round(attendance.presentRate * 100)}%` : '—',
        caption: attendance
          ? t(
              'subjectStatsTriad.attendanceCaption',
              { absent: attendance.absent, tardy: attendance.tardy },
              { defaultValue: '{{absent}} absences this term · {{tardy}} tardies' },
            )
          : t(
              'subjectStatsTriad.attendanceCaptionLoading',
              {},
              { defaultValue: 'Crunching attendance numbers…' },
            ),
        accent: 'secondary',
      },
      {
        icon: 'school',
        iconTint: 'text-tertiary',
        label: t('subjectStatsTriad.gradesLabel', {}, { defaultValue: 'Class Average' }),
        value: gpa ? letterFor(gpa.percent ?? 0) : '—',
        caption: gpa
          ? t(
              'subjectStatsTriad.gradesCaption',
              { percent: gpa.percent ? gpa.percent.toFixed(1) : '0' },
              { defaultValue: 'Across {{percent}}% weighted average' },
            )
          : t('subjectStatsTriad.gradesCaptionLoading', {}, { defaultValue: 'Loading grades…' }),
        accent: 'tertiary',
      },
    ] as const)

  return (
    <section
      data-mol-id="subject-stats-triad"
      className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}
    >
      {data.map((s) => (
        <div
          key={s.label}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform group',
            s.accent ? cm.accentCard({ tone: 'custom' }) : '',
          )}
          style={s.accent ? { ['--mol-accent' as string]: ACCENT_VAR[s.accent] } : undefined}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
            <span
              className={cm.cn(
                cm.sp('p', 3),
                'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                s.iconTint,
              )}
            >
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                {s.icon}
              </span>
            </span>
          </div>
          <p
            className={cm.cn(
              s.accent
                ? cm.accentCardLabel({ tone: 'custom' })
                : 'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {s.label}
          </p>
          <p className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tabular-nums')}>
            {s.value}
          </p>
          {s.caption && (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {s.caption}
            </p>
          )}
        </div>
      ))}
    </section>
  )
}

export default SubjectStatsTriad
