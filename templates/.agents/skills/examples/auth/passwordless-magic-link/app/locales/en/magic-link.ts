export default {
  magicLink: {
    title: 'Log in',
    subtitle: "Enter your email and we'll send you a one-tap login link — no password needed.",
    emailPlaceholder: 'you@example.com',
    submit: 'Send login link',
    submitting: 'Sending…',
    sent: {
      title: 'Check your email',
      body: "We've sent a login link to {{email}}. It expires in 15 minutes.",
      tryAgain: 'Use a different email',
    },
    error: {
      generic: 'Something went wrong. Try again.',
    },
  },
} as const
