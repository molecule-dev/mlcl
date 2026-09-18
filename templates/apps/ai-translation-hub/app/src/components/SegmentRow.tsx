import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type SegmentStatus =
  | 'untranslated'
  | 'draft'
  | 'machine'
  | 'in_review'
  | 'needs_review'
  | 'needs_revision'
  | 'approved'

export interface Segment {
  id: string
  number: number
  source: string
  target: string
  status: SegmentStatus
  /** AI confidence (0-100). */
  confidence: number
  /** Optional translation memory match percentage. */
  tm_match?: number
}

interface SegmentRowProps {
  segment: Segment
  active?: boolean
  onSelect?: (id: string) => void
  /** Edit / persist a new target_text value. Async; called on blur if dirty. */
  onCommit?: (id: string, target: string) => Promise<void> | void
}

const STATUS_BORDER: Record<SegmentStatus, string> = {
  untranslated: 'border-l-outline',
  draft: 'border-l-tertiary',
  machine: 'border-l-secondary',
  in_review: 'border-l-warning',
  needs_review: 'border-l-warning',
  needs_revision: 'border-l-tertiary',
  approved: 'border-l-success',
}

const STATUS_LABEL: Record<SegmentStatus, string> = {
  untranslated: 'Untranslated',
  draft: 'Draft',
  machine: 'Machine',
  in_review: 'In review',
  needs_review: 'Needs review',
  needs_revision: 'Needs revision',
  approved: 'Approved',
}

const CONFIDENCE_TONE = (c: number): string => {
  if (c >= 90) return 'text-success'
  if (c >= 75) return 'text-warning'
  return 'text-tertiary'
}

/**
 * Side-by-side translation editor row — gutter (segment number),
 * source pane (slate), target pane (indigo tint), status meta. The
 * target pane is an editable textarea so a user can actually type a
 * translation. Edits are debounced/committed on blur via `onCommit`.
 */
export function SegmentRow({ segment, active = false, onSelect, onCommit }: SegmentRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [draft, setDraft] = useState<string>(segment.target)
  const dirtyRef = useRef(false)

  useEffect(() => {
    setDraft(segment.target)
    dirtyRef.current = false
  }, [segment.id, segment.target])

  const handleBlur = async () => {
    if (!onCommit) return
    if (!dirtyRef.current) return
    if (draft === segment.target) return
    dirtyRef.current = false
    try {
      await onCommit(segment.id, draft)
    } catch (_error) {
      // Commit failed — revert the optimistic local draft to the last persisted value.
      setDraft(segment.target)
    }
  }

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(segment.id) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (
                (e.key === 'Enter' || e.key === ' ') &&
                (e.target as HTMLElement).tagName !== 'TEXTAREA'
              ) {
                onSelect(segment.id)
              }
            }
          : undefined
      }
      className={cm.cn(
        cm.flex({ align: 'stretch' }),
        'w-full border-b border-surface-container transition-colors',
        active
          ? 'bg-surface-container-highest border-l-2 border-l-primary'
          : 'border-l-2 border-l-transparent hover:bg-surface-container-low',
        onSelect ? 'cursor-pointer' : '',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'center' }),
          cm.sp('pt', 4),
          'w-10 text-outline font-mono text-xs select-none',
        )}
      >
        {segment.number}
      </div>
      <div
        className={cm.cn(
          cm.flex1,
          cm.sp('p', 4),
          'bg-source-pane font-serif-content text-on-surface min-w-0',
        )}
      >
        {segment.source}
      </div>
      <div
        className={cm.cn(
          cm.flex1,
          cm.sp('p', 4),
          'bg-target-pane font-serif-content text-on-surface min-w-0 border-l-4',
          STATUS_BORDER[segment.status],
        )}
      >
        {onCommit ? (
          <textarea
            data-mol-id={`segment-target-${segment.id}`}
            aria-label={t(
              'segmentRow.targetAria',
              { number: segment.number },
              { defaultValue: 'Target translation for segment {{number}}' },
            )}
            value={draft}
            onChange={(e) => {
              dirtyRef.current = true
              setDraft(e.target.value)
            }}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => {
              void handleBlur()
            }}
            placeholder={t('segmentRow.placeholder', {}, { defaultValue: 'Type the translation…' })}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'min-h-[44px] bg-transparent border-0 focus:ring-0 focus:outline-none resize-none font-serif-content text-base placeholder:text-outline-variant',
            )}
            rows={Math.max(1, draft.split('\n').length)}
          />
        ) : (
          <p>{segment.target}</p>
        )}
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 2))}
        >
          <span
            data-mol-id={`segment-status-${segment.id}`}
            className={cm.cn(
              cm.fontWeight('bold'),
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-widest bg-surface-container-low text-on-surface-variant',
            )}
          >
            {t(
              `segmentRow.status.${segment.status}`,
              {},
              { defaultValue: STATUS_LABEL[segment.status] },
            )}
          </span>
          <span
            className={cm.cn(cm.textSize('xs'), 'font-mono', CONFIDENCE_TONE(segment.confidence))}
          >
            {t(
              'segmentRow.confidence',
              { value: segment.confidence },
              { defaultValue: '{{value}}% confidence' },
            )}
          </span>
          {segment.tm_match !== undefined && (
            <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
              {t(
                'segmentRow.tmMatch',
                { value: segment.tm_match },
                { defaultValue: 'TM {{value}}%' },
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
