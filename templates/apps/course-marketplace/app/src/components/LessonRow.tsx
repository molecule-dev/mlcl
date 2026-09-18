/**
 * Lesson sidebar row — type icon (video/article/quiz) + title + duration,
 * with completed checkmark and active/primary highlight states.
 *
 * Translated from lms's LessonResourcesPanel row treatment into the
 * Lectura purple/gold per DESIGN.md (active row: primary-fixed bg with
 * 3px primary left border).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type LessonRowKind = 'video' | 'article' | 'quiz'

export type LessonRowProps = {
  courseId: string
  lessonId: string
  index: number
  title: string
  durationLabel: string
  kind: LessonRowKind
  completed?: boolean
  active?: boolean
}

const kindIcon: Record<LessonRowKind, string> = {
  video: 'play_circle',
  article: 'article',
  quiz: 'quiz',
}

export function LessonRow(props: LessonRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const base = props.active
    ? 'bg-primary-fixed border-l-[3px] border-primary text-on-primary-fixed'
    : props.completed
      ? 'text-on-surface-variant hover:bg-surface-container-low'
      : 'text-on-surface hover:bg-surface-container-low'
  return (
    <Link
      to={`/lesson/${props.lessonId}`}
      data-mol-id={`lesson-row-${props.lessonId}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'transition-colors',
        base,
      )}
      aria-current={props.active ? 'page' : undefined}
    >
      <span
        className={cm.cn(
          'material-symbols-outlined text-[18px]',
          props.active ? 'text-primary' : 'text-on-surface-variant',
        )}
        style={{ fontVariationSettings: props.completed ? "'FILL' 1" : "'FILL' 0" }}
        aria-hidden="true"
      >
        {props.completed ? 'check_circle' : kindIcon[props.kind]}
      </span>
      <div className={cm.cn('flex-1 min-w-0')}>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight(props.active ? 'bold' : 'medium'),
            'leading-tight truncate',
            props.completed && !props.active && 'line-through opacity-70',
          )}
        >
          {t(
            'lessonRow.indexTitle',
            { index: props.index, title: props.title },
            { defaultValue: '{{index}}. {{title}}' },
          )}
        </p>
      </div>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant tabular-nums whitespace-nowrap',
        )}
      >
        {props.durationLabel}
      </span>
    </Link>
  )
}

export default LessonRow
