/**
 * Maltese translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Jitgħabba...',
  'common.saving': 'Qed jiġi ssejvjat...',
  'common.close': 'Agħlaq',
  'common.goBack': 'Mur lura',
  'common.submit': 'Ibgħat',
  'common.continue': 'Kompli',

  // Auth - Login
  'auth.login.email': 'Email',
  'auth.login.password': 'Password',
  'auth.login.twoFactor': 'Token ta\' żewġ fatturi (Jekk attivat)',
  'auth.login.signUp': 'Irreġistra',
  'auth.login.loggingIn': 'Qed tidħol...',
  'auth.login.logIn': 'Idħol',
  'auth.login.forgotPassword': 'Insejt il-password?',

  // Auth - Signup
  'auth.signup.email': 'Email (Meħtieġ)',
  'auth.signup.password': 'Password (Meħtieġ)',
  'auth.signup.name': 'Ismek',
  'auth.signup.signingUp': 'Qed tirreġistra...',
  'auth.signup.signUp': 'Irreġistra',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Jekk jeżisti kont b\'dak l-email, intbagħtet link biex tirrisettja l-password.',
  'auth.forgotPassword.email': 'Email',
  'auth.forgotPassword.submitting': 'Qed jintbagħat...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Email',
  'auth.resetPassword.token': 'Token tar-reset tal-password',
  'auth.resetPassword.newPassword': 'Daħħal password ġdid',
  'auth.resetPassword.twoFactor': 'Token ta\' żewġ fatturi (Jekk attivat)',
  'auth.resetPassword.loggingIn': 'Qed tidħol...',
  'auth.resetPassword.submit': 'Issettja l-password u dħol',

  // Home
  'home.greeting': 'Bonġu, ',
  'home.world': 'Dinja',

  // Settings
  'settings.account': 'Kont',
  'settings.email': 'Email',
  'settings.authentication': 'Awtentikazzjoni',
  'settings.changePassword': 'Ibdel il-password',
  'settings.twoFactor': 'Awtentikazzjoni ta\' żewġ fatturi',
  'settings.notifications': 'Notifiki',
  'settings.pushNotifications': 'Notifiki push',
  'settings.billing': 'Kontijiet',
  'settings.plan': 'Pjan: ',
  'settings.upgrade': 'Agħmel upgrade',
  'settings.devices': 'Apparat',
  'settings.noDevices': 'L-ebda apparat ma nstab',
  'settings.thisDevice': 'Dan l-apparat',
  'settings.platform': 'Pjattaforma',
  'settings.browser': 'Browser',
  'settings.network': 'Network',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Mhux magħruf',
  'settings.logOut': 'Oħroġ',
  'settings.deleteAccount': 'Ħassar il-kont',
  'settings.changePasswordModal.title': 'Ibdel il-password',
  'settings.changePasswordModal.error': 'Ma rnexxiex jinbidel il-password.',
  'settings.changePasswordModal.currentPassword': 'Password attwali',
  'settings.changePasswordModal.newPassword': 'Password ġdida',
  'settings.changePasswordModal.changing': 'Qed jinbidel...',
  'settings.deleteAccountModal.title': 'Ħassar il-kont',
  'settings.deleteAccountModal.warning':
    'Din l-azzjoni ma tistax tiġi lura minnha. Daħħal il-password tiegħek biex tikkonferma.',
  'settings.deleteAccountModal.password': 'Password',
  'settings.deleteAccountModal.deleting': 'Qed jitħassar...',
  'settings.changePasswordModal.submit': 'Ibdel il-password',
  'settings.deleteAccountModal.submit': 'Ħassar il-kont',
  'settings.failedToUpdateEmail': 'Ma rnexxiex taġġorna l-email.',
  'settings.failedToDeleteAccount': 'Ma rnexxiex tħassar il-kont.',
  'settings.toggleTwoFactor': 'Ibdel l-awtentikazzjoni b\'żewġ fatturi',
  'settings.togglePushNotifications': 'Ibdel in-notifiki push',

  // Footer
  'footer.about': 'Dwar {{appName}}',
  'footer.privacyPolicy': 'Politika tal-privatezza',
  'footer.termsOfService': 'Termini tas-servizz',
  'footer.language': 'Lingwa',

  // OAuth
  'oauth.orContinueWith': 'Jew kompli permezz ta\'',
  'oauth.continueWith': 'Kompli permezz ta\' {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Ibdel it-tema',

  // User Menu
  'userMenu.open': 'Iftaħ il-menu tal-utent',

  // Plan Updated
  'planUpdated.message': 'Il-pjan tiegħek ġie aġġornat.',
  'planUpdated.thankYou': 'Grazzi!',
  'planUpdated.returnHome': 'Mur lura għad-dar',

  // PWA
  'pwa.updateAvailable': 'Verżjoni ġdida disponibbli!',
  'pwa.update': 'Aġġorna',
  'pwa.updating': "Qed jiġi aġġornat...",

  // User API errors
  'user.error.badRequest': 'Talba hazina.',
  'user.error.notFound': 'Ma nstabx.',
  'user.error.failedToCreateSession': 'Ma rnexxiex tohlok sessjoni.',
  'user.error.usernameRequired': 'Username mehtieg.',
  'user.error.passwordRequired': 'Password mehtiegha.',
  'user.error.emailInvalid': 'Email invalidu.',
  'user.error.usernameUnavailable': 'Username mhux disponibbli.',
  'user.error.emailAlreadyRegistered': 'Email diga registrat.',
  'user.error.failedToHashPassword': 'Ma rnexxiex tghamel hash tal-password.',
  'user.error.invalidCredentials': 'Kredenzjali invalidi.',
  'user.error.invalidTwoFactorToken': "Token ta' zewg fatturi invalidu.",
  'user.error.twoFactorVerificationUnavailable': "Verifika ta' zewg fatturi mhijiex disponibbli.",
  'user.error.loginFailed': 'Id-dhul falla.',
  'user.error.usernameCannotBeEmpty': 'Username ma jistax ikun vojt.',
  'user.error.failedToUpdateUser': 'Ma rnexxiex taggorna l-utent.',
  'user.error.failedToDeleteUser': 'Ma rnexxiex thasssar l-utent.',
  'user.error.failedToReadUser': 'Ma rnexxiex taqra l-utent.',
  'user.error.emailRequired': 'Email mehtieg.',
  'user.error.failedToProcessPasswordReset': 'Ma rnexxiex tipprocessa r-reset tal-password.',
  'user.error.newPasswordRequired': 'Password gdida mehtiegha.',
  'user.error.currentPasswordRequired': 'Password attwali mehtiegha.',
  'user.error.currentPasswordIncorrect': 'Password attwali mhijiex korretta.',
  'user.error.failedToUpdatePassword': 'Ma rnexxiex taggorna l-password.',
  'user.error.planKeyRequired': 'planKey mehtieg.',
  'user.error.invalidPlan': 'Pjan invalidu.',
  'user.error.failedToUpdateSubscription': 'Ma rnexxiex taggorna l-abbonament.',
  'user.error.failedToUpdatePlan': 'Ma rnexxiex taggorna l-pjan.',
  'user.error.twoFactorNotAvailable': "Awtentikazzjoni ta' zewg fatturi mhijiex disponibbli.",
  'user.error.tokenRequired': 'Token mehtieg.',
  'user.error.noPendingTwoFactorSetup':
    'Ebda setup ta\' zewg fatturi pendenti. Sejjah bl-azzjoni "setup" l-ewwel.',
  'user.error.invalidToken': 'Token invalidu.',
  'user.error.twoFactorNotEnabled': 'Zewg fatturi mhux attivati.',
  'user.error.invalidAction': 'Azzjoni invalida. Uza "setup", "enable", jew "disable".',
  'user.error.twoFactorOperationFailed': "Operazzjoni ta' zewg fatturi falliet.",
  'user.error.oauthServerNotConfigured': 'Server OAuth "{{server}}" mhux konfigurat.',
  'user.error.oauthVerificationFailed': 'Verifika OAuth falliet.',
  'user.error.failedToCreateUser': 'Ma rnexxiex tohlok utent.',
  'user.error.oauthLoginFailed': 'Dhul OAuth falla.',

  // Auth client errors
  'auth.error.requestFailed': 'It-talba falliet',
  'auth.error.loginFailed': 'Id-dhul falla',
  'auth.error.registrationFailed': 'Ir-registrazzjoni falliet',
  'auth.error.noRefreshToken': "Ebda token ta' aggornament disponibbli",

  // Form validation
  'forms.required': 'Dan il-kamp huwa meħtieġ',
  'forms.min': 'Il-valur irid ikun tal-inqas {{min}}',
  'forms.max': 'Il-valur irid ikun l-aktar {{max}}',
  'forms.minLength': 'Irid ikollu tal-inqas {{minLength}} karattru',
  'forms.maxLength': 'Irid ikollu l-aktar {{maxLength}} karattru',
  'forms.invalidFormat': 'Format invalidu',
  'forms.invalidEmail': 'Indirizz tal-email invalidu',
  'forms.invalidUrl': 'URL invalidu',
  'forms.invalidValue': 'Valur invalidu',

  // HTTP client errors
  'http.error.requestFailed': 'It-talba falliet bi stat {{status}}.',
  'http.error.networkError': 'Zball tan-netwerk.',

  // Routing errors
  'routing.error.missingParam': 'Parametru neqsin "{{name}}" ghar-rotta "{{pattern}}"',
  'routing.error.routeNotFound': 'Ir-rotta "{{name}}" ma nstabitx',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter irid jintuża ġo MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push notifications mhumiex supportati',
  'push.error.permissionNotGranted': "Permess ta' notifika mhux moghti",

  // Utility errors
  'error.networkError': 'Zball tan-netwerk. Icciekkja l-konnessjoni tieghek.',
  'error.timeout': "It-talba skadiet. Erga' pprova.",
  'error.unauthorized': "M'intix awtorizzat taghmel dan.",
  'error.forbidden': 'Access michud.',
  'error.notFound': 'Rizors ma nstabx.',
  'error.validationError': "Icciekkja l-input tieghek u erga' pprova.",
  'error.serverError': "Zball tas-server. Erga' pprova iktar tard.",
  'error.unknown': 'Sehhet zball mhux mistenni.',

  // AI conversation errors
  'conversation.error.messageRequired': 'messaGG mehtieg',
  'conversation.error.aiNotConfigured': 'Provajder AI mhux konfigurat',
  'conversation.error.unknownAiError': 'Zball AI mhux maghruf',
  'conversation.error.notFound': 'Ebda konversazzjoni ma nstabet',
  'conversation.error.streamError': 'Zball tal-istreaming AI',

  // Resource errors
  'resource.error.unknownError': 'Zball mhux maghruf.',
  'resource.error.unableToCreate': 'Ma setghetx tohlok {{name}}.',
  'resource.error.unableToUpdate': 'Ma setghetx taggorna {{name}}.',
  'resource.error.unableToDelete': 'Ma setghetx thasssar {{name}}.',
  'resource.error.notFound': 'Ma nstabx.',
  'resource.error.badRequest': 'Talba hazina.',
  'resource.error.unauthorized': 'Mhux awtorizzat.',

  // Project errors
  'project.error.nameAndTypeRequired': 'isem u projectType mehtieghin',
  'project.error.notFound': 'Ma nstabx',

  // Device errors
  'device.error.unauthorized': 'Mhux awtorizzat.',
  'device.error.badRequest': 'Talba ħażina.',
  'device.error.notFound': 'Ma nstabx.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': "Falla fil-qari ta' {{path}}: {{error}}",
  'codeSandbox.docker.error.writeFailed': "Falla fil-kitba ta' {{path}}: {{error}}",
  'codeSandbox.docker.error.deleteFailed': "Falla fit-thassir ta' {{path}}: {{error}}",
  'codeSandbox.docker.error.apiError':
    "Zball fl-API ta' Docker {{method}} {{path}}: {{status}} {{error}}",

  // Payment errors
  'user.payment.providerRequired': 'Il-fornitur tal-pagament mehtieg.',
  'user.payment.subscriptionIdRequired': 'subscriptionId mehtieg.',
  'user.payment.receiptAndPlanRequired': 'receipt u planKey mehtieghin.',
  'user.payment.verificationNotConfigured':
    'Il-verifika tal-pagament mhijiex konfigurata ghal {{provider}}.',
  'user.payment.invalidPlan': 'Pjan invalidu.',
  'user.payment.verificationFailed': 'Il-verifika tal-abbonament falliet.',
  'user.payment.unknownPlan': 'Pjan mhux maghruf.',
  'user.payment.invalidWebhookEvent': 'Avveniment webhook invalidu.',
}
