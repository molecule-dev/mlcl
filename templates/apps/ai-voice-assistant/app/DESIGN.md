# DESIGN.md — AI Voice Assistant

## Brand Identity

- **App Name:** Vox
- **Tagline:** Think out loud
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Conversational, immersive, smooth, ambient

## Target Persona

Users who prefer voice-first interaction with AI for thinking, brainstorming, and daily tasks.

## Screens

| Name               | Route             | Auth | Purpose                                                                                                                  | deriveFrom |
| ------------------ | ----------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing            | /                 | No   | Dark-mode marketing home with deep purple palette, voice demo, glowing waveforms, features, pricing                      | —          |
| Login              | /login            | No   | Dark centered card with glowing purple primary, ambient gradient background                                              | —          |
| Signup             | /signup           | No   | Create account                                                                                                           | Login      |
| ForgotPassword     | /forgot-password  | No   | Request reset                                                                                                            | Login      |
| ResetPassword      | /reset-password   | No   | Set new password                                                                                                         | Login      |
| Conversation       | /conversation     | Yes  | Dark sidebar with conversation history, centered chat column (680px max) with user/assistant bubbles, large pulsing m... | —          |
| History            | /history          | Yes  | Dark sidebar, list of past conversations with titles, durations, timestamps (mono), message counts                       | —          |
| ConversationDetail | /history/:id      | Yes  | Dark sidebar, full transcript center with playback controls at top, speaker labels, durations                            | —          |
| Agents             | /agents           | Yes  | Dark sidebar, agent persona cards with avatar, voice sample play button, description, capabilities list                  | —          |
| Settings           | /settings         | Yes  | Dark sidebar, voice selector, language, privacy toggles, notification settings                                           | —          |
| AgentDetail        | /agents/:id       | Yes  | Dark sidebar, agent persona editor with avatar, voice tile picker, system prompt, capability toggles, behavior sliders   | —          |
| Billing            | /settings/billing | Yes  | Dark sidebar, voice-minutes usage gauge, plan tier comparison, payment method, invoice history                           | —          |
| Search             | /search           | Yes  | Dark sidebar, command-palette search input, grouped results across transcripts, agents, bookmarks, settings              | —          |
| Profile            | /profile          | Yes  | Public/team identity card, avatar upload, display name, bio                                                              | Settings   |

## App Constraints

