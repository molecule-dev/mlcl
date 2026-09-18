# Examples — what to copy when the user asks for a feature

Each entry below is a working, tested vertical slice you can copy and
adapt. Read this file FIRST when the user asks for a feature, find the
closest match, then read that example's `README.md` (and the code files
it lists) before writing a single line.

The examples live at `.agents/skills/examples/<category>/<name>/`.
Inside each folder: `README.md` (intent + file map + anti-patterns) plus
the actual code files you copy from.

## How to use this index

1. **Read the user's request fully.** What outcome do they want?
2. **Match by meaning, not exact words.** Users describe outcomes
   ("let people sign up"), not implementations ("OAuth").
3. **For whole-app asks**, jump to the **Compound roadmaps** section.
   "Build me a marketplace" is not one feature — it's a composition.
4. **Read the matching example's `README.md`** to see exactly which
   files to copy and what env vars are needed.
5. **Copy + adapt** the example files into the user's project. Rename
   variables to fit their domain (e.g. `users` → `customers`).

## Single-feature examples

### Auth

| Example                         | When users say…                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `auth/oauth-google-login/`      | "log in with Google" / "sign up with my Google account" / "let people use SSO" / "use my Google login" / "one-click signup"        |
| `auth/email-password-login/`    | "let people sign up" / "email and password" / "registration form" / "forgot password" / "reset password" / "create an account"     |
| `auth/passwordless-magic-link/` | "passwordless login" / "magic link" / "email me a login link" / "no-password signin" / "login without remembering a password"      |
| `auth/two-factor-auth/`         | "two-factor authentication" / "2FA" / "MFA" / "TOTP" / "authenticator app" / "make logins more secure"                             |
| `auth/api-keys/`                | "API keys" / "personal access tokens" / "programmatic access" / "let users build integrations" / "service tokens"                  |
| `auth/role-based-access/`       | "roles / permissions" / "admin vs member vs viewer" / "RBAC" / "restrict access by role" / "permission system"                     |
| `auth/account-deletion/`        | "delete my account" / "account deletion" / "GDPR right to be forgotten" / "close my account" / "wipe my data"                      |
| `auth/email-verification/`      | "verify email address" / "confirm email after signup" / "click the link to activate" / "double opt-in" / "make sure email is real" |

(For OAuth providers other than Google: same example, swap the
provider package name — `@molecule/api-oauth-github`,
`@molecule/api-oauth-gitlab`, `@molecule/api-oauth-twitter`. Do not
invent OAuth packages for Auth0, Okta, Clerk, Supabase — none have
@molecule wrappers; wire them with their own SDKs.)

### Data display

| Example                             | When users say…                                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-display/paginated-user-list/` | "list of users" / "table with pagination" / "browse all my customers" / "admin panel for $resource" / "long list and it's slow" / "I want to see all the X" |
| `data-display/sortable-table/`      | "sortable table" / "table with sort and filter" / "spreadsheet-like view" / "filter by status / date" / "admin grid with bulk actions"                      |
| `data-display/csv-export/`          | "export to CSV" / "download as Excel" / "bulk export" / "let me download my data" / "GDPR data export"                                                      |
| `data-display/csv-import/`          | "import from CSV" / "upload a spreadsheet" / "bulk add records" / "migrate from another tool via CSV" / "Excel import"                                      |
| `data-display/charts-dashboard/`    | "charts" / "graphs" / "analytics dashboard" / "plot X over time" / "line / bar / pie chart" / "visualize my metrics"                                        |
| `data-display/kanban-board/`        | "kanban board" / "task board with drag and drop" / "Trello-style columns" / "move cards between columns" / "project / issue board"                          |
| `data-display/leaderboard/`         | "leaderboard" / "ranked scores / top users" / "gamification points ranking" / "weekly / all-time standings" / "competition board"                           |

### Content

| Example                     | When users say…                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `content/markdown-blog/`    | "I want to write articles" / "a blog" / "newsletter posts" / "documentation site" / "changelog" / "knowledge base" / "I want to publish things"        |
| `content/rich-text-editor/` | "rich text editor" / "WYSIWYG" / "formatted text input" / "bold / italic / lists" / "compose a post / note / comment with formatting" / "Quill editor" |
| `content/video-player/`     | "play a video" / "video player" / "live stream" / "HLS / .m3u8" / "embed a video" / "watch videos in the app" / "course lesson video"                  |

### Commerce

| Example                             | When users say…                                                                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commerce/stripe-checkout/`         | "let people pay" / "accept credit cards" / "Stripe checkout" / "subscription billing" / "monthly subscription" / "one-time payment" / "checkout flow" / "I want to charge for it" |
| `commerce/subscription-management/` | "customer billing portal" / "cancel / upgrade / downgrade subscription" / "manage my plan" / "change billing details" / "pause subscription"                                      |
| `commerce/promo-codes/`             | "promo codes" / "coupon codes" / "discount codes" / "apply a code at checkout" / "% off / $ off codes"                                                                            |
| `commerce/referrals/`               | "referral codes" / "invite link with credit" / "refer a friend" / "affiliate program" / "give-X-get-X"                                                                            |
| `commerce/pdf-invoices/`            | "generate PDF invoices" / "invoice download" / "receipt PDF" / "tax invoice" / "printable invoice"                                                                                |
| `commerce/digital-downloads/`       | "sell digital products" / "downloadable files after purchase" / "PDFs / fonts / e-books for sale" / "license keys"                                                                |

