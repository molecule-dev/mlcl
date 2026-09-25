import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppShell } from '../components/AppShell.js'
import CourseHeader from '../components/CourseHeader.js'
import CourseResourcesPanel from '../components/CourseResourcesPanel.js'
import KeyConceptsAccordion from '../components/KeyConceptsAccordion.js'
import LessonDescription from '../components/LessonDescription.js'
import LessonTitleBar from '../components/LessonTitleBar.js'
import ModuleProgressCard from '../components/ModuleProgressCard.js'
import StudyTipCard from '../components/StudyTipCard.js'
import TopNavBar from '../components/TopNavBar.js'
import VideoPlayer from '../components/VideoPlayer.js'
import VideoProgressBar from '../components/VideoProgressBar.js'

interface Course {
  id: string
  name: string
  description: string
  status: string
  instructor_id?: string | null
}

interface CourseProgress {
  courseId: string
  completedLessonIds: string[]
  completedCount: number
  totalLessons: number
  percentage: number
}

interface ModuleItem {
  id: string
  title: string
  type?: string
  position?: number
}

interface ModuleRow {
  id: string
  course_id: string
  title: string
  description?: string
  position?: number
}

interface UiLesson {
  id: string
  title: string
  completed: boolean
  duration: string
  type: string
}

interface UiModule {
  id: string
  title: string
  description: string
  order: number
  lessons: UiLesson[]
}

interface UiCourse extends Course {
  progress: number
  total_lessons: number
  completed_lessons: number
}

const unwrap = <T,>(res: unknown): T | null => {
  if (Array.isArray(res)) return res[0] as T
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data ?? null
  return (res as T) ?? null
}

const unwrapList = <T,>(res: unknown): T[] => {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  )
    return (res as { data: T[] }).data
  return []
}

function CourseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { courseId } = useParams<{ courseId: string }>()
  const http = useHttpClient()
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<UiModule[]>([])
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeModuleIdx, setActiveModuleIdx] = useState(0)
  const [expandedConcepts, setExpandedConcepts] = useState<Set<number>>(new Set([0]))
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const [courseRes, modulesRes, progressRes] = await Promise.all([
          http.get(`/api/courses/${courseId}`).catch(() => null),
          http.get(`/api/modules/course/${courseId}`).catch(() => null),
          http.get(`/api/courses/${courseId}/progress`).catch(() => null),
        ])
        if (!active) return

        const courseRow = unwrap<Course>(courseRes)
        const moduleRows = unwrapList<ModuleRow>(modulesRes)
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        const prog = unwrap<CourseProgress>(progressRes)
        const completedLessonIds = new Set(prog?.completedLessonIds ?? [])

        const moduleResults = await Promise.all(
          moduleRows.map(async (m, idx) => {
            const itemsRes = await http.get(`/api/modules/${m.id}/items`).catch(() => null)
            const items = unwrapList<ModuleItem>(itemsRes)
              .slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            const lessons: UiLesson[] = items.map((it) => ({
              id: it.id,
              title: it.title,
              completed: completedLessonIds.has(it.id),
              duration: '',
              type: it.type ?? 'page',
            }))
            const ui: UiModule = {
              id: m.id,
              title: m.title,
              description: m.description ?? '',
              order: idx + 1,
              lessons,
            }
            return ui
          }),
        )

        if (!active) return
        setCourse(courseRow)
        setModules(moduleResults)
        setProgress(prog)
        setActiveModuleIdx(0)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [courseId, http])

  const totalLessons = useMemo(
    () => progress?.totalLessons ?? modules.reduce((sum, m) => sum + m.lessons.length, 0),
    [modules, progress],
  )
  const completedLessons = useMemo(
    () =>
      progress?.completedCount ??
      modules.reduce((sum, m) => sum + m.lessons.filter((l) => l.completed).length, 0),
    [modules, progress],
  )
  const courseProgress = useMemo(
    () =>
      progress?.percentage ??
      (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0),
    [completedLessons, progress, totalLessons],
  )

  const displayCourse: UiCourse | null = course
    ? {
        ...course,
        progress: courseProgress,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
      }
    : null

  const activeModule = modules[activeModuleIdx]
  const activeLessonIdx =
    selectedLessonId != null
      ? (activeModule?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? 0)
      : (activeModule?.lessons?.findIndex((l) => !l.completed) ?? 0)
  const effectiveLessonIdx = activeLessonIdx >= 0 ? activeLessonIdx : 0
  const activeLesson = activeModule?.lessons?.[effectiveLessonIdx]

  const toggleConcept = (idx: number): void => {
    setExpandedConcepts((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const breadcrumb = t(
    'courseDetail.navBreadcrumb',
    {
      course: displayCourse?.name ?? '',
      module:
        activeModule?.title ?? t('courseDetail.moduleFallback', {}, { defaultValue: 'Module' }),
    },
    { defaultValue: 'Courses · {{course}} · {{module}}' },
  )

  if (loading) {
    return (
      <AppShell
        desktopTopBar={<TopNavBar contextCrumb={breadcrumb} />}
        className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}
        contentClassName={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 8),
          cm.sp('pb', 12),
          'pt-6 md:pt-24',
        )}
        contentStyle={{ minHeight: 'calc(100vh - 4rem)' }}
      >
        <div data-mol-id="course-detail-loading">
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              'border-4 border-primary border-t-transparent animate-spin',
            )}
            aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
          />
        </div>
      </AppShell>
    )
  }

  if (!displayCourse) {
    return (
      <AppShell
        desktopTopBar={<TopNavBar contextCrumb={breadcrumb} />}
        className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}
        contentClassName={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 4 }),
          cm.sp('px', 8),
          cm.sp('py', 24),
          'pt-6 md:pt-24 text-center',
        )}
      >
        <div data-mol-id="course-detail-not-found">
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('courseDetail.notFoundTitle', {}, { defaultValue: 'Course not found' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
            {t(
              'courseDetail.notFoundBody',
              {},
              {
                defaultValue:
                  'This course no longer exists, or you do not have access. Try the catalog.',
              },
            )}
          </p>
          <Link
            to="/courses"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textPrimary,
              'rounded-xl border border-outline-variant/40 hover:bg-primary/5',
            )}
          >
            {t('courseDetail.backToCourses', {}, { defaultValue: '← Back to courses' })}
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      desktopTopBar={<TopNavBar contextCrumb={breadcrumb} />}
      className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}
      contentClassName={cm.cn(
        cm.flex({ gap: 8 }),
        cm.sp('px', 8),
        cm.sp('pb', 12),
        'pt-6 md:pt-24 flex-col md:flex-row',
      )}
    >
      <div className={cm.cn(cm.flex1, cm.maxW('5xl'))}>
        <CourseHeader
          course={displayCourse}
          modules={modules}
          activeModuleIdx={activeModuleIdx}
          onModuleChange={(idx: number) => {
            setActiveModuleIdx(idx)
            setSelectedLessonId(null)
          }}
        />
        <div className={cm.stack(10)}>
          {activeModule && activeModule.lessons.length > 0 ? (
            <>
              <LessonTitleBar
                lesson={activeLesson}
                moduleOrder={activeModule?.order ?? activeModuleIdx + 1}
                lessonIdx={effectiveLessonIdx}
              />
              <VideoPlayer />
              <VideoProgressBar progress={displayCourse.progress} />
              <div
                className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), cm.sp('pt', 4), 'md:grid-cols-3')}
              >
                <div className={cm.cn(cm.stack(8), 'md:col-span-2')}>
                  <LessonDescription lesson={activeLesson} />
                  <KeyConceptsAccordion
                    expandedConcepts={expandedConcepts}
                    onToggle={toggleConcept}
                  />
                </div>
                <div className={cm.stack(8)}>
                  <CourseResourcesPanel />
                </div>
              </div>
            </>
          ) : (
            <div
              className={cm.cn(
                cm.sp('p', 10),
                'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest text-center',
              )}
              data-mol-id="course-detail-empty"
            >
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 2))}>
                {modules.length === 0
                  ? t('courseDetail.emptyModulesTitle', {}, { defaultValue: 'No modules yet' })
                  : t(
                      'courseDetail.emptyLessonsTitle',
                      {},
                      { defaultValue: 'No lessons in this module' },
                    )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {modules.length === 0
                  ? t(
                      'courseDetail.emptyModulesBody',
                      {},
                      {
                        defaultValue:
                          'The instructor has not added any modules to this course yet. Check back later.',
                      },
                    )
                  : t(
                      'courseDetail.emptyLessonsBody',
                      {},
                      { defaultValue: 'This module has no lessons yet. Check back later.' },
                    )}
              </p>
            </div>
          )}
        </div>
      </div>
      <aside className={cm.cn(cm.w(80), cm.shrink0)}>
        <div className={cm.cn(cm.stack(8), 'sticky top-24')}>
          {activeModule && activeModule.lessons.length > 0 && (
            <ModuleProgressCard
              courseId={courseId ?? ''}
              module={activeModule}
              activeLessonIdx={effectiveLessonIdx}
              onSelectLesson={setSelectedLessonId}
            />
          )}
          <StudyTipCard />
        </div>
      </aside>
    </AppShell>
  )
}

export default CourseDetail
export { CourseDetail, CourseDetail as CourseDetailPage }
