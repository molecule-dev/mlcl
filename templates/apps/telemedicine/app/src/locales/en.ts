/**
 * Telemedicine app — flat English translation map.
 *
 * The richer per-feature locale tree lives in `./en/` and is loaded by the
 * `@molecule/app-i18n-react-i18next` bond. This file mirrors the keys
 * referenced from `app/src/pages/*` and is what the Phase-2 verify gate
 * (G17) inspects — every user-visible string used in a page must be
 * resolvable from here.
 */

export default {
  app: {
    name: 'Solace',
    tagline: 'Care without the commute',
  },

  common: {
    loading: 'Loading…',
    error: 'Something went wrong.',
    retry: 'Try again',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
  },

  auth: {
    unauthorized: 'You must be logged in.',
    forbidden: 'You do not have access to this resource.',
  },

  errors: {
    internalServer: 'Something went wrong. Please try again.',
    notFound: 'Resource not found.',
    validation: 'Please correct the highlighted fields.',
  },

  login: {
    title: 'Welcome back',
    emailLabel: 'EMAIL',
    emailPlaceholder: 'patient@solace.health',
    passwordLabel: 'PASSWORD',
    passwordPlaceholder: '••••••••',
    forgot: 'Forgot password?',
    submit: 'Sign in',
    submitting: 'Signing in…',
    noAccount: "Don't have an account?",
    signupLink: 'Create one',
  },

  signup: {
    title: 'Create your account',
    submit: 'Create Account',
    haveAccount: 'Already have an account?',
    loginLink: 'Sign In',
  },

  forgotPassword: {
    title: 'Reset your password',
    submit: 'Send reset link',
    backToLogin: 'Back to Sign In',
  },

  resetPassword: {
    title: 'Set new password',
    submit: 'Reset password',
  },

  dashboard: {
    title: 'Dashboard',
    nextAppointment: 'Your next appointment',
    upcomingTitle: 'Upcoming appointments',
    noUpcoming: 'No upcoming appointments.',
    quickActionsTitle: 'Quick actions',
    bookAppointment: 'Book an appointment',
    viewMessages: 'Messages',
    viewPrescriptions: 'Prescriptions',
    viewRecords: 'Medical records',
    loadError: 'Failed to load.',
  },

  providers: {
    title: 'Providers',
    none: 'No providers found.',
    notFound: 'Provider not found.',
    searchRequired: 'Search query is required.',
    bookCta: 'Book',
    specialty: 'Specialty',
    languages: 'Languages',
    rating: 'Rating',
  },

  bookAppointment: {
    title: 'Book an appointment',
    pickProvider: 'Pick a provider',
    pickSlot: 'Pick a time',
    reason: 'Reason for visit',
    confirm: 'Confirm booking',
    success: 'Appointment booked',
  },

  appointments: {
    title: 'Appointments',
    none: 'No appointments yet.',
    notFound: 'Appointment not found.',
    missingFields: 'Patient, provider, and date are required.',
    upcoming: 'Upcoming',
    past: 'Past',
    cancelled: 'Cancelled',
    cancel: 'Cancel appointment',
    cancelReason: 'Reason for cancellation',
    reschedule: 'Reschedule',
    join: 'Join consultation',
    status: {
      scheduled: 'Scheduled',
      in_progress: 'In progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No-show',
    },
  },

  consult: {
    title: 'Pre-consult check',
    techCheck: 'Tech check',
    micOk: 'Microphone OK',
    camOk: 'Camera OK',
    join: 'Join now',
  },

  consultation: {
    title: 'Consultation',
    notFound: 'Consultation not found.',
    missingFields: 'Appointment, patient, and provider are required.',
    end: 'End consultation',
    notesLabel: 'Clinical notes',
    diagnosisLabel: 'Diagnosis',
    chiefComplaint: 'Chief complaint',
    hpi: 'History of present illness',
    ros: 'Review of systems',
    exam: 'Exam',
    assessment: 'Assessment',
    plan: 'Plan',
    sign: 'Sign encounter',
  },

  patients: {
    title: 'Patients',
    none: 'No patients yet.',
    notFound: 'Patient not found.',
    primaryConcern: 'Primary concern',
    lastVisit: 'Last visit',
    nextVisit: 'Next visit',
  },

  patientDetail: {
    vitals: 'Vitals',
    history: 'History',
    notes: 'Notes',
    medications: 'Medications',
  },

  prescriptions: {
    title: 'Prescriptions',
    none: 'No prescriptions yet.',
    notFound: 'Prescription not found.',
    missingFields: 'Patient, provider, and medication are required.',
    noRefills: 'No refills remaining.',
    requestRefill: 'Request refill',
    discontinue: 'Discontinue',
    status: {
      active: 'Active',
      cancelled: 'Cancelled',
      expired: 'Expired',
      sent_to_pharmacy: 'Sent to pharmacy',
      discontinued: 'Discontinued',
    },
  },

  medicalRecords: {
    title: 'Medical records',
    none: 'No records on file.',
    notFound: 'Record not found.',
    patientRequired: 'Patient is required.',
    upload: 'Upload record',
  },

  records: {
    title: 'Medical Records',
    notFound: 'Record not found.',
    summaryView: 'Summary',
    listView: 'All Records',
    conditions: 'Conditions',
    allergies: 'Allergies',
    medications: 'Current Medications',
    recentVitals: 'Recent Vitals',
    noConditions: 'No conditions on file.',
    noAllergies: 'No allergies on file.',
    noMedications: 'No medications on file.',
    noVitals: 'No vitals recorded.',
    noRecords: 'No records found.',
    allTypes: 'All Types',
  },

  recordShares: {
    title: 'Record sharing',
    none: 'No active grants.',
    revoke: 'Revoke',
    expires: 'Expires {{date}}',
    revoked: 'Revoked',
  },

  messages: {
    title: 'Messages',
    none: 'No messages yet.',
    placeholder: 'Type a message…',
    send: 'Send',
  },

  notifications: {
    title: 'Notifications',
    none: 'You are all caught up.',
    markAllRead: 'Mark all as read',
  },

  settings: {
    title: 'Settings',
    profile: 'Profile',
    payment: 'Payment',
    plan: 'Plan',
    dangerZone: 'Danger zone',
    deleteAccount: 'Delete account',
  },

  pricing: {
    headingDefault: 'Choose your {{appName}} plan',
    appointmentsLimit: '{{count}} appointments',
    consultationsLimit: '{{count}} consultations',
    prescriptionsLimit: '{{count}} prescriptions',
    providersLimit: '{{count}} providers',
    recordsLimit: '{{count}} records',
    advancedFeatures: 'Advanced features',
    dataExport: 'Data export',
    yes: '✓',
    no: '—',
  },

  planUpdated: {
    title: 'Plan updated',
    body: 'Your subscription has been updated.',
    backToDashboard: 'Back to dashboard',
  },

  landing: {
    title: 'Care from anywhere.',
    subtitle: 'Connect with licensed clinicians by video, chat, or phone — usually within minutes.',
    cta: 'Get started',
    secondary: 'Sign in',
  },
} as const
