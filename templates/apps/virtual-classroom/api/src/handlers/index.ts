import { Router } from 'express'

import assignmentsRouter from './assignments.js'
import chatRouter from './chat.js'
import coursesRouter from './courses.js'
import gradesRouter from './grades.js'
import meRouter from './me.js'
import notificationsRouter from './notifications.js'
import recordingsRouter from './recordings.js'
import roomsRouter from './rooms.js'
import whiteboardRouter from './whiteboard.js'

const router = Router()

router.use('/me', meRouter)
router.use('/courses', coursesRouter)
router.use('/assignments', assignmentsRouter)
router.use('/grades', gradesRouter)
router.use('/notifications', notificationsRouter)
router.use('/rooms', roomsRouter)
router.use('/chat', chatRouter)
router.use('/whiteboard', whiteboardRouter)
router.use('/recordings', recordingsRouter)

export default router
