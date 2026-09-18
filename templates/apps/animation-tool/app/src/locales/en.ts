/**
 * Per-app translation overlay for animation-tool. The molecule app shell loads
 * locale bonds first (UI primitives, auth, billing, …); this overlay adds
 * keys that are specific to the animation-tool flagship and overrides any
 * defaults we want to brand differently.
 *
 * Keys here mirror the `t('namespace.key', …)` calls in `app/src/pages/*` and
 * `app/src/components/*`. The Phase-2 gate G17 requires this file to exist
 * with non-empty translation entries — see `docs/flagship-rollout/apps/animation-tool/STATUS.md`.
 */

export default {
  app: {
    name: 'Vivace',
    tagline: 'Motion brought to life',
  },
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    back: 'Back',
    unauthorized: 'Unauthorized',
    serverError: 'Internal server error',
  },
  landing: {
    pageTitle: 'Vivace — Animation tool',
    headline: 'Author motion. Ship code-friendly assets.',
    subtitle:
      'Vivace is a Rive-style canvas with keyframes, easing curves, state machines, and one-click export to Lottie / SVG / MP4.',
    signIn: 'Sign in',
    getStarted: 'Get started',
  },
  login: {
    pageTitle: 'Sign in',
  },
  signup: {
    pageTitle: 'Create your account',
  },
  forgotPassword: {
    pageTitle: 'Reset your password',
  },
  resetPassword: {
    pageTitle: 'Set a new password',
  },
  dashboard: {
    pageTitle: 'Dashboard',
    title: 'Dashboard',
    welcome: 'Welcome back, animator',
    subtitle: 'Three renders in the queue. Five projects edited this week.',
    newProject: 'New project',
    statTotalProjects: 'Total projects',
    statThisWeek: 'This week',
    statRenderQueue: 'Render queue',
    statAvgDuration: 'Avg duration',
    timelineCaption: 'Last opened — Neon Fluid Intro · 12 keyframes across 3 tracks.',
    recentProjects: 'Recent projects',
    viewAll: 'View all →',
    activity: 'Activity',
  },
  projects: {
    pageTitle: 'Projects',
    notFound: 'Project not found',
    create: 'New project',
    rename: 'Rename',
    duplicate: 'Duplicate',
    delete: 'Delete',
    confirmDelete: 'Delete this project?',
    empty: 'No projects yet — create your first animation.',
  },
  editor: {
    pageTitle: 'Editor',
    addLayer: 'Add layer',
    addKeyframe: 'Add keyframe',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    timeline: 'Timeline',
    layers: 'Layers',
    properties: 'Properties',
    easing: 'Easing',
  },
  stateMachine: {
    pageTitle: 'State machine',
    addState: 'Add state',
    addTransition: 'Add transition',
    initialState: 'Initial state',
    save: 'Save state machine',
  },
  exportPage: {
    pageTitle: 'Export',
    format: 'Format',
    quality: 'Quality',
    queueRender: 'Queue render',
    download: 'Download',
    statusPending: 'Pending',
    statusProcessing: 'Processing',
    statusDone: 'Done',
    statusFailed: 'Failed',
  },
  exports: {
    projectNotFound: 'Project not found',
    projectRequired: 'Project ID is required',
  },
  keyframes: {
    notFound: 'Keyframe not found',
    projectRequired: 'Project ID is required',
  },
  states: {
    notFound: 'State not found',
    projectRequired: 'Project ID is required',
    defaultName: 'New State',
  },
  library: {
    pageTitle: 'Library',
    easingCurves: 'Easing curves',
    motionPresets: 'Motion presets',
    templates: 'Templates',
    addToProject: 'Add to project',
  },
  assets: {
    pageTitle: 'Assets',
    upload: 'Upload',
    dragHere: 'Drag SVG / PNG / Lottie here',
    delete: 'Delete asset',
  },
  settings: {
    pageTitle: 'Settings',
    profile: 'Profile',
    appearance: 'Appearance',
    dangerZone: 'Danger zone',
    deleteAccount: 'Delete account',
  },
  pricing: {
    pageTitle: 'Pricing',
    chooseYourPlan: 'Choose your {{appName}} plan',
    exports: '{{count}} exports',
    keyframes: '{{count}} keyframes',
    projects: '{{count}} projects',
    states: '{{count}} states',
    advancedFeatures: 'Advanced features',
    dataExport: 'Data export',
    yes: '✓',
    no: '—',
  },
  planUpdated: {
    pageTitle: 'Plan updated',
    message: 'Your plan has been updated.',
    thankYou: 'Thank you!',
    returnHome: 'Return home',
  },
  sharePreview: {
    pageTitle: 'Shared animation',
    expired: 'This share link has expired.',
    notFound: 'Shared project not found.',
  },
  notFound: {
    pageTitle: 'Not found',
    message: 'The page you’re looking for doesn’t exist.',
    backHome: 'Back to home',
  },
  privacy: {
    pageTitle: 'Privacy policy',
  },
  terms: {
    pageTitle: 'Terms of service',
  },
  footer: {
    privacy: 'Privacy',
    terms: 'Terms',
  },
}
