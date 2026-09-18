/**
 * Instructor avatar card — large round portrait, name, role/specialty,
 * stats triad (rating, students, courses). Used on Landing's "Learn from
 * the best" section, CourseDetail's instructor block, and InstructorProfile.
 *
 * Translated from lms's profile-style avatar treatment plus
 * personal-finance's editorial KPI rows into Lectura's purple palette.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type InstructorAvatarCardProps = {
  id: string
  name: string
  role: string
  bio?: string
  avgRating: number
  studentCount: number
  courseCount: number
  avatarSeed?: string
}

export function InstructorAvatarCard(props: InstructorAvatarCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const seed = props.avatarSeed ?? props.id
  const stats: Array<{ label: string; value: string }> = [
    {
      label: t('form.rating', {}, { defaultValue: 'Rating' }),
      value: props.avgRating.toFixed(1),
    },
    {
      label: t('instructorAvatarCard.students', {}, { defaultValue: 'Students' }),
      value:
        props.studentCount >= 1000
          ? `${(props.studentCount / 1000).toFixed(1)}K`
          : props.studentCount.toLocaleString(),
    },
    {
      label: t('instructorAvatarCard.courses', {}, { defaultValue: 'Courses' }),
      value: props.courseCount.toLocaleString(),
    },
  ]
  return (
    <Link
      to={`/instructors/${props.id}`}
      data-mol-id={`instructor-${props.id}`}
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', align: 'center' }),
        'group bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-[0px_12px_32px_rgba(75,8,201,0.08)] text-center transition-all',
      )}
    >
      <div
        className={cm.cn(
          'w-32 h-32 rounded-full overflow-hidden mb-5 border-4 border-surface-container-lowest shadow-sm',
        )}
      >
        <img
          src={`https://i.pravatar.cc/256?u=${seed}`}
          alt={props.name}
          className={cm.cn(
            'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
          )}
        />
      </div>
      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
        {props.name}
      </h3>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mt', 1),
          cm.sp('mb', 4),
          'text-primary-container font-medium',
        )}
      >
        {props.role}
      </p>
      {props.bio && (
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 5), 'text-on-surface-variant')}>
          {props.bio}
        </p>
      )}
      <div
        className={cm.cn(
          cm.flex({ justify: 'center' }),
          'w-full pt-4 border-t border-outline-variant/20 gap-6',
        )}
      >
        {stats.map((s) => (
          <div key={s.label} className={cm.cn('text-center')}>
            <p
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {s.value}
            </p>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-1',
              )}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </Link>
  )
}

export default InstructorAvatarCard
