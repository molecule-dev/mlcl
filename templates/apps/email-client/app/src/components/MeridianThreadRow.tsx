import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface ThreadLabel {
  name: string
  /** Tailwind tone — drives the background+text color of the chip. */
  tone?: 'work' | 'travel' | 'newsletter' | 'urgent' | 'personal' | 'receipt'
}

export interface ThreadRowData {
  id: string
  sender: string
  /** Two-letter avatar fallback initials (used when no avatar URL). */
  initials?: string
  subject: string
  snippet: string
  timestamp: string
  unread?: boolean
  starred?: boolean
  hasAttachment?: boolean
  labels?: ThreadLabel[]
}

interface MeridianThreadRowProps {
  thread: ThreadRowData
  active?: boolean
  /** Tighter vertical density — the user's "Compact thread rows" preference. */
  compact?: boolean
  onClick?: () => void
  onToggleStar?: () => void
}

const LABEL_TONES: Record<NonNullable<ThreadLabel['tone']>, string> = {
  work: 'bg-primary/10 text-primary-dark',
  travel: 'bg-success-light text-success',
  newsletter: 'bg-secondary/10 text-secondary',
  urgent: 'bg-error-light text-error',
  personal: 'bg-warning-light text-warning',
  receipt: 'bg-surface-container text-on-surface-variant',
}

const AVATAR_TONES = [
  'bg-primary/10 text-primary-dark',
  'bg-secondary/10 text-secondary',
  'bg-success-light text-success',
  'bg-warning-light text-warning',
  'bg-error-light text-error',
]

function avatarTone(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]!
}

/**
 * Editorial thread-list row with avatar chip, sender + timestamp, subject,
 * snippet, optional inline label chips, attachment glyph, and a left
 * brand-blue rail when unread or active.
 *
 * Translated from personal-finance's AccountRecentTransactions row +
 * crm's ActivityFeed item, adapted to email-thread vocabulary.
 */
export function MeridianThreadRow({
  thread,
  active,
  compact,
  onClick,
  onToggleStar,
}: MeridianThreadRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initials = thread.initials || thread.sender.slice(0, 2).toUpperCase()

  const starIcon = (
    <span
      className={cm.cn(
        'material-symbols-outlined text-base transition-colors',
        thread.starred ? 'text-warning' : 'text-on-surface-variant/40 group-hover:text-warning/60',
      )}
      style={thread.starred ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      star
    </span>
  )
  const starColumnClass = cm.cn(
    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
    cm.sp('mt', 1),
    'shrink-0',
  )

  return (
    // The row contains its own interactive star button, so it must not itself
    // be interactive (axe `nested-interactive`: no focusable descendants inside
    // a role="button"). Instead a transparent "stretched" button overlays the
    // row for the open-thread action; the star button is a positioned sibling
    // rendered later, so it paints above the overlay and stays independently
    // clickable and keyboard-reachable.
    <div
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('px', 4),
        cm.sp('py', compact ? 2 : 3),
        cm.w('full'),
        'group relative text-left border-b border-outline-variant/40 transition-colors',
        active
          ? 'bg-thread-active'
          : thread.unread
            ? 'bg-unread-light/40 hover:bg-unread-light/60'
            : 'hover:bg-surface-container-low',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cm.cn(cm.cursorPointer, 'absolute inset-0 w-full')}
        aria-current={active ? 'true' : undefined}
        aria-label={t(
          'meridian.thread.open',
          { subject: thread.subject, sender: thread.sender },
          { defaultValue: 'Open thread: {{subject}} from {{sender}}' },
        )}
      />
      {(thread.unread || active) && (
        <span
          className={'absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r pointer-events-none'}
          aria-hidden="true"
        />
      )}

      {onToggleStar ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar()
          }}
          className={cm.cn(starColumnClass, 'relative')}
          aria-pressed={thread.starred ?? false}
          aria-label={
            thread.starred
              ? t('meridian.thread.unstar', {}, { defaultValue: 'Remove star' })
              : t('meridian.thread.star', {}, { defaultValue: 'Add star' })
          }
        >
          {starIcon}
        </button>
      ) : (
        <span className={starColumnClass} aria-hidden="true">
          {starIcon}
        </span>
      )}

      <span
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.fontWeight('bold'),
          cm.textSize('sm'),
          cm.roundedFull,
          'shrink-0',
          avatarTone(thread.sender),
        )}
        aria-hidden="true"
      >
        {initials}
      </span>

      <span className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0 gap-0.5')}>
        <span className={cm.flex({ align: 'center', justify: 'between' })}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight(thread.unread ? 'bold' : 'medium'),
              'truncate text-on-surface',
            )}
          >
            {thread.sender}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('ml', 2),
              'shrink-0 tabular-nums',
              thread.unread ? 'text-primary font-bold' : 'text-on-surface-variant',
            )}
          >
            {thread.timestamp}
          </span>
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight(thread.unread ? 'semibold' : 'medium'),
            'truncate text-on-surface',
          )}
        >
          {thread.subject}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          {thread.hasAttachment && (
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              attach_file
            </span>
          )}
          <span className={'truncate flex-1'}>{thread.snippet}</span>
        </span>
        {thread.labels && thread.labels.length > 0 && (
          <span className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 1))}>
            {thread.labels.map((l) => (
              <span
                key={l.name}
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-[10px] py-0.5 uppercase tracking-wider',
                  LABEL_TONES[l.tone ?? 'receipt'],
                )}
              >
                {l.name}
              </span>
            ))}
          </span>
        )}
      </span>
    </div>
  )
}
