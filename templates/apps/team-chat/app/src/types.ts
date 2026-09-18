export interface Message {
  id: string
  author: { name: string; avatar: string; avatarAlt: string }
  timestamp: string
  content: string
  reactions: Array<{ emoji: string; count: number; variant: 'secondary' | 'tertiary' | 'default' }>
}

export interface MessagePreview {
  channel: string
  time: string
  author: string
  message: string
}

export interface Participant {
  avatar: string
  avatarAlt: string
}
