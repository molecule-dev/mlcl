import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type Grade = Record<string, unknown>

function GradeBreakdownTable({ grades = [] }: { grades?: Grade[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const getLetterGrade = (score: number, max: number) => {
    const pct = max > 0 ? Math.round((score / max) * 100) : 0
    return pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
  }

  const formatDate = (raw: unknown) => {
    if (!raw) return ''
    const d = new Date(String(raw))
    if (Number.isNaN(d.getTime())) return ''
    return t(
      'gradeBreakdownTable.dateShort',
      {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        day: d.getDate(),
      },
      { defaultValue: '{{month}} {{day}}' },
    )
  }

  return (
    <section
      className={cm.cn(
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden',
      )}
      data-mol-id="grade-breakdown-table"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          'border-b border-border',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-headline')}>
          {t('gradeBreakdownTable.sectionTitle', {}, { defaultValue: 'Recent Assessments' })}
        </h2>
      </div>

      {grades.length === 0 ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 10),
            'text-on-surface-variant gap-2',
          )}
          data-mol-id="grade-breakdown-empty"
        >
          <span className={cm.cn('material-symbols-outlined text-3xl text-outline/60')}>grade</span>
          <p className={cm.cn(cm.textSize('sm'), cm.textCenter)}>
            {t(
              'gradeBreakdownTable.empty',
              {},
              {
                defaultValue:
                  'No grades yet — once your assignments are graded they will appear here.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('overflow-x-auto custom-scrollbar')}>
          <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
            <thead>
              <tr className={cm.cn('bg-surface-container-low/50')}>
                <th
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    'text-[10px] text-foreground-secondary uppercase tracking-widest',
                  )}
                >
                  {t('nav.course', {}, { defaultValue: 'Course' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    'text-[10px] text-foreground-secondary uppercase tracking-widest',
                  )}
                >
                  {t('gradeBreakdownTable.columnAssignment', {}, { defaultValue: 'Assignment' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.textRight,
                    'text-[10px] text-foreground-secondary uppercase tracking-widest',
                  )}
                >
                  {t('gradeBreakdownTable.columnScore', {}, { defaultValue: 'Score' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.textCenter,
                    'text-[10px] text-foreground-secondary uppercase tracking-widest',
                  )}
                >
                  {t('gradeBreakdownTable.columnGrade', {}, { defaultValue: 'Grade' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.textRight,
                    'text-[10px] text-foreground-secondary uppercase tracking-widest',
                  )}
                >
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-border/50')}>
              {grades.map((grade, i) => {
                const score = Number(grade.score) || 0
                const maxScore = Number(grade.max_score) || 100
                const letter = getLetterGrade(score, maxScore)
                const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
                const courseName = String(grade.course_name ?? grade.course ?? '').trim()
                const assignmentName = String(
                  grade.assignment_title ?? grade.assignment ?? grade.title ?? grade.name ?? '',
                ).trim()
                const submittedAt =
                  grade.submitted_at ??
                  (grade as { submittedAt?: string }).submittedAt ??
                  grade.graded_at ??
                  grade.created_at ??
                  null
                return (
                  <tr
                    key={i}
                    className={cm.cn('hover:bg-surface-secondary/80 transition-colors group')}
                  >
                    <td
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 5),
                        cm.fontWeight('semibold'),
                        'text-foreground',
                      )}
                    >
                      {courseName ||
                        t('gradeBreakdownTable.unknownCourse', {}, { defaultValue: '—' })}
                    </td>
                    <td
                      className={cm.cn(cm.sp('px', 6), cm.sp('py', 5), 'text-foreground-secondary')}
                    >
                      {assignmentName ||
                        t('gradeBreakdownTable.unknownAssignment', {}, { defaultValue: '—' })}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 5),
                        cm.textRight,
                        cm.fontWeight('medium'),
                        pct < 78 && 'text-error',
                      )}
                    >
                      {t(
                        'gradeBreakdownTable.scoreValue',
                        { score, maxScore },
                        { defaultValue: '{{score}}/{{maxScore}}' },
                      )}
                    </td>
                    <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 5), cm.textCenter)}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.w(8),
                          cm.h(8),
                          'inline-flex items-center justify-center rounded-lg bg-secondary/10 text-secondary',
                        )}
                      >
                        {t(
                          'gradeBreakdownTable.gradeValue',
                          { grade: letter },
                          { defaultValue: '{{grade}}' },
                        )}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 5),
                        cm.textRight,
                        cm.textSize('sm'),
                        'text-foreground-secondary',
                      )}
                    >
                      {formatDate(submittedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default GradeBreakdownTable
export { GradeBreakdownTable }
