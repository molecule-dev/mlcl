/**
 * Punjabi translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
  'common.saving': 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ...',
  'common.close': 'ਬੰਦ ਕਰੋ',
  'common.goBack': 'ਵਾਪਸ ਜਾਓ',
  'common.submit': 'ਜਮ੍ਹਾਂ ਕਰੋ',
  'common.continue': 'ਜਾਰੀ ਰੱਖੋ',

  // Auth - Login
  'auth.login.email': 'ਈਮੇਲ',
  'auth.login.password': 'ਪਾਸਵਰਡ',
  'auth.login.twoFactor': 'ਦੋ-ਕਾਰਕ ਟੋਕਨ (ਜੇ ਚਾਲੂ ਹੋਵੇ)',
  'auth.login.signUp': 'ਸਾਈਨ ਅੱਪ ਕਰੋ',
  'auth.login.loggingIn': 'ਲੌਗ ਇਨ ਹੋ ਰਿਹਾ ਹੈ...',
  'auth.login.logIn': 'ਲੌਗ ਇਨ ਕਰੋ',
  'auth.login.forgotPassword': 'ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?',

  // Auth - Signup
  'auth.signup.email': 'ਈਮੇਲ (ਲੋੜੀਂਦਾ)',
  'auth.signup.password': 'ਪਾਸਵਰਡ (ਲੋੜੀਂਦਾ)',
  'auth.signup.name': 'ਤੁਹਾਡਾ ਨਾਮ',
  'auth.signup.signingUp': 'ਸਾਈਨ ਅੱਪ ਹੋ ਰਿਹਾ ਹੈ...',
  'auth.signup.signUp': 'ਸਾਈਨ ਅੱਪ ਕਰੋ',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'ਜੇ ਉਸ ਈਮੇਲ ਨਾਲ ਕੋਈ ਖਾਤਾ ਹੈ, ਤਾਂ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਲਿੰਕ ਭੇਜੀ ਗਈ ਹੈ।',
  'auth.forgotPassword.email': 'ਈਮੇਲ',
  'auth.forgotPassword.submitting': 'ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ਈਮੇਲ',
  'auth.resetPassword.token': 'ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਟੋਕਨ',
  'auth.resetPassword.newPassword': 'ਨਵਾਂ ਪਾਸਵਰਡ ਦਾਖ਼ਲ ਕਰੋ',
  'auth.resetPassword.twoFactor': 'ਦੋ-ਕਾਰਕ ਟੋਕਨ (ਜੇ ਚਾਲੂ ਹੋਵੇ)',
  'auth.resetPassword.loggingIn': 'ਲੌਗ ਇਨ ਹੋ ਰਿਹਾ ਹੈ...',
  'auth.resetPassword.submit': 'ਪਾਸਵਰਡ ਸੈੱਟ ਕਰੋ ਅਤੇ ਲੌਗ ਇਨ ਕਰੋ',

  // Home
  'home.greeting': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ',
  'home.world': 'ਦੁਨੀਆ',

  // Settings
  'settings.account': 'ਖਾਤਾ',
  'settings.email': 'ਈਮੇਲ',
  'settings.authentication': 'ਪ੍ਰਮਾਣੀਕਰਨ',
  'settings.changePassword': 'ਪਾਸਵਰਡ ਬਦਲੋ',
  'settings.twoFactor': 'ਦੋ-ਕਾਰਕ ਪ੍ਰਮਾਣੀਕਰਨ',
  'settings.notifications': 'ਸੂਚਨਾਵਾਂ',
  'settings.pushNotifications': 'ਪੁਸ਼ ਸੂਚਨਾਵਾਂ',
  'settings.billing': 'ਬਿਲਿੰਗ',
  'settings.plan': 'ਯੋਜਨਾ: ',
  'settings.upgrade': 'ਅੱਪਗ੍ਰੇਡ ਕਰੋ',
  'settings.devices': 'ਡਿਵਾਈਸ',
  'settings.noDevices': 'ਕੋਈ ਡਿਵਾਈਸ ਨਹੀਂ ਮਿਲੀ',
  'settings.thisDevice': 'ਇਹ ਡਿਵਾਈਸ',
  'settings.platform': 'ਪਲੇਟਫਾਰਮ',
  'settings.browser': 'ਬ੍ਰਾਊਜ਼ਰ',
  'settings.network': 'ਨੈੱਟਵਰਕ',
  'settings.online': 'ਔਨਲਾਈਨ',
  'settings.offline': 'ਔਫਲਾਈਨ',
  'settings.unknown': 'ਅਗਿਆਤ',
  'settings.logOut': 'ਲੌਗ ਆਊਟ',
  'settings.deleteAccount': 'ਖਾਤਾ ਮਿਟਾਓ',
  'settings.changePasswordModal.title': 'ਪਾਸਵਰਡ ਬਦਲੋ',
  'settings.changePasswordModal.error': 'ਪਾਸਵਰਡ ਬਦਲਣ ਵਿੱਚ ਅਸਫਲ।',
  'settings.changePasswordModal.currentPassword': 'ਮੌਜੂਦਾ ਪਾਸਵਰਡ',
  'settings.changePasswordModal.newPassword': 'ਨਵਾਂ ਪਾਸਵਰਡ',
  'settings.changePasswordModal.changing': 'ਬਦਲ ਰਿਹਾ ਹੈ...',
  'settings.deleteAccountModal.title': 'ਖਾਤਾ ਮਿਟਾਓ',
  'settings.deleteAccountModal.warning':
    'ਇਹ ਕਾਰਵਾਈ ਵਾਪਸ ਨਹੀਂ ਕੀਤੀ ਜਾ ਸਕਦੀ। ਪੁਸ਼ਟੀ ਕਰਨ ਲਈ ਆਪਣਾ ਪਾਸਵਰਡ ਦਾਖ਼ਲ ਕਰੋ।',
  'settings.deleteAccountModal.password': 'ਪਾਸਵਰਡ',
  'settings.deleteAccountModal.deleting': 'ਮਿਟਾਇਆ ਜਾ ਰਿਹਾ ਹੈ...',
  'settings.changePasswordModal.submit': 'ਪਾਸਵਰਡ ਬਦਲੋ',
  'settings.deleteAccountModal.submit': 'ਖਾਤਾ ਮਿਟਾਓ',
  'settings.failedToUpdateEmail': 'ਈਮੇਲ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'settings.failedToDeleteAccount': 'ਖਾਤਾ ਮਿਟਾਉਣ ਵਿੱਚ ਅਸਫਲ।',
  'settings.toggleTwoFactor': 'ਦੋ-ਕਾਰਕ ਪ੍ਰਮਾਣੀਕਰਨ ਟੌਗਲ ਕਰੋ',
  'settings.togglePushNotifications': 'ਪੁਸ਼ ਸੂਚਨਾਵਾਂ ਟੌਗਲ ਕਰੋ',

  // Footer
  'footer.about': '{{appName}} ਬਾਰੇ',
  'footer.privacyPolicy': 'ਗੋਪਨੀਯਤਾ ਨੀਤੀ',
  'footer.termsOfService': 'ਸੇਵਾ ਦੀਆਂ ਸ਼ਰਤਾਂ',
  'footer.language': 'ਭਾਸ਼ਾ',

  // OAuth
  'oauth.orContinueWith': 'ਜਾਂ ਇਸ ਨਾਲ ਜਾਰੀ ਰੱਖੋ',
  'oauth.continueWith': '{{provider}} ਨਾਲ ਜਾਰੀ ਰੱਖੋ',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'ਥੀਮ ਬਦਲੋ',

  // User Menu
  'userMenu.open': 'ਉਪਭੋਗਤਾ ਮੀਨੂ ਖੋਲ੍ਹੋ',

  // Plan Updated
  'planUpdated.message': 'ਤੁਹਾਡੀ ਯੋਜਨਾ ਅੱਪਡੇਟ ਕੀਤੀ ਗਈ ਹੈ।',
  'planUpdated.thankYou': 'ਧੰਨਵਾਦ!',
  'planUpdated.returnHome': 'ਹੋਮ ਤੇ ਵਾਪਸ ਜਾਓ',

  // PWA
  'pwa.updateAvailable': 'ਨਵਾਂ ਸੰਸਕਰਨ ਉਪਲਬਧ ਹੈ!',
  'pwa.update': 'ਅੱਪਡੇਟ',
  'pwa.updating': 'ਅੱਪਡੇਟ ਹੋ ਰਿਹਾ ਹੈ...',

  // User API errors
  'user.error.badRequest': 'ਖ਼ਰਾਬ ਬੇਨਤੀ।',
  'user.error.notFound': 'ਨਹੀਂ ਮਿਲਿਆ।',
  'user.error.failedToCreateSession': 'ਸੈਸ਼ਨ ਬਣਾਉਣ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.usernameRequired': 'ਉਪਭੋਗਤਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.passwordRequired': 'ਪਾਸਵਰਡ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.emailInvalid': 'ਈਮੇਲ ਅਵੈਧ ਹੈ।',
  'user.error.usernameUnavailable': 'ਉਪਭੋਗਤਾ ਨਾਮ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'user.error.emailAlreadyRegistered': 'ਈਮੇਲ ਪਹਿਲਾਂ ਤੋਂ ਰਜਿਸਟਰ ਹੈ।',
  'user.error.failedToHashPassword': 'ਪਾਸਵਰਡ ਹੈਸ਼ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.invalidCredentials': 'ਅਵੈਧ ਪ੍ਰਮਾਣ ਪੱਤਰ।',
  'user.error.invalidTwoFactorToken': 'ਅਵੈਧ ਦੋ-ਕਾਰਕ ਟੋਕਨ।',
  'user.error.twoFactorVerificationUnavailable': 'ਦੋ-ਕਾਰਕ ਤਸਦੀਕ ਉਪਲਬਧ ਨਹੀਂ।',
  'user.error.loginFailed': 'ਲੌਗਇਨ ਅਸਫਲ।',
  'user.error.usernameCannotBeEmpty': 'ਉਪਭੋਗਤਾ ਨਾਮ ਖਾਲੀ ਨਹੀਂ ਹੋ ਸਕਦਾ।',
  'user.error.failedToUpdateUser': 'ਉਪਭੋਗਤਾ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.failedToDeleteUser': 'ਉਪਭੋਗਤਾ ਮਿਟਾਉਣ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.failedToReadUser': 'ਉਪਭੋਗਤਾ ਪੜ੍ਹਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.emailRequired': 'ਈਮੇਲ ਲੋੜੀਂਦੀ ਹੈ।',
  'user.error.failedToProcessPasswordReset': 'ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਪ੍ਰਕਿਰਿਆ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.newPasswordRequired': 'ਨਵਾਂ ਪਾਸਵਰਡ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.currentPasswordRequired': 'ਮੌਜੂਦਾ ਪਾਸਵਰਡ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.currentPasswordIncorrect': 'ਮੌਜੂਦਾ ਪਾਸਵਰਡ ਗ਼ਲਤ ਹੈ।',
  'user.error.failedToUpdatePassword': 'ਪਾਸਵਰਡ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.planKeyRequired': 'planKey ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.invalidPlan': 'ਅਵੈਧ ਯੋਜਨਾ।',
  'user.error.failedToUpdateSubscription': 'ਸਬਸਕ੍ਰਿਪਸ਼ਨ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.failedToUpdatePlan': 'ਯੋਜਨਾ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.twoFactorNotAvailable': 'ਦੋ-ਕਾਰਕ ਪ੍ਰਮਾਣੀਕਰਨ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'user.error.tokenRequired': 'ਟੋਕਨ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.error.noPendingTwoFactorSetup':
    'ਕੋਈ ਬਕਾਇਆ ਦੋ-ਕਾਰਕ ਸੈੱਟਅੱਪ ਨਹੀਂ। ਪਹਿਲਾਂ "setup" ਐਕਸ਼ਨ ਨਾਲ ਕਾਲ ਕਰੋ।',
  'user.error.invalidToken': 'ਅਵੈਧ ਟੋਕਨ।',
  'user.error.twoFactorNotEnabled': 'ਦੋ-ਕਾਰਕ ਸਕਿਰਿਆ ਨਹੀਂ ਹੈ।',
  'user.error.invalidAction': 'ਅਵੈਧ ਐਕਸ਼ਨ। "setup", "enable", ਜਾਂ "disable" ਵਰਤੋ।',
  'user.error.twoFactorOperationFailed': 'ਦੋ-ਕਾਰਕ ਕਾਰਵਾਈ ਅਸਫਲ।',
  'user.error.oauthServerNotConfigured': 'OAuth ਸਰਵਰ "{{server}}" ਕੌਂਫਿਗਰ ਨਹੀਂ ਹੈ।',
  'user.error.oauthVerificationFailed': 'OAuth ਤਸਦੀਕ ਅਸਫਲ।',
  'user.error.failedToCreateUser': 'ਉਪਭੋਗਤਾ ਬਣਾਉਣ ਵਿੱਚ ਅਸਫਲ।',
  'user.error.oauthLoginFailed': 'OAuth ਲੌਗਇਨ ਅਸਫਲ।',

  // Auth client errors
  'auth.error.requestFailed': 'ਬੇਨਤੀ ਅਸਫਲ',
  'auth.error.loginFailed': 'ਲੌਗਇਨ ਅਸਫਲ',
  'auth.error.registrationFailed': 'ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਅਸਫਲ',
  'auth.error.noRefreshToken': 'ਕੋਈ ਰਿਫ੍ਰੈਸ਼ ਟੋਕਨ ਉਪਲਬਧ ਨਹੀਂ',

  // Form validation
  'forms.required': 'ਇਹ ਖੇਤਰ ਲੋੜੀਂਦਾ ਹੈ',
  'forms.min': 'ਮੁੱਲ ਘੱਟੋ-ਘੱਟ {{min}} ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ',
  'forms.max': 'ਮੁੱਲ ਵੱਧ ਤੋਂ ਵੱਧ {{max}} ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ',
  'forms.minLength': 'ਘੱਟੋ-ਘੱਟ {{minLength}} ਅੱਖਰ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ',
  'forms.maxLength': 'ਵੱਧ ਤੋਂ ਵੱਧ {{maxLength}} ਅੱਖਰ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ',
  'forms.invalidFormat': 'ਅਵੈਧ ਫਾਰਮੈਟ',
  'forms.invalidEmail': 'ਅਵੈਧ ਈਮੇਲ ਪਤਾ',
  'forms.invalidUrl': 'ਅਵੈਧ URL',
  'forms.invalidValue': 'ਅਵੈਧ ਮੁੱਲ',

  // HTTP client errors
  'http.error.requestFailed': 'ਸਥਿਤੀ {{status}} ਨਾਲ ਬੇਨਤੀ ਅਸਫਲ।',
  'http.error.networkError': 'ਨੈੱਟਵਰਕ ਗਲਤੀ।',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" ਮਾਰਗ ਲਈ "{{name}}" ਪੈਰਾਮੀਟਰ ਗੁੰਮ ਹੈ',
  'routing.error.routeNotFound': '"{{name}}" ਰੂਟ ਨਹੀਂ ਮਿਲਿਆ',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ਨੂੰ MoleculeRouterProvider ਦੇ ਅੰਦਰ ਵਰਤਿਆ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ',

  // Push notification errors
  'push.error.notSupported': 'ਪੁਸ਼ ਸੂਚਨਾਵਾਂ ਸਮਰਥਿਤ ਨਹੀਂ ਹਨ',
  'push.error.permissionNotGranted': 'ਸੂਚਨਾ ਇਜਾਜ਼ਤ ਨਹੀਂ ਦਿੱਤੀ ਗਈ',

  // Utility errors
  'error.networkError': 'ਨੈੱਟਵਰਕ ਗਲਤੀ। ਆਪਣਾ ਕਨੈਕਸ਼ਨ ਜਾਂਚੋ।',
  'error.timeout': 'ਬੇਨਤੀ ਦਾ ਸਮਾਂ ਖ਼ਤਮ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'error.unauthorized': 'ਤੁਸੀਂ ਇਹ ਕਾਰਵਾਈ ਕਰਨ ਲਈ ਅਧਿਕਾਰਤ ਨਹੀਂ ਹੋ।',
  'error.forbidden': 'ਪਹੁੰਚ ਤੋਂ ਇਨਕਾਰ।',
  'error.notFound': 'ਸਰੋਤ ਨਹੀਂ ਮਿਲਿਆ।',
  'error.validationError': 'ਆਪਣਾ ਇਨਪੁੱਟ ਜਾਂਚੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'error.serverError': 'ਸਰਵਰ ਗਲਤੀ। ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'error.unknown': 'ਇੱਕ ਅਣਕਿਆਸੀ ਗਲਤੀ ਆਈ।',

  // AI conversation errors
  'conversation.error.messageRequired': 'message ਲੋੜੀਂਦਾ ਹੈ',
  'conversation.error.aiNotConfigured': 'AI ਪ੍ਰੋਵਾਈਡਰ ਕੌਂਫਿਗਰ ਨਹੀਂ ਹੈ',
  'conversation.error.unknownAiError': 'ਅਣਜਾਣ AI ਗਲਤੀ',
  'conversation.error.notFound': 'ਕੋਈ ਗੱਲਬਾਤ ਨਹੀਂ ਮਿਲੀ',
  'conversation.error.streamError': 'AI ਸਟ੍ਰੀਮਿੰਗ ਗਲਤੀ',

  // Resource errors
  'resource.error.unknownError': 'ਅਣਜਾਣ ਗਲਤੀ।',
  'resource.error.unableToCreate': '{{name}} ਬਣਾਉਣ ਵਿੱਚ ਅਸਮਰੱਥ।',
  'resource.error.unableToUpdate': '{{name}} ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਮਰੱਥ।',
  'resource.error.unableToDelete': '{{name}} ਮਿਟਾਉਣ ਵਿੱਚ ਅਸਮਰੱਥ।',
  'resource.error.notFound': 'ਨਹੀਂ ਮਿਲਿਆ।',
  'resource.error.badRequest': 'ਖ਼ਰਾਬ ਬੇਨਤੀ।',
  'resource.error.unauthorized': 'ਅਣਅਧਿਕਾਰਤ।',

  // Project errors
  'project.error.nameAndTypeRequired': 'name ਅਤੇ projectType ਲੋੜੀਂਦੇ ਹਨ',
  'project.error.notFound': 'ਨਹੀਂ ਮਿਲਿਆ',

  // Device errors
  'device.error.unauthorized': 'ਅਣਅਧਿਕਾਰਤ।',
  'device.error.badRequest': 'ਗਲਤ ਬੇਨਤੀ।',
  'device.error.notFound': 'ਨਹੀਂ ਮਿਲਿਆ।',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} ਪੜ੍ਹਨ ਵਿੱਚ ਅਸਫਲ: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} ਲਿਖਣ ਵਿੱਚ ਅਸਫਲ: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} ਮਿਟਾਉਣ ਵਿੱਚ ਅਸਫਲ: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ਭੁਗਤਾਨ ਪ੍ਰਦਾਤਾ ਲੋੜੀਂਦਾ ਹੈ।',
  'user.payment.subscriptionIdRequired': 'subscriptionId ਲੋੜੀਂਦਾ ਹੈ।',
  'user.payment.receiptAndPlanRequired': 'receipt ਅਤੇ planKey ਲੋੜੀਂਦੇ ਹਨ।',
  'user.payment.verificationNotConfigured': '{{provider}} ਲਈ ਭੁਗਤਾਨ ਤਸਦੀਕ ਕੌਂਫਿਗਰ ਨਹੀਂ ਹੈ।',
  'user.payment.invalidPlan': 'ਅਵੈਧ ਯੋਜਨਾ।',
  'user.payment.verificationFailed': 'ਸਬਸਕ੍ਰਿਪਸ਼ਨ ਤਸਦੀਕ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'user.payment.unknownPlan': 'ਅਣਜਾਣ ਯੋਜਨਾ।',
  'user.payment.invalidWebhookEvent': 'ਅਵੈਧ ਵੈੱਬਹੁੱਕ ਇਵੈਂਟ।',
}