- Dark mode is the default theme — background #0c0a1a
- Recording state pulses in red (#ef4444); processing pulses in violet; speaking pulses in cyan
- Main chat column max-width 680px, centered

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6d28d9`
- Primary Hover: `#7c3aed`
- Primary Dark: `#5b21b6`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Listening: `#ef4444`
- Listening Pulse: `rgba(239, 68, 68, 0.25)`
- Processing: `#a78bfa`
- Processing Pulse: `rgba(167, 139, 250, 0.3)`
- Speaking: `#06b6d4`
- Speaking Pulse: `rgba(6, 182, 212, 0.25)`
- Idle: `#64748b`
- Transcription Confidence High: `#16a34a`
- Transcription Confidence Medium: `#eab308`
- Transcription Confidence Low: `#ef4444`
- Agent Active: `#8b5cf6`
- Agent Queued: `#94a3b8`

### Backgrounds

- Primary: `#0c0a1a`
- Secondary: `#131029`
- Tertiary: `#1a1538`
- Surface: `#1e1847`
- Surface Secondary: `#251f56`
- Input: `#1a1538`
- Chat Bubble User: `#6d28d9`
- Chat Bubble Assistant: `#1e1847`
- Waveform Track: `rgba(255, 255, 255, 0.06)`
- Overlay: `rgba(12, 10, 26, 0.75)`

### Text

- Primary: `#f1f0f7`
- Secondary: `#a5a0c4`
- Tertiary: `#7b74a3`
- Inverse: `#0c0a1a`
- Timestamp: `#7b74a3`
- Transcription: `#e2e0f0`
- Link: `#a78bfa`
- Link Hover: `#c4b5fd`

### Borders

- Primary: `#2d2660`
- Secondary: `#3b3378`
- Focus: `#7c3aed`
- Waveform: `rgba(167, 139, 250, 0.2)`

### Dark Theme Overrides

Dark theme IS the default for Vox. Light theme overrides:

- Primary: `#6d28d9`
- Background: `#f8f7fc`
- Secondary: `#f0eef8`
- Surface: `#ffffff`
- Surface Secondary: `#f5f3fb`
- Input: `#ffffff`
- Text Primary: `#1e1847`
- Text Secondary: `#64608a`
- Border Primary: `#e0ddf0`
- Chat Bubble User: `#6d28d9`
- Chat Bubble Assistant: `#f0eef8`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Transcript: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (font-feature-settings: "cv01", "cv02")
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`
- Duration: `"Tabular Nums", "Inter", sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `800px`
- Chat Column Max Width: `680px`
- Sidebar Width: `280px` (collapsed: `72px`)
- Top Bar Height: `56px`
- Input Bar Height: `72px` (resting), `120px` (expanded with controls)
- Waveform Height: `48px` (inline), `96px` (recording view)
- Voice Orb Size: `120px` (idle), `160px` (active), `200px` (recording)
- Transcript Panel Width: `320px` (side panel mode)

## Components

### Voice Orb

- Shape: circle, `120px` default
- Idle: solid primary, subtle `box-shadow: 0 0 30px rgba(109, 40, 217, 0.3)`
- Listening: radial gradient from `#ef4444` center to `#6d28d9` edge, pulsing ring animation at `1.5s ease-in-out infinite`
- Processing: rotating conic gradient `#a78bfa` → `#6d28d9` → `#a78bfa`, `2s linear infinite`
- Speaking: ripple rings emanating outward from accent color, `0.8s ease-out` per ring
- Border radius: `full` (9999px)
- Transition between states: `500ms cubic-bezier(0.4, 0, 0.2, 1)`
- Scale on active: `1.33` with spring easing
- Backdrop blur behind orb: `20px`

### Chat Bubble — User

- Border radius: `20px 20px 4px 20px`
- Background: brand primary
- Text color: `#ffffff`
- Padding: `12px 16px`
- Max width: `75%`
- Font size: `base` (16px)
- Align: right
- Source badge: "Voice" or "Text" pill, `10px` font, `rgba(255,255,255,0.3)` background

### Chat Bubble — Assistant

- Border radius: `20px 20px 20px 4px`
- Background: surface
- Text color: text-primary
- Padding: `12px 16px`
- Max width: `85%`
- Font size: `base` (16px)
- Align: left
- Audio playback bar: inline, `32px` height, accent color progress

### Waveform Visualizer

- Bar count: `40` (inline), `64` (full recording view)
- Bar width: `3px`
- Bar gap: `2px`
- Bar radius: `full` (rounded caps)
- Active color: gradient from primary to accent
- Inactive color: waveform-track background
- Animation: bars react to audio amplitude, `60fps`, `50ms` update interval
- Height: `48px` inline, `96px` full view

### Audio Playback Control

- Border radius: `24px` (pill)
- Height: `40px`
- Background: surface-secondary
- Play/pause button: `28px` circle, accent background
- Progress bar: `3px` height, accent fill, `full` radius
- Duration text: duration font, `xs` size, secondary text color
- Speed selector: `1×`, `1.5×`, `2×` pills, `sm` font

### Transcript Panel

- Background: surface
- Border-left: `1px solid` border-primary
- Word highlight (current): `rgba(167, 139, 250, 0.2)` background, `4px` radius
- Confidence underline: `2px dotted` using confidence colors (high/medium/low)
- Timestamp markers: `xs` font, tertiary text, `16px` left margin
- Speaker labels: `sm` font, `600` weight, primary text, `8px` bottom margin

### Voice Input Bar

- Background: surface with `backdrop-filter: blur(16px)`
- Border-top: `1px solid` border-primary
- Border radius: `0` (full width, docked to bottom)
- Inner input area radius: `24px` (pill shape)
- Mic button: `48px` circle, primary background, centered
- Mic button active: listening color, pulse animation
- Text fallback input: `40px` height, transparent background, left of mic
- Keyboard toggle: `32px` icon button, secondary color

### Conversation List Item

- Border radius: `12px`
- Padding: `12px 16px`
- Active: `rgba(109, 40, 217, 0.12)` background, primary left border `3px`
- Hover: `rgba(109, 40, 217, 0.06)` background
- Title: `sm` font, `500` weight, single line truncate
- Subtitle (last message): `xs` font, secondary text, single line truncate
- Timestamp: `xs` font, tertiary text, right-aligned
- Voice indicator icon: `12px`, accent color, next to timestamp if last message was voice

### Agent Status Indicator

- Shape: `8px` circle inline with text
- Active: agent-active color, pulse animation `2s ease-in-out infinite`
- Queued: agent-queued color, static
- Label: `sm` font, `500` weight
- Container: `8px` padding, `full` radius pill, `rgba` background matching agent color at `0.1` opacity

### Real-time Connection Badge

- Position: top-right of chat area, `8px` from edges
- Connected: `8px` green dot + "Live" text
- Reconnecting: `8px` amber dot, blink animation + "Reconnecting" text
- Disconnected: `8px` red dot + "Offline" text
- Font: `xs`, `500` weight
- Background: surface with `backdrop-filter: blur(8px)`, `full` radius
- Padding: `4px 10px`

## Animations

### Voice Orb Pulse

```
@keyframes orbPulse {
  0%, 100% { box-shadow: 0 0 30px rgba(109, 40, 217, 0.3); transform: scale(1); }
  50% { box-shadow: 0 0 60px rgba(109, 40, 217, 0.5); transform: scale(1.05); }
}
```

- Duration: `2s`
- Timing: `ease-in-out`
- Iteration: `infinite`
- Only active during listening/processing states

### Ripple (Speaking)

```
@keyframes speakRipple {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

- Duration: `1.2s`
- Timing: `ease-out`
- Stagger: 3 rings, `0.4s` apart

### Transcript Word Appear

- `opacity: 0 → 1`, `transform: translateY(2px) → translateY(0)`
- Duration: `200ms`
- Timing: `ease-out`
- Stagger: `30ms` per word (streaming feel)

### State Transitions

- Idle → Listening: `300ms ease-out` (color shift + scale up)
- Listening → Processing: `400ms ease-in-out` (color morph + rotation start)
- Processing → Speaking: `350ms ease-out` (ripple initiation)
- Any → Idle: `500ms ease-in` (scale down + color fade)

## Accessibility

- Voice orb states must have `aria-live="polite"` announcements: "Listening", "Processing", "Speaking", "Ready"
- All audio playback controls must be keyboard-accessible with visible focus rings (focus border color, `2px` offset)
- Transcript text must be selectable and copyable
- Waveform visualizer must have `aria-hidden="true"` (decorative) with text alternative nearby
- Minimum touch target: `44px` for all interactive elements
- Reduced motion: replace all pulse/ripple animations with static color changes via `prefers-reduced-motion: reduce`
