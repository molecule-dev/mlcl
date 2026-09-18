/**
 * Latvian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Ielāde...',
  'common.saving': 'Saglabāšana...',
  'common.close': 'Aizvērt',
  'common.goBack': 'Atgriezties',
  'common.submit': 'Iesniegt',
  'common.continue': 'Turpināt',

  // Auth - Login
  'auth.login.email': 'E-pasts',
  'auth.login.password': 'Parole',
  'auth.login.twoFactor': 'Divfaktoru tokens (ja iespējots)',
  'auth.login.signUp': 'Reģistrēties',
  'auth.login.loggingIn': 'Pieslēgšanās...',
  'auth.login.logIn': 'Pieslēgties',
  'auth.login.forgotPassword': 'Aizmirsāt paroli?',

  // Auth - Signup
  'auth.signup.email': 'E-pasts (obligāts)',
  'auth.signup.password': 'Parole (obligāta)',
  'auth.signup.name': 'Jūsu vārds',
  'auth.signup.signingUp': 'Reģistrēšana...',
  'auth.signup.signUp': 'Reģistrēties',

  // Auth - Forgot Password
  'auth.forgotPassword.success': 'Ja konts ar šo e-pasta adresi pastāv, paroles atiestatīšanas saite ir nosūtīta.',
  'auth.forgotPassword.email': 'E-pasts',
  'auth.forgotPassword.submitting': 'Iesniegšana...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-pasts',
  'auth.resetPassword.token': 'Paroles atiestatīšanas tokens',
  'auth.resetPassword.newPassword': 'Ievadiet jaunu paroli',
  'auth.resetPassword.twoFactor': 'Divfaktoru tokens (ja iespējots)',
  'auth.resetPassword.loggingIn': 'Pieslēgšanās...',
  'auth.resetPassword.submit': 'Iestatīt paroli un pieslēgties',

  // Home
  'home.greeting': 'Sveiki, ',
  'home.world': 'Pasaule',

  // Settings
  'settings.account': 'Konts',
  'settings.email': 'E-pasts',
  'settings.authentication': 'Autentifikācija',
  'settings.changePassword': 'Mainīt paroli',
  'settings.twoFactor': 'Divfaktoru autentifikācija',
  'settings.notifications': 'Paziņojumi',
  'settings.pushNotifications': 'Push paziņojumi',
  'settings.billing': 'Norēķini',
  'settings.plan': 'Plāns: ',
  'settings.upgrade': 'Uzlabot',
  'settings.devices': 'Ierīces',
  'settings.noDevices': 'Ierīces nav atrastas',
  'settings.thisDevice': 'Šī ierīce',
  'settings.platform': 'Platforma',
  'settings.browser': 'Pārlūks',
  'settings.network': 'Tīkls',
  'settings.online': 'Tiešsaistē',
  'settings.offline': 'Bezsaistē',
  'settings.unknown': 'Nezināms',
  'settings.logOut': 'Izrakstīties',
  'settings.deleteAccount': 'Dzēst kontu',
  'settings.changePasswordModal.title': 'Mainīt paroli',
  'settings.changePasswordModal.error': 'Neizdevās mainīt paroli.',
  'settings.changePasswordModal.currentPassword': 'Pašreizējā parole',
  'settings.changePasswordModal.newPassword': 'Jaunā parole',
  'settings.changePasswordModal.changing': 'Mainīšana...',
  'settings.deleteAccountModal.title': 'Dzēst kontu',
  'settings.deleteAccountModal.warning': 'Šo darbību nevar atsaukt. Lūdzu, ievadiet savu paroli, lai apstiprinātu.',
  'settings.deleteAccountModal.password': 'Parole',
  'settings.deleteAccountModal.deleting': 'Dzēšana...',
  'settings.changePasswordModal.submit': 'Mainīt paroli',
  'settings.deleteAccountModal.submit': 'Dzēst kontu',
  'settings.failedToUpdateEmail': 'Neizdevās atjaunināt e-pastu.',
  'settings.failedToDeleteAccount': 'Neizdevās dzēst kontu.',
  'settings.toggleTwoFactor': 'Pārslēgt divfaktoru autentifikāciju',
  'settings.togglePushNotifications': 'Pārslēgt push paziņojumus',

  // Footer
  'footer.about': 'Par {{appName}}',
  'footer.privacyPolicy': 'Privātuma politika',
  'footer.termsOfService': 'Pakalpojumu noteikumi',
  'footer.language': 'Valoda',

  // OAuth
  'oauth.orContinueWith': 'Vai turpināt ar',
  'oauth.continueWith': 'Turpināt ar {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Pārslēgt motīvu',

  // User Menu
  'userMenu.open': 'Atvērt lietotāja izvēlni',

  // Plan Updated
  'planUpdated.message': 'Jūsu plāns ir atjaunināts.',
  'planUpdated.thankYou': 'Paldies!',
  'planUpdated.returnHome': 'Atgriezties sākumlapā',

  // PWA
  'pwa.updateAvailable': 'Jauna versija pieejama!',
  'pwa.update': 'Atjaunināt',
  'pwa.updating': 'Atjaunina...',

  // User API errors
  'user.error.badRequest': 'Slikts pieprasījums.',
  'user.error.notFound': 'Nav atrasts.',
  'user.error.failedToCreateSession': 'Neizdevās izveidot sesiju.',
  'user.error.usernameRequired': 'Nepieciešams lietotājvārds.',
  'user.error.passwordRequired': 'Nepieciešama parole.',
  'user.error.emailInvalid': 'E-pasts nav derīgs.',
  'user.error.usernameUnavailable': 'Lietotājvārds nav pieejams.',
  'user.error.emailAlreadyRegistered': 'E-pasts jau reģistrēts.',
  'user.error.failedToHashPassword': 'Neizdevās jaukt paroli.',
  'user.error.invalidCredentials': 'Nederīgi akreditācijas dati.',
  'user.error.invalidTwoFactorToken': 'Nederīgs divfaktoru žetons.',
  'user.error.twoFactorVerificationUnavailable': 'Divfaktoru verifikācija nav pieejama.',
  'user.error.loginFailed': 'Pieteikšanās neizdevās.',
  'user.error.usernameCannotBeEmpty': 'Lietotājvārds nevar būt tukšs.',
  'user.error.failedToUpdateUser': 'Neizdevās atjaunināt lietotāju.',
  'user.error.failedToDeleteUser': 'Neizdevās dzēst lietotāju.',
  'user.error.failedToReadUser': 'Neizdevās nolasīt lietotāju.',
  'user.error.emailRequired': 'Nepieciešams e-pasts.',
  'user.error.failedToProcessPasswordReset': 'Neizdevās apstrādāt paroles atiestatīšanu.',
  'user.error.newPasswordRequired': 'Nepieciešama jauna parole.',
  'user.error.currentPasswordRequired': 'Nepieciešama pašreizējā parole.',
  'user.error.currentPasswordIncorrect': 'Pašreizējā parole ir nepareiza.',
  'user.error.failedToUpdatePassword': 'Neizdevās atjaunināt paroli.',
  'user.error.planKeyRequired': 'Nepieciešams planKey.',
  'user.error.invalidPlan': 'Nederīgs plāns.',
  'user.error.failedToUpdateSubscription': 'Neizdevās atjaunināt abonēšanu.',
  'user.error.failedToUpdatePlan': 'Neizdevās atjaunināt plānu.',
  'user.error.twoFactorNotAvailable': 'Divfaktoru autentifikācija nav pieejama.',
  'user.error.tokenRequired': 'Nepieciešams žetons.',
  'user.error.noPendingTwoFactorSetup':
    'Nav gaidošu divfaktoru iestatīšanu. Izsauciet ar darbību "setup".',
  'user.error.invalidToken': 'Nederīgs žetons.',
  'user.error.twoFactorNotEnabled': 'Divfaktoru autentifikācija nav iespējota.',
  'user.error.invalidAction': 'Nederīga darbība. Izmantojiet "setup", "enable" vai "disable".',
  'user.error.twoFactorOperationFailed': 'Divfaktoru operācija neizdevās.',
  'user.error.oauthServerNotConfigured': 'OAuth serveris "{{server}}" nav konfigurēts.',
  'user.error.oauthVerificationFailed': 'OAuth verifikācija neizdevās.',
  'user.error.failedToCreateUser': 'Neizdevās izveidot lietotāju.',
  'user.error.oauthLoginFailed': 'OAuth pieteikšanās neizdevās.',

  // Auth client errors
  'auth.error.requestFailed': 'Pieprasījums neizdevās',
  'auth.error.loginFailed': 'Pieteikšanās neizdevās',
  'auth.error.registrationFailed': 'Reģistrācija neizdevās',
  'auth.error.noRefreshToken': 'Nav pieejams atjaunošanas žetons',

  // Form validation
  'forms.required': 'Šis lauks ir obligāts',
  'forms.min': 'Vērtībai jābūt vismaz {{min}}',
  'forms.max': 'Vērtībai jābūt ne vairāk kā {{max}}',
  'forms.minLength': 'Jābūt vismaz {{minLength}} rakstzīmēm',
  'forms.maxLength': 'Jābūt ne vairāk kā {{maxLength}} rakstzīmēm',
  'forms.invalidFormat': 'Nederīgs formāts',
  'forms.invalidEmail': 'Nederīga e-pasta adrese',
  'forms.invalidUrl': 'Nederīgs URL',
  'forms.invalidValue': 'Nederīga vērtība',

  // HTTP client errors
  'http.error.requestFailed': 'Pieprasījums neizdevās ar statusu {{status}}.',
  'http.error.networkError': 'Tīkla kļūda.',

  // Routing errors
  'routing.error.missingParam': 'Trūkst parametra "{{name}}" ceļam "{{pattern}}"',
  'routing.error.routeNotFound': 'Maršruts "{{name}}" nav atrasts',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter jāizmanto MoleculeRouterProvider iekšienē',

  // Push notification errors
  'push.error.notSupported': 'Push paziņojumi nav atbalstīti',
  'push.error.permissionNotGranted': 'Paziņojumu atļauja nav piešķirta',

  // Utility errors
  'error.networkError': 'Tīkla kļūda. Pārbaudiet savienojumu.',
  'error.timeout': 'Pieprasījuma noildze. Mēģiniet vēlreiz.',
  'error.unauthorized': 'Jums nav tiesību veikt šo darbību.',
  'error.forbidden': 'Piekļuve liegta.',
  'error.notFound': 'Resurss nav atrasts.',
  'error.validationError': 'Pārbaudiet ievadi un mēģiniet vēlreiz.',
  'error.serverError': 'Servera kļūda. Mēģiniet vēlāk.',
  'error.unknown': 'Radās negaidīta kļūda.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Nepieciešams ziņojums',
  'conversation.error.aiNotConfigured': 'AI nodrošinātājs nav konfigurēts',
  'conversation.error.unknownAiError': 'Nezināma AI kļūda',
  'conversation.error.notFound': 'Saruna nav atrasta',
  'conversation.error.streamError': 'AI straumes kļūda',

  // Resource errors
  'resource.error.unknownError': 'Nezināma kļūda.',
  'resource.error.unableToCreate': 'Nevar izveidot {{name}}.',
  'resource.error.unableToUpdate': 'Nevar atjaunināt {{name}}.',
  'resource.error.unableToDelete': 'Nevar dzēst {{name}}.',
  'resource.error.notFound': 'Nav atrasts.',
  'resource.error.badRequest': 'Slikts pieprasījums.',
  'resource.error.unauthorized': 'Nav autorizēts.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Nepieciešams nosaukums un projectType',
  'project.error.notFound': 'Nav atrasts',

  // Device errors
  'device.error.unauthorized': 'Neautorizēts.',
  'device.error.badRequest': 'Nepareizs pieprasījums.',
  'device.error.notFound': 'Nav atrasts.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Neizdevās nolasīt {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Neizdevās ierakstīt {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Neizdevās dzēst {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Nepieciešams maksājumu nodrošinātājs.',
  'user.payment.subscriptionIdRequired': 'Nepieciešams subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Nepieciešams kvīts un planKey.',
  'user.payment.verificationNotConfigured':
    'Maksājuma verifikācija nav konfigurēta priekš {{provider}}.',
  'user.payment.invalidPlan': 'Nederīgs plāns.',
  'user.payment.verificationFailed': 'Abonēšanas verifikācija neizdevās.',
  'user.payment.unknownPlan': 'Nezināms plāns.',
  'user.payment.invalidWebhookEvent': 'Nederīgs webhook notikums.',
}
