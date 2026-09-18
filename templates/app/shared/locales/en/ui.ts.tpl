/**
 * Default English translations.
 *
 * Add additional locales by creating new files (e.g., es.ts, fr.ts)
 * and registering them with the i18n provider in config.ts.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Loading...',
  'common.saving': 'Saving...',
  'common.close': 'Close',
  'common.goBack': 'Go back',
  'common.submit': 'Submit',
  'common.continue': 'Continue',

  // Auth - Login
  'auth.login.email': 'Email',
  'auth.login.password': 'Password',
  'auth.login.twoFactor': 'Two-Factor Token (If enabled)',
  'auth.login.signUp': 'Sign up',
  'auth.login.loggingIn': 'Logging in...',
  'auth.login.logIn': 'Log in',
  'auth.login.forgotPassword': 'Forgot password?',

  // Auth - Signup
  'auth.signup.email': 'Email (Required)',
  'auth.signup.password': 'Password (Required)',
  'auth.signup.name': 'Your name',
  'auth.signup.signingUp': 'Signing up...',
  'auth.signup.signUp': 'Sign up',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'If an account with that email exists, a password reset link has been sent.',
  'auth.forgotPassword.email': 'Email',
  'auth.forgotPassword.submitting': 'Submitting...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Email',
  'auth.resetPassword.token': 'Password Reset Token',
  'auth.resetPassword.newPassword': 'Enter New Password',
  'auth.resetPassword.twoFactor': 'Two-Factor Token (If enabled)',
  'auth.resetPassword.loggingIn': 'Logging in...',
  'auth.resetPassword.submit': 'Set password & log in',

  // Home
  'home.greeting': 'Hello, ',
  'home.world': 'World',

  // Settings
  'settings.account': 'Account',
  'settings.email': 'Email',
  'settings.authentication': 'Authentication',
  'settings.changePassword': 'Change password',
  'settings.twoFactor': 'Two-factor authentication',
  'settings.notifications': 'Notifications',
  'settings.pushNotifications': 'Push notifications',
  'settings.billing': 'Billing',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Upgrade',
  'settings.devices': 'Devices',
  'settings.noDevices': 'No devices found',
  'settings.thisDevice': 'This Device',
  'settings.platform': 'Platform',
  'settings.browser': 'Browser',
  'settings.network': 'Network',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Unknown',
  'settings.logOut': 'Log out',
  'settings.deleteAccount': 'Delete account',
  'settings.changePasswordModal.title': 'Change Password',
  'settings.changePasswordModal.error': 'Failed to change password.',
  'settings.changePasswordModal.currentPassword': 'Current Password',
  'settings.changePasswordModal.newPassword': 'New Password',
  'settings.changePasswordModal.changing': 'Changing...',
  'settings.deleteAccountModal.title': 'Delete Account',
  'settings.deleteAccountModal.warning':
    'This action cannot be undone. Please enter your password to confirm.',
  'settings.deleteAccountModal.password': 'Password',
  'settings.deleteAccountModal.deleting': 'Deleting...',
  'settings.changePasswordModal.submit': 'Change password',
  'settings.deleteAccountModal.submit': 'Delete account',
  'settings.failedToUpdateEmail': 'Failed to update email.',
  'settings.failedToDeleteAccount': 'Failed to delete account.',
  'settings.toggleTwoFactor': 'Toggle two-factor authentication',
  'settings.togglePushNotifications': 'Toggle push notifications',

  // Footer
  'footer.about': 'About {{appName}}',
  'footer.privacyPolicy': 'Privacy Policy',
  'footer.termsOfService': 'Terms of Service',
  'footer.language': 'Language',

  // About
  'about.title': 'About {{appName}}',
  'about.visitWebsite': 'Visit our website →',

  // OAuth
  'oauth.orContinueWith': 'Or continue with',
  'oauth.continueWith': 'Continue with {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Toggle theme',

  // User Menu
  'userMenu.open': 'Open user menu',

  // Plan Updated
  'planUpdated.message': 'Your plan has been updated.',
  'planUpdated.thankYou': 'Thank you!',
  'planUpdated.returnHome': 'Return home',

  // PWA
  'pwa.updateAvailable': 'New version available!',
  'pwa.update': 'Update',
  'pwa.updating': 'Updating...',

  // User API errors
  'user.error.badRequest': 'Bad request.',
  'user.error.notFound': 'Not found.',
  'user.error.failedToCreateSession': 'Failed to create session.',
  'user.error.usernameRequired': 'Username is required.',
  'user.error.passwordRequired': 'Password is required.',
  'user.error.emailInvalid': 'Email is invalid.',
  'user.error.usernameUnavailable': 'Username is unavailable.',
  'user.error.emailAlreadyRegistered': 'Email is already registered.',
  'user.error.failedToHashPassword': 'Failed to hash password.',
  'user.error.invalidCredentials': 'Invalid credentials.',
  'user.error.invalidTwoFactorToken': 'Invalid two-factor token.',
  'user.error.twoFactorVerificationUnavailable': 'Two-factor verification unavailable.',
  'user.error.loginFailed': 'Login failed.',
  'user.error.usernameCannotBeEmpty': 'Username cannot be empty.',
  'user.error.failedToUpdateUser': 'Failed to update user.',
  'user.error.failedToDeleteUser': 'Failed to delete user.',
  'user.error.failedToReadUser': 'Failed to read user.',
  'user.error.emailRequired': 'Email is required.',
  'user.error.failedToProcessPasswordReset': 'Failed to process password reset.',
  'user.error.newPasswordRequired': 'New password is required.',
  'user.error.currentPasswordRequired': 'Current password is required.',
  'user.error.currentPasswordIncorrect': 'Current password is incorrect.',
  'user.error.failedToUpdatePassword': 'Failed to update password.',
  'user.error.planKeyRequired': 'planKey is required.',
  'user.error.invalidPlan': 'Invalid plan.',
  'user.error.failedToUpdateSubscription': 'Failed to update subscription.',
  'user.error.failedToUpdatePlan': 'Failed to update plan.',
  'user.error.twoFactorNotAvailable': 'Two-factor authentication is not available.',
  'user.error.tokenRequired': 'Token is required.',
  'user.error.noPendingTwoFactorSetup':
    'No pending two-factor setup. Call with action "setup" first.',
  'user.error.invalidToken': 'Invalid token.',
  'user.error.twoFactorNotEnabled': 'Two-factor is not enabled.',
  'user.error.invalidAction': 'Invalid action. Use "setup", "enable", or "disable".',
  'user.error.twoFactorOperationFailed': 'Two-factor operation failed.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" is not configured.',
  'user.error.oauthVerificationFailed': 'OAuth verification failed.',
  'user.error.failedToCreateUser': 'Failed to create user.',
  'user.error.oauthLoginFailed': 'OAuth login failed.',

  // Auth client errors
  'auth.error.requestFailed': 'Request failed',
  'auth.error.loginFailed': 'Login failed',
  'auth.error.registrationFailed': 'Registration failed',
  'auth.error.noRefreshToken': 'No refresh token available',

  // Form validation
  'forms.required': 'This field is required',
  'forms.min': 'Value must be at least {{min}}',
  'forms.max': 'Value must be at most {{max}}',
  'forms.minLength': 'Must be at least {{minLength}} characters',
  'forms.maxLength': 'Must be at most {{maxLength}} characters',
  'forms.invalidFormat': 'Invalid format',
  'forms.invalidEmail': 'Invalid email address',
  'forms.invalidUrl': 'Invalid URL',
  'forms.invalidValue': 'Invalid value',

  // HTTP client errors
  'http.error.requestFailed': 'Request failed with status {{status}}.',
  'http.error.networkError': 'Network error.',

  // Routing errors
  'routing.error.missingParam': 'Missing param "{{name}}" for path "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" not found',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter must be used within a MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push notifications not supported',
  'push.error.permissionNotGranted': 'Notification permission not granted',

  // Utility errors
  'error.networkError': 'Network error. Please check your connection.',
  'error.timeout': 'Request timed out. Please try again.',
  'error.unauthorized': 'You are not authorized to perform this action.',
  'error.forbidden': 'Access denied.',
  'error.notFound': 'Resource not found.',
  'error.validationError': 'Please check your input and try again.',
  'error.serverError': 'Server error. Please try again later.',
  'error.unknown': 'An unexpected error occurred.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message is required',
  'conversation.error.aiNotConfigured': 'AI provider not configured',
  'conversation.error.unknownAiError': 'Unknown AI error',
  'conversation.error.notFound': 'No conversation found',
  'conversation.error.streamError': 'AI streaming error',

  // Resource errors
  'resource.error.unknownError': 'Unknown error.',
  'resource.error.unableToCreate': 'Unable to create {{name}}.',
  'resource.error.unableToUpdate': 'Unable to update {{name}}.',
  'resource.error.unableToDelete': 'Unable to delete {{name}}.',
  'resource.error.notFound': 'Not found.',
  'resource.error.badRequest': 'Bad request.',
  'resource.error.unauthorized': 'Unauthorized.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name and projectType are required',
  'project.error.notFound': 'Not found',

  // Device errors
  'device.error.unauthorized': 'Unauthorized.',
  'device.error.badRequest': 'Bad request.',
  'device.error.notFound': 'Not found.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Failed to read {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Failed to write {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Failed to delete {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Payment provider is required.',
  'user.payment.subscriptionIdRequired': 'subscriptionId is required.',
  'user.payment.receiptAndPlanRequired': 'receipt and planKey are required.',
  'user.payment.verificationNotConfigured':
    'Payment verification is not configured for {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Unknown plan.',
  'user.payment.invalidWebhookEvent': 'Invalid webhook event.',
}
