# DESIGN.md — Music DAW

## Brand Identity

- **App Name:** Fugue
- **Tagline:** Layer everything, lose nothing
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Creative
- Technical
- Fluid
- Studio-grade

## Target Persona

Music producers and sound designers building multi-track compositions in a browser DAW.

## Screens

| Name           | Route                       | Auth | Purpose                                                                                     | deriveFrom |
| -------------- | --------------------------- | ---- | ------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                           | No   | Marketing home                                                                              | —          |
| Login          | /login                      | No   | Sign in                                                                                     | —          |
| Signup         | /signup                     | No   | Create account                                                                              | Login      |
| ForgotPassword | /forgot-password            | No   | Request reset                                                                               | Login      |
| ResetPassword  | /reset-password             | No   | Set new password                                                                            | Login      |
| Dashboard      | /dashboard                  | Yes  | Recent projects, templates, sample library highlights                                       | —          |
| Projects       | /projects                   | Yes  | All projects with duration, BPM, last edited                                                | —          |
| Editor         | /projects/:id               | Yes  | DAW timeline editor with tracks, waveforms, mixer, transport                                | —          |
| Samples        | /samples                    | Yes  | Sample library browser with preview                                                         | —          |
| Mixing         | /projects/:id/mix           | Yes  | Mixer view with faders, pan, FX chain                                                       | —          |
| Settings       | /settings                   | Yes  | Audio interface, MIDI, keyboard shortcuts                                                   | —          |
| PianoRoll      | /projects/:id/clips/:clipId | Yes  | MIDI note editor — vertical keyboard, note grid, velocity lane, clip/note inspector         | —          |
| SampleDetail   | /samples/:id                | Yes  | Single-sample view with waveform editor, slice points, key/BPM tagging, pitch/time controls | —          |
| Profile        | /profile/:handle            | Yes  | Producer profile with cover, stats, published projects, samples, activity                   | —          |
| Billing        | /settings/billing           | Yes  | Subscription, plan comparison, usage meters, payment method, invoice history                | —          |

## App Constraints

- Dark studio aesthetic with neon violet accents
- Track timeline with waveform rendering
- Transport controls (play/stop/record) fixed bottom

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#8b5cf6`
- Primary Hover: `#a78bfa`
- Primary Dark: `#7c3aed`
- Accent: `#ec4899`
- Accent Hover: `#f472b6`
- Accent Dark: `#db2777`
- Glow: `rgba(139, 92, 246, 0.25)` (used for active/playing state halos)

### Semantic

- Playing: `#22d3ee`
- Playing Light: `rgba(34, 211, 238, 0.15)`
- Recording: `#ef4444`
- Recording Light: `rgba(239, 68, 68, 0.15)`
- Muted: `#6b7280`
- Soloed: `#facc15`
- Armed: `#ef4444`
- Clipping: `#ff0000`
- Headroom: `#22c55e`

### Track Lane Colors (cycled per-track)

- Lane 1: `#8b5cf6` (violet)
- Lane 2: `#06b6d4` (cyan)
- Lane 3: `#f97316` (orange)
- Lane 4: `#22c55e` (emerald)
- Lane 5: `#ec4899` (pink)
- Lane 6: `#eab308` (yellow)
- Lane 7: `#3b82f6` (blue)
- Lane 8: `#14b8a6` (teal)

### Backgrounds

- Primary: `#0c0a13`
- Secondary: `#13111c`
- Tertiary: `#1a1726`
- Surface: `#1e1b2e`
- Surface Secondary: `#252238`
- Input: `#1a1726`
- Overlay: `rgba(0, 0, 0, 0.7)`
- Timeline: `#100e1a`
- Mixer Strip: `#181524`
- Piano Roll: `#0f0d18`

### Text

- Primary: `#f1f0f5`
- Secondary: `#9894a8`
- Tertiary: `#706c82`
- Inverse: `#0c0a13`
- Link: `#a78bfa`
- Link Hover: `#c4b5fd`

