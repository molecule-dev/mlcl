/**
 * Danish translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Indlæser...',
  'common.saving': 'Gemmer...',
  'common.close': 'Luk',
  'common.goBack': 'Gå tilbage',
  'common.submit': 'Indsend',
  'common.continue': 'Fortsæt',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Adgangskode',
  'auth.login.twoFactor': 'Tofaktor-token (hvis aktiveret)',
  'auth.login.signUp': 'Opret konto',
  'auth.login.loggingIn': 'Logger ind...',
  'auth.login.logIn': 'Log ind',
  'auth.login.forgotPassword': 'Glemt adgangskode?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (påkrævet)',
  'auth.signup.password': 'Adgangskode (påkrævet)',
  'auth.signup.name': 'Dit navn',
  'auth.signup.signingUp': 'Opretter konto...',
  'auth.signup.signUp': 'Opret konto',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Hvis en konto med den e-mailadresse findes, er der sendt et link til nulstilling af adgangskode.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Indsender...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Token til nulstilling af adgangskode',
  'auth.resetPassword.newPassword': 'Indtast ny adgangskode',
  'auth.resetPassword.twoFactor': 'Tofaktor-token (hvis aktiveret)',
  'auth.resetPassword.loggingIn': 'Logger ind...',
  'auth.resetPassword.submit': 'Indstil adgangskode og log ind',

  // Home
  'home.greeting': 'Hej, ',
  'home.world': 'Verden',

  // Settings
  'settings.account': 'Konto',
  'settings.email': 'E-mail',
  'settings.authentication': 'Godkendelse',
  'settings.changePassword': 'Skift adgangskode',
  'settings.twoFactor': 'Tofaktorgodkendelse',
  'settings.notifications': 'Notifikationer',
  'settings.pushNotifications': 'Push-notifikationer',
  'settings.billing': 'Fakturering',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Opgrader',
  'settings.devices': 'Enheder',
  'settings.noDevices': 'Ingen enheder fundet',
  'settings.thisDevice': 'Denne enhed',
  'settings.platform': 'Platform',
  'settings.browser': 'Browser',
  'settings.network': 'Netværk',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Ukendt',
  'settings.logOut': 'Log ud',
  'settings.deleteAccount': 'Slet konto',
  'settings.changePasswordModal.title': 'Skift adgangskode',
  'settings.changePasswordModal.error': 'Kunne ikke ændre adgangskoden.',
  'settings.changePasswordModal.currentPassword': 'Nuværende adgangskode',
  'settings.changePasswordModal.newPassword': 'Ny adgangskode',
  'settings.changePasswordModal.changing': 'Ændrer...',
  'settings.deleteAccountModal.title': 'Slet konto',
  'settings.deleteAccountModal.warning':
    'Denne handling kan ikke fortrydes. Indtast din adgangskode for at bekræfte.',
  'settings.deleteAccountModal.password': 'Adgangskode',
  'settings.deleteAccountModal.deleting': 'Sletter...',
  'settings.changePasswordModal.submit': 'Skift adgangskode',
  'settings.deleteAccountModal.submit': 'Slet konto',
  'settings.failedToUpdateEmail': 'Kunne ikke opdatere e-mail.',
  'settings.failedToDeleteAccount': 'Kunne ikke slette konto.',
  'settings.toggleTwoFactor': 'Skift tofaktorgodkendelse',
  'settings.togglePushNotifications': 'Skift push-notifikationer',

  // Footer
  'footer.about': 'Om {{appName}}',
  'footer.privacyPolicy': 'Privatlivspolitik',
  'footer.termsOfService': 'Servicevilkår',
  'footer.language': 'Sprog',

  // OAuth
  'oauth.orContinueWith': 'Eller fortsæt med',
  'oauth.continueWith': 'Fortsæt med {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Skift tema',

  // User Menu
  'userMenu.open': 'Åbn brugermenu',

  // Plan Updated
  'planUpdated.message': 'Din plan er blevet opdateret.',
  'planUpdated.thankYou': 'Tak!',
  'planUpdated.returnHome': 'Gå til startsiden',

  // PWA
  'pwa.updateAvailable': 'Ny version tilgængelig!',
  'pwa.update': 'Opdater',
  'pwa.updating': 'Opdaterer...',

  // User API errors
  'user.error.badRequest': 'Ugyldig forespørgsel.',
  'user.error.notFound': 'Ikke fundet.',
  'user.error.failedToCreateSession': 'Kunne ikke oprette session.',
  'user.error.usernameRequired': 'Brugernavn er påkrævet.',
  'user.error.passwordRequired': 'Adgangskode er påkrævet.',
  'user.error.emailInvalid': 'E-mail er ugyldig.',
  'user.error.usernameUnavailable': 'Brugernavn er ikke tilgængeligt.',
  'user.error.emailAlreadyRegistered': 'E-mail er allerede registreret.',
  'user.error.failedToHashPassword': 'Kunne ikke hashe adgangskode.',
  'user.error.invalidCredentials': 'Ugyldige legitimationsoplysninger.',
  'user.error.invalidTwoFactorToken': 'Ugyldigt to-faktor-token.',
  'user.error.twoFactorVerificationUnavailable': 'To-faktor-verifikation utilgængelig.',
  'user.error.loginFailed': 'Login mislykkedes.',
  'user.error.usernameCannotBeEmpty': 'Brugernavn må ikke være tomt.',
  'user.error.failedToUpdateUser': 'Kunne ikke opdatere bruger.',
  'user.error.failedToDeleteUser': 'Kunne ikke slette bruger.',
  'user.error.failedToReadUser': 'Kunne ikke læse bruger.',
  'user.error.emailRequired': 'E-mail er påkrævet.',
  'user.error.failedToProcessPasswordReset': 'Kunne ikke behandle nulstilling af adgangskode.',
  'user.error.newPasswordRequired': 'Ny adgangskode er påkrævet.',
  'user.error.currentPasswordRequired': 'Nuværende adgangskode er påkrævet.',
  'user.error.currentPasswordIncorrect': 'Nuværende adgangskode er forkert.',
  'user.error.failedToUpdatePassword': 'Kunne ikke opdatere adgangskode.',
  'user.error.planKeyRequired': 'planKey er påkrævet.',
  'user.error.invalidPlan': 'Ugyldig plan.',
  'user.error.failedToUpdateSubscription': 'Kunne ikke opdatere abonnement.',
  'user.error.failedToUpdatePlan': 'Kunne ikke opdatere plan.',
  'user.error.twoFactorNotAvailable': 'To-faktor-godkendelse er ikke tilgængelig.',
  'user.error.tokenRequired': 'Token er påkrævet.',
  'user.error.noPendingTwoFactorSetup':
    'Ingen ventende to-faktor-opsætning. Kald med handlingen "setup" først.',
  'user.error.invalidToken': 'Ugyldigt token.',
  'user.error.twoFactorNotEnabled': 'To-faktor er ikke aktiveret.',
  'user.error.invalidAction': 'Ugyldig handling. Brug "setup", "enable" eller "disable".',
  'user.error.twoFactorOperationFailed': 'To-faktor-operation mislykkedes.',
  'user.error.oauthServerNotConfigured': 'OAuth-server "{{server}}" er ikke konfigureret.',
  'user.error.oauthVerificationFailed': 'OAuth-verifikation mislykkedes.',
  'user.error.failedToCreateUser': 'Kunne ikke oprette bruger.',
  'user.error.oauthLoginFailed': 'OAuth-login mislykkedes.',

  // Auth client errors
  'auth.error.requestFailed': 'Forespørgsel mislykkedes',
  'auth.error.loginFailed': 'Login mislykkedes',
  'auth.error.registrationFailed': 'Registrering mislykkedes',
  'auth.error.noRefreshToken': 'Ingen opdateringstoken tilgængelig',

  // Form validation
  'forms.required': 'Dette felt er påkrævet',
  'forms.min': 'Værdien skal være mindst {{min}}',
  'forms.max': 'Værdien skal være højst {{max}}',
  'forms.minLength': 'Skal være mindst {{minLength}} tegn',
  'forms.maxLength': 'Skal være højst {{maxLength}} tegn',
  'forms.invalidFormat': 'Ugyldigt format',
  'forms.invalidEmail': 'Ugyldig e-mailadresse',
  'forms.invalidUrl': 'Ugyldig URL',
  'forms.invalidValue': 'Ugyldig værdi',

  // HTTP client errors
  'http.error.requestFailed': 'Forespørgsel mislykkedes med status {{status}}.',
  'http.error.networkError': 'Netværksfejl.',

  // Routing errors
  'routing.error.missingParam': 'Manglende parameter "{{name}}" for sti "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruten "{{name}}" blev ikke fundet',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter skal bruges inden for en MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push-notifikationer understøttes ikke',
  'push.error.permissionNotGranted': 'Notifikationstilladelse ikke givet',

  // Utility errors
  'error.networkError': 'Netværksfejl. Kontroller venligst din forbindelse.',
  'error.timeout': 'Forespørgsel timeout. Prøv venligst igen.',
  'error.unauthorized': 'Du er ikke autoriseret til at udføre denne handling.',
  'error.forbidden': 'Adgang nægtet.',
  'error.notFound': 'Ressource ikke fundet.',
  'error.validationError': 'Kontroller venligst dit input og prøv igen.',
  'error.serverError': 'Serverfejl. Prøv venligst igen senere.',
  'error.unknown': 'En uventet fejl opstod.',

  // AI conversation errors
  'conversation.error.messageRequired': 'besked er påkrævet',
  'conversation.error.aiNotConfigured': 'AI-udbyder ikke konfigureret',
  'conversation.error.unknownAiError': 'Ukendt AI-fejl',
  'conversation.error.notFound': 'Ingen samtale fundet',
  'conversation.error.streamError': 'AI-streamingfejl',

  // Resource errors
  'resource.error.unknownError': 'Ukendt fejl.',
  'resource.error.unableToCreate': 'Kan ikke oprette {{name}}.',
  'resource.error.unableToUpdate': 'Kan ikke opdatere {{name}}.',
  'resource.error.unableToDelete': 'Kan ikke slette {{name}}.',
  'resource.error.notFound': 'Ikke fundet.',
  'resource.error.badRequest': 'Ugyldig forespørgsel.',
  'resource.error.unauthorized': 'Uautoriseret.',

  // Project errors
  'project.error.nameAndTypeRequired': 'navn og projectType er påkrævet',
  'project.error.notFound': 'Ikke fundet',

  // Device errors
  'device.error.unauthorized': 'Uautoriseret.',
  'device.error.badRequest': 'Ugyldig anmodning.',
  'device.error.notFound': 'Ikke fundet.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Kunne ikke læse {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Kunne ikke skrive {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Kunne ikke slette {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Betalingsudbyder er påkrævet.',
  'user.payment.subscriptionIdRequired': 'subscriptionId er påkrævet.',
  'user.payment.receiptAndPlanRequired': 'kvittering og planKey er påkrævet.',
  'user.payment.verificationNotConfigured':
    'Betalingsverifikation er ikke konfigureret for {{provider}}.',
  'user.payment.invalidPlan': 'Ugyldig plan.',
  'user.payment.verificationFailed': 'Kunne ikke verificere abonnement.',
  'user.payment.unknownPlan': 'Ukendt plan.',
  'user.payment.invalidWebhookEvent': 'Ugyldig webhook-hændelse.',
}
