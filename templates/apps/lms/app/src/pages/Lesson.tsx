import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import KeyConceptsAccordion from '../components/KeyConceptsAccordion.js'
import LessonCompleteButton from '../components/LessonCompleteButton.js'
import LessonDescription from '../components/LessonDescription.js'
import LessonFooter from '../components/LessonFooter.js'
import LessonHeader from '../components/LessonHeader.js'
import LessonResourcesPanel from '../components/LessonResourcesPanel.js'
import LessonTopNavBar from '../components/LessonTopNavBar.js'
import LessonVideoPlayer from '../components/LessonVideoPlayer.js'
import VideoProgressBar from '../components/VideoProgressBar.js'

interface Resource {
  name: string
  url: string
  type: string
  size?: string
}
interface LessonData {
  id: string
  title: string
  type?: string | null
  url?: string | null
  content_id?: string | null
  course_id?: string
  course_name: string | null
  module_title?: string | null
  order: number
  total_lessons: number
  next_lesson_id: string | null
  prev_lesson_id: string | null
  // Optional fields not yet in the schema; kept so future migrations
  // can populate them without UI changes.
  content?: string
  video_url?: string | null
  duration?: string
  difficulty?: string | null
  key_concepts?: string[]
  resources?: Resource[]
}

function Lesson() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [completed, setCompleted] = useState(false)
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    if (!courseId || !lessonId) return
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/modules/items/${lessonId}`).catch(() => null),
      http.get(`/api/courses/${courseId}/progress`).catch(() => null),
    ])
      .then(([lessonRes, progressRes]) => {
        const lessonBody = ((lessonRes as { data?: unknown } | null)?.data ??
          lessonRes) as LessonData | null
        if (lessonBody?.id) {
          setLesson(lessonBody)
        } else {
          setError(t('lesson.notFound', {}, { defaultValue: 'This lesson is not available.' }))
        }
        const progress = ((progressRes as { data?: unknown } | null)?.data ?? progressRes) as {
          completedLessonIds?: unknown
          percentage?: unknown
        } | null
        if (progress && Array.isArray(progress.completedLessonIds)) {
          setCompleted(progress.completedLessonIds.includes(lessonId))
          setProgressPct(typeof progress.percentage === 'number' ? progress.percentage : 0)
        }
      })
      .catch(() => {
        setError(t('lesson.fetchError', {}, { defaultValue: 'Failed to load this lesson.' }))
      })
      .finally(() => setLoading(false))
  }, [courseId, lessonId, http, t])

  const handleMarkComplete = async () => {
    if (!courseId || !lessonId || marking) return
    setMarking(true)
    try {
      await http.post(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {})
      track({ name: 'lesson.completed', properties: { courseId, lessonId } })
      setCompleted(true)
      const progressRes: unknown = await http
        .get(`/api/courses/${courseId}/progress`)
        .catch(() => null)
      const progress = ((progressRes as { data?: unknown } | null)?.data ?? progressRes) as {
        percentage?: unknown
      } | null
      if (progress && typeof progress.percentage === 'number') {
        setProgressPct(progress.percentage)
      }
    } catch (_error) {
      // Mark-complete failed — the button stays enabled so the user can
      // simply retry; local progress state is left untouched.
    } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.surface, 'text-on-surface antialiased')}>
        <LessonTopNavBar courseId={courseId} />
        <main
          className={cm.cn(
            cm.maxW('[800px]'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            'md:py-20',
          )}
          aria-label={t('lesson.loadingLabel', {}, { defaultValue: 'Loading lesson' })}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'py-20')}>
            <div
              className={cm.cn(
                cm.roundedFull,
                cm.h(10),
                cm.w(10),
                'animate-spin border-b-2 border-primary',
              )}
            />
          </div>
        </main>
      </div>
    )
  }

  const keyConcepts = lesson?.key_concepts ?? []
  const resources = lesson?.resources ?? []
  const courseProgress = progressPct ?? 0

  if (error) {
    return (
      <div className={cm.cn(cm.surface, 'text-on-surface antialiased')}>
        <LessonTopNavBar courseId={courseId} />
        <main
          className={cm.cn(
            cm.maxW('[800px]'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            'md:py-20',
          )}
        >
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-error-container text-on-error-container rounded-2xl',
            )}
            role="alert"
            data-mol-id="lesson-error"
          >
            {error}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface antialiased')}>
      <LessonTopNavBar
        courseId={courseId}
        courseName={lesson?.course_name ?? undefined}
        lessonOrder={lesson?.order}
        totalLessons={lesson?.total_lessons}
        prevLessonId={lesson?.prev_lesson_id ?? undefined}
        nextLessonId={lesson?.next_lesson_id ?? undefined}
        onPrevious={
          lesson?.prev_lesson_id && courseId
            ? () => navigate(`/course/${courseId}/lesson/${lesson.prev_lesson_id}`)
            : undefined
        }
        onNext={
          lesson?.next_lesson_id && courseId
            ? () => navigate(`/course/${courseId}/lesson/${lesson.next_lesson_id}`)
            : undefined
        }
      />
      <main
        className={cm.cn(
          cm.maxW('[800px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('py', 12),
          'md:py-20',
        )}
      >
        <div className={cm.stack(10)}>
          <LessonHeader
            title={lesson?.title}
            order={lesson?.order}
            duration={lesson?.duration}
            difficulty={lesson?.difficulty ?? undefined}
            type={lesson?.type ?? undefined}
          />
          <LessonVideoPlayer
            duration={lesson?.duration}
            videoUrl={lesson?.video_url ?? undefined}
          />
          <VideoProgressBar progress={courseProgress} />
          <LessonDescription lesson={{ description: lesson?.content }} />
          <KeyConceptsAccordion concepts={keyConcepts} />
          <LessonResourcesPanel resources={resources} />
          <LessonCompleteButton
            completed={completed}
            loading={marking}
            onComplete={handleMarkComplete}
          />
        </div>
      </main>
      <LessonFooter />
    </div>
  )
}

export default Lesson
export { Lesson, Lesson as LessonPage }
