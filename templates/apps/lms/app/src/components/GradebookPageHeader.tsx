import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type Course = { id: string; name: string; [key: string]: unknown }
type GradeRow = Record<string, unknown>

/**
 * Build a CSV blob from the current grades view and trigger a browser
 * download. Pure client-side — no backend export endpoint needed; the
 * data is already loaded in the page state.
 */
function downloadGradesCsv(grades: GradeRow[], courses: Course[], scope: string): void {
  const courseNameById = new Map(courses.map((c) => [String(c.id), String(c.name)]))
  const header = ['course', 'assignment_id', 'score', 'max_score', 'letter_grade', 'graded_at']
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = grades.map((g) => [
    courseNameById.get(String(g.course_id ?? g.courseId ?? '')) ?? String(g.course_id ?? ''),
    g.assignment_id ?? g.assignmentId ?? '',
    g.score ?? '',
    g.max_score ?? g.maxScore ?? '',
    g.letter_grade ?? g.letterGrade ?? '',
    g.graded_at ?? g.gradedAt ?? '',
  ])
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `grades-${scope || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function GradebookPageHeader({
  courses = [],
  selectedCourse = '',
  onCourseChange,
  grades = [],
}: {
  courses?: Course[]
  selectedCourse?: string
  onCourseChange?: (id: string) => void
  grades?: GradeRow[]
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const scope = selectedCourse
    ? (courses.find((c) => String(c.id) === selectedCourse)?.name ?? selectedCourse)
    : t('gradebookPageHeader.allCoursesOption', {}, { defaultValue: 'all-courses' })
  const canExport = grades.length > 0
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 4 }),
        'md:flex-row md:items-end',
      )}
    >
      <div>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'tracking-[0.1em] uppercase font-label',
          )}
        >
          {t('gradebookPageHeader.overline', {}, { defaultValue: 'Performance Overview' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mt', 1),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('gradebookPageHeader.title', {}, { defaultValue: 'Academic Grades' })}
        </h1>
      </div>
      <div className={cm.cn(cm.flex({ gap: 3 }))}>
        <div className={cm.cn('relative')}>
          <select
            aria-label={t(
              'gradebookPageHeader.courseFilterLabel',
              {},
              { defaultValue: 'Filter by course' },
            )}
            className={cm.cn(
              cm.sp('py', 3),
              cm.sp('pl', 4),
              cm.sp('pr', 10),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'appearance-none bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 min-w-[200px]',
            )}
            value={selectedCourse}
            onChange={(e) => onCourseChange?.(e.target.value)}
          >
            <option value="">
              {t('gradebookPageHeader.allCoursesOption', {}, { defaultValue: 'All Courses' })}
            </option>
            {courses.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {String(c.name)}
              </option>
            ))}
          </select>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]',
            )}
          >
            expand_more
          </span>
        </div>
        <button
          type="button"
          data-mol-id="btn-gradebook-export"
          disabled={!canExport}
          aria-label={t(
            'gradebookPageHeader.exportButtonLabel',
            {},
            { defaultValue: 'Export grades to CSV' },
          )}
          title={t(
            'gradebookPageHeader.exportButtonLabel',
            {},
            { defaultValue: 'Export grades to CSV' },
          )}
          className={cm.cn(
            cm.sp('p', 3),
            'bg-surface-container-lowest rounded-xl hover:bg-surface-container-low transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          onClick={() => {
            if (!canExport) return
            downloadGradesCsv(grades, courses, String(scope))
          }}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-on-surface-variant text-[18px]')}
          >
            file_download
          </span>
        </button>
      </div>
    </div>
  )
}

export default GradebookPageHeader
export { GradebookPageHeader }