### Borders

- Primary: `#2d2945`
- Secondary: `#3d3858`
- Focus: `#8b5cf6`

### Meter Gradient (bottom to top)

- Low: `#22c55e`
- Mid: `#facc15`
- High: `#f97316`
- Clip: `#ef4444`

### Dark Theme Overrides

Dark IS the default for Fugue. Light theme overrides:

- Primary: `#7c3aed`
- Background: `#f5f3ff`
- Surface: `#ffffff`
- Surface Secondary: `#ede9fe`
- Text Primary: `#1e1b2e`
- Text Secondary: `#6d6884`
- Border Primary: `#ddd6fe`

## Typography

### Font Families

- UI (default): `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Mono (timecodes, BPM, parameter values): `"JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, monospace`
- Display (logo, transport): `Inter, -apple-system, sans-serif` (weight 800)

### Font Sizes

- Parameter Label: `0.625rem` (10px)
- Track Label: `0.75rem` (12px)
- Mixer Label: `0.6875rem` (11px)
- Timecode: `0.875rem` (14px) mono
- BPM Display: `1.125rem` (18px) mono, weight 700
- Transport Time: `1.5rem` (24px) mono, weight 600

## Layout

- Content Max Width: `none` (full viewport — DAWs use every pixel)
- Arrangement Area: fluid, fills remaining space between sidebar and inspector
- Track Header Width: `220px` (collapsible to `160px`)
- Track Default Height: `80px` (resizable: min `40px`, max `300px`)
- Inspector Panel Width: `280px` (right side, collapsible)
- Mixer Strip Width: `90px` (min `72px`, max `120px`)
- Browser/Library Panel Width: `260px` (left sidebar, collapsible)
- Transport Bar Height: `48px` (fixed bottom or top)
- Timeline Ruler Height: `28px`
- Piano Roll Key Width: `48px`
- Toolbar Height: `40px`

### Panel Zones

- **Top:** Toolbar (global actions, tool selection)
- **Left:** Browser panel (instruments, effects, samples, file browser)
- **Center:** Arrangement view (timeline + track lanes) or Piano Roll / Drum Editor
- **Right:** Inspector (selected track/clip properties)
- **Bottom:** Mixer view (channel strips) — resizable, can be hidden or detached
- **Footer:** Transport bar (play/stop/record, BPM, time signature, timecode)

## Components

### Track Lane

- Background: surface with subtle alternating rows (`Surface` / `Surface Secondary`)
- Selected track: left `3px` accent border using track lane color
- Header background: `Mixer Strip` color
- Header padding: `8px 12px`
- Waveform/MIDI clip: rounded `4px`, filled with lane color at 30% opacity, waveform/notes in lane color at 90%
- Clip label: `10px` font, top-left inside clip, white with 70% opacity
- Drag handle: full height, `4px` wide, visible on hover
- Mute/Solo/Arm buttons: `20px` square, `4px` radius, icon-only

### Channel Strip (Mixer)

- Width: `90px`
- Background: `Mixer Strip`
- Border-right: `1px solid` border-primary
- Fader track: `4px` wide, `160px` tall, `2px` radius, centered
- Fader thumb: `32px` wide, `12px` tall, `3px` radius, surface color, `1px` border
- Level meter: `6px` wide, `160px` tall, `2px` radius, gradient fill (meter gradient), stereo = two meters with `2px` gap
- Pan knob: `28px` diameter, `full` radius, `2px` stroke
- Channel label: `11px` mono, centered, truncated with ellipsis
- Send slots: `24px` tall each, `10px` label, hover reveals value

### Transport Bar

- Background: `Secondary` with top `1px` border
- Height: `48px`
- Play/Stop/Record buttons: `32px` square, `full` radius
- Play: `Playing` color when active, pulsing glow
- Record: `Recording` color when active, pulsing glow
- BPM field: mono `18px`, editable on double-click, `48px` wide
- Time signature: mono `14px`, dropdown on click
- Timecode display: mono `14px`, right-aligned
- Loop toggle: `Accent` color when active

