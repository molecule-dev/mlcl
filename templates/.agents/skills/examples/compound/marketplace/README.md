---
name: marketplace
intent: |
  - "Build me a marketplace"
  - "Etsy clone" / "Airbnb clone" / "Fiverr clone"
  - "Two-sided platform — sellers list, buyers buy"
  - "Let people sell things to each other"
  - "Online store with multiple sellers"
keywords: [marketplace, etsy, airbnb, store, listings, sellers, buyers]
---

# Marketplace (compound — multi-feature roadmap)

**This isn't a single example.** A marketplace is the composition of
several primitives that already have worked examples. Read this README
as a build order, then read each linked example for the actual code.

## Build order

1. **`auth/oauth-google-login/`** OR **`auth/email-password-login/`**
   — both buyers and sellers need accounts. OAuth is faster to ship.
   Add a `role` column on the user (`'buyer' | 'seller'` or both).
2. **`uploads/profile-photo-upload/`** — sellers need profile photos
   AND product photos. Same upload pattern; multiple call sites.
3. **`data-display/paginated-user-list/`** — adapt to a "browse listings"
   page. Rename `users` → `listings`; add filters/search.
4. **`commerce/stripe-checkout/`** — buyers pay with Stripe Checkout.
   Use **Stripe Connect** to route money to sellers minus your platform
   fee. (Connect is a Stripe API feature, not a separate package.)
5. **`messaging/in-app-chat/`** — buyer ↔ seller messaging per listing.
   Add a `listing_id` column on messages; treat each listing as its
   own channel.
6. **`forms/contact-form/`** — optional support form for disputes.

## What you'll build on top

Custom code with no example coverage:

- **Listing CRUD** — sellers create/edit/delete their own listings.
  Standard handler + `@molecule/api-database` find/create/update.
- **Reviews** — buyers leave star ratings on completed orders.
  Use `@molecule/app-rating-display-react` to render the average rating on
  listing cards and `@molecule/app-rating-form-react` for the review
  submission form (interactive star picker + textarea + submit).
- **Search + filters** — by category, price range, location.
  Use `@molecule/api-search-meilisearch` (or `-typesense`).
- **Order state machine** — pending → paid → shipped → delivered.
  No package; write a state column + transition guards.

## Anti-patterns

- Do not invent `@molecule/api-marketplace` or
  `@molecule/app-listings`. Marketplaces are compositions, not a
  single package.
- Do not collect payment info into your own database. Use Stripe
  Connect — sellers onboard via a Stripe-hosted flow that returns a
  `stripe_account_id` you store.
- Do not build the messaging UI before the listing CRUD; sellers need
  something to sell first. Match build order above.

## Required env

Pulled from each linked example's README — sum of OAuth + S3 + Stripe
secrets, plus `STRIPE_CONNECT_CLIENT_ID` for seller onboarding.

## Verify

End-to-end: seller signs up → uploads a photo → creates a listing →
buyer signs up (different browser) → views listings → messages seller
→ checks out → seller's Stripe dashboard shows the payout.
