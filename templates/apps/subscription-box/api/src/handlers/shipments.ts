import { Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, findById, findOne, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import { wrap } from './_async.js'

const router = Router()

const createShipmentSchema = z.object({
  boxId: z.string().min(1),
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
  estimatedDelivery: z.string().optional(),
  labelUrl: z.string().url().optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'shipped', 'in_transit', 'out_for_delivery', 'delivered']),
})

router.get(
  '/box/:boxId',
  wrap(async (req, res) => {
    const userId = requireUser(res)
    if (!userId) return

    const box = (await findById('boxes', String(req.params.boxId))) as Record<
      string,
      unknown
    > | null
    if (!box) {
      res.status(404).json({ error: t('box.notFound', {}, { defaultValue: 'Box not found' }) })
      return
    }
    if (box.user_id !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }

    const shipment = await findOne<Record<string, unknown>>('shipments', [
      { field: 'box_id', operator: '=', value: req.params.boxId },
    ])

    if (!shipment) {
      res
        .status(404)
        .json({ error: t('shipment.notFound', {}, { defaultValue: 'Shipment not found' }) })
      return
    }
    res.json(shipment)
  }),
)

router.post(
  '/',
  requireAdmin,
  validateBody(createShipmentSchema),
  wrap(async (req, res) => {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId

    const { boxId, carrier, trackingNumber, estimatedDelivery, labelUrl } = req.body as z.infer<
      typeof createShipmentSchema
    >

    const box = (await findById('boxes', boxId)) as Record<string, unknown> | null
    if (!box) {
      res.status(404).json({ error: t('box.notFound', {}, { defaultValue: 'Box not found' }) })
      return
    }

    const shipment = await create('shipments', {
      box_id: boxId,
      user_id: box.user_id,
      carrier,
      tracking_number: trackingNumber,
      label_url: labelUrl ?? null,
      estimated_delivery: estimatedDelivery ?? null,
      status: 'shipped',
      shipped_at: new Date().toISOString(),
    })

    await updateById('boxes', boxId, { status: 'shipped' })

    const user = await findById('users', box.user_id as string)
    if (user) {
      await sendMail({
        to: (user as Record<string, unknown>).email as string,
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        subject: t('shipment.shippedSubject', {}, { defaultValue: 'Your box has shipped!' }),
        text: t(
          'shipment.shippedBody',
          { carrier, trackingNumber },
          { defaultValue: `Tracking ${trackingNumber} via ${carrier}.` },
        ),
      }).catch((mailError) => {
        logger.warn({ mailError, userId }, 'shipment email failed to send')
      })
    }

    res.status(201).json(shipment.data ?? shipment)
  }),
)

router.put(
  '/:id/status',
  requireAdmin,
  validateBody(updateStatusSchema),
  wrap(async (req, res) => {
    const { status } = req.body as z.infer<typeof updateStatusSchema>

    const updateResult = await updateById('shipments', String(req.params.id), {
      status,
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    })
    const shipment = (updateResult?.data ?? updateResult) as Record<string, unknown> | null
    if (!shipment) {
      res
        .status(404)
        .json({ error: t('shipment.notFound', {}, { defaultValue: 'Shipment not found' }) })
      return
    }

    if (status === 'delivered' && shipment.box_id) {
      await updateById('boxes', shipment.box_id as string, {
        status: 'delivered',
      })
    }

    res.json(shipment)
  }),
)

export default router
