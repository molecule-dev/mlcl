/**
 * Question type badge — pill keyed to question type taxonomy from DESIGN.md
 * (Multiple Choice = primary, Open Text = accent emerald, Rating = amber,
 * Ranking = violet, Word Cloud = pink).
 *
 * Translated from applicant-tracking's StagePill (uppercase tracking-widest
 * pill with semantic palette per category) — recoloured to match the
 * "Question Type Badge" recipe in DESIGN.md.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type QuestionType =
  'single-choice' | 'multiple-choice' | 'ranked' | 'open-text' | 'rating' | 'word-cloud'

const TINT: Record<QuestionType, { bg: string; text: string }> = {
  'single-choice': {
    bg: 'color-mix(in srgb, var(--mol-color-info) 12%, transparent)',
    text: 'var(--mol-color-info)',
  },
  'multiple-choice': {
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
    text: 'var(--mol-color-info)',
  },
  ranked: {
    bg: 'color-mix(in srgb, var(--mol-color-primary) 12%, transparent)',
    text: 'var(--mol-color-primary-dark)',
  },
  'open-text': {
    bg: 'color-mix(in srgb, var(--mol-color-success) 12%, transparent)',
    text: 'var(--mol-color-success)',
  },
  rating: {
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    text: 'var(--mol-color-warning)',
  },
  'word-cloud': {
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 12%, transparent)',
    text: 'var(--mol-color-secondary)',
  },
}

const ICON: Record<QuestionType, string> = {
  'single-choice': 'radio_button_checked',
  'multiple-choice': 'check_box',
  ranked: 'reorder',
  'open-text': 'edit_note',
  rating: 'star',
  'word-cloud': 'cloud',
}

const DEFAULT_LABEL: Record<QuestionType, string> = {
  'single-choice': 'Single choice',
  'multiple-choice': 'Multiple choice',
  ranked: 'Ranked',
  'open-text': 'Open text',
  rating: 'Rating',
  'word-cloud': 'Word cloud',
}

interface QuestionTypeBadgeProps {
  type: QuestionType
  size?: 'sm' | 'md'
}

export function QuestionTypeBadge({ type, size = 'sm' }: QuestionTypeBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = TINT[type]
  const label = t(`questionTypeBadge.${type}`, {}, { defaultValue: DEFAULT_LABEL[type] })
  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-1.5 rounded-full uppercase tracking-widest font-black',
        size === 'md' ? 'px-3 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]',
      )}
      style={{ backgroundColor: tint.bg, color: tint.text }}
    >
      <span
        className={cm.cn(
          'material-symbols-outlined',
          size === 'md' ? 'text-[14px]' : 'text-[12px]',
        )}
        aria-hidden="true"
      >
        {ICON[type]}
      </span>
      {label}
    </span>
  )
}
