/**
 * Swedish translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Laddar...',
  'common.saving': 'Sparar...',
  'common.close': 'Stäng',
  'common.goBack': 'Gå tillbaka',
  'common.submit': 'Skicka',
  'common.continue': 'Fortsätt',

  // Auth - Login
  'auth.login.email': 'E-post',
  'auth.login.password': 'Lösenord',
  'auth.login.twoFactor': 'Tvåfaktorstoken (om aktiverat)',
  'auth.login.signUp': 'Registrera dig',
  'auth.login.loggingIn': 'Loggar in...',
  'auth.login.logIn': 'Logga in',
  'auth.login.forgotPassword': 'Glömt lösenord?',

  // Auth - Signup
  'auth.signup.email': 'E-post (obligatoriskt)',
  'auth.signup.password': 'Lösenord (obligatoriskt)',
  'auth.signup.name': 'Ditt namn',
  'auth.signup.signingUp': 'Registrerar...',
  'auth.signup.signUp': 'Registrera dig',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Om ett konto med den e-postadressen finns har en länk för återställning av lösenord skickats.',
  'auth.forgotPassword.email': 'E-post',
  'auth.forgotPassword.submitting': 'Skickar...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-post',
  'auth.resetPassword.token': 'Token för återställning av lösenord',
  'auth.resetPassword.newPassword': 'Ange nytt lösenord',
  'auth.resetPassword.twoFactor': 'Tvåfaktorstoken (om aktiverat)',
  'auth.resetPassword.loggingIn': 'Loggar in...',
  'auth.resetPassword.submit': 'Ställ in lösenord och logga in',

  // Home
  'home.greeting': 'Hej, ',
  'home.world': 'Världen',

  // Settings
  'settings.account': 'Konto',
  'settings.email': 'E-post',
  'settings.authentication': 'Autentisering',
  'settings.changePassword': 'Ändra lösenord',
  'settings.twoFactor': 'Tvåfaktorsautentisering',
  'settings.notifications': 'Aviseringar',
  'settings.pushNotifications': 'Push-aviseringar',
  'settings.billing': 'Fakturering',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Uppgradera',
  'settings.devices': 'Enheter',
  'settings.noDevices': 'Inga enheter hittades',
  'settings.thisDevice': 'Denna enhet',
  'settings.platform': 'Plattform',
  'settings.browser': 'Webbläsare',
  'settings.network': 'Nätverk',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Okänd',
  'settings.logOut': 'Logga ut',
  'settings.deleteAccount': 'Radera konto',
  'settings.changePasswordModal.title': 'Ändra lösenord',
  'settings.changePasswordModal.error': 'Det gick inte att ändra lösenordet.',
  'settings.changePasswordModal.currentPassword': 'Nuvarande lösenord',
  'settings.changePasswordModal.newPassword': 'Nytt lösenord',
  'settings.changePasswordModal.changing': 'Ändrar...',
  'settings.deleteAccountModal.title': 'Radera konto',
  'settings.deleteAccountModal.warning':
    'Denna åtgärd kan inte ångras. Ange ditt lösenord för att bekräfta.',
  'settings.deleteAccountModal.password': 'Lösenord',
  'settings.deleteAccountModal.deleting': 'Raderar...',
  'settings.changePasswordModal.submit': 'Ändra lösenord',
  'settings.deleteAccountModal.submit': 'Radera konto',
  'settings.failedToUpdateEmail': 'Kunde inte uppdatera e-post.',
  'settings.failedToDeleteAccount': 'Kunde inte radera kontot.',
  'settings.toggleTwoFactor': 'Växla tvåfaktorsautentisering',
  'settings.togglePushNotifications': 'Växla push-notiser',

  // Footer
  'footer.about': 'Om {{appName}}',
  'footer.privacyPolicy': 'Integritetspolicy',
  'footer.termsOfService': 'Användarvillkor',
  'footer.language': 'Språk',

  // OAuth
  'oauth.orContinueWith': 'Eller fortsätt med',
  'oauth.continueWith': 'Fortsätt med {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Växla tema',

  // User Menu
  'userMenu.open': 'Öppna användarmeny',

  // Plan Updated
  'planUpdated.message': 'Din plan har uppdaterats.',
  'planUpdated.thankYou': 'Tack!',
  'planUpdated.returnHome': 'Återgå till startsidan',

  // PWA
  'pwa.updateAvailable': 'Ny version tillgänglig!',
  'pwa.update': 'Uppdatera',
  'pwa.updating': 'Uppdaterar...',

  // User API errors
  'user.error.badRequest': 'Ogiltig begäran.',
  'user.error.notFound': 'Hittades inte.',
  'user.error.failedToCreateSession': 'Kunde inte skapa session.',
  'user.error.usernameRequired': 'Användarnamn krävs.',
  'user.error.passwordRequired': 'Lösenord krävs.',
  'user.error.emailInvalid': 'E-post är ogiltig.',
  'user.error.usernameUnavailable': 'Användarnamn är inte tillgängligt.',
  'user.error.emailAlreadyRegistered': 'E-post är redan registrerad.',
  'user.error.failedToHashPassword': 'Kunde inte hasha lösenord.',
  'user.error.invalidCredentials': 'Ogiltiga inloggningsuppgifter.',
  'user.error.invalidTwoFactorToken': 'Ogiltig tvåfaktorstoken.',
  'user.error.twoFactorVerificationUnavailable': 'Tvåfaktorsverifiering otillgänglig.',
  'user.error.loginFailed': 'Inloggning misslyckades.',
  'user.error.usernameCannotBeEmpty': 'Användarnamn kan inte vara tomt.',
  'user.error.failedToUpdateUser': 'Kunde inte uppdatera användare.',
  'user.error.failedToDeleteUser': 'Kunde inte ta bort användare.',
  'user.error.failedToReadUser': 'Kunde inte läsa användare.',
  'user.error.emailRequired': 'E-post krävs.',
  'user.error.failedToProcessPasswordReset': 'Kunde inte behandla lösenordsåterställning.',
  'user.error.newPasswordRequired': 'Nytt lösenord krävs.',
  'user.error.currentPasswordRequired': 'Nuvarande lösenord krävs.',
  'user.error.currentPasswordIncorrect': 'Nuvarande lösenord är felaktigt.',
  'user.error.failedToUpdatePassword': 'Kunde inte uppdatera lösenord.',
  'user.error.planKeyRequired': 'planKey krävs.',
  'user.error.invalidPlan': 'Ogiltig plan.',
  'user.error.failedToUpdateSubscription': 'Kunde inte uppdatera abonnemang.',
  'user.error.failedToUpdatePlan': 'Kunde inte uppdatera plan.',
  'user.error.twoFactorNotAvailable': 'Tvåfaktorsautentisering är inte tillgänglig.',
  'user.error.tokenRequired': 'Token krävs.',
  'user.error.noPendingTwoFactorSetup':
    'Ingen pågående tvåfaktorsinställning. Anropa med åtgärden "setup" först.',
  'user.error.invalidToken': 'Ogiltig token.',
  'user.error.twoFactorNotEnabled': 'Tvåfaktor är inte aktiverad.',
  'user.error.invalidAction': 'Ogiltig åtgärd. Använd "setup", "enable" eller "disable".',
  'user.error.twoFactorOperationFailed': 'Tvåfaktorsåtgärd misslyckades.',
  'user.error.oauthServerNotConfigured': 'OAuth-server "{{server}}" är inte konfigurerad.',
  'user.error.oauthVerificationFailed': 'OAuth-verifiering misslyckades.',
  'user.error.failedToCreateUser': 'Kunde inte skapa användare.',
  'user.error.oauthLoginFailed': 'OAuth-inloggning misslyckades.',

  // Auth client errors
  'auth.error.requestFailed': 'Begäran misslyckades',
  'auth.error.loginFailed': 'Inloggning misslyckades',
  'auth.error.registrationFailed': 'Registrering misslyckades',
  'auth.error.noRefreshToken': 'Ingen uppdateringstoken tillgänglig',

  // Form validation
  'forms.required': 'Detta fält är obligatoriskt',
  'forms.min': 'Värdet måste vara minst {{min}}',
  'forms.max': 'Värdet måste vara högst {{max}}',
  'forms.minLength': 'Måste vara minst {{minLength}} tecken',
  'forms.maxLength': 'Måste vara högst {{maxLength}} tecken',
  'forms.invalidFormat': 'Ogiltigt format',
  'forms.invalidEmail': 'Ogiltig e-postadress',
  'forms.invalidUrl': 'Ogiltig URL',
  'forms.invalidValue': 'Ogiltigt värde',

  // HTTP client errors
  'http.error.requestFailed': 'Begäran misslyckades med status {{status}}.',
  'http.error.networkError': 'Nätverksfel.',

  // Routing errors
  'routing.error.missingParam': 'Saknad parameter "{{name}}" för sökväg "{{pattern}}"',
  'routing.error.routeNotFound': 'Rutten "{{name}}" hittades inte',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter måste användas inom en MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push-notiser stöds inte',
  'push.error.permissionNotGranted': 'Notisbehörighet inte beviljad',

  // Utility errors
  'error.networkError': 'Nätverksfel. Kontrollera din anslutning.',
  'error.timeout': 'Begäran timeout. Försök igen.',
  'error.unauthorized': 'Du har inte behörighet att utföra denna åtgärd.',
  'error.forbidden': 'Åtkomst nekad.',
  'error.notFound': 'Resurs hittades inte.',
  'error.validationError': 'Kontrollera din inmatning och försök igen.',
  'error.serverError': 'Serverfel. Försök igen senare.',
  'error.unknown': 'Ett oväntat fel inträffade.',

  // AI conversation errors
  'conversation.error.messageRequired': 'meddelande krävs',
  'conversation.error.aiNotConfigured': 'AI-leverantör inte konfigurerad',
  'conversation.error.unknownAiError': 'Okänt AI-fel',
  'conversation.error.notFound': 'Ingen konversation hittad',
  'conversation.error.streamError': 'AI-strömningsfel',

  // Resource errors
  'resource.error.unknownError': 'Okänt fel.',
  'resource.error.unableToCreate': 'Kan inte skapa {{name}}.',
  'resource.error.unableToUpdate': 'Kan inte uppdatera {{name}}.',
  'resource.error.unableToDelete': 'Kan inte ta bort {{name}}.',
  'resource.error.notFound': 'Hittades inte.',
  'resource.error.badRequest': 'Ogiltig begäran.',
  'resource.error.unauthorized': 'Obehörig.',

  // Project errors
  'project.error.nameAndTypeRequired': 'namn och projectType krävs',
  'project.error.notFound': 'Hittades inte',

  // Device errors
  'device.error.unauthorized': 'Obehörig.',
  'device.error.badRequest': 'Ogiltig begäran.',
  'device.error.notFound': 'Hittades inte.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Misslyckades med att läsa {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Misslyckades med att skriva {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Misslyckades med att ta bort {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Betalningsleverantör krävs.',
  'user.payment.subscriptionIdRequired': 'subscriptionId krävs.',
  'user.payment.receiptAndPlanRequired': 'kvitto och planKey krävs.',
  'user.payment.verificationNotConfigured':
    'Betalningsverifiering är inte konfigurerad för {{provider}}.',
  'user.payment.invalidPlan': 'Ogiltig plan.',
  'user.payment.verificationFailed': 'Kunde inte verifiera abonnemang.',
  'user.payment.unknownPlan': 'Okänd plan.',
  'user.payment.invalidWebhookEvent': 'Ogiltig webhook-händelse.',
}
