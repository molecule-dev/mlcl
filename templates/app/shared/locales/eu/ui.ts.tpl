/**
 * Basque translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Kargatzen...',
  'common.saving': 'Gordetzen...',
  'common.close': 'Itxi',
  'common.goBack': 'Atzera',
  'common.submit': 'Bidali',
  'common.continue': 'Jarraitu',

  // Auth - Login
  'auth.login.email': 'Emaila',
  'auth.login.password': 'Pasahitza',
  'auth.login.twoFactor': 'Bi faktoreko kodea (Gaituta badago)',
  'auth.login.signUp': 'Erregistratu',
  'auth.login.loggingIn': 'Saioa hasten...',
  'auth.login.logIn': 'Hasi saioa',
  'auth.login.forgotPassword': 'Pasahitza ahaztu duzu?',

  // Auth - Signup
  'auth.signup.email': 'Emaila (Beharrezkoa)',
  'auth.signup.password': 'Pasahitza (Beharrezkoa)',
  'auth.signup.name': 'Zure izena',
  'auth.signup.signingUp': 'Erregistratzen...',
  'auth.signup.signUp': 'Erregistratu',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Email horrekin kontua existitzen bada, pasahitza berrezartzeko esteka bidali da.',
  'auth.forgotPassword.email': 'Emaila',
  'auth.forgotPassword.submitting': 'Bidaltzen...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Emaila',
  'auth.resetPassword.token': 'Pasahitza berrezartzeko kodea',
  'auth.resetPassword.newPassword': 'Sartu pasahitz berria',
  'auth.resetPassword.twoFactor': 'Bi faktoreko kodea (Gaituta badago)',
  'auth.resetPassword.loggingIn': 'Saioa hasten...',
  'auth.resetPassword.submit': 'Ezarri pasahitza eta hasi saioa',

  // Home
  'home.greeting': 'Kaixo, ',
  'home.world': 'Mundua',

  // Settings
  'settings.account': 'Kontua',
  'settings.email': 'Emaila',
  'settings.authentication': 'Autentifikazioa',
  'settings.changePassword': 'Aldatu pasahitza',
  'settings.twoFactor': 'Bi faktoreko autentifikazioa',
  'settings.notifications': 'Jakinarazpenak',
  'settings.pushNotifications': 'Push jakinarazpenak',
  'settings.billing': 'Fakturazioa',
  'settings.plan': 'Plana: ',
  'settings.upgrade': 'Hobetu',
  'settings.devices': 'Gailuak',
  'settings.noDevices': 'Ez da gailurik aurkitu',
  'settings.thisDevice': 'Gailu hau',
  'settings.platform': 'Plataforma',
  'settings.browser': 'Nabigatzailea',
  'settings.network': 'Sarea',
  'settings.online': 'Linean',
  'settings.offline': 'Lineaz kanpo',
  'settings.unknown': 'Ezezaguna',
  'settings.logOut': 'Amaitu saioa',
  'settings.deleteAccount': 'Ezabatu kontua',
  'settings.changePasswordModal.title': 'Aldatu pasahitza',
  'settings.changePasswordModal.error': 'Ezin izan da pasahitza aldatu.',
  'settings.changePasswordModal.currentPassword': 'Uneko pasahitza',
  'settings.changePasswordModal.newPassword': 'Pasahitz berria',
  'settings.changePasswordModal.changing': 'Aldatzen...',
  'settings.deleteAccountModal.title': 'Ezabatu kontua',
  'settings.deleteAccountModal.warning':
    'Ekintza hau ezin da desegin. Sartu zure pasahitza berresteko.',
  'settings.deleteAccountModal.password': 'Pasahitza',
  'settings.deleteAccountModal.deleting': 'Ezabatzen...',
  'settings.changePasswordModal.submit': 'Aldatu pasahitza',
  'settings.deleteAccountModal.submit': 'Ezabatu kontua',
  'settings.failedToUpdateEmail': 'Ezin izan da e-posta eguneratu.',
  'settings.failedToDeleteAccount': 'Ezin izan da kontua ezabatu.',
  'settings.toggleTwoFactor': 'Txandakatu bi faktoreko autentifikazioa',
  'settings.togglePushNotifications': 'Txandakatu push jakinarazpenak',

  // Footer
  'footer.about': '{{appName}}-ri buruz',
  'footer.privacyPolicy': 'Pribatutasun politika',
  'footer.termsOfService': 'Zerbitzu baldintzak',
  'footer.language': 'Hizkuntza',

  // OAuth
  'oauth.orContinueWith': 'Edo jarraitu honekin',
  'oauth.continueWith': 'Jarraitu {{provider}}-(e)kin',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Aldatu gaia',

  // User Menu
  'userMenu.open': 'Ireki erabiltzaile menua',

  // Plan Updated
  'planUpdated.message': 'Zure plana eguneratu da.',
  'planUpdated.thankYou': 'Eskerrik asko!',
  'planUpdated.returnHome': 'Itzuli hasierara',

  // PWA
  'pwa.updateAvailable': 'Bertsio berria eskuragarri!',
  'pwa.update': 'Eguneratu',
  'pwa.updating': 'Eguneratzen...',

  // User API errors
  'user.error.badRequest': 'Eskaera okerra.',
  'user.error.notFound': 'Ez da aurkitu.',
  'user.error.failedToCreateSession': 'Ezin izan da saioa sortu.',
  'user.error.usernameRequired': 'Erabiltzaile-izena beharrezkoa da.',
  'user.error.passwordRequired': 'Pasahitza beharrezkoa da.',
  'user.error.emailInvalid': 'Helbide elektronikoa baliogabea da.',
  'user.error.usernameUnavailable': 'Erabiltzaile-izena ez dago erabilgarri.',
  'user.error.emailAlreadyRegistered': 'Helbide elektronikoa dagoeneko erregistratuta dago.',
  'user.error.failedToHashPassword': 'Ezin izan da pasahitza enkriptatu.',
  'user.error.invalidCredentials': 'Kredentzial baliogabeak.',
  'user.error.invalidTwoFactorToken': 'Bi faktoreko token baliogabea.',
  'user.error.twoFactorVerificationUnavailable': 'Bi faktoreko egiaztapena ez dago erabilgarri.',
  'user.error.loginFailed': 'Saioa hasteak huts egin du.',
  'user.error.usernameCannotBeEmpty': 'Erabiltzaile-izena ezin da hutsik egon.',
  'user.error.failedToUpdateUser': 'Ezin izan da erabiltzailea eguneratu.',
  'user.error.failedToDeleteUser': 'Ezin izan da erabiltzailea ezabatu.',
  'user.error.failedToReadUser': 'Ezin izan da erabiltzailea irakurri.',
  'user.error.emailRequired': 'Helbide elektronikoa beharrezkoa da.',
  'user.error.failedToProcessPasswordReset': 'Ezin izan da pasahitzaren berrezarpena prozesatu.',
  'user.error.newPasswordRequired': 'Pasahitz berria beharrezkoa da.',
  'user.error.currentPasswordRequired': 'Uneko pasahitza beharrezkoa da.',
  'user.error.currentPasswordIncorrect': 'Uneko pasahitza okerra da.',
  'user.error.failedToUpdatePassword': 'Ezin izan da pasahitza eguneratu.',
  'user.error.planKeyRequired': 'planKey beharrezkoa da.',
  'user.error.invalidPlan': 'Plan baliogabea.',
  'user.error.failedToUpdateSubscription': 'Ezin izan da harpidetza eguneratu.',
  'user.error.failedToUpdatePlan': 'Ezin izan da plana eguneratu.',
  'user.error.twoFactorNotAvailable': 'Bi faktoreko autentifikazioa ez dago erabilgarri.',
  'user.error.tokenRequired': 'Tokena beharrezkoa da.',
  'user.error.noPendingTwoFactorSetup':
    'Ez dago bi faktoreko konfigurazio zain. Deitu lehenik "setup" ekintzarekin.',
  'user.error.invalidToken': 'Token baliogabea.',
  'user.error.twoFactorNotEnabled': 'Bi faktorekoa ez dago gaituta.',
  'user.error.invalidAction': 'Ekintza baliogabea. Erabili "setup", "enable" edo "disable".',
  'user.error.twoFactorOperationFailed': 'Bi faktoreko eragiketak huts egin du.',
  'user.error.oauthServerNotConfigured': 'OAuth zerbitzaria "{{server}}" ez dago konfiguratuta.',
  'user.error.oauthVerificationFailed': 'OAuth egiaztapenak huts egin du.',
  'user.error.failedToCreateUser': 'Ezin izan da erabiltzailea sortu.',
  'user.error.oauthLoginFailed': 'OAuth saio-hasierak huts egin du.',

  // Auth client errors
  'auth.error.requestFailed': 'Eskaerak huts egin du',
  'auth.error.loginFailed': 'Saioa hasteak huts egin du',
  'auth.error.registrationFailed': 'Erregistroak huts egin du',
  'auth.error.noRefreshToken': 'Ez dago freskatze-tokenik erabilgarri',

  // Form validation
  'forms.required': 'Eremu hau nahitaezkoa da',
  'forms.min': 'Balioak gutxienez {{min}} izan behar du',
  'forms.max': 'Balioak gehienez {{max}} izan behar du',
  'forms.minLength': 'Gutxienez {{minLength}} karaktere izan behar ditu',
  'forms.maxLength': 'Gehienez {{maxLength}} karaktere izan behar ditu',
  'forms.invalidFormat': 'Formatu baliogabea',
  'forms.invalidEmail': 'Helbide elektroniko baliogabea',
  'forms.invalidUrl': 'URL baliogabea',
  'forms.invalidValue': 'Balio baliogabea',

  // HTTP client errors
  'http.error.requestFailed': 'Eskaerak huts egin du {{status}} egoerarekin.',
  'http.error.networkError': 'Sare-errorea.',

  // Routing errors
  'routing.error.missingParam': '"{{name}}" parametroa falta da "{{pattern}}" biderako',
  'routing.error.routeNotFound': '"{{name}}" bidea ez da aurkitu',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider baten barruan erabili behar da',

  // Push notification errors
  'push.error.notSupported': 'Push jakinarazpenak ez dira bateragarriak',
  'push.error.permissionNotGranted': 'Jakinarazpen-baimena ez da eman',

  // Utility errors
  'error.networkError': 'Sare-errorea. Mesedez, egiaztatu zure konexioa.',
  'error.timeout': 'Eskaeraren denbora-muga gainditu da. Mesedez, saiatu berriro.',
  'error.unauthorized': 'Ez duzu baimenik ekintza hau burutzeko.',
  'error.forbidden': 'Sarbidea ukatua.',
  'error.notFound': 'Baliabidea ez da aurkitu.',
  'error.validationError': 'Mesedez, egiaztatu zure datuak eta saiatu berriro.',
  'error.serverError': 'Zerbitzari-errorea. Mesedez, saiatu berriro geroago.',
  'error.unknown': 'Ustekabeko errore bat gertatu da.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Mezua beharrezkoa da',
  'conversation.error.aiNotConfigured': 'AA hornitzailea ez dago konfiguratuta',
  'conversation.error.unknownAiError': 'AA errore ezezaguna',
  'conversation.error.notFound': 'Ez da elkarrizketarik aurkitu',
  'conversation.error.streamError': 'AA streaming errorea',

  // Resource errors
  'resource.error.unknownError': 'Errore ezezaguna.',
  'resource.error.unableToCreate': 'Ezin izan da {{name}} sortu.',
  'resource.error.unableToUpdate': 'Ezin izan da {{name}} eguneratu.',
  'resource.error.unableToDelete': 'Ezin izan da {{name}} ezabatu.',
  'resource.error.notFound': 'Ez da aurkitu.',
  'resource.error.badRequest': 'Eskaera okerra.',
  'resource.error.unauthorized': 'Baimenik gabe.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Izena eta proiektu-mota beharrezkoak dira',
  'project.error.notFound': 'Ez da aurkitu',

  // Device errors
  'device.error.unauthorized': 'Baimenik gabe.',
  'device.error.badRequest': 'Eskaera okerra.',
  'device.error.notFound': 'Ez da aurkitu.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Huts egin du {{path}} irakurtzean: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Huts egin du {{path}} idaztean: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Huts egin du {{path}} ezabatzean: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Ordainketa-hornitzailea beharrezkoa da.',
  'user.payment.subscriptionIdRequired': 'subscriptionId beharrezkoa da.',
  'user.payment.receiptAndPlanRequired': 'receipt eta planKey beharrezkoak dira.',
  'user.payment.verificationNotConfigured':
    'Ordainketa egiaztapena ez dago konfiguratuta {{provider}}-rako.',
  'user.payment.invalidPlan': 'Plan baliogabea.',
  'user.payment.verificationFailed': 'Ezin izan da harpidetza egiaztatu.',
  'user.payment.unknownPlan': 'Plan ezezaguna.',
  'user.payment.invalidWebhookEvent': 'Webhook gertaera baliogabea.',
}