### Messaging

| Example                      | When users say…                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `messaging/in-app-chat/`     | "let users chat" / "DMs between users" / "support chat widget" / "conversation thread" / "real-time messaging"           |
| `messaging/comment-threads/` | "comment threads" / "nested / threaded comments" / "discussion under a post" / "replies to comments" / "comment section" |
| `messaging/emoji-reactions/` | "emoji reactions" / "react with 👍 ❤️ 😂" / "like / reaction bar" / "reaction counts" / "react to a post"                |

### Uploads

| Example                         | When users say…                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `uploads/profile-photo-upload/` | "upload an avatar" / "let users add a profile photo" / "image upload with preview" / "photo crop and upload"                |
| `uploads/file-attachments/`     | "attach files" / "PDF / document upload" / "multiple files per record" / "resume upload" / "file library" / "asset library" |

### Forms

| Example                    | When users say…                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `forms/contact-form/`      | "a contact form" / "let people email me" / "get-in-touch page" / "support form" / "feedback form" / "simple form on the home page"       |
| `forms/settings-page/`     | "settings page" / "account settings" / "profile settings" / "preferences page" / "update my profile" / "change my email or display name" |
| `forms/multi-step-wizard/` | "a multi-step form" / "wizard" / "stepped signup" / "application form across multiple pages" / "intake questionnaire"                    |
| `forms/onboarding-tour/`   | "product tour" / "onboarding tour with tooltips" / "walk new users through the UI" / "highlight features step-by-step" / "coach marks"   |
| `forms/version-history/`   | "version history" / "revisions" / "undo / restore previous version" / "change history" / "track changes over time"                       |
| `forms/dark-mode/`         | "dark mode toggle" / "light / dark theme" / "theme switcher" / "match system preference"                                                 |
| `forms/tags-input/`        | "tags input" / "add labels / keywords" / "chip / token input" / "multi-value field" / "categorize with tags"                             |
| `forms/color-picker/`      | "color picker" / "pick a color / hex" / "brand / theme color input" / "swatch selector"                                                  |

### Notifications

| Example                               | When users say…                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notifications/in-app-notifications/` | "notifications" / "notification center" / "bell icon with unread count" / "activity feed" / "tell users when something happens"                                       |
| `notifications/transactional-emails/` | "send a welcome email" / "email receipt after purchase" / "password reset email" / "order confirmation email" / "transactional email"                                 |
| `notifications/web-push/`             | "push notifications" / "browser notifications" / "notify when app is closed" / "re-engagement notifications" / "mobile-style alerts"                                  |
| `notifications/sms-alerts/`           | "send SMS" / "text message notification" / "SMS alert / reminder" / "text the user" / "Twilio / Vonage" (for SMS one-time-code login, add `@molecule/api-two-factor`) |

### Search

| Example                    | When users say…                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search/full-text-search/` | "let users search" / "search bar" / "search products / posts / users" / "full-text search" / "type-ahead / autocomplete search"                                                                                                              |
| `search/semantic-search/`  | "semantic search" / "search by meaning" / "ask questions about my documents" / "chat with your data / knowledge base" / "RAG" (keyword search → use `full-text-search`; one-shot summarize/generate → use `integrations/ai-text-generation`) |

### Ratings

| Example                 | When users say…                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ratings/star-ratings/` | "let people rate things" / "star ratings" / "1–5 reviews" / "rate this product / service / post" / "show average rating" |

### Background jobs

| Example                  | When users say…                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jobs/scheduled-tasks/`  | "run a job every night" / "cron" / "scheduled task" / "daily / hourly batch process" / "periodic cleanup" (TIME-based; for on-demand async work use `jobs/background-queue`)                                          |
| `jobs/background-queue/` | "process in the background" / "background job / worker" / "do X asynchronously" / "don't block the request" / "job queue" / "offload slow work" (ON-DEMAND; for time-based recurring work use `jobs/scheduled-tasks`) |

### Integrations

