/**
 * Filipino translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Naglo-load...',
  'common.saving': 'Nagse-save...',
  'common.close': 'Isara',
  'common.goBack': 'Bumalik',
  'common.submit': 'Isumite',
  'common.continue': 'Magpatuloy',

  // Auth - Login
  'auth.login.email': 'Email',
  'auth.login.password': 'Password',
  'auth.login.twoFactor': 'Two-Factor Token (Kung naka-enable)',
  'auth.login.signUp': 'Mag-sign up',
  'auth.login.loggingIn': 'Nagla-log in...',
  'auth.login.logIn': 'Mag-log in',
  'auth.login.forgotPassword': 'Nakalimutan ang password?',

  // Auth - Signup
  'auth.signup.email': 'Email (Kinakailangan)',
  'auth.signup.password': 'Password (Kinakailangan)',
  'auth.signup.name': 'Iyong pangalan',
  'auth.signup.signingUp': 'Nagsa-sign up...',
  'auth.signup.signUp': 'Mag-sign up',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Kung may account na may ganitong email, naipadala na ang link para i-reset ang password.',
  'auth.forgotPassword.email': 'Email',
  'auth.forgotPassword.submitting': 'Isinusumite...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Email',
  'auth.resetPassword.token': 'Token para sa Pag-reset ng Password',
  'auth.resetPassword.newPassword': 'Ilagay ang Bagong Password',
  'auth.resetPassword.twoFactor': 'Two-Factor Token (Kung naka-enable)',
  'auth.resetPassword.loggingIn': 'Nagla-log in...',
  'auth.resetPassword.submit': 'Itakda ang password at mag-log in',

  // Home
  'home.greeting': 'Kumusta, ',
  'home.world': 'Mundo',

  // Settings
  'settings.account': 'Account',
  'settings.email': 'Email',
  'settings.authentication': 'Authentication',
  'settings.changePassword': 'Palitan ang password',
  'settings.twoFactor': 'Two-factor authentication',
  'settings.notifications': 'Mga Notipikasyon',
  'settings.pushNotifications': 'Mga push notification',
  'settings.billing': 'Pagsingil',
  'settings.plan': 'Plano: ',
  'settings.upgrade': 'I-upgrade',
  'settings.devices': 'Mga Device',
  'settings.noDevices': 'Walang nahanap na device',
  'settings.thisDevice': 'Itong Device',
  'settings.platform': 'Platform',
  'settings.browser': 'Browser',
  'settings.network': 'Network',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Hindi alam',
  'settings.logOut': 'Mag-log out',
  'settings.deleteAccount': 'I-delete ang account',
  'settings.changePasswordModal.title': 'Palitan ang Password',
  'settings.changePasswordModal.error': 'Hindi nagawa ang pagpapalit ng password.',
  'settings.changePasswordModal.currentPassword': 'Kasalukuyang Password',
  'settings.changePasswordModal.newPassword': 'Bagong Password',
  'settings.changePasswordModal.changing': 'Pinapalitan...',
  'settings.deleteAccountModal.title': 'I-delete ang Account',
  'settings.deleteAccountModal.warning':
    'Hindi na maibabalik ang aksyong ito. Pakiusap ilagay ang iyong password para kumpirmahin.',
  'settings.deleteAccountModal.password': 'Password',
  'settings.deleteAccountModal.deleting': 'Dini-delete...',
  'settings.changePasswordModal.submit': 'Palitan ang password',
  'settings.deleteAccountModal.submit': 'I-delete ang account',
  'settings.failedToUpdateEmail': 'Hindi na-update ang email.',
  'settings.failedToDeleteAccount': 'Hindi nabura ang account.',
  'settings.toggleTwoFactor': 'I-toggle ang two-factor authentication',
  'settings.togglePushNotifications': 'I-toggle ang push notifications',

  // Footer
  'footer.about': 'Tungkol sa {{appName}}',
  'footer.privacyPolicy': 'Patakaran sa Privacy',
  'footer.termsOfService': 'Mga Tuntunin ng Serbisyo',
  'footer.language': 'Wika',

  // OAuth
  'oauth.orContinueWith': 'O magpatuloy gamit ang',
  'oauth.continueWith': 'Magpatuloy gamit ang {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Palitan ang tema',

  // User Menu
  'userMenu.open': 'Buksan ang menu ng user',

  // Plan Updated
  'planUpdated.message': 'Na-update na ang iyong plano.',
  'planUpdated.thankYou': 'Salamat!',
  'planUpdated.returnHome': 'Bumalik sa home',

  // PWA
  'pwa.updateAvailable': 'May bagong bersyon na magagamit!',
  'pwa.update': 'I-update',
  'pwa.updating': 'Ina-update...',

  // User API errors
  'user.error.badRequest': 'Hindi valid na request.',
  'user.error.notFound': 'Hindi nahanap.',
  'user.error.failedToCreateSession': 'Nabigo ang paglikha ng session.',
  'user.error.usernameRequired': 'Kailangan ang username.',
  'user.error.passwordRequired': 'Kailangan ang password.',
  'user.error.emailInvalid': 'Hindi valid ang email.',
  'user.error.usernameUnavailable': 'Hindi available ang username.',
  'user.error.emailAlreadyRegistered': 'Nakarehistro na ang email.',
  'user.error.failedToHashPassword': 'Nabigo ang pag-hash ng password.',
  'user.error.invalidCredentials': 'Hindi valid na mga credential.',
  'user.error.invalidTwoFactorToken': 'Hindi valid na two-factor token.',
  'user.error.twoFactorVerificationUnavailable': 'Hindi available ang two-factor verification.',
  'user.error.loginFailed': 'Nabigo ang pag-login.',
  'user.error.usernameCannotBeEmpty': 'Hindi maaaring walang laman ang username.',
  'user.error.failedToUpdateUser': 'Nabigo ang pag-update ng user.',
  'user.error.failedToDeleteUser': 'Nabigo ang pagbura ng user.',
  'user.error.failedToReadUser': 'Nabigo ang pagbasa ng user.',
  'user.error.emailRequired': 'Kailangan ang email.',
  'user.error.failedToProcessPasswordReset': 'Nabigo ang pagproseso ng pag-reset ng password.',
  'user.error.newPasswordRequired': 'Kailangan ang bagong password.',
  'user.error.currentPasswordRequired': 'Kailangan ang kasalukuyang password.',
  'user.error.currentPasswordIncorrect': 'Hindi tama ang kasalukuyang password.',
  'user.error.failedToUpdatePassword': 'Nabigo ang pag-update ng password.',
  'user.error.planKeyRequired': 'Kailangan ang planKey.',
  'user.error.invalidPlan': 'Hindi valid na plan.',
  'user.error.failedToUpdateSubscription': 'Nabigo ang pag-update ng subscription.',
  'user.error.failedToUpdatePlan': 'Nabigo ang pag-update ng plan.',
  'user.error.twoFactorNotAvailable': 'Hindi available ang two-factor authentication.',
  'user.error.tokenRequired': 'Kailangan ang token.',
  'user.error.noPendingTwoFactorSetup':
    'Walang pending na two-factor setup. Tumawag muna gamit ang action na "setup".',
  'user.error.invalidToken': 'Hindi valid na token.',
  'user.error.twoFactorNotEnabled': 'Hindi naka-enable ang two-factor.',
  'user.error.invalidAction': 'Hindi valid na action. Gamitin ang "setup", "enable", o "disable".',
  'user.error.twoFactorOperationFailed': 'Nabigo ang two-factor operation.',
  'user.error.oauthServerNotConfigured': 'Hindi naka-configure ang OAuth server na "{{server}}".',
  'user.error.oauthVerificationFailed': 'Nabigo ang OAuth verification.',
  'user.error.failedToCreateUser': 'Nabigo ang paglikha ng user.',
  'user.error.oauthLoginFailed': 'Nabigo ang OAuth login.',

  // Auth client errors
  'auth.error.requestFailed': 'Nabigo ang request',
  'auth.error.loginFailed': 'Nabigo ang pag-login',
  'auth.error.registrationFailed': 'Nabigo ang pagpaparehistro',
  'auth.error.noRefreshToken': 'Walang available na refresh token',

  // Form validation
  'forms.required': 'Kinakailangan ang field na ito',
  'forms.min': 'Ang halaga ay dapat hindi bababa sa {{min}}',
  'forms.max': 'Ang halaga ay dapat hindi hihigit sa {{max}}',
  'forms.minLength': 'Dapat ay hindi bababa sa {{minLength}} na karakter',
  'forms.maxLength': 'Dapat ay hindi hihigit sa {{maxLength}} na karakter',
  'forms.invalidFormat': 'Hindi wastong format',
  'forms.invalidEmail': 'Hindi wastong email address',
  'forms.invalidUrl': 'Hindi wastong URL',
  'forms.invalidValue': 'Hindi wastong halaga',

  // HTTP client errors
  'http.error.requestFailed': 'Nabigo ang request na may status {{status}}.',
  'http.error.networkError': 'Network error.',

  // Routing errors
  'routing.error.missingParam': 'Nawawalang parameter na "{{name}}" para sa path na "{{pattern}}"',
  'routing.error.routeNotFound': 'Hindi nahanap ang ruta na "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Ang useMoleculeRouter ay dapat gamitin sa loob ng MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Hindi sinusuportahan ang push notifications',
  'push.error.permissionNotGranted': 'Hindi ibinigay ang pahintulot para sa notification',

  // Utility errors
  'error.networkError': 'Network error. Pakisuri ang iyong koneksyon.',
  'error.timeout': 'Nag-timeout ang request. Pakisubukan muli.',
  'error.unauthorized': 'Hindi ka awtorisadong gawin ang aksyong ito.',
  'error.forbidden': 'Tinanggihan ang access.',
  'error.notFound': 'Hindi nahanap ang resource.',
  'error.validationError': 'Pakisuri ang iyong input at subukan muli.',
  'error.serverError': 'Server error. Pakisubukan muli mamaya.',
  'error.unknown': 'May naganap na hindi inaasahang error.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Kailangan ang message',
  'conversation.error.aiNotConfigured': 'Hindi naka-configure ang AI provider',
  'conversation.error.unknownAiError': 'Hindi kilalang AI error',
  'conversation.error.notFound': 'Walang nahanap na conversation',
  'conversation.error.streamError': 'AI streaming error',

  // Resource errors
  'resource.error.unknownError': 'Hindi kilalang error.',
  'resource.error.unableToCreate': 'Hindi malikha ang {{name}}.',
  'resource.error.unableToUpdate': 'Hindi ma-update ang {{name}}.',
  'resource.error.unableToDelete': 'Hindi mabura ang {{name}}.',
  'resource.error.notFound': 'Hindi nahanap.',
  'resource.error.badRequest': 'Hindi valid na request.',
  'resource.error.unauthorized': 'Hindi awtorisado.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Kailangan ang name at projectType',
  'project.error.notFound': 'Hindi nahanap',

  // Device errors
  'device.error.unauthorized': 'Hindi awtorisado.',
  'device.error.badRequest': 'Maling kahilingan.',
  'device.error.notFound': 'Hindi nahanap.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Nabigo ang pagbasa ng {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Nabigo ang pagsulat ng {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Nabigo ang pagtanggal ng {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Kailangan ang payment provider.',
  'user.payment.subscriptionIdRequired': 'Kailangan ang subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Kailangan ang receipt at planKey.',
  'user.payment.verificationNotConfigured':
    'Hindi naka-configure ang payment verification para sa {{provider}}.',
  'user.payment.invalidPlan': 'Hindi valid na plan.',
  'user.payment.verificationFailed': 'Nabigo ang pag-verify ng subscription.',
  'user.payment.unknownPlan': 'Hindi kilalang plan.',
  'user.payment.invalidWebhookEvent': 'Hindi valid na webhook event.',
}
