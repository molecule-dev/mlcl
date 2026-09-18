/**
 * English translation keys consumed by the ai-study-buddy app pages.
 * Loaded by the i18n bond at startup; companion locale subdirectories
 * (`en/`, `es/`, …) provide locale-specific shared molecule package
 * translations and are merged separately.
 */
export default {
  auth: {
    unauthorized: 'Authentication required.',
  },
  authShell: {
    sampleEyebrow: 'A card from your future deck',
    sampleFront: '"Explain the Krebs cycle in 3 steps."',
    sampleBack: 'Glycolysis → pyruvate oxidation → citric-acid cycle.',
    sampleStreak: '{{days}}-day streak',
    sampleRetention: '{{pct}}% mastery',
  },
  topics: {
    title: 'Topics',
    notFound: 'Topic not found.',
    new: 'New topic',
    name: 'Topic title',
    description: 'Description',
    subject: 'Subject',
    materialCount: '{{count}} materials',
    masteryScore: '{{pct}}% mastered',
    delete: 'Delete topic',
    confirmDelete: 'Delete this topic and all its materials? This cannot be undone.',
    search: 'Search topics',
    noMaterialsContext: 'No study materials uploaded yet.',
    aiAnswerStub: 'AI tutoring response will appear here.',
  },
  quizzes: {
    title: 'Quizzes',
    notFound: 'Quiz not found.',
    new: 'New quiz',
    generate: 'Generate quiz',
    submit: 'Submit answers',
    noQuestions: 'Quiz has no questions.',
    placeholderQuestion: 'Question {{n}} about {{topic}}',
    placeholderExplanation: 'Generated explanation will appear here.',
    defaultTitle: '{{topic}} Quiz',
    perfectScore: 'Perfect score! You have mastered all the concepts in this quiz.',
    tutorFeedback:
      'Great progress — {{correct}} of {{total}} correct. Review the explanations below to lock in what you missed.',
  },
  flashcards: {
    title: 'Flashcards',
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    showAnswer: 'Show answer',
    noDue: 'No cards due for review!',
    complete: 'Study session complete!',
  },
  dashboard: {
    title: 'Today',
    streak: '{{count}}-day streak',
    cardsReviewedToday: 'Cards reviewed today',
    upcomingQuizzes: 'Upcoming quizzes',
    recentTopics: 'Recent topics',
    createTopic: 'Create your first topic',
    studyNow: 'Study now',
  },
  masteryRing: {
    label: 'Mastered',
    mastered: 'Mastered',
    reviewing: 'Reviewing',
    learning: 'Learning',
    notStarted: 'Not started',
  },
  masteryHeroCard: {
    title: 'Overall Mastery',
    weeklyHours: '{{hours}} hrs this week',
    cardsMastered: '{{mastered}} of {{total}} cards mastered',
  },
  progress: {
    title: 'Progress',
    streakChart: 'Daily streak',
    quizScores: 'Quiz scores',
    cardsTrend: 'Cards reviewed',
  },
  settings: {
    title: 'Settings',
    profile: 'Profile',
    theme: 'Theme',
    notifications: 'Notifications',
    dailyGoal: 'Daily goal',
    dangerZone: 'Danger zone',
    deleteAccount: 'Delete account',
  },
  notifications: {
    title: 'Notifications',
    empty: 'No notifications yet.',
    markAllRead: 'Mark all read',
  },
  pricing: {
    heading: 'Choose your {{app}} plan',
    limits: {
      quizzes: 'quizzes',
      topics: 'topics',
      advanced: 'Advanced features',
      export: 'Data export',
    },
  },
  planUpdated: {
    title: 'Plan updated',
    body: 'Your subscription has been updated.',
    backToDashboard: 'Back to dashboard',
  },
  forgotPassword: {
    heading: 'Reset your password',
    subtitle: "We'll email you a reset link.",
    emailLabel: 'Email',
    submit: 'Send reset link',
    backToSignIn: 'Back to sign in',
  },
  resetPassword: {
    heading: 'Set a new password',
    newPasswordLabel: 'New password',
    confirmPasswordLabel: 'Confirm password',
    submit: 'Reset password',
    backToSignIn: 'Back to sign in',
  },
  login: {
    heading: 'Welcome back',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    forgot: 'Forgot password?',
    noAccount: "Don't have an account?",
    signup: 'Create one',
  },
  signup: {
    heading: 'Start studying free',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm password',
    submit: 'Create account',
    haveAccount: 'Already have an account?',
    signin: 'Sign in',
  },
  landing: {
    heroHeading: 'Master any subject, one question at a time.',
    heroBody:
      'Upload your course material, generate flashcards and quizzes, and ask grounded questions that cite your own notes.',
    cta: 'Start studying free',
  },
  billing: {
    error: {
      unknownPriceId: 'Unknown priceId "{{priceId}}".',
      providerUnavailable: 'Billing provider unavailable. Try again later.',
      checkoutFailed: 'Could not start checkout. Try again later.',
      cancelFailed: 'No active subscription to cancel.',
    },
  },
  terms: {
    title: 'Terms',
    intro: 'This is the Terms page. Replace this placeholder with real content.',
  },
} as const
