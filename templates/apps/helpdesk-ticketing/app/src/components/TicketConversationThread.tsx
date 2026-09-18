import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Reply {
  id: string
  body: string
  is_internal: boolean
  author_name?: string
  created_at: string
}

function fmtDate(s: string) {
  const d = new Date(s)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function TicketConversationThread({ replies }: { replies: Reply[] }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  if (!replies.length) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.textSize('sm'), 'text-outline')}>
        {t(
          'ticketConversationThread.empty',
          {},
          { defaultValue: 'No messages yet — be the first to reply.' },
        )}
      </div>
    )
  }
  return (
    <div className={cm.stack(6)}>
      {replies.map((reply) =>
        reply.is_internal ? (
          <div key={reply.id} className={cm.flex({ justify: 'center' })}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 3 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('medium'),
                'bg-surface-container-highest/50 text-[11px] text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                data-icon="lock"
              >
                lock
              </span>
              <span>{reply.body}</span>
              <span className={cm.cn('text-outline')}>
                {t(
                  'ticketConversationThread.internalNoteDate',
                  { date: fmtDate(reply.created_at) },
                  { defaultValue: '• {{date}}' },
                )}
              </span>
            </div>
          </div>
        ) : (
          <div key={reply.id} className={cm.flex({ gap: 4 })}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.shrink0,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'bg-primary-fixed text-on-surface',
              )}
            >
              {reply.author_name
                ? initials(reply.author_name)
                : t('ticketConversationThread.unknownAuthorInitials', {}, { defaultValue: '?' })}
            </div>
            <div className={cm.cn(cm.flex1, cm.stack(2))}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                >
                  {reply.author_name ?? t('settings.unknown', {}, { defaultValue: 'Unknown' })}
                </span>
                <span className={cm.cn('text-[11px] text-outline')}>
                  {t(
                    'ticketConversationThread.messageDate',
                    { date: fmtDate(reply.created_at) },
                    { defaultValue: '{{date}}' },
                  )}
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.textSize('sm'),
                  'bg-surface-container-low rounded-2xl rounded-tl-none leading-relaxed text-on-surface-variant',
                )}
              >
                {reply.body}
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  )
}
export default TicketConversationThread
export { TicketConversationThread }
