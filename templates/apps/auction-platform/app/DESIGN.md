# DESIGN.md — Auction Platform

## Brand Identity

- **App Name:** Gavl
- **Tagline:** Every second counts
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Urgent, competitive, energetic, trustworthy

## Target Persona

Bidders and sellers participating in live online auctions for collectibles, art, and specialty items.

## Screens

| Name               | Route                     | Auth | Purpose                                                                                                                                                                                                                                                         | deriveFrom |
| ------------------ | ------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing            | /                         | No   | Marketing home showcasing featured auctions with countdowns, warm orange palette, features, pricing                                                                                                                                                             | —          |
| Login              | /login                    | No   | Centered card with orange primary                                                                                                                                                                                                                               | —          |
| Signup             | /signup                   | No   | Create account                                                                                                                                                                                                                                                  | Login      |
| ForgotPassword     | /forgot-password          | No   | Request reset                                                                                                                                                                                                                                                   | Login      |
| ResetPassword      | /reset-password           | No   | Set new password                                                                                                                                                                                                                                                | Login      |
| BrowseAuctions     | /auctions                 | Yes  | Filter sidebar (category, price, ending soon), grid of auction cards with hero image, title, current bid in orange, c...                                                                                                                                        | —          |
| AuctionDetail      | /auctions/:id             | Yes  | Image gallery left with thumbnails, bid panel right with current bid, countdown timer, bid increment buttons, buy-now...                                                                                                                                        | —          |
| MyBids             | /my-bids                  | Yes  | Sidebar, tabs (Active / Won / Lost), table with item photo, title, my bid, current bid, status badge (winning/outbid)...                                                                                                                                        | —          |
| SellListing        | /sell/new                 | Yes  | Sidebar, form with photo upload grid, title, description, starting bid, reserve, duration picker, categories, preview...                                                                                                                                        | —          |
| Watchlist          | /watchlist                | Yes  | Sidebar, grid of saved auctions with live countdown timers and current bid updates, notification bell toggle per item                                                                                                                                           | —          |
| Settings           | /settings                 | Yes  | Sidebar, profile, payment methods, shipping addresses, notifications                                                                                                                                                                                            | —          |
| SellerDashboard    | /seller                   | Yes  | Sidebar, seller's command center: stats cards (active listings, bids received, items sold, revenue), tabs (Active/Sold/Ended/Drafts), listings table with thumbnails + current bid + watchers + status, recent activity feed                                    | —          |
| Notifications      | /notifications            | Yes  | Sidebar, full activity center with filter chips (All/Bids/Outbids/Wins/Watchlist/Selling/System), grouped notification rows with semantic left-border colors (red outbid, amber ending, green won, orange new-bid) and inline action buttons, preferences panel | —          |
| SellerProfile      | /sellers/:handle          | Yes  | Sidebar, public seller profile: avatar + name + verified checkmark + star rating + trust stats (% positive, items sold, Top Seller badge), tabs (Active Listings/Sold/Reviews/About), auction grid, reviews preview, bio                                        | —          |
| WonAuctionCheckout | /my-bids/won/:id/checkout | Yes  | Sidebar, two-column checkout: won banner with payment countdown, item summary, shipping address radio cards, payment method radio cards, sticky order summary with fees breakdown and green Pay Now CTA                                                         | —          |

## App Constraints

