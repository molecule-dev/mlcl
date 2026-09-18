/**
 * Zulu translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Iyalayisha...',
  'common.saving': 'Iyalondoloza...',
  'common.close': 'Vala',
  'common.goBack': 'Buyela emuva',
  'common.submit': 'Thumela',
  'common.continue': 'Qhubeka',

  // Auth - Login
  'auth.login.email': 'I-imeyili',
  'auth.login.password': 'Iphasiwedi',
  'auth.login.twoFactor': 'Ithokheni Yokuqinisekisa Okubili (Uma ivuliwe)',
  'auth.login.signUp': 'Bhalisa',
  'auth.login.loggingIn': 'Iyangena...',
  'auth.login.logIn': 'Ngena',
  'auth.login.forgotPassword': 'Ukhohlwe iphasiwedi?',

  // Auth - Signup
  'auth.signup.email': 'I-imeyili (Iyadingeka)',
  'auth.signup.password': 'Iphasiwedi (Iyadingeka)',
  'auth.signup.name': 'Igama lakho',
  'auth.signup.signingUp': 'Iyabhalisa...',
  'auth.signup.signUp': 'Bhalisa',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Uma i-akhawunti enale imeyili ikhona, isixhumanisi sokusethwa kabusha kwephasiwedi sesithunyelwe.',
  'auth.forgotPassword.email': 'I-imeyili',
  'auth.forgotPassword.submitting': 'Iyathumela...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'I-imeyili',
  'auth.resetPassword.token': 'Ithokheni Yokusethwa Kabusha Kwephasiwedi',
  'auth.resetPassword.newPassword': 'Faka Iphasiwedi Entsha',
  'auth.resetPassword.twoFactor': 'Ithokheni Yokuqinisekisa Okubili (Uma ivuliwe)',
  'auth.resetPassword.loggingIn': 'Iyangena...',
  'auth.resetPassword.submit': 'Setha iphasiwedi bese ungena',

  // Home
  'home.greeting': 'Sawubona, ',
  'home.world': 'Mhlaba',

  // Settings
  'settings.account': 'I-akhawunti',
  'settings.email': 'I-imeyili',
  'settings.authentication': 'Ukuqinisekisa',
  'settings.changePassword': 'Shintsha iphasiwedi',
  'settings.twoFactor': 'Ukuqinisekisa okubili',
  'settings.notifications': 'Izaziso',
  'settings.pushNotifications': 'Izaziso zokuphusha',
  'settings.billing': 'Ukukhokha',
  'settings.plan': 'Uhlelo: ',
  'settings.upgrade': 'Thuthukisa',
  'settings.devices': 'Amadivayisi',
  'settings.noDevices': 'Awekho amadivayisi atholakele',
  'settings.thisDevice': 'Le Divayisi',
  'settings.platform': 'Inkundla',
  'settings.browser': 'Isiphequluli',
  'settings.network': 'Inethiwekhi',
  'settings.online': 'Ku-inthanethi',
  'settings.offline': 'Ayikho ku-inthanethi',
  'settings.unknown': 'Akwaziwa',
  'settings.logOut': 'Phuma',
  'settings.deleteAccount': 'Susa i-akhawunti',
  'settings.changePasswordModal.title': 'Shintsha Iphasiwedi',
  'settings.changePasswordModal.error': 'Yehlulekile ukushintsha iphasiwedi.',
  'settings.changePasswordModal.currentPassword': 'Iphasiwedi Yamanje',
  'settings.changePasswordModal.newPassword': 'Iphasiwedi Entsha',
  'settings.changePasswordModal.changing': 'Iyashintsha...',
  'settings.deleteAccountModal.title': 'Susa I-akhawunti',
  'settings.deleteAccountModal.warning':
    'Lesi senzo asikwazi ukuhlehliswa. Sicela ufake iphasiwedi yakho ukuze uqinisekise.',
  'settings.deleteAccountModal.password': 'Iphasiwedi',
  'settings.deleteAccountModal.deleting': 'Iyasusa...',
  'settings.changePasswordModal.submit': 'Shintsha iphasiwedi',
  'settings.deleteAccountModal.submit': 'Susa i-akhawunti',
  'settings.failedToUpdateEmail': 'Yehlulekile ukubuyekeza i-imeyili.',
  'settings.failedToDeleteAccount': 'Yehlulekile ukususa i-akhawunti.',
  'settings.toggleTwoFactor': 'Guqula ukufakazela okukabili',
  'settings.togglePushNotifications': 'Guqula izaziso ze-push',

  // Footer
  'footer.about': 'Mayelana ne-{{appName}}',
  'footer.privacyPolicy': 'Inqubomgomo Yobumfihlo',
  'footer.termsOfService': 'Imigomo Yesevisi',
  'footer.language': 'Ulimi',

  // OAuth
  'oauth.orContinueWith': 'Noma qhubeka nge',
  'oauth.continueWith': 'Qhubeka nge-{{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Shintsha ithimu',

  // User Menu
  'userMenu.open': 'Vula imenyu yomsebenzisi',

  // Plan Updated
  'planUpdated.message': 'Uhlelo lwakho lubuyekeziwe.',
  'planUpdated.thankYou': 'Siyabonga!',
  'planUpdated.returnHome': 'Buyela ekhaya',

  // PWA
  'pwa.updateAvailable': 'Inguqulo entsha iyatholakala!',
  'pwa.update': 'Buyekeza',
  'pwa.updating': 'Iyabuyekeza...',

  // User API errors
  'user.error.badRequest': 'Isicelo esingalungile.',
  'user.error.notFound': 'Ayitholakali.',
  'user.error.failedToCreateSession': 'Yehlulekile ukwakha iseshini.',
  'user.error.usernameRequired': 'Igama lomsebenzisi liyadingeka.',
  'user.error.passwordRequired': 'Iphasiwedi iyadingeka.',
  'user.error.emailInvalid': 'I-imeyili ayilungile.',
  'user.error.usernameUnavailable': 'Igama lomsebenzisi alitholakali.',
  'user.error.emailAlreadyRegistered': 'I-imeyili isivele ibhaliswe.',
  'user.error.failedToHashPassword': 'Yehlulekile ukusimba iphasiwedi.',
  'user.error.invalidCredentials': 'Iziqinisekiso ezingavumelekile.',
  'user.error.invalidTwoFactorToken': 'Ithokheni yezinyathelo ezimbili engavumelekile.',
  'user.error.twoFactorVerificationUnavailable':
    'Ukuqinisekiswa kwezinyathelo ezimbili akutholakali.',
  'user.error.loginFailed': 'Ukungena kuhlulekile.',
  'user.error.usernameCannotBeEmpty': 'Igama lomsebenzisi alikwazi ukuba ngeze.',
  'user.error.failedToUpdateUser': 'Yehlulekile ukubuyekeza umsebenzisi.',
  'user.error.failedToDeleteUser': 'Yehlulekile ukususa umsebenzisi.',
  'user.error.failedToReadUser': 'Yehlulekile ukufunda umsebenzisi.',
  'user.error.emailRequired': 'I-imeyili iyadingeka.',
  'user.error.failedToProcessPasswordReset':
    'Yehlulekile ukucubungula ukusetha kabusha iphasiwedi.',
  'user.error.newPasswordRequired': 'Iphasiwedi entsha iyadingeka.',
  'user.error.currentPasswordRequired': 'Iphasiwedi yamanje iyadingeka.',
  'user.error.currentPasswordIncorrect': 'Iphasiwedi yamanje ayilungile.',
  'user.error.failedToUpdatePassword': 'Yehlulekile ukubuyekeza iphasiwedi.',
  'user.error.planKeyRequired': 'i-planKey iyadingeka.',
  'user.error.invalidPlan': 'Uhlelo olungavumelekile.',
  'user.error.failedToUpdateSubscription': 'Yehlulekile ukubuyekeza isithangami.',
  'user.error.failedToUpdatePlan': 'Yehlulekile ukubuyekeza uhlelo.',
  'user.error.twoFactorNotAvailable': 'Ukuqinisekiswa kwezinyathelo ezimbili akutholakali.',
  'user.error.tokenRequired': 'Ithokheni iyadingeka.',
  'user.error.noPendingTwoFactorSetup':
    'Akukho ukumiswa kwezinyathelo ezimbili okulindile. Shayela ngesenzo se-"setup" kuqala.',
  'user.error.invalidToken': 'Ithokheni engavumelekile.',
  'user.error.twoFactorNotEnabled': 'Izinyathelo ezimbili azivulwanga.',
  'user.error.invalidAction':
    'Isenzo esingavumelekile. Sebenzisa "setup", "enable", noma "disable".',
  'user.error.twoFactorOperationFailed': 'Umsebenzi wezinyathelo ezimbili uhlulekile.',
  'user.error.oauthServerNotConfigured': 'Iseva ye-OAuth "{{server}}" ayimisekanga.',
  'user.error.oauthVerificationFailed': 'Ukuqinisekiswa kwe-OAuth kuhlulekile.',
  'user.error.failedToCreateUser': 'Yehlulekile ukwakha umsebenzisi.',
  'user.error.oauthLoginFailed': 'Ukungena nge-OAuth kuhlulekile.',

  // Auth client errors
  'auth.error.requestFailed': 'Isicelo sihlulekile',
  'auth.error.loginFailed': 'Ukungena kuhlulekile',
  'auth.error.registrationFailed': 'Ukubhalisa kuhlulekile',
  'auth.error.noRefreshToken': 'Akukho ithokheni yokuvuselela etholakalayo',

  // Form validation
  'forms.required': 'Lesi sigaba siyadingeka',
  'forms.min': 'Inani kufanele libe okungenani {{min}}',
  'forms.max': 'Inani kufanele libe okungenani {{max}}',
  'forms.minLength': 'Kufanele kube okungenani izinhlamvu {{minLength}}',
  'forms.maxLength': 'Kufanele kube okungenani izinhlamvu {{maxLength}}',
  'forms.invalidFormat': 'Ifomethi engavumelekile',
  'forms.invalidEmail': 'Ikheli le-imeyili elingavumelekile',
  'forms.invalidUrl': 'I-URL engavumelekile',
  'forms.invalidValue': 'Inani elingavumelekile',

  // HTTP client errors
  'http.error.requestFailed': 'Isicelo sihlulekile ngesimo {{status}}.',
  'http.error.networkError': 'Iphutha lenethiwekhi.',

  // Routing errors
  'routing.error.missingParam': 'Ipharamitha "{{name}}" ayitholakalanga kwindlela "{{pattern}}"',
  'routing.error.routeNotFound': 'Indlela "{{name}}" ayitholakalanga',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter kumele isetshenziswe ngaphakathi kwe-MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Izaziso zokuphusha azisekelwe',
  'push.error.permissionNotGranted': 'Imvume yesaziso ayinikezwanga',

  // Utility errors
  'error.networkError': 'Iphutha lenethiwekhi. Sicela uhlole uxhumano lwakho.',
  'error.timeout': 'Isikhathi sesicelo siphelile. Sicela uzame futhi.',
  'error.unauthorized': 'Awuvunyelwe ukwenza lesi senzo.',
  'error.forbidden': 'Ukufinyelela kunqatshiwe.',
  'error.notFound': 'Umthombo awutholakali.',
  'error.validationError': 'Sicela uhlole okufakile bese uzama futhi.',
  'error.serverError': 'Iphutha leseva. Sicela uzame futhi kamuva.',
  'error.unknown': 'Kuvelele iphutha elingalindelekile.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Umlayezo uyadingeka',
  'conversation.error.aiNotConfigured': 'Umhlinzeki we-AI awumisekanga',
  'conversation.error.unknownAiError': 'Iphutha le-AI elingaziwa',
  'conversation.error.notFound': 'Akukho ingxoxo etholakele',
  'conversation.error.streamError': 'Iphutha lokusakaza i-AI',

  // Resource errors
  'resource.error.unknownError': 'Iphutha elingaziwa.',
  'resource.error.unableToCreate': 'Ayikwazi ukwakha i-{{name}}.',
  'resource.error.unableToUpdate': 'Ayikwazi ukubuyekeza i-{{name}}.',
  'resource.error.unableToDelete': 'Ayikwazi ukususa i-{{name}}.',
  'resource.error.notFound': 'Ayitholakali.',
  'resource.error.badRequest': 'Isicelo esingalungile.',
  'resource.error.unauthorized': 'Akuvunyelwe.',

  // Project errors
  'project.error.nameAndTypeRequired': 'igama ne-projectType kuyadingeka',
  'project.error.notFound': 'Ayitholakali',

  // Device errors
  'device.error.unauthorized': 'Akuvunyelwe.',
  'device.error.badRequest': 'Isicelo esingalungile.',
  'device.error.notFound': 'Ayitholakali.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Kwehlulekile ukufunda {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Kwehlulekile ukubhala {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Kwehlulekile ukususa {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Umhlinzeki wokukhokha uyadingeka.',
  'user.payment.subscriptionIdRequired': 'i-subscriptionId iyadingeka.',
  'user.payment.receiptAndPlanRequired': 'i-receipt ne-planKey ziyadingeka.',
  'user.payment.verificationNotConfigured':
    'Ukuqinisekiswa kokukhokha akumisekanga nge-{{provider}}.',
  'user.payment.invalidPlan': 'Uhlelo olungavumelekile.',
  'user.payment.verificationFailed': 'Yehlulekile ukuqinisekisa isithangami.',
  'user.payment.unknownPlan': 'Uhlelo olungaziwa.',
  'user.payment.invalidWebhookEvent': 'Isenzakalo se-webhook esingavumelekile.',
}
