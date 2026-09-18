import CodeBlockMessage from './CodeBlockMessage.js'
import FileMessage from './FileMessage.js'

interface ChannelTechnicalMessagesProps {
  channelId?: string
}

export default function ChannelTechnicalMessages({
  channelId = 'general',
}: ChannelTechnicalMessagesProps) {
  return (
    <>
      {/* Message 3: Alex Chen */}
      <CodeBlockMessage channelId={channelId} />
      <FileMessage />
    </>
  )
}
export { ChannelTechnicalMessages }