| Example                            | When users say…                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integrations/incoming-webhooks/`  | "receive webhooks" / "integrate with Stripe / GitHub / Slack" / "listen for events from another app" / "webhook endpoint"                                                                             |
| `integrations/outbound-webhooks/`  | "send webhooks to my users" / "let users subscribe to events" / "notify external systems when something happens" / "Zapier-style / outgoing integrations" / "deliver events to a customer URL"        |
| `integrations/feature-flags/`      | "feature flags" / "A/B test" / "gradual rollout" / "turn features on for some users" / "beta toggle" / "kill switch"                                                                                  |
| `integrations/localization-setup/` | "internationalization / i18n" / "translate my app" / "language switcher" / "multi-language" / "localize for Spanish/French/etc"                                                                       |
| `integrations/analytics-events/`   | "track events" / "analytics" / "Mixpanel / PostHog / Amplitude" / "funnel tracking" / "user behavior tracking"                                                                                        |
| `integrations/maps-location/`      | "maps" / "location picker" / "address autocomplete" / "show pins on a map" / "near me"                                                                                                                |
| `integrations/ai-text-generation/` | "add AI" / "summarize / rewrite / draft with AI" / "AI writing assistant" / "generate text with an LLM (Claude / GPT)" / "AI button" (for a full streaming chat, use `@molecule/app-ai-chat` instead) |

## Compound roadmaps (whole-app asks)

When the user describes a whole product, not a feature, route them
here. Each roadmap is a build order across multiple single-feature
examples plus notes on what custom code remains.

| Example                       | When users say…                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compound/marketplace/`       | "build me a marketplace" / "Etsy / Airbnb / Fiverr clone" / "two-sided platform" / "let people sell to each other" / "online store with multiple sellers"    |
| `compound/social-feed/`       | "build me a social app" / "Instagram / Twitter / TikTok clone" / "social network" / "feed of posts from people I follow" / "photo sharing"                   |
| `compound/saas-starter/`      | "build me a SaaS" / "subscription business" / "membership site with paid plans" / "B2B tool with billing" / "Notion for X" / "tool I can charge monthly for" |
| `compound/booking-app/`       | "Calendly clone" / "booking system" / "let people book a time with me" / "appointment scheduling" / "salon/restaurant/class booking"                         |
| `compound/admin-panel/`       | "admin panel" / "backoffice" / "internal tool to CRUD my resources" / "staff dashboard" / "CMS for my own use"                                               |
| `compound/multi-tenant-orgs/` | "teams" / "organizations" / "workspaces" / "multi-tenant" / "invite teammates" / "B2B account model"                                                         |
| `compound/community-hub/`     | "Reddit clone" / "Hacker News clone" / "Product Hunt clone" / "link aggregator" / "community where people post and upvote"                                   |
| `compound/crowdfunding/`      | "Kickstarter clone" / "GoFundMe clone" / "crowdfunding" / "fundraising campaigns" / "pre-orders / Kickstarter-style funding"                                 |
| `compound/help-desk/`         | "Zendesk clone" / "help desk / ticketing system" / "customer support tool" / "tickets with status workflow"                                                  |
| `compound/learning-platform/` | "Udemy clone" / "Coursera clone" / "online courses" / "LMS" / "sell video courses"                                                                           |
| `compound/wiki-kb/`           | "wiki" / "knowledge base" / "internal docs" / "Confluence clone" / "Notion-style team docs"                                                                  |
| `compound/audit-log/`         | "audit log" / "activity history" / "who did what when" / "compliance trail" / "change log for sensitive actions"                                             |

---

## Translating non-technical asks

Most users describe what they want to build in their own words, never
naming OAuth, S3, Stripe, or "pagination". Map their phrasing to the
right example(s):

### "I want to build…" — whole-product asks

| Non-technical phrasing                      | Example(s)                                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "an app like Etsy / Airbnb / Fiverr"        | `compound/marketplace/`                                                                                               |
| "an app like Instagram / Twitter / TikTok"  | `compound/social-feed/`                                                                                               |
| "an app like Notion / Linear / Asana for X" | `compound/saas-starter/` (custom domain logic on top)                                                                 |
| "an app like Calendly"                      | `compound/booking-app/`                                                                                               |
| "an app like Substack / Medium"             | `content/markdown-blog/` + `auth/email-password-login/`                                                               |
| "a Slack / Discord clone"                   | `messaging/in-app-chat/` + `auth/oauth-google-login/`                                                                 |
| "a Zoom clone"                              | NO example — needs WebRTC, custom build                                                                               |
| "a Spotify clone"                           | NO example — audio licensing is the hard part, not the code                                                           |
| "a real estate / job listings site"         | `compound/marketplace/` (rename listings, drop checkout)                                                              |
| "an admin dashboard for my X"               | `data-display/paginated-user-list/` (start there, add per-row actions)                                                |
| "a directory of X"                          | `data-display/paginated-user-list/`                                                                                   |
| "a portfolio site"                          | `content/markdown-blog/` (each post = a project)                                                                      |
| "a course platform"                         | `compound/saas-starter/` + `content/markdown-blog/` (each lesson = a post) + `uploads/profile-photo-upload/` (videos) |
| "an event ticketing app"                    | `compound/booking-app/` + `commerce/stripe-checkout/`                                                                 |
| "a fitness / habit tracker"                 | `auth/email-password-login/` + `data-display/paginated-user-list/` (rename to logs)                                   |

