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

interface RecentConversationsTableProps {
  conversations: ConversationRow[]
  onViewAll: () => void
  onFilter: () => void
}

export default function RecentConversationsTable({
  conversations,
  onViewAll,
  onFilter,
}: RecentConversationsTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const getResolutionClasses = (resolution: string) => {
    if (resolution === 'Resolved') return 'bg-success-light text-success'
    if (resolution === 'In Progress') return 'bg-blue-100 text-blue-700'
    if (resolution === 'Escalated') return 'bg-error-container text-error'
    return 'bg-surface-container-high text-on-surface-variant'
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div
      style={{
        backdropFilter: 'blur(16px)',
        backgroundColor: 'var(--color-glass-bg)',
        border: '1px solid var(--color-glass-border-faint)',
        borderRadius: '2rem',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-on-error)',
        boxShadow: 'var(--tw-shadow-sm, revert)',
        overflow: 'hidden',
      }}
      data-mol-id="recent-conversations"
    >
      <div
        className={cm.flex({ justify: 'between', align: 'center' })}
        style={{
          padding: 'calc(8 * 0.25rem)',
          borderTopWidth: '1px',
          borderColor: 'var(--md-sys-color-surface-container-high)',
        }}
        data-mol-id="recent-conversations-header"
      >
        <h4
          className={cm.fontWeight('bold')}
          style={{
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            color: 'var(--md-sys-color-on-surface)',
          }}
        >
          {t('recent-conversations.title', {}, { defaultValue: 'Recent Conversations' })}
        </h4>
        <button
          className={'hover:bg-surface-variant'}
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            padding: 'calc(2 * 0.25rem)',
            borderRadius: '0.75rem',
            transitionProperty:
              'color, background-color, border-color, text-decoration-color, fill, stroke',
            transitionDuration: '150ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={onFilter}
        >
          <span
            style={{
              fontFamily: 'Material Symbols outlined',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            filter_list
          </span>
        </button>
      </div>
      <div style={{ overflowX: 'auto' }} data-mol-id="recent-conversations-table-wrap">
        <table style={{ width: '100%', color: 'var(--md-sys-color-left)' }}>
          <thead>
            <tr
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-surface-container-low) 50%, transparent)',
              }}
            >
              <th
                className={cm.fontWeight('bold')}
                style={{
                  paddingLeft: 'calc(8 * 0.25rem)',
                  paddingRight: 'calc(8 * 0.25rem)',
                  padding: 'calc(4 * 0.25rem)',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-outline)',
                  textTransform: 'uppercase',
                  letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                }}
              >
                {t('recent-conversations.col-user', {}, { defaultValue: 'User' })}
              </th>
              <th
                className={cm.fontWeight('bold')}
                style={{
                  paddingLeft: 'calc(8 * 0.25rem)',
                  paddingRight: 'calc(8 * 0.25rem)',
                  padding: 'calc(4 * 0.25rem)',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-outline)',
                  textTransform: 'uppercase',
                  letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                }}
              >
                {t('recent-conversations.col-intent', {}, { defaultValue: 'Intent' })}
              </th>
              <th
                className={cm.fontWeight('bold')}
                style={{
                  paddingLeft: 'calc(8 * 0.25rem)',
                  paddingRight: 'calc(8 * 0.25rem)',
                  padding: 'calc(4 * 0.25rem)',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-outline)',
                  textTransform: 'uppercase',
                  letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                }}
              >
                {t('recent-conversations.col-resolution', {}, { defaultValue: 'Resolution' })}
              </th>
              <th
                className={cm.fontWeight('bold')}
                style={{
                  paddingLeft: 'calc(8 * 0.25rem)',
                  paddingRight: 'calc(8 * 0.25rem)',
                  padding: 'calc(4 * 0.25rem)',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-outline)',
                  textTransform: 'uppercase',
                  letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                }}
              >
                {t('form.duration', {}, { defaultValue: 'Duration' })}
              </th>
              <th
                className={cm.fontWeight('bold')}
                style={{
                  paddingLeft: 'calc(8 * 0.25rem)',
                  paddingRight: 'calc(8 * 0.25rem)',
                  padding: 'calc(4 * 0.25rem)',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-outline)',
                  textTransform: 'uppercase',
                  letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
                }}
              >
                {t('recent-conversations.col-satisfaction', {}, { defaultValue: 'Satisfaction' })}
              </th>
            </tr>
          </thead>
          <tbody
            style={{
              borderTopWidth: '1px',
              borderTopStyle: 'solid',
              borderColor: 'var(--color-surface-container-high)',
            }}
          >
            {conversations.map((conversation) => (
              <tr
                key={conversation.id}
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
                  <div
                    className={cm.flex({ align: 'center' })}
                    style={{ gap: 'calc(3 * 0.25rem)' }}
                  >
                    {conversation.avatar_url ? (
                      <img
                        alt="User Avatar"
                        className={cm.roundedFull}
                        style={{
                          width: '8rem-scaled',
                          height: 'calc(8 * 0.25rem)',
                          objectFit: 'cover',
                        }}
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
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getResolutionClasses(conversation.resolution)}`}
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
                  {conversation.rating === 0 ? (
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
                  ) : (
                    <div
                      className={cm.flex()}
                      style={{ gap: 'calc(0.5 * 0.25rem)', color: 'var(--md-sys-color-tertiary)' }}
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          style={{
                            fontFamily: 'Material Symbols outlined',
                            fontSize: '18px',
                            ...(i < conversation.rating
                              ? { fontVariationSettings: "'FILL' 1" }
                              : {}),
                          }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className={cm.flex({ justify: 'center' })}
        style={{
          padding: 'calc(4 * 0.25rem)',
          backgroundColor:
            'color-mix(in srgb, var(--md-sys-color-surface-container-low) 30%, transparent)',
          borderTopWidth: '1px',
          borderColor: 'var(--md-sys-color-surface-container-high)',
        }}
        data-mol-id="recent-conversations-footer"
      >
        <button
          className={cm.cn(cm.fontWeight('bold'), 'hover:underline')}
          style={{
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            color: 'var(--md-sys-color-primary)',
          }}
          onClick={onViewAll}
        >
          {t('recent-conversations.view-all', {}, { defaultValue: 'View All Conversations' })}
        </button>
      </div>
    </div>
  )
}

export { RecentConversationsTable }
