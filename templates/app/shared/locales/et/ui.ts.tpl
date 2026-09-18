/**
 * Estonian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Laadimine...',
  'common.saving': 'Salvestamine...',
  'common.close': 'Sulge',
  'common.goBack': 'Mine tagasi',
  'common.submit': 'Esita',
  'common.continue': 'Jatka',

  // Auth - Login
  'auth.login.email': 'E-post',
  'auth.login.password': 'Parool',
  'auth.login.twoFactor': 'Kaheastmeline token (kui lubatud)',
  'auth.login.signUp': 'Registreeru',
  'auth.login.loggingIn': 'Sisselogimine...',
  'auth.login.logIn': 'Logi sisse',
  'auth.login.forgotPassword': 'Unustasid parooli?',

  // Auth - Signup
  'auth.signup.email': 'E-post (kohustuslik)',
  'auth.signup.password': 'Parool (kohustuslik)',
  'auth.signup.name': 'Sinu nimi',
  'auth.signup.signingUp': 'Registreerimine...',
  'auth.signup.signUp': 'Registreeru',

  // Auth - Forgot Password
  'auth.forgotPassword.success': 'Kui selle e-posti aadressiga konto on olemas, on parooli lähtestamise link saadetud.',
  'auth.forgotPassword.email': 'E-post',
  'auth.forgotPassword.submitting': 'Esitamine...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-post',
  'auth.resetPassword.token': 'Parooli lähtestamise token',
  'auth.resetPassword.newPassword': 'Sisesta uus parool',
  'auth.resetPassword.twoFactor': 'Kaheastmeline token (kui lubatud)',
  'auth.resetPassword.loggingIn': 'Sisselogimine...',
  'auth.resetPassword.submit': 'Määra parool ja logi sisse',

  // Home
  'home.greeting': 'Tere, ',
  'home.world': 'Maailm',

  // Settings
  'settings.account': 'Konto',
  'settings.email': 'E-post',
  'settings.authentication': 'Autentimine',
  'settings.changePassword': 'Muuda parooli',
  'settings.twoFactor': 'Kaheastmeline autentimine',
  'settings.notifications': 'Teavitused',
  'settings.pushNotifications': 'Tõuketeavitused',
  'settings.billing': 'Arveldamine',
  'settings.plan': 'Plaan: ',
  'settings.upgrade': 'Uuenda',
  'settings.devices': 'Seadmed',
  'settings.noDevices': 'Seadmeid ei leitud',
  'settings.thisDevice': 'See seade',
  'settings.platform': 'Platvorm',
  'settings.browser': 'Brauser',
  'settings.network': 'Võrk',
  'settings.online': 'Võrgus',
  'settings.offline': 'Võrgust väljas',
  'settings.unknown': 'Teadmata',
  'settings.logOut': 'Logi välja',
  'settings.deleteAccount': 'Kustuta konto',
  'settings.changePasswordModal.title': 'Muuda parooli',
  'settings.changePasswordModal.error': 'Parooli muutmine ebaõnnestus.',
  'settings.changePasswordModal.currentPassword': 'Praegune parool',
  'settings.changePasswordModal.newPassword': 'Uus parool',
  'settings.changePasswordModal.changing': 'Muutmine...',
  'settings.deleteAccountModal.title': 'Kustuta konto',
  'settings.deleteAccountModal.warning': 'Seda toimingut ei saa tagasi võtta. Kinnitamiseks sisesta oma parool.',
  'settings.deleteAccountModal.password': 'Parool',
  'settings.deleteAccountModal.deleting': 'Kustutamine...',
  'settings.changePasswordModal.submit': 'Muuda parooli',
  'settings.deleteAccountModal.submit': 'Kustuta konto',
  'settings.failedToUpdateEmail': 'E-posti värskendamine ebaõnnestus.',
  'settings.failedToDeleteAccount': 'Konto kustutamine ebaõnnestus.',
  'settings.toggleTwoFactor': 'Lülita kaheastmeline autentimine',
  'settings.togglePushNotifications': 'Lülita tõuketeatised',

  // Footer
  'footer.about': '{{appName}}-st',
  'footer.privacyPolicy': 'Privaatsuspoliitika',
  'footer.termsOfService': 'Teenuse tingimused',
  'footer.language': 'Keel',

  // OAuth
  'oauth.orContinueWith': 'Või jätka kasutades',
  'oauth.continueWith': 'Jätka teenusega {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Vaheta teemat',

  // User Menu
  'userMenu.open': 'Ava kasutajamenüü',

  // Plan Updated
  'planUpdated.message': 'Sinu plaan on uuendatud.',
  'planUpdated.thankYou': 'Aitäh!',
  'planUpdated.returnHome': 'Tagasi avalehele',

  // PWA
  'pwa.updateAvailable': 'Uus versioon saadaval!',
  'pwa.update': 'Uuenda',
  'pwa.updating': 'Uuendamine...',

  // User API errors
  'user.error.badRequest': 'Vigane päring.',
  'user.error.notFound': 'Ei leitud.',
  'user.error.failedToCreateSession': 'Seansi loomine ebaõnnestus.',
  'user.error.usernameRequired': 'Kasutajanimi on nõutav.',
  'user.error.passwordRequired': 'Parool on nõutav.',
  'user.error.emailInvalid': 'E-post on vigane.',
  'user.error.usernameUnavailable': 'Kasutajanimi pole saadaval.',
  'user.error.emailAlreadyRegistered': 'E-post on juba registreeritud.',
  'user.error.failedToHashPassword': 'Parooli räsimine ebaõnnestus.',
  'user.error.invalidCredentials': 'Vigased mandaadid.',
  'user.error.invalidTwoFactorToken': 'Vigane kaheastmelise autentimise token.',
  'user.error.twoFactorVerificationUnavailable': 'Kaheastmeline kinnitamine pole saadaval.',
  'user.error.loginFailed': 'Sisselogimine ebaõnnestus.',
  'user.error.usernameCannotBeEmpty': 'Kasutajanimi ei tohi olla tühi.',
  'user.error.failedToUpdateUser': 'Kasutaja uuendamine ebaõnnestus.',
  'user.error.failedToDeleteUser': 'Kasutaja kustutamine ebaõnnestus.',
  'user.error.failedToReadUser': 'Kasutaja lugemine ebaõnnestus.',
  'user.error.emailRequired': 'E-post on nõutav.',
  'user.error.failedToProcessPasswordReset': 'Parooli lähtestamise töötlemine ebaõnnestus.',
  'user.error.newPasswordRequired': 'Uus parool on nõutav.',
  'user.error.currentPasswordRequired': 'Praegune parool on nõutav.',
  'user.error.currentPasswordIncorrect': 'Praegune parool on vale.',
  'user.error.failedToUpdatePassword': 'Parooli uuendamine ebaõnnestus.',
  'user.error.planKeyRequired': 'planKey on nõutav.',
  'user.error.invalidPlan': 'Vigane plaan.',
  'user.error.failedToUpdateSubscription': 'Tellimuse uuendamine ebaõnnestus.',
  'user.error.failedToUpdatePlan': 'Plaani uuendamine ebaõnnestus.',
  'user.error.twoFactorNotAvailable': 'Kaheastmeline autentimine pole saadaval.',
  'user.error.tokenRequired': 'Token on nõutav.',
  'user.error.noPendingTwoFactorSetup':
    'Ootel kaheastmelise seadistuse puudub. Kutsuge esmalt tegevusega "setup".',
  'user.error.invalidToken': 'Vigane token.',
  'user.error.twoFactorNotEnabled': 'Kaheastmeline autentimine pole lubatud.',
  'user.error.invalidAction': 'Vigane tegevus. Kasutage "setup", "enable" või "disable".',
  'user.error.twoFactorOperationFailed': 'Kaheastmelise autentimise toiming ebaõnnestus.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" pole seadistatud.',
  'user.error.oauthVerificationFailed': 'OAuth kinnitamine ebaõnnestus.',
  'user.error.failedToCreateUser': 'Kasutaja loomine ebaõnnestus.',
  'user.error.oauthLoginFailed': 'OAuth sisselogimine ebaõnnestus.',

  // Auth client errors
  'auth.error.requestFailed': 'Päring ebaõnnestus',
  'auth.error.loginFailed': 'Sisselogimine ebaõnnestus',
  'auth.error.registrationFailed': 'Registreerimine ebaõnnestus',
  'auth.error.noRefreshToken': 'Värskendustoken pole saadaval',

  // Form validation
  'forms.required': 'See väli on kohustuslik',
  'forms.min': 'Väärtus peab olema vähemalt {{min}}',
  'forms.max': 'Väärtus peab olema kõige rohkem {{max}}',
  'forms.minLength': 'Peab olema vähemalt {{minLength}} tähemärki',
  'forms.maxLength': 'Peab olema kõige rohkem {{maxLength}} tähemärki',
  'forms.invalidFormat': 'Vigane vorming',
  'forms.invalidEmail': 'Vigane e-posti aadress',
  'forms.invalidUrl': 'Vigane URL',
  'forms.invalidValue': 'Vigane väärtus',

  // HTTP client errors
  'http.error.requestFailed': 'Päring ebaõnnestus olekuga {{status}}.',
  'http.error.networkError': 'Võrguviga.',

  // Routing errors
  'routing.error.missingParam': 'Puuduv parameeter "{{name}}" teekonna "{{pattern}}" jaoks',
  'routing.error.routeNotFound': 'Marsruuti "{{name}}" ei leitud',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter tuleb kasutada MoleculeRouterProvider sees',

  // Push notification errors
  'push.error.notSupported': 'Tõuketeatised pole toetatud',
  'push.error.permissionNotGranted': 'Teavituse luba ei antud',

  // Utility errors
  'error.networkError': 'Võrguviga. Palun kontrollige ühendust.',
  'error.timeout': 'Päringu ajalõpp. Palun proovige uuesti.',
  'error.unauthorized': 'Teil pole selle toimingu tegemiseks volitust.',
  'error.forbidden': 'Juurdepääs keelatud.',
  'error.notFound': 'Ressurssi ei leitud.',
  'error.validationError': 'Palun kontrollige sisendit ja proovige uuesti.',
  'error.serverError': 'Serveri viga. Palun proovige hiljem uuesti.',
  'error.unknown': 'Ilmnes ootamatu viga.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Sõnum on nõutav',
  'conversation.error.aiNotConfigured': 'AI pakkuja pole seadistatud',
  'conversation.error.unknownAiError': 'Tundmatu AI viga',
  'conversation.error.notFound': 'Vestlust ei leitud',
  'conversation.error.streamError': 'AI voogesituse viga',

  // Resource errors
  'resource.error.unknownError': 'Tundmatu viga.',
  'resource.error.unableToCreate': 'Ei saa luua {{name}}.',
  'resource.error.unableToUpdate': 'Ei saa uuendada {{name}}.',
  'resource.error.unableToDelete': 'Ei saa kustutada {{name}}.',
  'resource.error.notFound': 'Ei leitud.',
  'resource.error.badRequest': 'Vigane päring.',
  'resource.error.unauthorized': 'Volitamata.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Nimi ja projectType on nõutavad',
  'project.error.notFound': 'Ei leitud',

  // Device errors
  'device.error.unauthorized': 'Volitamata.',
  'device.error.badRequest': 'Vigane päring.',
  'device.error.notFound': 'Ei leitud.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} lugemine ebaõnnestus: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} kirjutamine ebaõnnestus: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} kustutamine ebaõnnestus: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Makseteenuse pakkuja on nõutav.',
  'user.payment.subscriptionIdRequired': 'subscriptionId on nõutav.',
  'user.payment.receiptAndPlanRequired': 'Kviitung ja planKey on nõutavad.',
  'user.payment.verificationNotConfigured':
    'Makse kinnitamine pole seadistatud teenusele {{provider}}.',
  'user.payment.invalidPlan': 'Vigane plaan.',
  'user.payment.verificationFailed': 'Tellimuse kinnitamine ebaõnnestus.',
  'user.payment.unknownPlan': 'Tundmatu plaan.',
  'user.payment.invalidWebhookEvent': 'Vigane webhooki sündmus.',
}
