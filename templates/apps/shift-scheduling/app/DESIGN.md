# Shiftly — Shift Scheduling (design notes)

When I Work-like hourly-workforce scheduling. Brand: **Shiftly** — indigo
(`#4f46e5`), Inter for text, tabular numerals everywhere times appear.

## Surfaces

| Route            | Purpose                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`              | Marketing landing (coverage preview, pricing)                                                                                                                                           |
| `/dashboard`     | KPIs (staff, open shifts, pending approvals, hours vs budget), per-day coverage, today's shifts                                                                                         |
| `/schedule`      | **Signature screen** — weekly grid: rows = staff, columns = Mon–Sun; shift blocks colored by role, open-shift row dashed at the bottom; week nav; publish/unpublish; add-shift composer |
| `/shifts/:id`    | Shift detail — assignment, availability warning, swap/drop request form, approve/deny requests + claims                                                                                 |
| `/open-shifts`   | Claim board — published unassigned shifts; claim dialog                                                                                                                                 |
| `/swap-requests` | Mine + incoming with approve/deny                                                                                                                                                       |
| `/availability`  | Weekly recurring windows + black-out dates per person                                                                                                                                   |
| `/staff`         | Roster table — role, contact, this-week hours vs max, status toggle                                                                                                                     |
| `/timesheets`    | Completed-shift rollups per staff per week; scheduled vs claimed; client-side CSV export                                                                                                |

## Color tokens (theme.css)

- Primary/brand: indigo `#4f46e5` (light) / `#818cf8` (dark).
- Role colors (schedule grid blocks): `--color-role-lead` indigo, `-barista`
  teal, `-cashier` amber, `-cook` pink, `-general` slate.
- Request status: `--color-req-pending` amber / `-approved` green /
  `-denied` red — used by the shared `RequestStatusPill`.
- Publish state: `--color-published` green / `--color-draft` amber.
- Availability warning (soft flag): `--color-warn-flag` amber.

## Rules

- All styling via `getClassMap()` / `cm.*`; no raw Tailwind in markup beyond
  the arbitrary-value tokens declared in theme.css.
- All user-facing text via `t(key, values, { defaultValue })`.
- `data-mol-id` on every interactive element.
- Times render as `HH:mm` 24h, tabular-nums; week math is Monday-based both
  client- and server-side (`weekStartOf` / `addWeeks` in api `_decorate.ts`).
- Dark mode: full token set in `[data-mol-mode='dark']`.