### Instrument/Effect Rack

- Container: `Surface` background, `8px` radius top corners
- Slot height: `28px`
- Plugin label: `12px`, secondary text, truncated
- Bypass toggle: `16px` circle, primary color when active, muted when bypassed
- Drag reorder: `4px` grip dots on left
- Expand arrow: reveals full plugin UI (embedded or floating window)

### Piano Roll

- Background: `Piano Roll`
- Grid lines: border-primary at `0.5px`, bar lines at `1px`
- White keys: `Surface Secondary` at 5% opacity
- Black keys: `Surface` at 8% opacity
- Note block: track lane color, `2px` radius, velocity mapped to opacity (40%–100%)
- Selected note: white `1px` border, brighter fill
- Velocity bar (bottom lane): track lane color, vertical bars

### Knob

- Size: `28px` (sm), `36px` (md), `48px` (lg)
- Track: `3px` stroke, border-secondary color, 270-degree arc
- Value arc: `3px` stroke, primary color (or parameter-specific color)
- Pointer: `2px` stroke, text-primary
- Value label: `10px` mono, centered below

### Waveform Display

- Background: transparent (inherits clip background)
- Waveform fill: lane color at 40% opacity
- Waveform stroke: lane color at 90%, `1px`
- Zero line: border-primary at 30% opacity
- Selection highlight: primary at 20% opacity

### Browser Panel

- Section headers: `11px` uppercase, secondary text, `600` weight
- Tree items: `13px`, `28px` row height, `20px` indent per level
- Drag preview: `4px` radius, surface background, `md` shadow, 90% opacity
- Search input: `32px` height, `Tertiary` background, `sm` radius
- Category pills: `full` radius, `10px` font, `24px` height

### Timeline Ruler

- Background: `Secondary`
- Height: `28px`
- Bar numbers: `10px` mono, secondary text
- Beat ticks: `8px` tall major, `4px` minor, border-secondary
- Playhead: `1px` wide, `Playing` color, full arrangement height, with `8px` triangle top marker
- Loop region: `Accent` at 15% opacity fill, `Accent` `2px` top border

### Context Menu (right-click)

- Background: `Surface`
- Border: `1px solid` border-primary
- Radius: `8px`
- Shadow: `lg`
- Item height: `32px`
- Item padding: `8px 16px`
- Shortcut label: `11px` mono, secondary text, right-aligned
- Separator: `1px` border-primary, `4px` vertical margin
- Hover: `Surface Secondary`

## Transitions

- Meter smoothing: `60ms linear` (fast enough for audio metering)
- Fader drag: `0ms` (instant, no interpolation during drag)
- Panel collapse/expand: `200ms ease-out`
- Playhead scrub: `0ms` (instant)
- Plugin UI open: `150ms ease`
- Track arm/solo/mute: `100ms ease` (state color transition)

## Z-Index Scale (additions to base)

- Track Clips: `100`
- Playhead: `200`
- Selection Marquee: `300`
- Floating Plugin Window: `1250`
- Transport Bar: `1150` (above sticky, below modal)

## Design Principles

1. **Dark-first** — Fugue defaults to a dark theme. All components are designed dark-first; light theme is the adaptation, not the other way around.
2. **Density over whitespace** — DAW interfaces maximize information density. Prefer compact controls, tight spacing, and minimal padding in mixer/arrangement views.
3. **Instant feedback** — Audio controls (faders, knobs, transport) must feel zero-latency. No easing on drag interactions. Meter updates at 60fps minimum.
4. **Color = identity** — Each track gets a lane color. That color propagates to clips, mixer strips, sends, and the piano roll. Users should spot their bass track by color alone.
5. **Readable at a glance** — Monospace for all numerical values (BPM, timecodes, dB levels). Tabular numerals prevent layout jitter when values change.
6. **Non-destructive always** — Visual affordances should communicate that actions are undoable. No "delete" without undo. Mute rather than remove.
