/**
 * Kannada translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
  'common.saving': 'ಉಳಿಸುತ್ತಿದೆ...',
  'common.close': 'ಮುಚ್ಚಿ',
  'common.goBack': 'ಹಿಂದೆ ಹೋಗಿ',
  'common.submit': 'ಸಲ್ಲಿಸಿ',
  'common.continue': 'ಮುಂದುವರಿಸಿ',

  // Auth - Login
  'auth.login.email': 'ಇಮೇಲ್',
  'auth.login.password': 'ಪಾಸ್‌ವರ್ಡ್',
  'auth.login.twoFactor': 'ದ್ವಿ-ಅಂಶ ಟೋಕನ್ (ಸಕ್ರಿಯವಾಗಿದ್ದರೆ)',
  'auth.login.signUp': 'ಸೈನ್ ಅಪ್ ಮಾಡಿ',
  'auth.login.loggingIn': 'ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ...',
  'auth.login.logIn': 'ಲಾಗಿನ್ ಮಾಡಿ',
  'auth.login.forgotPassword': 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',

  // Auth - Signup
  'auth.signup.email': 'ಇಮೇಲ್ (ಅಗತ್ಯ)',
  'auth.signup.password': 'ಪಾಸ್‌ವರ್ಡ್ (ಅಗತ್ಯ)',
  'auth.signup.name': 'ನಿಮ್ಮ ಹೆಸರು',
  'auth.signup.signingUp': 'ಸೈನ್ ಅಪ್ ಆಗುತ್ತಿದೆ...',
  'auth.signup.signUp': 'ಸೈನ್ ಅಪ್ ಮಾಡಿ',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'ಆ ಇಮೇಲ್‌ನೊಂದಿಗೆ ಖಾತೆ ಇದ್ದರೆ, ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸಲಾಗಿದೆ.',
  'auth.forgotPassword.email': 'ಇಮೇಲ್',
  'auth.forgotPassword.submitting': 'ಸಲ್ಲಿಸುತ್ತಿದೆ...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ಇಮೇಲ್',
  'auth.resetPassword.token': 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಟೋಕನ್',
  'auth.resetPassword.newPassword': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ',
  'auth.resetPassword.twoFactor': 'ದ್ವಿ-ಅಂಶ ಟೋಕನ್ (ಸಕ್ರಿಯವಾಗಿದ್ದರೆ)',
  'auth.resetPassword.loggingIn': 'ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ...',
  'auth.resetPassword.submit': 'ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ ಮತ್ತು ಲಾಗಿನ್ ಮಾಡಿ',

  // Home
  'home.greeting': 'ನಮಸ್ಕಾರ, ',
  'home.world': 'ಪ್ರಪಂಚ',

  // Settings
  'settings.account': 'ಖಾತೆ',
  'settings.email': 'ಇಮೇಲ್',
  'settings.authentication': 'ದೃಢೀಕರಣ',
  'settings.changePassword': 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
  'settings.twoFactor': 'ದ್ವಿ-ಅಂಶ ದೃಢೀಕರಣ',
  'settings.notifications': 'ಅಧಿಸೂಚನೆಗಳು',
  'settings.pushNotifications': 'ಪುಶ್ ಅಧಿಸೂಚನೆಗಳು',
  'settings.billing': 'ಬಿಲ್ಲಿಂಗ್',
  'settings.plan': 'ಯೋಜನೆ: ',
  'settings.upgrade': 'ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ',
  'settings.devices': 'ಸಾಧನಗಳು',
  'settings.noDevices': 'ಯಾವುದೇ ಸಾಧನಗಳು ಕಂಡುಬಂದಿಲ್ಲ',
  'settings.thisDevice': 'ಈ ಸಾಧನ',
  'settings.platform': 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್',
  'settings.browser': 'ಬ್ರೌಸರ್',
  'settings.network': 'ನೆಟ್‌ವರ್ಕ್',
  'settings.online': 'ಆನ್‌ಲೈನ್',
  'settings.offline': 'ಆಫ್‌ಲೈನ್',
  'settings.unknown': 'ತಿಳಿದಿಲ್ಲ',
  'settings.logOut': 'ಲಾಗ್ ಔಟ್',
  'settings.deleteAccount': 'ಖಾತೆ ಅಳಿಸಿ',
  'settings.changePasswordModal.title': 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
  'settings.changePasswordModal.error': 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಲು ವಿಫಲವಾಗಿದೆ.',
  'settings.changePasswordModal.currentPassword': 'ಪ್ರಸ್ತುತ ಪಾಸ್‌ವರ್ಡ್',
  'settings.changePasswordModal.newPassword': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
  'settings.changePasswordModal.changing': 'ಬದಲಾಯಿಸುತ್ತಿದೆ...',
  'settings.deleteAccountModal.title': 'ಖಾತೆ ಅಳಿಸಿ',
  'settings.deleteAccountModal.warning':
    'ಈ ಕ್ರಿಯೆಯನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದೃಢೀಕರಿಸಲು ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.',
  'settings.deleteAccountModal.password': 'ಪಾಸ್‌ವರ್ಡ್',
  'settings.deleteAccountModal.deleting': 'ಅಳಿಸುತ್ತಿದೆ...',
  'settings.changePasswordModal.submit': 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
  'settings.deleteAccountModal.submit': 'ಖಾತೆ ಅಳಿಸಿ',
  'settings.failedToUpdateEmail': 'ಇಮೇಲ್ ನವೀಕರಿಸಲು ವಿಫಲವಾಯಿತು.',
  'settings.failedToDeleteAccount': 'ಖಾತೆ ಅಳಿಸಲು ವಿಫಲವಾಯಿತು.',
  'settings.toggleTwoFactor': 'ಎರಡು-ಅಂಶ ದೃಢೀಕರಣ ಟಾಗಲ್ ಮಾಡಿ',
  'settings.togglePushNotifications': 'ಪುಶ್ ಅಧಿಸೂಚನೆಗಳನ್ನು ಟಾಗಲ್ ಮಾಡಿ',

  // Footer
  'footer.about': '{{appName}} ಬಗ್ಗೆ',
  'footer.privacyPolicy': 'ಗೌಪ್ಯತಾ ನೀತಿ',
  'footer.termsOfService': 'ಸೇವಾ ನಿಯಮಗಳು',
  'footer.language': 'ಭಾಷೆ',

  // OAuth
  'oauth.orContinueWith': 'ಅಥವಾ ಇದರೊಂದಿಗೆ ಮುಂದುವರಿಸಿ',
  'oauth.continueWith': '{{provider}} ಮೂಲಕ ಮುಂದುವರಿಸಿ',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'ಥೀಮ್ ಬದಲಾಯಿಸಿ',

  // User Menu
  'userMenu.open': 'ಬಳಕೆದಾರ ಮೆನು ತೆರೆಯಿರಿ',

  // Plan Updated
  'planUpdated.message': 'ನಿಮ್ಮ ಯೋಜನೆ ನವೀಕರಿಸಲಾಗಿದೆ.',
  'planUpdated.thankYou': 'ಧನ್ಯವಾದಗಳು!',
  'planUpdated.returnHome': 'ಹೋಮ್‌ಗೆ ಹಿಂತಿರುಗಿ',

  // PWA
  'pwa.updateAvailable': 'ಹೊಸ ಆವೃತ್ತಿ ಲಭ್ಯವಿದೆ!',
  'pwa.update': 'ನವೀಕರಿಸಿ',
  'pwa.updating': 'ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ...',

  // User API errors
  'user.error.badRequest': 'ಕೆಟ್ಟ ವಿನಂತಿ.',
  'user.error.notFound': 'ಕಂಡುಬಂದಿಲ್ಲ.',
  'user.error.failedToCreateSession': 'ಸೆಷನ್ ರಚಿಸಲು ವಿಫಲ.',
  'user.error.usernameRequired': 'ಬಳಕೆದಾರ ಹೆಸರು ಅಗತ್ಯ.',
  'user.error.passwordRequired': 'ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯ.',
  'user.error.emailInvalid': 'ಇಮೇಲ್ ಅಮಾನ್ಯ.',
  'user.error.usernameUnavailable': 'ಬಳಕೆದಾರ ಹೆಸರು ಲಭ್ಯವಿಲ್ಲ.',
  'user.error.emailAlreadyRegistered': 'ಇಮೇಲ್ ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಲಾಗಿದೆ.',
  'user.error.failedToHashPassword': 'ಪಾಸ್‌ವರ್ಡ್ ಹ್ಯಾಶ್ ಮಾಡಲು ವಿಫಲ.',
  'user.error.invalidCredentials': 'ಅಮಾನ್ಯ ರುಜುವಾತುಗಳು.',
  'user.error.invalidTwoFactorToken': 'ಅಮಾನ್ಯ ಎರಡು-ಅಂಶ ಟೋಕನ್.',
  'user.error.twoFactorVerificationUnavailable': 'ಎರಡು-ಅಂಶ ಪರಿಶೀಲನೆ ಲಭ್ಯವಿಲ್ಲ.',
  'user.error.loginFailed': 'ಲಾಗಿನ್ ವಿಫಲ.',
  'user.error.usernameCannotBeEmpty': 'ಬಳಕೆದಾರ ಹೆಸರು ಖಾಲಿ ಇರಬಾರದು.',
  'user.error.failedToUpdateUser': 'ಬಳಕೆದಾರರನ್ನು ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.failedToDeleteUser': 'ಬಳಕೆದಾರರನ್ನು ಅಳಿಸಲು ವಿಫಲ.',
  'user.error.failedToReadUser': 'ಬಳಕೆದಾರರನ್ನು ಓದಲು ವಿಫಲ.',
  'user.error.emailRequired': 'ಇಮೇಲ್ ಅಗತ್ಯ.',
  'user.error.failedToProcessPasswordReset': 'ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ ಪ್ರಕ್ರಿಯೆ ವಿಫಲ.',
  'user.error.newPasswordRequired': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯ.',
  'user.error.currentPasswordRequired': 'ಪ್ರಸ್ತುತ ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯ.',
  'user.error.currentPasswordIncorrect': 'ಪ್ರಸ್ತುತ ಪಾಸ್‌ವರ್ಡ್ ತಪ್ಪಾಗಿದೆ.',
  'user.error.failedToUpdatePassword': 'ಪಾಸ್‌ವರ್ಡ್ ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.planKeyRequired': 'planKey ಅಗತ್ಯ.',
  'user.error.invalidPlan': 'ಅಮಾನ್ಯ ಯೋಜನೆ.',
  'user.error.failedToUpdateSubscription': 'ಚಂದಾ ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.failedToUpdatePlan': 'ಯೋಜನೆ ನವೀಕರಿಸಲು ವಿಫಲ.',
  'user.error.twoFactorNotAvailable': 'ಎರಡು-ಅಂಶ ದೃಢೀಕರಣ ಲಭ್ಯವಿಲ್ಲ.',
  'user.error.tokenRequired': 'ಟೋಕನ್ ಅಗತ್ಯ.',
  'user.error.noPendingTwoFactorSetup':
    'ಬಾಕಿ ಎರಡು-ಅಂಶ ಸೆಟಪ್ ಇಲ್ಲ. ಮೊದಲು "setup" ಕ್ರಿಯೆಯೊಂದಿಗೆ ಕರೆ ಮಾಡಿ.',
  'user.error.invalidToken': 'ಅಮಾನ್ಯ ಟೋಕನ್.',
  'user.error.twoFactorNotEnabled': 'ಎರಡು-ಅಂಶ ಸಕ್ರಿಯಗೊಂಡಿಲ್ಲ.',
  'user.error.invalidAction': 'ಅಮಾನ್ಯ ಕ್ರಿಯೆ. "setup", "enable", ಅಥವಾ "disable" ಬಳಸಿ.',
  'user.error.twoFactorOperationFailed': 'ಎರಡು-ಅಂಶ ಕಾರ್ಯಾಚರಣೆ ವಿಫಲ.',
  'user.error.oauthServerNotConfigured': 'OAuth ಸರ್ವರ್ "{{server}}" ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ.',
  'user.error.oauthVerificationFailed': 'OAuth ಪರಿಶೀಲನೆ ವಿಫಲ.',
  'user.error.failedToCreateUser': 'ಬಳಕೆದಾರರನ್ನು ರಚಿಸಲು ವಿಫಲ.',
  'user.error.oauthLoginFailed': 'OAuth ಲಾಗಿನ್ ವಿಫಲ.',

  // Auth client errors
  'auth.error.requestFailed': 'ವಿನಂತಿ ವಿಫಲ',
  'auth.error.loginFailed': 'ಲಾಗಿನ್ ವಿಫಲ',
  'auth.error.registrationFailed': 'ನೋಂದಣಿ ವಿಫಲ',
  'auth.error.noRefreshToken': 'ಯಾವುದೇ ರಿಫ್ರೆಶ್ ಟೋಕನ್ ಲಭ್ಯವಿಲ್ಲ',

  // Form validation
  'forms.required': 'ಈ ಕ್ಷೇತ್ರ ಅಗತ್ಯವಿದೆ',
  'forms.min': 'ಮೌಲ್ಯವು ಕನಿಷ್ಠ {{min}} ಆಗಿರಬೇಕು',
  'forms.max': 'ಮೌಲ್ಯವು ಗರಿಷ್ಠ {{max}} ಆಗಿರಬೇಕು',
  'forms.minLength': 'ಕನಿಷ್ಠ {{minLength}} ಅಕ್ಷರಗಳಿರಬೇಕು',
  'forms.maxLength': 'ಗರಿಷ್ಠ {{maxLength}} ಅಕ್ಷರಗಳಿರಬೇಕು',
  'forms.invalidFormat': 'ಅಮಾನ್ಯ ಸ್ವರೂಪ',
  'forms.invalidEmail': 'ಅಮಾನ್ಯ ಇಮೇಲ್ ವಿಳಾಸ',
  'forms.invalidUrl': 'ಅಮಾನ್ಯ URL',
  'forms.invalidValue': 'ಅಮಾನ್ಯ ಮೌಲ್ಯ',

  // HTTP client errors
  'http.error.requestFailed': 'ಸ್ಥಿತಿ {{status}} ನೊಂದಿಗೆ ವಿನಂತಿ ವಿಫಲ.',
  'http.error.networkError': 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" ಮಾರ್ಗಕ್ಕೆ "{{name}}" ಪ್ಯಾರಾಮೀಟರ್ ಕಾಣೆಯಾಗಿದೆ',
  'routing.error.routeNotFound': '"{{name}}" ಮಾರ್ಗ ಕಂಡುಬಂದಿಲ್ಲ',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ಅನ್ನು MoleculeRouterProvider ಒಳಗೆ ಬಳಸಬೇಕು',

  // Push notification errors
  'push.error.notSupported': 'ಪುಶ್ ಅಧಿಸೂಚನೆಗಳು ಬೆಂಬಲಿತವಲ್ಲ',
  'push.error.permissionNotGranted': 'ಅಧಿಸೂಚನೆ ಅನುಮತಿ ನೀಡಲಾಗಿಲ್ಲ',

  // Utility errors
  'error.networkError': 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ನಿಮ್ಮ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.',
  'error.timeout': 'ವಿನಂತಿ ಸಮಯ ಮೀರಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  'error.unauthorized': 'ಈ ಕ್ರಿಯೆಯನ್ನು ಮಾಡಲು ನಿಮಗೆ ಅಧಿಕಾರವಿಲ್ಲ.',
  'error.forbidden': 'ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ.',
  'error.notFound': 'ಸಂಪನ್ಮೂಲ ಕಂಡುಬಂದಿಲ್ಲ.',
  'error.validationError': 'ನಿಮ್ಮ ಇನ್‌ಪುಟ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  'error.serverError': 'ಸರ್ವರ್ ದೋಷ. ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  'error.unknown': 'ಅನಿರೀಕ್ಷಿತ ದೋಷ ಸಂಭವಿಸಿದೆ.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message ಅಗತ್ಯ',
  'conversation.error.aiNotConfigured': 'AI ಪ್ರೊವೈಡರ್ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ',
  'conversation.error.unknownAiError': 'ಅಜ್ಞಾತ AI ದೋಷ',
  'conversation.error.notFound': 'ಯಾವುದೇ ಸಂಭಾಷಣೆ ಕಂಡುಬಂದಿಲ್ಲ',
  'conversation.error.streamError': 'AI ಸ್ಟ್ರೀಮಿಂಗ್ ದೋಷ',

  // Resource errors
  'resource.error.unknownError': 'ಅಜ್ಞಾತ ದೋಷ.',
  'resource.error.unableToCreate': '{{name}} ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
  'resource.error.unableToUpdate': '{{name}} ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
  'resource.error.unableToDelete': '{{name}} ಅಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
  'resource.error.notFound': 'ಕಂಡುಬಂದಿಲ್ಲ.',
  'resource.error.badRequest': 'ಕೆಟ್ಟ ವಿನಂತಿ.',
  'resource.error.unauthorized': 'ಅನಧಿಕೃತ.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name ಮತ್ತು projectType ಅಗತ್ಯ',
  'project.error.notFound': 'ಕಂಡುಬಂದಿಲ್ಲ',

  // Device errors
  'device.error.unauthorized': 'ಅನಧಿಕೃತ.',
  'device.error.badRequest': 'ಕೆಟ್ಟ ವಿನಂತಿ.',
  'device.error.notFound': 'ಕಂಡುಬಂದಿಲ್ಲ.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} ಓದಲು ವಿಫಲವಾಗಿದೆ: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} ಬರೆಯಲು ವಿಫಲವಾಗಿದೆ: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} ಅಳಿಸಲು ವಿಫಲವಾಗಿದೆ: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ಪಾವತಿ ಒದಗಿಸುವವರು ಅಗತ್ಯ.',
  'user.payment.subscriptionIdRequired': 'subscriptionId ಅಗತ್ಯ.',
  'user.payment.receiptAndPlanRequired': 'receipt ಮತ್ತು planKey ಅಗತ್ಯ.',
  'user.payment.verificationNotConfigured': '{{provider}} ಗಾಗಿ ಪಾವತಿ ಪರಿಶೀಲನೆ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ.',
  'user.payment.invalidPlan': 'ಅಮಾನ್ಯ ಯೋಜನೆ.',
  'user.payment.verificationFailed': 'ಚಂದಾ ಪರಿಶೀಲಿಸಲು ವಿಫಲ.',
  'user.payment.unknownPlan': 'ಅಜ್ಞಾತ ಯೋಜನೆ.',
  'user.payment.invalidWebhookEvent': 'ಅಮಾನ್ಯ ವೆಬ್‌ಹುಕ್ ಈವೆಂಟ್.',
}
