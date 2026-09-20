/**
 * Aggregate of app-level English keys, exposed at `locales/en.ts` so the
 * flagship-rollout verify gate (G17) can find a key-count for the app. The
 * runtime locale is loaded from `locales/en/ui.ts` via the i18n bond — this
 * file is a static index for verification + tooling.
 */

export default {
  app: {
    name: 'Shiftly',
    tagline: 'Hourly teams, on shift',
  },
  nav: {
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    openShifts: 'Open shifts',
    swapRequests: 'Swap requests',
    availability: 'Availability',
    staff: 'Staff',
    timesheets: 'Timesheets',
    settings: 'Settings',
    billing: 'Billing',
  },
  requestStatus: {
    approved: 'Approved',
    pending: 'Pending',
    denied: 'Denied',
  },
  status: {
    active: 'Active',
    inactive: 'Inactive',
  },
  schedule: {
    addShift: 'Add shift',
    publishWeek: 'Publish week',
    unpublish: 'Unpublish week',
    openRow: 'Open shifts',
    staffColumn: 'Staff',
    thisWeek: 'Today',
    dateRequired: 'Date, start, and end time are required.',
    submitFailed: 'Failed to create the shift.',
    publishFailed: 'Publish failed.',
    weekRange: '{{start}} – {{end}}',
    shiftCount: '{{count}} shifts',
  },
  staff: {
    add: 'Add staff',
    edit: 'Edit staff',
    maxHours: 'Max h/week',
    fieldsRequired: 'First name, last name, and email are required.',
    submitFailed: 'Failed to add the staff member.',
  },
  swaps: {
    approve: 'Approve',
    deny: 'Deny',
  },
  shiftDetail: {
    drop: 'Drop',
    swap: 'Swap',
    notes: 'Notes',
    hours: 'h',
  },
  availability: {
    addWindow: 'Add window',
    addBlackout: 'Add black-out',
    day: {
      sun: 'Sunday',
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
    },
  },
  timesheets: {
    exportCta: 'Export CSV',
    totalHours: '{{hours}} hours completed',
    scheduledVsClaimed: '{{scheduled}}h scheduled · {{claimed}}h claimed',
  },
  dashboard: {
    wantsToDrop: 'wants to drop',
    wantsToSwap: 'wants to swap',
    claimed: 'claimed an open',
    shift: 'shift',
    openShift: 'Open shift',
    openCount: '{{count}} open',
  },
}
