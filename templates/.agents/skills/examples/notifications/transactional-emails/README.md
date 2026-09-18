---
name: transactional-emails
intent: |
  - "Send a welcome email"
  - "Email receipt after purchase"
  - "Password reset email"
  - "Order confirmation email"
  - "Transactional email"
keywords: [email, welcome, receipt, transactional, smtp, mailgun, sendgrid]
---

# Transactional emails (welcome / receipt / reset)

**When to copy this example:** the user wants any "send an email
when X happens" — welcome on signup, receipt on purchase, password
reset, etc. Different from `forms/contact-form/` which is
inbound-from-user.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-emails-mailgun --workspace=api  # or -sendgrid / -ses / -sendmail
```

## Files in this example

| Path                          | What it does                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `api/bonds/emails-mailgun.ts` | Wires `emails` bond.                                                                                                                 |
| `api/lib/transactional.ts`    | One function per email template — `sendWelcome(user)`, `sendReceipt(order)`, etc. Each loads the template via `t()` so locales work. |
| `app/locales/en/emails.ts`    | Subject + body templates with `{{var}}` placeholders.                                                                                |

## Anti-patterns

- Do not put email HTML strings inline in handler code. Templates
  belong in locale files so translators can localize them.
- Do not invent `@molecule/api-transactional` — there's no such
  package. The composition is `api-emails-*` + your own `lib/`.
- Do not block the request on the email send. Either fire-and-
  forget (catch errors to a logger) or queue via a job runner.
  A failed email shouldn't 500 the signup endpoint.
- Do not send password-reset links that don't expire. 15 minutes
  is the standard.
- Do not reuse the same template for transactional and marketing
  email. Marketing must include unsubscribe; transactional doesn't
  need to (but should still set proper headers).

## Verify

User signs up → receives welcome email within seconds. User checks
out → receives receipt with order number + total. User requests
password reset → receives reset link → clicks within 15 min → can
set a new password.
