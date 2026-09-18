/**
 * Swahili translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Inapakia...',
  'common.saving': 'Inahifadhi...',
  'common.close': 'Funga',
  'common.goBack': 'Rudi nyuma',
  'common.submit': 'Wasilisha',
  'common.continue': 'Endelea',

  // Auth - Login
  'auth.login.email': 'Barua pepe',
  'auth.login.password': 'Nenosiri',
  'auth.login.twoFactor': 'Tokeni ya Uthibitishaji wa Hatua Mbili (Ikiwezeshwa)',
  'auth.login.signUp': 'Jisajili',
  'auth.login.loggingIn': 'Inaingia...',
  'auth.login.logIn': 'Ingia',
  'auth.login.forgotPassword': 'Umesahau nenosiri?',

  // Auth - Signup
  'auth.signup.email': 'Barua pepe (Inahitajika)',
  'auth.signup.password': 'Nenosiri (Linahitajika)',
  'auth.signup.name': 'Jina lako',
  'auth.signup.signingUp': 'Inajisajili...',
  'auth.signup.signUp': 'Jisajili',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ikiwa akaunti yenye barua pepe hiyo ipo, kiungo cha kuweka upya nenosiri kimetumwa.',
  'auth.forgotPassword.email': 'Barua pepe',
  'auth.forgotPassword.submitting': 'Inawasilisha...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Barua pepe',
  'auth.resetPassword.token': 'Tokeni ya Kuweka Upya Nenosiri',
  'auth.resetPassword.newPassword': 'Weka Nenosiri Jipya',
  'auth.resetPassword.twoFactor': 'Tokeni ya Uthibitishaji wa Hatua Mbili (Ikiwezeshwa)',
  'auth.resetPassword.loggingIn': 'Inaingia...',
  'auth.resetPassword.submit': 'Weka nenosiri na uingie',

  // Home
  'home.greeting': 'Habari, ',
  'home.world': 'Dunia',

  // Settings
  'settings.account': 'Akaunti',
  'settings.email': 'Barua pepe',
  'settings.authentication': 'Uthibitishaji',
  'settings.changePassword': 'Badilisha nenosiri',
  'settings.twoFactor': 'Uthibitishaji wa hatua mbili',
  'settings.notifications': 'Arifa',
  'settings.pushNotifications': 'Arifa za kusukuma',
  'settings.billing': 'Malipo',
  'settings.plan': 'Mpango: ',
  'settings.upgrade': 'Pandisha',
  'settings.devices': 'Vifaa',
  'settings.noDevices': 'Hakuna vifaa vilivyopatikana',
  'settings.thisDevice': 'Kifaa Hiki',
  'settings.platform': 'Jukwaa',
  'settings.browser': 'Kivinjari',
  'settings.network': 'Mtandao',
  'settings.online': 'Mtandaoni',
  'settings.offline': 'Nje ya mtandao',
  'settings.unknown': 'Haijulikani',
  'settings.logOut': 'Toka',
  'settings.deleteAccount': 'Futa akaunti',
  'settings.changePasswordModal.title': 'Badilisha Nenosiri',
  'settings.changePasswordModal.error': 'Imeshindwa kubadilisha nenosiri.',
  'settings.changePasswordModal.currentPassword': 'Nenosiri la Sasa',
  'settings.changePasswordModal.newPassword': 'Nenosiri Jipya',
  'settings.changePasswordModal.changing': 'Inabadilisha...',
  'settings.deleteAccountModal.title': 'Futa Akaunti',
  'settings.deleteAccountModal.warning':
    'Kitendo hiki hakiwezi kutendwa upya. Tafadhali weka nenosiri lako ili kuthibitisha.',
  'settings.deleteAccountModal.password': 'Nenosiri',
  'settings.deleteAccountModal.deleting': 'Inafuta...',
  'settings.changePasswordModal.submit': 'Badilisha nenosiri',
  'settings.deleteAccountModal.submit': 'Futa akaunti',
  'settings.failedToUpdateEmail': 'Imeshindwa kusasisha barua pepe.',
  'settings.failedToDeleteAccount': 'Imeshindwa kufuta akaunti.',
  'settings.toggleTwoFactor': 'Badilisha uthibitishaji wa hatua mbili',
  'settings.togglePushNotifications': 'Badilisha arifa za push',

  // Footer
  'footer.about': 'Kuhusu {{appName}}',
  'footer.privacyPolicy': 'Sera ya Faragha',
  'footer.termsOfService': 'Masharti ya Huduma',
  'footer.language': 'Lugha',

  // OAuth
  'oauth.orContinueWith': 'Au endelea na',
  'oauth.continueWith': 'Endelea na {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Badilisha mandhari',

  // User Menu
  'userMenu.open': 'Fungua menyu ya mtumiaji',

  // Plan Updated
  'planUpdated.message': 'Mpango wako umesasishwa.',
  'planUpdated.thankYou': 'Asante!',
  'planUpdated.returnHome': 'Rudi nyumbani',

  // PWA
  'pwa.updateAvailable': 'Toleo jipya linapatikana!',
  'pwa.update': 'Sasisha',
  'pwa.updating': 'Inasasisha...',

  // User API errors
  'user.error.badRequest': 'Ombi batili.',
  'user.error.notFound': 'Haijapatikana.',
  'user.error.failedToCreateSession': 'Imeshindwa kuunda kipindi.',
  'user.error.usernameRequired': 'Jina la mtumiaji linahitajika.',
  'user.error.passwordRequired': 'Nenosiri linahitajika.',
  'user.error.emailInvalid': 'Barua pepe ni batili.',
  'user.error.usernameUnavailable': 'Jina la mtumiaji halipatikani.',
  'user.error.emailAlreadyRegistered': 'Barua pepe tayari imesajiliwa.',
  'user.error.failedToHashPassword': 'Imeshindwa kusimba nenosiri.',
  'user.error.invalidCredentials': 'Vitambulisho batili.',
  'user.error.invalidTwoFactorToken': 'Tokeni ya hatua mbili batili.',
  'user.error.twoFactorVerificationUnavailable': 'Uthibitishaji wa hatua mbili haupatikani.',
  'user.error.loginFailed': 'Kuingia kumeshindwa.',
  'user.error.usernameCannotBeEmpty': 'Jina la mtumiaji haliwezi kuwa tupu.',
  'user.error.failedToUpdateUser': 'Imeshindwa kusasisha mtumiaji.',
  'user.error.failedToDeleteUser': 'Imeshindwa kufuta mtumiaji.',
  'user.error.failedToReadUser': 'Imeshindwa kusoma mtumiaji.',
  'user.error.emailRequired': 'Barua pepe inahitajika.',
  'user.error.failedToProcessPasswordReset': 'Imeshindwa kusindika kuweka upya nenosiri.',
  'user.error.newPasswordRequired': 'Nenosiri jipya linahitajika.',
  'user.error.currentPasswordRequired': 'Nenosiri la sasa linahitajika.',
  'user.error.currentPasswordIncorrect': 'Nenosiri la sasa si sahihi.',
  'user.error.failedToUpdatePassword': 'Imeshindwa kusasisha nenosiri.',
  'user.error.planKeyRequired': 'planKey inahitajika.',
  'user.error.invalidPlan': 'Mpango batili.',
  'user.error.failedToUpdateSubscription': 'Imeshindwa kusasisha usajili.',
  'user.error.failedToUpdatePlan': 'Imeshindwa kusasisha mpango.',
  'user.error.twoFactorNotAvailable': 'Uthibitishaji wa hatua mbili haupatikani.',
  'user.error.tokenRequired': 'Tokeni inahitajika.',
  'user.error.noPendingTwoFactorSetup':
    'Hakuna usanidi wa hatua mbili unaongojea. Piga simu kwa kitendo cha "setup" kwanza.',
  'user.error.invalidToken': 'Tokeni batili.',
  'user.error.twoFactorNotEnabled': 'Hatua mbili haijawezeshwa.',
  'user.error.invalidAction': 'Kitendo batili. Tumia "setup", "enable", au "disable".',
  'user.error.twoFactorOperationFailed': 'Operesheni ya hatua mbili imeshindwa.',
  'user.error.oauthServerNotConfigured': 'Seva ya OAuth "{{server}}" haijasanidiwa.',
  'user.error.oauthVerificationFailed': 'Uthibitishaji wa OAuth umeshindwa.',
  'user.error.failedToCreateUser': 'Imeshindwa kuunda mtumiaji.',
  'user.error.oauthLoginFailed': 'Kuingia kwa OAuth kumeshindwa.',

  // Auth client errors
  'auth.error.requestFailed': 'Ombi limeshindwa',
  'auth.error.loginFailed': 'Kuingia kumeshindwa',
  'auth.error.registrationFailed': 'Usajili umeshindwa',
  'auth.error.noRefreshToken': 'Hakuna tokeni ya kuonyesha upya inayopatikana',

  // Form validation
  'forms.required': 'Sehemu hii inahitajika',
  'forms.min': 'Thamani lazima iwe angalau {{min}}',
  'forms.max': 'Thamani lazima iwe zaidi ya {{max}}',
  'forms.minLength': 'Lazima iwe na angalau herufi {{minLength}}',
  'forms.maxLength': 'Lazima iwe na zaidi ya herufi {{maxLength}}',
  'forms.invalidFormat': 'Muundo batili',
  'forms.invalidEmail': 'Anwani ya barua pepe batili',
  'forms.invalidUrl': 'URL batili',
  'forms.invalidValue': 'Thamani batili',

  // HTTP client errors
  'http.error.requestFailed': 'Ombi limeshindwa na hali {{status}}.',
  'http.error.networkError': 'Hitilafu ya mtandao.',

  // Routing errors
  'routing.error.missingParam': 'Parameta "{{name}}" inakosekana kwa njia "{{pattern}}"',
  'routing.error.routeNotFound': 'Njia "{{name}}" haikupatikana',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter lazima itumike ndani ya MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Arifa za kushinikiza hazitumiki',
  'push.error.permissionNotGranted': 'Ruhusa ya arifa haijatolewa',

  // Utility errors
  'error.networkError': 'Hitilafu ya mtandao. Tafadhali angalia muunganisho wako.',
  'error.timeout': 'Muda wa ombi umeisha. Tafadhali jaribu tena.',
  'error.unauthorized': 'Huna idhini ya kufanya kitendo hiki.',
  'error.forbidden': 'Ufikiaji umekataliwa.',
  'error.notFound': 'Rasilimali haijapatikana.',
  'error.validationError': 'Tafadhali angalia ingizo lako na ujaribu tena.',
  'error.serverError': 'Hitilafu ya seva. Tafadhali jaribu tena baadaye.',
  'error.unknown': 'Hitilafu isiyotarajiwa imetokea.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Ujumbe unahitajika',
  'conversation.error.aiNotConfigured': 'Mtoa huduma wa AI haujasanidiwa',
  'conversation.error.unknownAiError': 'Hitilafu ya AI isiyojulikana',
  'conversation.error.notFound': 'Hakuna mazungumzo yaliyopatikana',
  'conversation.error.streamError': 'Hitilafu ya utiririshaji wa AI',

  // Resource errors
  'resource.error.unknownError': 'Hitilafu isiyojulikana.',
  'resource.error.unableToCreate': 'Haiwezi kuunda {{name}}.',
  'resource.error.unableToUpdate': 'Haiwezi kusasisha {{name}}.',
  'resource.error.unableToDelete': 'Haiwezi kufuta {{name}}.',
  'resource.error.notFound': 'Haijapatikana.',
  'resource.error.badRequest': 'Ombi batili.',
  'resource.error.unauthorized': 'Haijaidhinishwa.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name na projectType zinahitajika',
  'project.error.notFound': 'Haijapatikana',

  // Device errors
  'device.error.unauthorized': 'Haujaidhinishwa.',
  'device.error.badRequest': 'Ombi batili.',
  'device.error.notFound': 'Haipatikani.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Imeshindwa kusoma {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Imeshindwa kuandika {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Imeshindwa kufuta {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Mtoa huduma wa malipo anahitajika.',
  'user.payment.subscriptionIdRequired': 'subscriptionId inahitajika.',
  'user.payment.receiptAndPlanRequired': 'receipt na planKey zinahitajika.',
  'user.payment.verificationNotConfigured':
    'Uthibitishaji wa malipo haujasanidiwa kwa {{provider}}.',
  'user.payment.invalidPlan': 'Mpango batili.',
  'user.payment.verificationFailed': 'Imeshindwa kuthibitisha usajili.',
  'user.payment.unknownPlan': 'Mpango usiojulikana.',
  'user.payment.invalidWebhookEvent': 'Tukio la webhook batili.',
}
