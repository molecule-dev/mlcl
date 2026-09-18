/**
 * PUBLIC counterparty signing — the redeem side of the emailed `/sign/:token` link.
 *
 * Sending a contract for signature emails each counterparty a `${appUrl}/sign/${token}`
 * link (contracts.ts). This router — mounted in App/router.ts BEFORE the session auth
 * middleware — lets that EXTERNAL signer (who has NO account) view and sign the contract
 * using the token as the bearer credential. The 24-byte token is unguessable, so it is a
 * safe public credential; even so this endpoint exposes ONLY the fields the signer needs
 * (never the whole contract/signature row), enforces expiry, and is single-use per signer.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { ownerWantsNotification } from '../lib/notify-prefs.js'

const router = Router()

interface SignatureRow {
  id: string
  contract_id: string
  user_id: string
  signer_name: string
  status: string
  signed_at: string | null
  token: string | null
  token_expires_at: string | null
}
interface ContractRow {
  id: string
  user_id: string
  title: string
  body_html: string
  body_md: string
  status: string
}

const INVALID = { key: 'sign.invalid', def: 'This signing link is invalid or has been used.' }

async function findByToken(token: string): Promise<SignatureRow | null> {
  if (!token) return null
  const rows = await findMany<SignatureRow>('signatures', {
    where: [{ field: 'token', operator: '=', value: token }],
    limit: 1,
  })
  return rows[0] ?? null
}

const isExpired = (sig: SignatureRow): boolean =>
  !!sig.token_expires_at && new Date(sig.token_expires_at).getTime() < Date.now()

/** GET /api/sign/:token — the contract this counterparty is being asked to sign. */
router.get('/:token', async (req: Request, res: Response) => {
  const sig = await findByToken(String(req.params.token))
  const contract = sig ? await findById<ContractRow>('contracts', String(sig.contract_id)) : null
  if (!sig || !contract) {
    res.status(404).json({ error: t(INVALID.key, {}, { defaultValue: INVALID.def }) })
    return
  }
  // Public endpoint — expose ONLY what the signer needs to review, never the whole row.
  res.json({
    signerName: sig.signer_name,
    status: sig.status,
    expired: isExpired(sig),
    alreadySigned: sig.status === 'signed',
    contract: { title: contract.title, body_html: contract.body_html, body_md: contract.body_md },
  })
})

/** POST /api/sign/:token — record THIS counterparty's signature (single-use). */
router.post('/:token', async (req: Request, res: Response) => {
  const sig = await findByToken(String(req.params.token))
  if (!sig) {
    res.status(404).json({ error: t(INVALID.key, {}, { defaultValue: INVALID.def }) })
    return
  }
  if (isExpired(sig)) {
    res.status(410).json({
      error: t('sign.expired', {}, { defaultValue: 'This signing link has expired.' }),
    })
    return
  }
  // Idempotent: re-POSTing an already-signed token is a no-op success — never double-signs.
  if (sig.status === 'signed') {
    res.json({ status: 'signed', alreadySigned: true })
    return
  }

  const now = new Date().toISOString()
  await updateById('signatures', String(sig.id), {
    status: 'signed',
    signed_at: now,
    ip: req.ip ?? null,
  })
  try {
    await create('signature_events', {
      contract_id: sig.contract_id,
      user_id: sig.user_id,
      kind: 'signed',
      occurred_at: now,
      created_at: now,
    })
  } catch (error) {
    logger.warn('sign: failed to write signature_event', { error })
  }

  // When every counterparty has signed, activate the contract and notify the owner.
  const all = await findMany<SignatureRow>('signatures', {
    where: [{ field: 'contract_id', operator: '=', value: sig.contract_id }],
    limit: 200,
  })
  const outstanding = all.filter(
    (s) => s.id !== sig.id && s.status !== 'signed' && s.status !== 'declined',
  )
  if (outstanding.length === 0) {
    const contract = await findById<ContractRow>('contracts', String(sig.contract_id))
    await updateById('contracts', String(sig.contract_id), {
      status: 'active',
      signed_at: now,
      updated_at: now,
    })
    // Honor the owner's "Signed or declined" notification toggle
    // (Settings → oauthData.notificationPreferences.contractSigned).
    if (contract && (await ownerWantsNotification(contract.user_id, 'contractSigned'))) {
      try {
        await create('notifications', {
          user_id: contract.user_id,
          kind: 'signed',
          title: t(
            'sign.notifTitle',
            { title: contract.title },
            { defaultValue: `${contract.title} signed` },
          ),
          body: t('sign.notifBody', {}, { defaultValue: 'All required parties have signed.' }),
          contract_id: sig.contract_id,
          link: `/contracts/${sig.contract_id}`,
          created_at: now,
        })
      } catch (error) {
        logger.warn('sign: failed to write owner notification', { error })
      }
    }
  }
  res.json({ status: 'signed' })
})

export default router
