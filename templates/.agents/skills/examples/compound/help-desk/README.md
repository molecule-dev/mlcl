---
name: help-desk
intent: |
  - "Zendesk clone"
  - "Help desk / ticketing system"
  - "Customer support tool"
  - "Tickets with status workflow"
  - "Internal IT ticketing"
keywords: [helpdesk, zendesk, ticket, support, sla, queue]
---

# Help desk (compound — multi-feature roadmap)

**This isn't a single example.** A help desk composes auth + tickets

- comments + reporting + admin gating. Read this README, then read
  each linked example.

## Build order

1. **`auth/email-password-login/`** — staff need accounts. Customers
   typically don't (they file tickets via email or anonymous form).
2. **`forms/contact-form/`** — adapt as the "file a ticket" page.
   Result row goes into `tickets` table not just an email.
3. **`messaging/in-app-chat/`** — adapt for ticket reply thread.
   `channel_id` → `ticket_id`.
4. **`auth/role-based-access/`** — staff vs admin vs customer.
   Customers can only see their own tickets.
5. **`data-display/sortable-table/`** — staff queue: open tickets,
   filterable by priority/assignee/age.
6. **`compound/admin-panel/`** — overall admin shell with tickets +
   users + canned responses.
7. **`data-display/csv-export/`** — auditors / managers want
   ticket history.

## What you'll build on top

Custom code with no example coverage:

- **Status state machine**: `new → open → pending → resolved → closed`.
  Transitions emit events for SLA tracking.
- **SLA timers**: cron job (see `jobs/scheduled-tasks/`) escalates
  tickets that breach response/resolution times.
- **Email-to-ticket ingress**: use `@molecule/api-emails-inbound` +
  `@molecule/api-emails-inbound-mailgun` (or `-ses`) — the inbound sibling of
  the outbound `api-emails-*` bond. It hands you a parsed `InboundEmail` (+
  `InboundEmailReply` for threading) via the provider's webhook route; create a
  ticket from it. Do NOT hand-roll an inbox poller.
- **Macros / canned responses**: a `templates` table + a UI to
  insert into the reply.

## Anti-patterns

- Do not invent `@molecule/api-helpdesk` or
  `@molecule/api-zendesk-clone`. Composition.
- Do not let customers see all tickets. Server enforces
  `assignee/customer` scoping on every list query.
- Do not ship without a "spam" status; you'll regret it day 2.
- Do not skip the audit trail (`compound/audit-log/`). Compliance
  - dispute resolution both need it.

## Verify

Customer files ticket via the form → email lands at staff +
ticket appears in queue → staff replies → customer gets email
with the reply text + a link to view → status moves to
`pending` automatically when staff replies → customer can
reply via web view → eventually staff marks `resolved`.
