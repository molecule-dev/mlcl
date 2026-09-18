export interface Bot {
  id: string
  name: string
  icon: string
  iconBgClass: string
  status: 'online' | 'offline'
  description: string
  conversations: number
  satisfaction: number
  updatedAt: string
}
