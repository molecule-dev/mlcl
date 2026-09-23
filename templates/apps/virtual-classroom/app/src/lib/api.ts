/**
 * Typed shapes for the virtual-classroom REST API.
 *
 * Pages call `useHttpClient()` directly and pass these types as the
 * generic to `http.get<T>` etc. We keep the shapes here so a UI
 * change against the wire format is a single-file edit, not a
 * needle-in-haystack search through every consumer.
 */

export interface CourseRow {
  id: string
  instructor_id: string
  code: string
  title: string
  term: string | null
  description: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface AssignmentRow {
  id: string
  course_id: string
  title: string
  description: string
  due_date: string | null
  points: number
  type: string
  created_at: string
  updated_at: string
}

export interface SubmissionRow {
  id: string
  assignment_id: string
  student_id: string
  content: string
  file_url: string | null
  status: string
  submitted_at: string
}

export interface GradeRow {
  id: string
  assignment_id: string
  student_id: string
  course_id: string
  score: number
  max_score: number
  letter_grade: string | null
  feedback: string
  graded_at: string
}

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

export interface RoomRow {
  id: string
  course_id: string | null
  host_id: string
  name: string
  join_code: string
  status: string
  participant_count: number
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface DashboardBundle {
  stats: {
    courses: number
    enrolled: number
    teaching: number
    assignments: number
    unreadNotifications: number
  }
  upcomingRoom: RoomRow | null
  upcomingRooms: RoomRow[]
  courses: CourseRow[]
  assignments: AssignmentRow[]
  grades: GradeRow[]
  notifications: NotificationRow[]
}

export interface CalendarEvent {
  id: string
  kind: 'class' | 'assignment'
  title: string
  course_id: string | null
  starts_at: string | null
  ends_at: string | null
  url: string
}

export interface ChatMessageRow {
  id: string
  room_id: string
  user_id: string
  content: string
  type: string
  created_at: string
}

export interface WhiteboardRow {
  id: string
  room_id: string
  strokes: WhiteboardStroke[]
  created_at: string
  updated_at: string
}

export interface WhiteboardStroke {
  id?: string
  user_id?: string
  created_at?: string
  points: { x: number; y: number }[]
  color?: string
  width?: number
}

/**
 * Client-side shape check for room/course/assignment ids taken from the URL.
 *
 * The API validates every `:id` param as a UUID and answers 400 for anything
 * else, so a malformed deep link (e.g. `/class/demo-room-1`) would otherwise
 * fire requests that are guaranteed to fail — noisy console errors for the
 * user and a failing console-error guard in e2e. Pages guard with this BEFORE
 * fetching and render their not-found state instead.
 */
export function isUuid(id: string | undefined | null): id is string {
  return (
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
}
