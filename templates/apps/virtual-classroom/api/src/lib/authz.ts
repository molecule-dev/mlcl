/**
 * Shared authorization helpers for the virtual-classroom handler suite.
 *
 * Authorization model:
 *   - `courses.instructor_id`              owns courses, assignments, grades.
 *   - `course_enrollments(student_id, course_id)` is the read-membership
 *     gate for student-side reads (courses, assignments, recordings).
 *   - `rooms.host_id` owns rooms; an active `room_participants` row scopes
 *     read access to chat / whiteboard.
 *   - `submissions.student_id` is the owner; instructor of the parent course
 *     can also read & grade.
 *
 * Helpers walk the chain so handlers don't repeat joins.
 */

import { randomBytes } from 'node:crypto'

import type { Response } from 'express'

import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

export {
  requireUser,
  getUserId as userId,
  validationError,
} from '@molecule/api-bonds-default-express'

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

export interface CourseEnrollmentRow {
  id: string
  course_id: string
  student_id: string
  role: string
  enrolled_at: string
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

export interface RoomParticipantRow {
  id: string
  room_id: string
  user_id: string
  role: string
  joined_at: string
  left_at: string | null
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

/** Returns the course if `userId` is the instructor; otherwise null. */
export const requireOwnedCourse = async (
  courseId: string,
  ownerId: string,
): Promise<CourseRow | null> => {
  return findOne<CourseRow>('courses', [
    { field: 'id', operator: '=', value: courseId },
    { field: 'instructor_id', operator: '=', value: ownerId },
  ])
}

/**
 * Returns the course if `userId` is the instructor OR an enrolled student.
 * Used for read paths (course detail, assignments list, recordings list).
 */
export const requireCourseMember = async (
  courseId: string,
  memberId: string,
): Promise<CourseRow | null> => {
  const course = await findOne<CourseRow>('courses', [
    { field: 'id', operator: '=', value: courseId },
  ])
  if (!course) return null
  if (course.instructor_id === memberId) return course
  const enrollment = await findOne<CourseEnrollmentRow>('course_enrollments', [
    { field: 'course_id', operator: '=', value: courseId },
    { field: 'student_id', operator: '=', value: memberId },
  ])
  return enrollment ? course : null
}

/** Returns the room if `userId` is the host; otherwise null. */
export const requireOwnedRoom = async (roomId: string, hostId: string): Promise<RoomRow | null> => {
  return findOne<RoomRow>('rooms', [
    { field: 'id', operator: '=', value: roomId },
    { field: 'host_id', operator: '=', value: hostId },
  ])
}

/**
 * Derive a room participant's role from authoritative server-side state ONLY —
 * never from the request body. Trusting a client-supplied role lets a student
 * self-assign `instructor`/`ta` and gain whiteboard write/clear access.
 *
 * Precedence:
 *   - room host                                  -> 'instructor'
 *   - course room, caller is the course owner    -> 'instructor'
 *   - course room, caller has an enrollment      -> that enrollment's role
 *                                                   (e.g. 'ta' or 'student')
 *   - course room, caller is not enrolled        -> 'guest' (read-only)
 *   - non-course room, any non-host              -> 'student' (read-only)
 *
 * Only room ownership or an authoritative `course_enrollments.role` can yield an
 * elevated (`instructor`/`ta`) participant — the whiteboard write gate.
 */
export const deriveRoomJoinRole = async (room: RoomRow, userId: string): Promise<string> => {
  if (room.host_id === userId) return 'instructor'
  if (room.course_id) {
    const course = await findOne<CourseRow>('courses', [
      { field: 'id', operator: '=', value: room.course_id },
    ])
    if (course && course.instructor_id === userId) return 'instructor'
    const enrollment = await findOne<CourseEnrollmentRow>('course_enrollments', [
      { field: 'course_id', operator: '=', value: room.course_id },
      { field: 'student_id', operator: '=', value: userId },
    ])
    if (enrollment) return enrollment.role
    return 'guest'
  }
  return 'student'
}

/**
 * Returns the room if the user is host OR an active participant. Used for
 * read paths and member-only writes (chat send, whiteboard stroke draw).
 */
export const requireRoomMember = async (
  roomId: string,
  memberId: string,
): Promise<RoomRow | null> => {
  const room = await findOne<RoomRow>('rooms', [{ field: 'id', operator: '=', value: roomId }])
  if (!room) return null
  if (room.host_id === memberId) return room
  const participant = await findOne<RoomParticipantRow>('room_participants', [
    { field: 'room_id', operator: '=', value: roomId },
    { field: 'user_id', operator: '=', value: memberId },
    { field: 'left_at', operator: 'is_null' },
  ])
  return participant ? room : null
}

/**
 * Returns the assignment if `userId` is instructor of the parent course OR
 * an enrolled student.
 */
export const requireAssignmentMember = async (
  assignmentId: string,
  memberId: string,
): Promise<{ assignment: AssignmentRow; course: CourseRow } | null> => {
  const assignment = await findOne<AssignmentRow>('assignments', [
    { field: 'id', operator: '=', value: assignmentId },
  ])
  if (!assignment) return null
  const course = await requireCourseMember(assignment.course_id, memberId)
  return course ? { assignment, course } : null
}

/** Instructor-only assignment access (create/update/grade). */
export const requireOwnedAssignment = async (
  assignmentId: string,
  instructorId: string,
): Promise<{ assignment: AssignmentRow; course: CourseRow } | null> => {
  const assignment = await findOne<AssignmentRow>('assignments', [
    { field: 'id', operator: '=', value: assignmentId },
  ])
  if (!assignment) return null
  const course = await requireOwnedCourse(assignment.course_id, instructorId)
  return course ? { assignment, course } : null
}

export const internalError = (res: Response): void => {
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

/**
 * 6-char URL-safe join code (alphanumeric uppercase). Join codes are bearer
 * credentials — presenting one resolves a room via GET /rooms/by-code/:code,
 * so anyone who can predict a code gains room access. Math.random is a
 * predictable non-cryptographic PRNG; draw from a CSPRNG instead. [L2-1]
 */
export const generateJoinCode = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  // Rejection sampling keeps every symbol equally likely: skip byte values
  // above the largest multiple of the alphabet size (a plain modulo would
  // favor the earliest characters).
  const limit = 256 - (256 % alphabet.length)
  let out = ''
  while (out.length < 6) {
    const buf = randomBytes(16)
    for (let i = 0; i < buf.length && out.length < 6; i++) {
      if (buf[i]! < limit) out += alphabet[buf[i]! % alphabet.length]
    }
  }
  return out
}
