/**
 * Afrikaans translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Laai...',
  'common.saving': 'Stoor...',
  'common.close': 'Sluit',
  'common.goBack': 'Gaan terug',
  'common.submit': 'Dien in',
  'common.continue': 'Gaan voort',

  // Auth - Login
  'auth.login.email': 'E-pos',
  'auth.login.password': 'Wagwoord',
  'auth.login.twoFactor': 'Tweefaktor-token (Indien geaktiveer)',
  'auth.login.signUp': 'Registreer',
  'auth.login.loggingIn': 'Teken aan...',
  'auth.login.logIn': 'Teken aan',
  'auth.login.forgotPassword': 'Wagwoord vergeet?',

  // Auth - Signup
  'auth.signup.email': 'E-pos (Verpligtend)',
  'auth.signup.password': 'Wagwoord (Verpligtend)',
  'auth.signup.name': 'Jou naam',
  'auth.signup.signingUp': 'Registreer...',
  'auth.signup.signUp': 'Registreer',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'As daar \'n rekening met daardie e-posadres bestaan, is \'n wagwoordherstelskakel gestuur.',
  'auth.forgotPassword.email': 'E-pos',
  'auth.forgotPassword.submitting': 'Dien in...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-pos',
  'auth.resetPassword.token': 'Wagwoordherstel-token',
  'auth.resetPassword.newPassword': 'Voer nuwe wagwoord in',
  'auth.resetPassword.twoFactor': 'Tweefaktor-token (Indien geaktiveer)',
  'auth.resetPassword.loggingIn': 'Teken aan...',
  'auth.resetPassword.submit': 'Stel wagwoord in en teken aan',

  // Home
  'home.greeting': 'Hallo, ',
  'home.world': 'Wêreld',

  // Settings
  'settings.account': 'Rekening',
  'settings.email': 'E-pos',
  'settings.authentication': 'Verifikasie',
  'settings.changePassword': 'Verander wagwoord',
  'settings.twoFactor': 'Tweefaktor-verifikasie',
  'settings.notifications': 'Kennisgewings',
  'settings.pushNotifications': 'Push-kennisgewings',
  'settings.billing': 'Fakturering',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Opgradeer',
  'settings.devices': 'Toestelle',
  'settings.noDevices': 'Geen toestelle gevind nie',
  'settings.thisDevice': 'Hierdie toestel',
  'settings.platform': 'Platform',
  'settings.browser': 'Blaaier',
  'settings.network': 'Netwerk',
  'settings.online': 'Aanlyn',
  'settings.offline': 'Aflyn',
  'settings.unknown': 'Onbekend',
  'settings.logOut': 'Teken uit',
  'settings.deleteAccount': 'Verwyder rekening',
  'settings.changePasswordModal.title': 'Verander wagwoord',
  'settings.changePasswordModal.error': 'Kon nie wagwoord verander nie.',
  'settings.changePasswordModal.currentPassword': 'Huidige wagwoord',
  'settings.changePasswordModal.newPassword': 'Nuwe wagwoord',
  'settings.changePasswordModal.changing': 'Verander...',
  'settings.deleteAccountModal.title': 'Verwyder rekening',
  'settings.deleteAccountModal.warning':
    'Hierdie aksie kan nie ongedaan gemaak word nie. Voer asseblief jou wagwoord in om te bevestig.',
  'settings.deleteAccountModal.password': 'Wagwoord',
  'settings.deleteAccountModal.deleting': 'Verwyder...',
  'settings.changePasswordModal.submit': 'Verander wagwoord',
  'settings.deleteAccountModal.submit': 'Verwyder rekening',
  'settings.failedToUpdateEmail': 'Kon nie e-pos opdateer nie.',
  'settings.failedToDeleteAccount': 'Kon nie rekening uitvee nie.',
  'settings.toggleTwoFactor': 'Wissel tweefaktor-verifikasie',
  'settings.togglePushNotifications': 'Wissel stootkennisgewings',

  // Footer
  'footer.about': 'Oor {{appName}}',
  'footer.privacyPolicy': 'Privaatheidsbeleid',
  'footer.termsOfService': 'Diensvoorwaardes',
  'footer.language': 'Taal',

  // OAuth
  'oauth.orContinueWith': 'Of gaan voort met',
  'oauth.continueWith': 'Gaan voort met {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Wissel tema',

  // User Menu
  'userMenu.open': 'Maak gebruikersmenu oop',

  // Plan Updated
  'planUpdated.message': 'Jou plan is opgedateer.',
  'planUpdated.thankYou': 'Dankie!',
  'planUpdated.returnHome': 'Keer terug huis toe',

  // PWA
  'pwa.updateAvailable': 'Nuwe weergawe beskikbaar!',
  'pwa.update': 'Opdateer',
  'pwa.updating': 'Opdateer tans...',

  // User API errors
  'user.error.badRequest': 'Ongeldige versoek.',
  'user.error.notFound': 'Nie gevind nie.',
  'user.error.failedToCreateSession': 'Kon nie sessie skep nie.',
  'user.error.usernameRequired': 'Gebruikersnaam word vereis.',
  'user.error.passwordRequired': 'Wagwoord word vereis.',
  'user.error.emailInvalid': 'E-pos is ongeldig.',
  'user.error.usernameUnavailable': 'Gebruikersnaam is onbeskikbaar.',
  'user.error.emailAlreadyRegistered': 'E-pos is reeds geregistreer.',
  'user.error.failedToHashPassword': 'Kon nie wagwoord versleutel nie.',
  'user.error.invalidCredentials': 'Ongeldige magtigingsbewyse.',
  'user.error.invalidTwoFactorToken': 'Ongeldige tweefaktor-teken.',
  'user.error.twoFactorVerificationUnavailable': 'Tweefaktor-verifikasie onbeskikbaar.',
  'user.error.loginFailed': 'Aanmelding het misluk.',
  'user.error.usernameCannotBeEmpty': 'Gebruikersnaam kan nie leeg wees nie.',
  'user.error.failedToUpdateUser': 'Kon nie gebruiker opdateer nie.',
  'user.error.failedToDeleteUser': 'Kon nie gebruiker verwyder nie.',
  'user.error.failedToReadUser': 'Kon nie gebruiker lees nie.',
  'user.error.emailRequired': 'E-pos word vereis.',
  'user.error.failedToProcessPasswordReset': 'Kon nie wagwoordherstel verwerk nie.',
  'user.error.newPasswordRequired': 'Nuwe wagwoord word vereis.',
  'user.error.currentPasswordRequired': 'Huidige wagwoord word vereis.',
  'user.error.currentPasswordIncorrect': 'Huidige wagwoord is verkeerd.',
  'user.error.failedToUpdatePassword': 'Kon nie wagwoord opdateer nie.',
  'user.error.planKeyRequired': 'planKey word vereis.',
  'user.error.invalidPlan': 'Ongeldige plan.',
  'user.error.failedToUpdateSubscription': 'Kon nie intekening opdateer nie.',
  'user.error.failedToUpdatePlan': 'Kon nie plan opdateer nie.',
  'user.error.twoFactorNotAvailable': 'Tweefaktor-verifikasie is nie beskikbaar nie.',
  'user.error.tokenRequired': 'Teken word vereis.',
  'user.error.noPendingTwoFactorSetup':
    'Geen hangende tweefaktor-opstelling nie. Roep eers met aksie "setup" aan.',
  'user.error.invalidToken': 'Ongeldige teken.',
  'user.error.twoFactorNotEnabled': 'Tweefaktor is nie geaktiveer nie.',
  'user.error.invalidAction': 'Ongeldige aksie. Gebruik "setup", "enable" of "disable".',
  'user.error.twoFactorOperationFailed': 'Tweefaktor-operasie het misluk.',
  'user.error.oauthServerNotConfigured': 'OAuth-bediener "{{server}}" is nie opgestel nie.',
  'user.error.oauthVerificationFailed': 'OAuth-verifikasie het misluk.',
  'user.error.failedToCreateUser': 'Kon nie gebruiker skep nie.',
  'user.error.oauthLoginFailed': 'OAuth-aanmelding het misluk.',

  // Auth client errors
  'auth.error.requestFailed': 'Versoek het misluk',
  'auth.error.loginFailed': 'Aanmelding het misluk',
  'auth.error.registrationFailed': 'Registrasie het misluk',
  'auth.error.noRefreshToken': 'Geen herlaaiteken beskikbaar nie',

  // Form validation
  'forms.required': 'Hierdie veld is verpligtend',
  'forms.min': 'Waarde moet ten minste {{min}} wees',
  'forms.max': 'Waarde moet hoogstens {{max}} wees',
  'forms.minLength': 'Moet ten minste {{minLength}} karakters wees',
  'forms.maxLength': 'Moet hoogstens {{maxLength}} karakters wees',
  'forms.invalidFormat': 'Ongeldige formaat',
  'forms.invalidEmail': 'Ongeldige e-posadres',
  'forms.invalidUrl': 'Ongeldige URL',
  'forms.invalidValue': 'Ongeldige waarde',

  // HTTP client errors
  'http.error.requestFailed': 'Versoek het misluk met status {{status}}.',
  'http.error.networkError': 'Netwerkfout.',

  // Routing errors
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" vir pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Roete "{{name}}" nie gevind nie',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter moet binne 'n MoleculeRouterProvider gebruik word",

  // Push notification errors
  'push.error.notSupported': 'Stootkennisgewings word nie ondersteun nie',
  'push.error.permissionNotGranted': 'Kennisgewingtoestemming nie toegestaan nie',

  // Utility errors
  'error.networkError': 'Netwerkfout. Kontroleer asseblief jou verbinding.',
  'error.timeout': 'Versoek het uitgetel. Probeer asseblief weer.',
  'error.unauthorized': 'Jy is nie gemagtig om hierdie aksie uit te voer nie.',
  'error.forbidden': 'Toegang geweier.',
  'error.notFound': 'Hulpbron nie gevind nie.',
  'error.validationError': 'Kontroleer asseblief jou invoer en probeer weer.',
  'error.serverError': 'Bedienerfout. Probeer asseblief later weer.',
  'error.unknown': "'n Onverwagte fout het voorgekom.",

  // AI conversation errors
  'conversation.error.messageRequired': 'boodskap word vereis',
  'conversation.error.aiNotConfigured': 'KI-verskaffer nie opgestel nie',
  'conversation.error.unknownAiError': 'Onbekende KI-fout',
  'conversation.error.notFound': 'Geen gesprek gevind nie',
  'conversation.error.streamError': 'KI-stroomfout',

  // Resource errors
  'resource.error.unknownError': 'Onbekende fout.',
  'resource.error.unableToCreate': 'Kan nie {{name}} skep nie.',
  'resource.error.unableToUpdate': 'Kan nie {{name}} opdateer nie.',
  'resource.error.unableToDelete': 'Kan nie {{name}} verwyder nie.',
  'resource.error.notFound': 'Nie gevind nie.',
  'resource.error.badRequest': 'Ongeldige versoek.',
  'resource.error.unauthorized': 'Ongemagtig.',

  // Project errors
  'project.error.nameAndTypeRequired': 'naam en projectType word vereis',
  'project.error.notFound': 'Nie gevind nie',

  // Device errors
  'device.error.unauthorized': 'Ongemagtig.',
  'device.error.badRequest': 'Ongeldige versoek.',
  'device.error.notFound': 'Nie gevind nie.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Kon nie {{path}} lees nie: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Kon nie {{path}} skryf nie: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Kon nie {{path}} uitvee nie: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Betalingsverskaffer word vereis.',
  'user.payment.subscriptionIdRequired': 'subscriptionId word vereis.',
  'user.payment.receiptAndPlanRequired': 'kwitansie en planKey word vereis.',
  'user.payment.verificationNotConfigured':
    'Betalingsverifikasie is nie opgestel vir {{provider}} nie.',
  'user.payment.invalidPlan': 'Ongeldige plan.',
  'user.payment.verificationFailed': 'Kon nie intekening verifieer nie.',
  'user.payment.unknownPlan': 'Onbekende plan.',
  'user.payment.invalidWebhookEvent': 'Ongeldige webhook-gebeurtenis.',
}
