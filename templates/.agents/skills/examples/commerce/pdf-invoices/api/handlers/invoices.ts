import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { renderInvoice } from '../lib/render-invoice.js'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

router.get('/:order_id.pdf', requireAuth, async (req, res) => {
  const orderId = req.params.order_id as string
  const order = (await findById('orders', orderId)) as {
    id: string
    invoice_number: string
    user_id: string
    created_at: string
    currency: string
    line_items: { description: string; quantity: number; unit_price_cents: number }[]
    tax_rate_percent: number
  } | null
  if (!order) {
    return res
      .status(404)
      .json({ error: t('orders.notFound', undefined, { defaultValue: 'Order not found' }) })
  }

  const session = res.locals.session as { userId: string; role?: string }
  const isAdmin = session.role === 'admin'
  if (!isAdmin && order.user_id !== session.userId) {
    return res
      .status(403)
      .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
  }

  const customer = (await findById('users', order.user_id)) as {
    name: string
    email: string
    address?: string
    vat_id?: string
  } | null

  const pdf = await renderInvoice({
    invoiceNumber: order.invoice_number,
    issueDate: new Date(order.created_at),
    seller: {
      name: process.env.SELLER_NAME ?? 'Your Business',
      address: process.env.SELLER_ADDRESS ?? '',
      vatId: process.env.SELLER_VAT_ID,
    },
    customer: {
      name: customer?.name ?? 'Customer',
      email: customer?.email ?? '',
      address: customer?.address,
      vatId: customer?.vat_id,
    },
    lineItems: order.line_items.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPriceCents: li.unit_price_cents,
    })),
    taxRatePercent: order.tax_rate_percent,
    currency: order.currency,
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.invoice_number}.pdf"`)
  res.send(pdf)
})

export default router
