/**
 * Dutch translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Laden...',
  'common.saving': 'Opslaan...',
  'common.close': 'Sluiten',
  'common.goBack': 'Terug',
  'common.submit': 'Verzenden',
  'common.continue': 'Doorgaan',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Wachtwoord',
  'auth.login.twoFactor': 'Tweefactortoken (indien ingeschakeld)',
  'auth.login.signUp': 'Registreren',
  'auth.login.loggingIn': 'Inloggen...',
  'auth.login.logIn': 'Inloggen',
  'auth.login.forgotPassword': 'Wachtwoord vergeten?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (verplicht)',
  'auth.signup.password': 'Wachtwoord (verplicht)',
  'auth.signup.name': 'Uw naam',
  'auth.signup.signingUp': 'Registreren...',
  'auth.signup.signUp': 'Registreren',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Als er een account met dat e-mailadres bestaat, is er een link voor het opnieuw instellen van het wachtwoord verzonden.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Verzenden...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Wachtwoord-resettoken',
  'auth.resetPassword.newPassword': 'Nieuw wachtwoord',
  'auth.resetPassword.twoFactor': 'Tweefactortoken (indien ingeschakeld)',
  'auth.resetPassword.loggingIn': 'Inloggen...',
  'auth.resetPassword.submit': 'Wachtwoord instellen en inloggen',

  // Home
  'home.greeting': 'Hallo, ',
  'home.world': 'Wereld',

  // Settings
  'settings.account': 'Account',
  'settings.email': 'E-mail',
  'settings.authentication': 'Authenticatie',
  'settings.changePassword': 'Wachtwoord wijzigen',
  'settings.twoFactor': 'Tweefactorauthenticatie',
  'settings.notifications': 'Meldingen',
  'settings.pushNotifications': 'Pushmeldingen',
  'settings.billing': 'Facturering',
  'settings.plan': 'Abonnement: ',
  'settings.upgrade': 'Upgraden',
  'settings.devices': 'Apparaten',
  'settings.noDevices': 'Geen apparaten gevonden',
  'settings.thisDevice': 'Dit apparaat',
  'settings.platform': 'Platform',
  'settings.browser': 'Browser',
  'settings.network': 'Netwerk',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Onbekend',
  'settings.logOut': 'Uitloggen',
  'settings.deleteAccount': 'Account verwijderen',
  'settings.changePasswordModal.title': 'Wachtwoord wijzigen',
  'settings.changePasswordModal.error': 'Wachtwoord wijzigen mislukt.',
  'settings.changePasswordModal.currentPassword': 'Huidig wachtwoord',
  'settings.changePasswordModal.newPassword': 'Nieuw wachtwoord',
  'settings.changePasswordModal.changing': 'Wijzigen...',
  'settings.deleteAccountModal.title': 'Account verwijderen',
  'settings.deleteAccountModal.warning':
    'Deze actie kan niet ongedaan worden gemaakt. Voer uw wachtwoord in ter bevestiging.',
  'settings.deleteAccountModal.password': 'Wachtwoord',
  'settings.deleteAccountModal.deleting': 'Verwijderen...',
  'settings.changePasswordModal.submit': 'Wachtwoord wijzigen',
  'settings.deleteAccountModal.submit': 'Account verwijderen',
  'settings.failedToUpdateEmail': 'Kan e-mail niet bijwerken.',
  'settings.failedToDeleteAccount': 'Kan account niet verwijderen.',
  'settings.toggleTwoFactor': 'Tweefactorauthenticatie wisselen',
  'settings.togglePushNotifications': 'Push-meldingen wisselen',

  // Footer
  'footer.about': 'Over {{appName}}',
  'footer.privacyPolicy': 'Privacybeleid',
  'footer.termsOfService': 'Servicevoorwaarden',
  'footer.language': 'Taal',

  // OAuth
  'oauth.orContinueWith': 'Of doorgaan met',
  'oauth.continueWith': 'Doorgaan met {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Thema wisselen',

  // User Menu
  'userMenu.open': 'Gebruikersmenu openen',

  // Plan Updated
  'planUpdated.message': 'Uw abonnement is bijgewerkt.',
  'planUpdated.thankYou': 'Bedankt!',
  'planUpdated.returnHome': 'Terug naar home',

  // PWA
  'pwa.updateAvailable': 'Nieuwe versie beschikbaar!',
  'pwa.update': 'Bijwerken',
  'pwa.updating': 'Bijwerken...',

  // User API errors
  'user.error.badRequest': 'Ongeldig verzoek.',
  'user.error.notFound': 'Niet gevonden.',
  'user.error.failedToCreateSession': 'Kon sessie niet aanmaken.',
  'user.error.usernameRequired': 'Gebruikersnaam is vereist.',
  'user.error.passwordRequired': 'Wachtwoord is vereist.',
  'user.error.emailInvalid': 'E-mail is ongeldig.',
  'user.error.usernameUnavailable': 'Gebruikersnaam is niet beschikbaar.',
  'user.error.emailAlreadyRegistered': 'E-mail is al geregistreerd.',
  'user.error.failedToHashPassword': 'Kon wachtwoord niet hashen.',
  'user.error.invalidCredentials': 'Ongeldige inloggegevens.',
  'user.error.invalidTwoFactorToken': 'Ongeldig tweefactor-token.',
  'user.error.twoFactorVerificationUnavailable': 'Tweefactor-verificatie niet beschikbaar.',
  'user.error.loginFailed': 'Inloggen mislukt.',
  'user.error.usernameCannotBeEmpty': 'Gebruikersnaam mag niet leeg zijn.',
  'user.error.failedToUpdateUser': 'Kon gebruiker niet bijwerken.',
  'user.error.failedToDeleteUser': 'Kon gebruiker niet verwijderen.',
  'user.error.failedToReadUser': 'Kon gebruiker niet lezen.',
  'user.error.emailRequired': 'E-mail is vereist.',
  'user.error.failedToProcessPasswordReset': 'Kon wachtwoordherstel niet verwerken.',
  'user.error.newPasswordRequired': 'Nieuw wachtwoord is vereist.',
  'user.error.currentPasswordRequired': 'Huidig wachtwoord is vereist.',
  'user.error.currentPasswordIncorrect': 'Huidig wachtwoord is onjuist.',
  'user.error.failedToUpdatePassword': 'Kon wachtwoord niet bijwerken.',
  'user.error.planKeyRequired': 'planKey is vereist.',
  'user.error.invalidPlan': 'Ongeldig plan.',
  'user.error.failedToUpdateSubscription': 'Kon abonnement niet bijwerken.',
  'user.error.failedToUpdatePlan': 'Kon plan niet bijwerken.',
  'user.error.twoFactorNotAvailable': 'Tweefactor-authenticatie is niet beschikbaar.',
  'user.error.tokenRequired': 'Token is vereist.',
  'user.error.noPendingTwoFactorSetup':
    'Geen openstaande tweefactor-instelling. Roep eerst aan met de actie "setup".',
  'user.error.invalidToken': 'Ongeldig token.',
  'user.error.twoFactorNotEnabled': 'Tweefactor is niet ingeschakeld.',
  'user.error.invalidAction': 'Ongeldige actie. Gebruik "setup", "enable" of "disable".',
  'user.error.twoFactorOperationFailed': 'Tweefactor-operatie mislukt.',
  'user.error.oauthServerNotConfigured': 'OAuth-server "{{server}}" is niet geconfigureerd.',
  'user.error.oauthVerificationFailed': 'OAuth-verificatie mislukt.',
  'user.error.failedToCreateUser': 'Kon gebruiker niet aanmaken.',
  'user.error.oauthLoginFailed': 'OAuth-aanmelding mislukt.',

  // Auth client errors
  'auth.error.requestFailed': 'Verzoek mislukt',
  'auth.error.loginFailed': 'Inloggen mislukt',
  'auth.error.registrationFailed': 'Registratie mislukt',
  'auth.error.noRefreshToken': 'Geen verversingstoken beschikbaar',

  // Form validation
  'forms.required': 'Dit veld is verplicht',
  'forms.min': 'De waarde moet minimaal {{min}} zijn',
  'forms.max': 'De waarde moet maximaal {{max}} zijn',
  'forms.minLength': 'Moet minimaal {{minLength}} tekens bevatten',
  'forms.maxLength': 'Moet maximaal {{maxLength}} tekens bevatten',
  'forms.invalidFormat': 'Ongeldig formaat',
  'forms.invalidEmail': 'Ongeldig e-mailadres',
  'forms.invalidUrl': 'Ongeldige URL',
  'forms.invalidValue': 'Ongeldige waarde',

  // HTTP client errors
  'http.error.requestFailed': 'Verzoek mislukt met status {{status}}.',
  'http.error.networkError': 'Netwerkfout.',

  // Routing errors
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" voor pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" niet gevonden',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter moet binnen een MoleculeRouterProvider worden gebruikt',

  // Push notification errors
  'push.error.notSupported': 'Pushmeldingen worden niet ondersteund',
  'push.error.permissionNotGranted': 'Meldingstoestemming niet verleend',

  // Utility errors
  'error.networkError': 'Netwerkfout. Controleer uw verbinding.',
  'error.timeout': 'Verzoek timeout. Probeer het opnieuw.',
  'error.unauthorized': 'U bent niet gemachtigd om deze actie uit te voeren.',
  'error.forbidden': 'Toegang geweigerd.',
  'error.notFound': 'Bron niet gevonden.',
  'error.validationError': 'Controleer uw invoer en probeer het opnieuw.',
  'error.serverError': 'Serverfout. Probeer het later opnieuw.',
  'error.unknown': 'Er is een onverwachte fout opgetreden.',

  // AI conversation errors
  'conversation.error.messageRequired': 'bericht is vereist',
  'conversation.error.aiNotConfigured': 'AI-provider niet geconfigureerd',
  'conversation.error.unknownAiError': 'Onbekende AI-fout',
  'conversation.error.notFound': 'Geen gesprek gevonden',
  'conversation.error.streamError': 'AI-streamingfout',

  // Resource errors
  'resource.error.unknownError': 'Onbekende fout.',
  'resource.error.unableToCreate': 'Kan {{name}} niet aanmaken.',
  'resource.error.unableToUpdate': 'Kan {{name}} niet bijwerken.',
  'resource.error.unableToDelete': 'Kan {{name}} niet verwijderen.',
  'resource.error.notFound': 'Niet gevonden.',
  'resource.error.badRequest': 'Ongeldig verzoek.',
  'resource.error.unauthorized': 'Niet geautoriseerd.',

  // Project errors
  'project.error.nameAndTypeRequired': 'naam en projectType zijn vereist',
  'project.error.notFound': 'Niet gevonden',

  // Device errors
  'device.error.unauthorized': 'Ongeautoriseerd.',
  'device.error.badRequest': 'Ongeldig verzoek.',
  'device.error.notFound': 'Niet gevonden.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Kan {{path}} niet lezen: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Kan {{path}} niet schrijven: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Kan {{path}} niet verwijderen: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Betalingsprovider is vereist.',
  'user.payment.subscriptionIdRequired': 'subscriptionId is vereist.',
  'user.payment.receiptAndPlanRequired': 'bon en planKey zijn vereist.',
  'user.payment.verificationNotConfigured':
    'Betalingsverificatie is niet geconfigureerd voor {{provider}}.',
  'user.payment.invalidPlan': 'Ongeldig plan.',
  'user.payment.verificationFailed': 'Kon abonnement niet verifiëren.',
  'user.payment.unknownPlan': 'Onbekend plan.',
  'user.payment.invalidWebhookEvent': 'Ongeldig webhook-evenement.',
}
