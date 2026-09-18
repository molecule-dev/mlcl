---
name: crowdfunding
intent: |
  - "Kickstarter clone"
  - "GoFundMe clone"
  - "Crowdfunding"
  - "Fundraising campaigns"
  - "Pre-orders / Kickstarter-style funding"
keywords: [crowdfunding, kickstarter, gofundme, fundraising, campaign, pledge]
---

# Crowdfunding (compound — multi-feature roadmap)

**This isn't a single example.** A crowdfunding platform composes
auth + listings + payments + content + the funding model itself.

## Build order

1. **`auth/email-password-login/`** + **`auth/oauth-google-login/`**
   — campaigners need accounts; backers can be guests but accounts
   give better UX.
2. **`uploads/file-attachments/`** — campaigners upload pitch
   videos, images, plans.
3. **`content/markdown-blog/`** — campaign description + updates
   are long-form content with images.
4. **`commerce/stripe-checkout/`** — but with **delayed capture**.
   Backers' cards are authorized, charged only on campaign success
   (Stripe `manual` capture mode + a webhook on campaign deadline).
5. **`notifications/transactional-emails/`** — campaign-funded
   emails, refund-on-failure emails, milestone updates.

## What you'll build on top

Custom code with no example coverage:

- **`campaigns` + `pledges` tables** — pledges link to a Stripe
  PaymentIntent in `manual` capture mode.
- **Deadline cron** — `jobs/scheduled-tasks/` style daily job
  checks expired campaigns; if `total_pledged >= goal`, captures
  all pledges; otherwise voids them and refunds.
- **Campaign page** — progress bar, days remaining, backer count,
  reward tiers list.
- **Reward fulfillment workflow** — post-success, campaigners need
  to know who pledged what tier so they can ship rewards.
- **Public funding ticker** — a real-time updated total. Use
  `notifications/in-app-notifications/` realtime bond.

## Anti-patterns

- Do not invent `@molecule/api-crowdfunding`. Composition.
- Do not capture pledges on creation. The all-or-nothing model
  REQUIRES authorize-on-pledge / capture-on-success.
- Do not let campaigners edit the funding goal after launch.
  Backers pledged based on a specific goal.
- Do not auto-launch a campaign without manual review. Fraud
  is rampant on crowdfunding sites; add a "submitted → reviewed
  → approved" workflow.

## Verify

Campaigner creates campaign with $10k goal, 30-day deadline →
3 backers pledge $5k total → deadline cron runs → goal NOT met
→ all pledges voided, no charges → campaigner gets failure email.
Same campaign with $15k pledged → cron captures all → backers
charged → funds release per Stripe payout schedule.
