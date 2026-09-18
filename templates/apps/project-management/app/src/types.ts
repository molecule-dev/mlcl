export interface Task {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low' | 'backlog'
  project: string
  dueDate: string
  isOverdue: boolean
  status: 'todo' | 'in-progress' | 'done'
  assignee: { name: string; avatar: string; alt: string }
  date: string
  statusColor: string
  completed: boolean
}

export interface UpcomingEvent {
  id: string
  title: string
  time: string
  variant: 'default' | 'deadline' | 'success'
  projectId: string
}
