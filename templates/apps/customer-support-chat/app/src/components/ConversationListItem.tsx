/**
 * Conversation row for the Inbox sidebar — thin shim around
 * @molecule/app-message-preview-react. Preserves this app's prop names
 * (customerName/id) so other components don't have to change; the
 * shared package owns the visual implementation.
 */
import { MessagePreview, type MessagePreviewPresence } from '@molecule/app-message-preview-react'
import { useTranslation } from '@molecule/app-react'

export type Presence = MessagePreviewPresence

interface ConversationListItemProps {
  id: string
  customerName: string
  preview: string
  timestamp: string
  /** Unread message count; 0 hides the pip. */
  unread?: number
  presence?: Presence
  active?: boolean
  /** Optional channel hint (icon name) e.g. mail, chat, phone. */
  channelIcon?: string
  initials?: string
  /**
   * Optional click handler. When provided, intercepts the anchor click so
   * callers can drive selection state in addition to navigating. The Link's
   * default navigation still happens (the handler should not preventDefault
   * unless it wants to suppress navigation entirely).
   */
  onClick?: () => void
}

function ConversationListItem({
  id,
  customerName,
  preview,
  timestamp,
  unread = 0,
  presence = 'offline',
  active = false,
  channelIcon,
  initials,
  onClick,
}: ConversationListItemProps) {
  const { t } = useTranslation()
  return (
    <MessagePreview
      to={`/conversation/${id}`}
      name={customerName}
      preview={preview}
      timestamp={timestamp}
      unread={unread}
      presence={presence}
      active={active}
      channelIcon={channelIcon}
      initials={initials}
      onClick={onClick}
      unreadAriaLabel={t(
        'conversationListItem.unreadAria',
        { count: unread },
        { defaultValue: `${unread} unread` },
      )}
    />
  )
}

export default ConversationListItem
export { ConversationListItem }
