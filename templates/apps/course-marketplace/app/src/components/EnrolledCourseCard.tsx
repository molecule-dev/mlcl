/**
 * Enrolled course card — image with status pill, title + instructor,
 * progress bar with lessons-completed count, and contextual CTA.
 *
 * Translated from lms's CourseCard.tsx (progress + CTA layout)
 * for MyLearning + InstructorDashboard usage.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type EnrollmentStatus = 'in-progress' | 'completed' | 'not-started'

export type EnrolledCourseCardProps = {
  id: string
  title: string
  instructor: string
  lessonsTotal: number
  lessonsCompleted: number
  imageSeed?: string
  continueHref?: string
  certificateHref?: string
}

function statusFor(props: EnrolledCourseCardProps): EnrollmentStatus {
  if (props.lessonsCompleted === 0) return 'not-started'
  if (props.lessonsCompleted >= props.lessonsTotal) return 'completed'
  return 'in-progress'
}

export function EnrolledCourseCard(props: EnrolledCourseCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const status = statusFor(props)
  const percent =
    props.lessonsTotal === 0 ? 0 : Math.round((props.lessonsCompleted / props.lessonsTotal) * 100)
  const seed = props.imageSeed ?? `enrolled-${props.id}`
  const statusMeta: Record<EnrollmentStatus, { label: string; cls: string }> = {
    'in-progress': {
      label: t('status.inProgress', {}, { defaultValue: 'In progress' }),
      cls: 'bg-secondary-container text-on-secondary-container',
    },
    completed: {
      label: t('common.completed', {}, { defaultValue: 'Completed' }),
      cls: 'bg-primary text-white',
    },
    'not-started': {
      label: t('enrolledCourseCard.status.notStarted', {}, { defaultValue: 'Not started' }),
      cls: 'bg-surface-container-highest text-on-surface-variant',
    },
  }
  const meta = statusMeta[status]
  return (
    <article
      className={cm.cn(
        'group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-[0px_12px_32px_rgba(75,8,201,0.08)] transition-all duration-300',
      )}
      data-mol-id={`enrolled-course-${props.id}`}
    >
      <div className={cm.cn('relative aspect-video overflow-hidden')}>
        <img
          alt={props.title}
          className={cm.cn('w-full h-full object-cover')}
          src={`https://picsum.photos/seed/${seed}/640/360`}
        />
        <span
          className={cm.cn(
            'absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm',
            meta.cls,
          )}
        >
          {status === 'completed' && (
            <span
              className={cm.cn('material-symbols-outlined text-[14px]')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          )}
          {meta.label}
        </span>
      </div>
      <div className={cm.cn(cm.sp('p', 6), 'flex flex-col flex-grow')}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.sp('mb', 1),
            'leading-tight text-on-surface group-hover:text-primary transition-colors',
          )}
        >
          {props.title}
        </h3>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mb', 5), 'text-primary-container font-medium')}
        >
          {props.instructor}
        </p>
        <div className={cm.cn('mt-auto')}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span>
              {t(
                'enrolledCourseCard.lessons',
                { done: props.lessonsCompleted, total: props.lessonsTotal },
                { defaultValue: '{{done}} of {{total}} lessons' },
              )}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{percent}%</span>
          </div>
          <div
            className={cm.cn(
              'h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mb-5',
            )}
          >
            <div
              className={cm.cn(
                'h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500',
              )}
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          {status === 'completed' ? (
            <Link
              to={props.certificateHref ?? `/my-learning/${props.id}/certificate`}
              data-mol-id="btn-certificate"
              className={cm.cn(
                'w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-colors',
                'bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                workspace_premium
              </span>
              {t(
                'enrolledCourseCard.downloadCertificate',
                {},
                { defaultValue: 'View certificate' },
              )}
            </Link>
          ) : status === 'not-started' ? (
            <Link
              to={props.continueHref ?? `/courses/${props.id}`}
              data-mol-id="btn-start"
              className={
                'w-full inline-flex items-center justify-center py-3 rounded-lg font-bold bg-surface-container-high text-primary hover:bg-surface-container-highest transition-colors'
              }
            >
              {t('enrolledCourseCard.startLearning', {}, { defaultValue: 'Start learning' })}
            </Link>
          ) : (
            <Link
              to={props.continueHref ?? `/courses/${props.id}`}
              data-mol-id="btn-continue"
              className={
                'w-full inline-flex items-center justify-center py-3 rounded-lg font-bold bg-primary-container text-on-primary hover:bg-primary transition-colors'
              }
            >
              {t('common.continue', {}, { defaultValue: 'Continue' })}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export default EnrolledCourseCard
