import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface ConversationRow {
  id: string
  bot_id: string
  visitor_name: string
  avatar_url?: string
  intent: string
  resolution: string
  duration: string
  rating: number
  created_at: string
}

interface Props {
  conversation: ConversationRow
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function resolutionClasses(resolution: string): string {
  if (resolution === 'Resolved') return 'bg-success-light text-success'
  if (resolution === 'In Progress') return 'bg-blue-100 text-blue-700'
  if (resolution === 'Escalated') return 'bg-error-container text-error'
  return 'bg-surface-container text-on-surface-variant'
}

export default function ConversationTableRow({ conversation }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <tr
      className={'hover:bg-surface-container-low'}
      style={{
        transitionProperty:
          'color, background-color, border-color, text-decoration-color, fill, stroke',
        transitionDuration: '150ms',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      data-mol-id={`conversation-row-${conversation.id}`}
    >
      <td
        style={{
          paddingLeft: 'calc(8 * 0.25rem)',
          paddingRight: 'calc(8 * 0.25rem)',
          padding: 'calc(5 * 0.25rem)',
        }}
      >
        <div className={cm.flex({ align: 'center' })} style={{ gap: 'calc(3 * 0.25rem)' }}>
          {conversation.avatar_url ? (
            <img
              alt="User Avatar"
              className={cm.roundedFull}
              style={{ width: '8rem-scaled', height: 'calc(8 * 0.25rem)', objectFit: 'cover' }}
              src={conversation.avatar_url}
            />
          ) : (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.roundedFull,
              )}
              style={{
                width: '8rem-scaled',
                height: 'calc(8 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-secondary-fixed)',
                color: 'var(--md-sys-color-secondary)',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
            >
              {getInitials(conversation.visitor_name)}
            </div>
          )}
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-on-surface)',
            }}
          >
            {conversation.visitor_name}
          </span>
        </div>
      </td>
      <td
        style={{
          paddingLeft: 'calc(8 * 0.25rem)',
          paddingRight: 'calc(8 * 0.25rem)',
          padding: 'calc(5 * 0.25rem)',
        }}
      >
        <span
          className={cm.fontWeight('medium')}
          style={{
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            color: 'var(--md-sys-color-on-surface-variant)',
          }}
        >
          {conversation.intent}
        </span>
      </td>
      <td
        style={{
          paddingLeft: 'calc(8 * 0.25rem)',
          paddingRight: 'calc(8 * 0.25rem)',
          padding: 'calc(5 * 0.25rem)',
        }}
      >
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${resolutionClasses(conversation.resolution)}`}
        >
          {conversation.resolution}
        </span>
      </td>
      <td
        className={cm.fontWeight('medium')}
        style={{
          paddingLeft: 'calc(8 * 0.25rem)',
          paddingRight: 'calc(8 * 0.25rem)',
          padding: 'calc(5 * 0.25rem)',
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          color: 'var(--md-sys-color-outline)',
        }}
      >
        {conversation.duration}
      </td>
      <td
        style={{
          paddingLeft: 'calc(8 * 0.25rem)',
          paddingRight: 'calc(8 * 0.25rem)',
          padding: 'calc(5 * 0.25rem)',
        }}
      >
        {conversation.rating > 0 ? (
          <div
            className={cm.flex()}
            style={{ gap: 'calc(0.5 * 0.25rem)', color: 'var(--md-sys-color-tertiary)' }}
            data-mol-id={`star-rating-${conversation.id}`}
          >
            {[1, 2, 3, 4, 5].map((star) =>
              star <= conversation.rating ? (
                <span
                  key={star}
                  style={{
                    fontFamily: 'Material Symbols outlined',
                    fontSize: '18px',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  star
                </span>
              ) : (
                <span
                  key={star}
                  style={{ fontFamily: 'Material Symbols outlined', fontSize: '18px' }}
                >
                  star
                </span>
              ),
            )}
          </div>
        ) : (
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-outline)',
            }}
          >
            {t('status.pending', {}, { defaultValue: 'Pending' })}
          </span>
        )}
      </td>
    </tr>
  )
}

export { ConversationTableRow }