- Live countdown timers use mono font (SF Mono) on dark #1e1e1e background with white text
- Current bid price uses orange (#e05a2b), buy-now price uses green (#1a9a6c)
- Ending-soon auctions show amber urgent badge

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e05a2b`
- Primary Hover: `#f06a3b`
- Primary Dark: `#c04a1e`
- Accent: `#1a9a6c`
- Accent Hover: `#22b87e`
- Accent Dark: `#147a56`

### Semantic

- Bid Active: `#e05a2b`
- Bid Active Light: `#fde8e0`
- Bid Winning: `#1a9a6c`
- Bid Winning Light: `#d1fae5`
- Bid Outbid: `#dc2626`
- Bid Outbid Light: `#fee2e2`
- Ending Soon: `#d97706`
- Ending Soon Light: `#fef3c7`
- Auction Closed: `#6b7280`
- Auction Closed Light: `#f3f4f6`
- Reserve Met: `#1a9a6c`
- Reserve Not Met: `#d97706`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf8f6`
- Bid Panel: `#fdf6f2`
- Timer Bar: `#1e1e1e`

### Text

- Price: `#111827`
- Price Current Bid: `#e05a2b`
- Price Buy Now: `#1a9a6c`
- Bid Increment: `#6b7280`
- Timer: `#ffffff`
- Timer Urgent: `#dc2626`
- Link: `#e05a2b`
- Link Hover: `#c04a1e`

### Borders

- Bid Panel: `#f0d8c8`
- Bid Panel Focus: `#e05a2b`

### Dark Theme Overrides

- Primary: `#f28c60`
- Accent: `#34d399`
- Background: `#111017`
- Surface: `#1c1a24`
- Surface Secondary: `#252330`
- Bid Panel: `#2a2232`
- Text Primary: `#f5f3f7`
- Text Secondary: `#a09bb0`
- Border Primary: `#33303e`
- Timer Bar: `#0d0b12`
- Price Current Bid: `#f28c60`
- Timer Urgent: `#f87171`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Timer: `"SF Mono", "Fira Code", "Cascadia Code", SFMono-Regular, Menlo, monospace`

## Layout

- Content Max Width: `1400px`
- Auction Grid Columns: `4` (desktop), `3` (laptop), `2` (tablet), `1` (mobile)
- Auction Grid Gap: `20px`
- Sidebar Filter Width: `280px`
- Bid Panel Width: `380px`
- Dashboard Sidebar Width: `260px`
- Timer Bar Height: `48px`

## Components

### Auction Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md` with `translateY(-2px)` lift
- Image aspect ratio: `4:3`
- Padding: `0` (image flush) + `16px` (content area)
- Timer overlay: bottom of image, `Timer Bar` background, `Timer` font, `12px` padding
- Timer urgent state: `Ending Soon` background when < 5 minutes remain
- Bid count badge: `Accent` background, white bold text, top-left absolute, `full` radius
- Status ribbon: top-right corner, angled `45deg`, `28px` height, category-colored

### Bid Panel

- Border radius: `12px` (lg)
- Background: `Bid Panel`
- Border: `1px solid` `Bid Panel` border
- Padding: `24px`
- Shadow: `md`
- Current bid: `3xl` font, `700` weight, `Price Current Bid` color
- Bid input height: `56px`
- Bid input border radius: `8px`
- Bid input focus: `2px solid` `Bid Panel Focus`
- Bid button: full width, `48px` height, `Primary` background, `600` weight

### Place Bid Button

- Border radius: `8px` (md)
- Height: `48px` (lg)
- Font weight: `600`
- Font size: `lg` (18px)
- Background: `Primary`
- Hover: `Primary Hover` + `md` shadow
- Active/pressed: `Primary Dark`
- Disabled: `#d0d0d0` background, `#888` text
- Full width in bid panel

### Buy Now Button

- Border radius: `8px` (md)
- Height: `48px` (lg)
- Font weight: `600`
- Background: `Accent`
- Hover: `Accent Hover`
- Full width in bid panel, below bid button with `12px` gap

### Countdown Timer

- Font family: `Timer`
- Active: `20px`, `600` weight, white on `Timer Bar`
- Urgent (< 5 min): `Timer Urgent` color, pulse animation `1s ease infinite`
- Compact (card): `14px`, `500` weight
- Segments: `DD : HH : MM : SS` with `4px` letter-spacing between colons
- Segment labels: `10px`, `400` weight, `Text Secondary`

### Bid History Table

- Header background: `Surface Secondary`
- Row hover: `Surface Secondary`
- Winning bid row: left `3px solid` `Bid Winning` accent border
- Your bid highlight: `Bid Active Light` background
- Outbid row: `Bid Outbid Light` background, `Bid Outbid` text
- Cell padding: `10px 16px`
- Bidder avatar: `28px` circle, `full` radius
- Timestamp: `sm` font, `Text Secondary`

### Auction Status Badge

- Border radius: `full` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Font weight: `600`
- Text transform: uppercase
- Letter spacing: `0.5px`
- Variants:
  - Live: `Bid Active Light` background, `Bid Active` text, pulsing dot indicator
  - Ending Soon: `Ending Soon Light` background, `Ending Soon` text
  - Closed: `Auction Closed Light` background, `Auction Closed` text
  - Won: `Bid Winning Light` background, `Bid Winning` text
  - Reserve Not Met: `Ending Soon Light` background, `Reserve Not Met` text

### Image Gallery

- Main image border radius: `12px`
- Thumbnail size: `64px`
- Thumbnail border radius: `8px`
- Thumbnail active: `2px solid` `Primary`
- Thumbnail gap: `8px`
- Zoom on hover: `scale(1.5)` with `overflow: hidden` container
- Max thumbnails visible: `6`, scroll for more

### Category Nav Bar

- Height: `48px`
- Background: `Surface`
- Border bottom: `1px solid` border-primary
- Active item: `Primary` underline `3px`, `Primary` text, `600` weight
- Horizontal scroll on mobile with fade edges
- Icon size: `18px` inline before label

### Notification Toast (Bid Updates)

- Border radius: `12px`
- Shadow: `lg`
- Padding: `16px`
- Max width: `380px`
- Position: bottom-right
- Outbid alert: `Bid Outbid` left border `4px`, `Bid Outbid Light` background
- Won alert: `Bid Winning` left border `4px`, `Bid Winning Light` background
- Ending soon: `Ending Soon` left border `4px`, `Ending Soon Light` background
- Auto-dismiss: `5s` for info, `8s` for outbid alerts
- Entrance: slide-in from right, `Normal` transition

### Seller Dashboard Cards

- Border radius: `12px`
- Padding: `20px`
- Stat number: `2xl` font, `700` weight
- Stat label: `sm` font, `Text Secondary`
- Trend indicator: `sm` font, `Bid Winning` for positive, `Bid Outbid` for negative
- Grid: `3` columns desktop, `1` mobile

### Search Bar

- Border radius: `full` (pill)
- Height: `48px`
- Padding: `8px 20px`
- Background: `Surface Secondary`
- Border: `1px solid transparent`
- Focus: `Surface` background, `1px solid` `Primary`
- Search icon: `20px`, `Text Secondary`
- Category dropdown: inline left, `1px solid` border-primary separator
