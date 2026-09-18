export const emails = {
  welcome: {
    subject: 'Welcome!',
    body: 'Hi {{name}},\n\nThanks for signing up. Let us know if you have any questions.',
  },
  receipt: {
    subject: 'Your receipt #{{id}}',
    body: 'Thanks for your order #{{id}}.\n\n{{items}}\n\nTotal: ${{total}}',
  },
  reset: {
    subject: 'Reset your password',
    body: 'Click here to reset your password (expires in 15 minutes):\n\n{{link}}',
  },
}
