/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import clips from './clips.js'
import collaborators from './collaborators.js'
import effects from './effects.js'
import exports from './exports.js'
import instruments from './instruments.js'
import midiNotes from './midi_notes.js'
import preferences from './preferences.js'
import projects from './projects.js'
import samples from './samples.js'
import tracks from './tracks.js'

const router = Router()

router.use('/projects', projects)
router.use('/tracks', tracks)
router.use('/effects', effects)
router.use('/exports', exports)
router.use('/instruments', instruments)
router.use('/samples', samples)
router.use('/clips', clips)
router.use('/midi-notes', midiNotes)
router.use('/midi_notes', midiNotes)
router.use('/collaborators', collaborators)
router.use('/preferences', preferences)

export default router
