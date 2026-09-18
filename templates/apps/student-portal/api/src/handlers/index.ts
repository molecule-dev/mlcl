import { Router } from 'express'

import announcementsRouter from './announcements.js'
import assignmentsRouter from './assignments.js'
import attendanceRouter from './attendance.js'
import gradesRouter from './grades.js'
import messagesRouter from './messages.js'
import scheduleRouter from './schedule.js'

const router = Router()

router.use('/announcements', announcementsRouter)
router.use('/assignments', assignmentsRouter)
router.use('/attendance', attendanceRouter)
router.use('/grades', gradesRouter)
router.use('/messages', messagesRouter)
router.use('/schedule', scheduleRouter)

export default router
