/**
 * Extraction-template catalogue.
 *
 * The Rules page (`app/src/pages/Rules.tsx`) renders a "templates"
 * section listing the schemas the AI uses for each document type. We
 * expose a built-in catalogue per user — there's nothing user-mutable
 * yet, but the endpoint reads back per-user usage stats from the
 * `documents` table so the "last_used" timestamps reflect what
 * the user has actually processed.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface TemplateDef {
  id: string
  name: string
  type: string
  fields: string[]
}

const BUILTIN_TEMPLATES: TemplateDef[] = [
  {
    id: 'tpl-invoice',
    name: 'Invoice',
    type: 'invoice',
    fields: [
      'Vendor',
      'Invoice number',
      'Invoice date',
      'Due date',
      'Total',
      'Tax',
      'Currency',
      'PO number',
    ],
  },
  {
    id: 'tpl-receipt',
    name: 'Receipt',
    type: 'receipt',
    fields: ['Merchant', 'Date', 'Total', 'Tax', 'Payment method', 'Card last 4'],
  },
  {
    id: 'tpl-contract',
    name: 'Contract',
    type: 'contract',
    fields: [
      'Counterparty',
      'Effective date',
      'Term',
      'Auto-renew',
      'Termination notice',
      'Governing law',
    ],
  },
  {
    id: 'tpl-form',
    name: 'Form',
    type: 'form',
    fields: ['Form type', 'Filing date', 'Filer name', 'Filer ID', 'Submitted by'],
  },
  {
    id: 'tpl-report',
    name: 'Report',
    type: 'report',
    fields: ['Report title', 'Author', 'Period', 'Date issued'],
  },
  {
    id: 'tpl-identification',
    name: 'Identification',
    type: 'identification',
    fields: [
      'Document type',
      'Issuing authority',
      'Holder name',
      'Date of birth',
      'Document number',
      'Expiry',
    ],
  },
]

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const documents = (await findMany('documents', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'processed_at', direction: 'desc' }],
    })) as Record<string, unknown>[]

    const lastUsedByType = new Map<string, string>()
    for (const d of documents) {
      const cls = String(d.doc_class ?? '')
      if (!cls || lastUsedByType.has(cls)) continue
      const at = (d.processed_at ?? d.uploaded_at) as Date | string | null
      if (at != null) lastUsedByType.set(cls, new Date(String(at)).toISOString())
    }

    const enriched = BUILTIN_TEMPLATES.map((tpl) => ({
      ...tpl,
      last_used: lastUsedByType.get(tpl.type) ?? null,
    }))
    res.json(enriched)
  } catch (error) {
    logger.error('extraction-templates.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
