import { t } from '@molecule/api-i18n'
import { sendMail } from '@molecule/api-emails'

// The sender address, defined ONCE. `EMAIL_FROM` is the canonical var (see the
// api-patterns env table + the framework's own reset emails). The default DERIVES
// from `MAILGUN_DOMAIN` on purpose: Mailgun rejects a `from` whose domain isn't your
// verified sending domain, so a hardcoded `noreply@example.com` bounces EVERY email
// once MAILGUN_DOMAIN is your real domain. Deriving it keeps sending working out of
// the box (MAILGUN_DOMAIN must be set for Mailgun anyway).
const FROM = process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`

type User = { id: string; email: string; name?: string }
type Order = {
  id: string
  total_cents: number
  customer_email: string
  items: { title: string; quantity: number }[]
}

export async function sendWelcome(user: User): Promise<void> {
  const subject = t(
    'emails.welcome.subject',
    { name: user.name ?? '' },
    { defaultValue: 'Welcome!' },
  )
  const body = t(
    'emails.welcome.body',
    { name: user.name ?? 'there' },
    {
      defaultValue: 'Hi {{name}},\n\nThanks for signing up. Let us know if you have any questions.',
    },
  )
  // Fire-and-forget; log failures, never block the caller.
  void sendMail({ from: FROM, to: user.email, subject, text: body }).catch((err) => {
    console.error('welcome email failed', { userId: user.id, err })
  })
}

export async function sendReceipt(order: Order): Promise<void> {
  const subject = t(
    'emails.receipt.subject',
    { id: order.id },
    { defaultValue: 'Your receipt #{{id}}' },
  )
  const itemsLine = order.items.map((i) => `${i.quantity}× ${i.title}`).join('\n')
  const total = (order.total_cents / 100).toFixed(2)
  const body = t(
    'emails.receipt.body',
    { id: order.id, items: itemsLine, total },
    {
      defaultValue: 'Thanks for your order #{{id}}.\n\n{{items}}\n\nTotal: ${{total}}',
    },
  )
  void sendMail({ from: FROM, to: order.customer_email, subject, text: body }).catch((err) => {
    console.error('receipt email failed', { orderId: order.id, err })
  })
}

export async function sendPasswordReset({
  user,
  token,
  appUrl,
}: {
  user: User
  token: string
  appUrl: string
}): Promise<void> {
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`
  const subject = t('emails.reset.subject', undefined, { defaultValue: 'Reset your password' })
  const body = t(
    'emails.reset.body',
    { link },
    {
      defaultValue: 'Click here to reset your password (expires in 15 minutes):\n\n{{link}}',
    },
  )
  // This one we DO await — caller wants to know whether the email left.
  await sendMail({ from: FROM, to: user.email, subject, text: body })
}