### "Let people…" — feature-level asks

| Non-technical phrasing                                                              | Example(s)                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "let people pay / buy stuff / order things"                                         | `commerce/stripe-checkout/`                                                                                 |
| "let people sign up / make accounts / register"                                     | `auth/email-password-login/` (mention OAuth as faster alternative)                                          |
| "let people sign in / log in"                                                       | same as above                                                                                               |
| "let people post things / share things"                                             | `content/markdown-blog/` (long-form) or `compound/social-feed/` (short-form social)                         |
| "let people upload photos / pictures / images"                                      | `uploads/profile-photo-upload/`                                                                             |
| "let people upload files / documents"                                               | `uploads/file-attachments/`                                                                                 |
| "let people talk / chat / message each other"                                       | `messaging/in-app-chat/`                                                                                    |
| "let people contact me / email me"                                                  | `forms/contact-form/`                                                                                       |
| "let people leave reviews / rate things"                                            | `ratings/star-ratings/` (rating widget) + `data-display/paginated-user-list/` if you need a list of reviews |
| "let people search / filter X"                                                      | `search/full-text-search/`                                                                                  |
| "let people invite teammates"                                                       | `compound/multi-tenant-orgs/` (full team / orgs roadmap; invite flow is one of its sub-features)            |
| "let people share / send a link"                                                    | NO direct example — generate a slug + render a public page                                                  |
| "let people connect my app to Zapier / their own systems / get notified externally" | `integrations/outbound-webhooks/` (register a URL, deliver signed events, SSRF-safe)                        |

### "I want a…" — page/section asks

| Non-technical phrasing        | Example(s)                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "a feed"                      | `compound/social-feed/` for full thing, or `data-display/paginated-user-list/` for just the list                                                                       |
| "a profile page"              | `uploads/profile-photo-upload/` for the photo + custom form for the rest                                                                                               |
| "a settings page"             | `forms/settings-page/`                                                                                                                                                 |
| "a dashboard"                 | `data-display/charts-dashboard/` for the charts + `data-display/paginated-user-list/` as a data panel; layout from `.agents/skills/patterns/dashboard-shell-layout.md` |
| "charts / graphs / analytics" | `data-display/charts-dashboard/` (bond `@molecule/app-charts-chartjs`)                                                                                                 |
| "a landing page"              | NO example — write static page with `@molecule/app-ui-react`. Use `forms/contact-form/` for the CTA.                                                                   |
| "a pricing page"              | NO direct example — static page; checkout uses `commerce/stripe-checkout/`                                                                                             |
| "an admin panel"              | `compound/admin-panel/` (full roadmap) — one `data-display/sortable-table/` per resource within it                                                                     |
| "a search page"               | `search/full-text-search/`                                                                                                                                             |
| "a comments section"          | `messaging/comment-threads/` (nested comments on any resource via api-resource-comment + ThreadTree)                                                                   |
| "a notification center"       | `notifications/in-app-notifications/`                                                                                                                                  |

### Vague / ambitious asks

| Phrasing                               | What to do                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| "I want to build the next Facebook"    | Use `compound/social-feed/`. Tell them they're describing 3-5 years of work; pick ONE flagship feature for v1.                                |
| "Make it like X but for Y"             | Decompose X into features. Map each feature to an example. Tell them which features have no example coverage so they know what's custom work. |
| "Just build me an app" / "Surprise me" | Ask one clarifying question: "Who are the users and what's the core thing they do?" Without that you can't pick examples.                     |
| "I don't know what I want"             | Suggest `compound/saas-starter/` as the most generic shape (auth + paywall + a feature). Ask what the feature is.                             |

If the user's ask doesn't match anything above, it's probably a custom
feature (not covered by any @molecule package). Tell them so and write
it directly using standard npm libraries — never invent a `@molecule/*`
name to fill the gap.

## Adding new examples

Examples are sourced from `mlcl/templates/apps/*` (canonical flagship
implementations) plus `mlcl/templates/.agents/skills/examples/`
(curated). To add one: pick a flagship that has the feature working,
extract the bond + handler + page + locale into a new folder under the
right category, write a README.md following the format in the existing
ones, and add a row to the appropriate table above.

For compound roadmaps: write the README only — they reference single-
feature examples, no own code.
