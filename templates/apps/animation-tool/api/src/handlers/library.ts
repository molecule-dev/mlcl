/**
 * Library handler — serves curated easing presets and keyframe templates.
 *
 * These are static, server-curated data (not user-editable) so they live
 * inline rather than in a DB table. They are the canonical reference set
 * the editor's library panel pulls from.
 */
import type { Request, Response } from 'express'
import { Router } from 'express'

import { t } from '@molecule/api-i18n'

const router = Router()

interface EasingPreset {
  id: string
  name: string
  expression: string
  bezier: [number, number, number, number]
}

interface KeyframeTemplate {
  id: string
  name: string
  description: string
  trackCount: number
  duration: string
  category: 'fades' | 'transforms' | 'micro' | 'states'
}

const EASINGS: EasingPreset[] = [
  {
    id: 'ease-out-quint',
    name: 'Ease Out Quint',
    expression: 'cubic-bezier(0.22, 1, 0.36, 1)',
    bezier: [0.22, 1, 0.36, 1],
  },
  {
    id: 'ease-in-out',
    name: 'Ease In Out',
    expression: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bezier: [0.4, 0, 0.2, 1],
  },
  {
    id: 'spring',
    name: 'Spring',
    expression: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bezier: [0.34, 1.56, 0.64, 1],
  },
  {
    id: 'snap',
    name: 'Snap',
    expression: 'cubic-bezier(0.87, 0, 0.13, 1)',
    bezier: [0.87, 0, 0.13, 1],
  },
  {
    id: 'gentle',
    name: 'Gentle',
    expression: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    bezier: [0.25, 0.1, 0.25, 1],
  },
  {
    id: 'bounce',
    name: 'Bounce',
    expression: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    bezier: [0.68, -0.55, 0.265, 1.55],
  },
]

const TEMPLATES: KeyframeTemplate[] = [
  {
    id: 'fade-in',
    name: 'Fade In Slide Up',
    description: '20px translate + opacity, 480ms',
    trackCount: 2,
    duration: '00:00:48',
    category: 'fades',
  },
  {
    id: 'cross-fade',
    name: 'Cross Fade',
    description: 'Two-layer A/B opacity swap',
    trackCount: 2,
    duration: '00:00:32',
    category: 'fades',
  },
  {
    id: 'wobble',
    name: 'Wobble',
    description: 'Rotation 3-step ±6° with spring',
    trackCount: 1,
    duration: '00:00:24',
    category: 'transforms',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    description: 'Scale 1 → 1.06 → 1, infinite',
    trackCount: 1,
    duration: '00:00:16',
    category: 'micro',
  },
  {
    id: 'pressed',
    name: 'Pressed State',
    description: 'Scale + drop-shadow on press',
    trackCount: 2,
    duration: '00:00:12',
    category: 'states',
  },
  {
    id: 'state-flip',
    name: 'State Flip',
    description: 'Idle → Hover → Active → Idle',
    trackCount: 4,
    duration: '00:00:30',
    category: 'states',
  },
]

function requireAuth(res: Response): boolean {
  const session = res.locals.session as { userId?: string } | undefined
  if (!session?.userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return false
  }
  return true
}

router.get('/easings', (_req: Request, res: Response) => {
  if (!requireAuth(res)) return
  res.json(EASINGS)
})

router.get('/templates', (_req: Request, res: Response) => {
  if (!requireAuth(res)) return
  res.json(TEMPLATES)
})

export default router
