/**
 * Norwegian Bokmål translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Laster...',
  'common.saving': 'Lagrer...',
  'common.close': 'Lukk',
  'common.goBack': 'Gå tilbake',
  'common.submit': 'Send inn',
  'common.continue': 'Fortsett',

  // Auth - Login
  'auth.login.email': 'E-post',
  'auth.login.password': 'Passord',
  'auth.login.twoFactor': 'Tofaktor-token (hvis aktivert)',
  'auth.login.signUp': 'Registrer deg',
  'auth.login.loggingIn': 'Logger inn...',
  'auth.login.logIn': 'Logg inn',
  'auth.login.forgotPassword': 'Glemt passord?',

  // Auth - Signup
  'auth.signup.email': 'E-post (påkrevd)',
  'auth.signup.password': 'Passord (påkrevd)',
  'auth.signup.name': 'Ditt navn',
  'auth.signup.signingUp': 'Registrerer...',
  'auth.signup.signUp': 'Registrer deg',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Hvis en konto med den e-postadressen finnes, har en lenke for tilbakestilling av passord blitt sendt.',
  'auth.forgotPassword.email': 'E-post',
  'auth.forgotPassword.submitting': 'Sender...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-post',
  'auth.resetPassword.token': 'Token for tilbakestilling av passord',
  'auth.resetPassword.newPassword': 'Skriv inn nytt passord',
  'auth.resetPassword.twoFactor': 'Tofaktor-token (hvis aktivert)',
  'auth.resetPassword.loggingIn': 'Logger inn...',
  'auth.resetPassword.submit': 'Sett passord og logg inn',

  // Home
  'home.greeting': 'Hei, ',
  'home.world': 'Verden',

  // Settings
  'settings.account': 'Konto',
  'settings.email': 'E-post',
  'settings.authentication': 'Autentisering',
  'settings.changePassword': 'Endre passord',
  'settings.twoFactor': 'Tofaktorautentisering',
  'settings.notifications': 'Varsler',
  'settings.pushNotifications': 'Push-varsler',
  'settings.billing': 'Fakturering',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Oppgrader',
  'settings.devices': 'Enheter',
  'settings.noDevices': 'Ingen enheter funnet',
  'settings.thisDevice': 'Denne enheten',
  'settings.platform': 'Plattform',
  'settings.browser': 'Nettleser',
  'settings.network': 'Nettverk',
  'settings.online': 'Tilkoblet',
  'settings.offline': 'Frakoblet',
  'settings.unknown': 'Ukjent',
  'settings.logOut': 'Logg ut',
  'settings.deleteAccount': 'Slett konto',
  'settings.changePasswordModal.title': 'Endre passord',
  'settings.changePasswordModal.error': 'Kunne ikke endre passordet.',
  'settings.changePasswordModal.currentPassword': 'Nåværende passord',
  'settings.changePasswordModal.newPassword': 'Nytt passord',
  'settings.changePasswordModal.changing': 'Endrer...',
  'settings.deleteAccountModal.title': 'Slett konto',
  'settings.deleteAccountModal.warning':
    'Denne handlingen kan ikke angres. Skriv inn passordet ditt for å bekrefte.',
  'settings.deleteAccountModal.password': 'Passord',
  'settings.deleteAccountModal.deleting': 'Sletter...',
  'settings.changePasswordModal.submit': 'Endre passord',
  'settings.deleteAccountModal.submit': 'Slett konto',
  'settings.failedToUpdateEmail': 'Kunne ikke oppdatere e-post.',
  'settings.failedToDeleteAccount': 'Kunne ikke slette konto.',
  'settings.toggleTwoFactor': 'Veksle tofaktorautentisering',
  'settings.togglePushNotifications': 'Veksle push-varsler',

  // Footer
  'footer.about': 'Om {{appName}}',
  'footer.privacyPolicy': 'Personvernerklæring',
  'footer.termsOfService': 'Tjenestevilkår',
  'footer.language': 'Språk',

  // OAuth
  'oauth.orContinueWith': 'Eller fortsett med',
  'oauth.continueWith': 'Fortsett med {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Bytt tema',

  // User Menu
  'userMenu.open': 'Åpne brukermeny',

  // Plan Updated
  'planUpdated.message': 'Planen din har blitt oppdatert.',
  'planUpdated.thankYou': 'Takk!',
  'planUpdated.returnHome': 'Gå til startsiden',

  // PWA
  'pwa.updateAvailable': 'Ny versjon tilgjengelig!',
  'pwa.update': 'Oppdater',
  'pwa.updating': 'Oppdaterer...',

  // User API errors
  'user.error.badRequest': 'Ugyldig forespørsel.',
  'user.error.notFound': 'Ikke funnet.',
  'user.error.failedToCreateSession': 'Kunne ikke opprette økt.',
  'user.error.usernameRequired': 'Brukernavn er påkrevd.',
  'user.error.passwordRequired': 'Passord er påkrevd.',
  'user.error.emailInvalid': 'E-post er ugyldig.',
  'user.error.usernameUnavailable': 'Brukernavn er ikke tilgjengelig.',
  'user.error.emailAlreadyRegistered': 'E-post er allerede registrert.',
  'user.error.failedToHashPassword': 'Kunne ikke hashe passord.',
  'user.error.invalidCredentials': 'Ugyldige legitimasjonsopplysninger.',
  'user.error.invalidTwoFactorToken': 'Ugyldig tofaktor-token.',
  'user.error.twoFactorVerificationUnavailable': 'Tofaktor-verifisering utilgjengelig.',
  'user.error.loginFailed': 'Innlogging mislyktes.',
  'user.error.usernameCannotBeEmpty': 'Brukernavn kan ikke være tomt.',
  'user.error.failedToUpdateUser': 'Kunne ikke oppdatere bruker.',
  'user.error.failedToDeleteUser': 'Kunne ikke slette bruker.',
  'user.error.failedToReadUser': 'Kunne ikke lese bruker.',
  'user.error.emailRequired': 'E-post er påkrevd.',
  'user.error.failedToProcessPasswordReset': 'Kunne ikke behandle tilbakestilling av passord.',
  'user.error.newPasswordRequired': 'Nytt passord er påkrevd.',
  'user.error.currentPasswordRequired': 'Nåværende passord er påkrevd.',
  'user.error.currentPasswordIncorrect': 'Nåværende passord er feil.',
  'user.error.failedToUpdatePassword': 'Kunne ikke oppdatere passord.',
  'user.error.planKeyRequired': 'planKey er påkrevd.',
  'user.error.invalidPlan': 'Ugyldig plan.',
  'user.error.failedToUpdateSubscription': 'Kunne ikke oppdatere abonnement.',
  'user.error.failedToUpdatePlan': 'Kunne ikke oppdatere plan.',
  'user.error.twoFactorNotAvailable': 'Tofaktor-autentisering er ikke tilgjengelig.',
  'user.error.tokenRequired': 'Token er påkrevd.',
  'user.error.noPendingTwoFactorSetup':
    'Ingen ventende tofaktor-oppsett. Kall med handlingen "setup" først.',
  'user.error.invalidToken': 'Ugyldig token.',
  'user.error.twoFactorNotEnabled': 'Tofaktor er ikke aktivert.',
  'user.error.invalidAction': 'Ugyldig handling. Bruk "setup", "enable" eller "disable".',
  'user.error.twoFactorOperationFailed': 'Tofaktor-operasjon mislyktes.',
  'user.error.oauthServerNotConfigured': 'OAuth-server "{{server}}" er ikke konfigurert.',
  'user.error.oauthVerificationFailed': 'OAuth-verifisering mislyktes.',
  'user.error.failedToCreateUser': 'Kunne ikke opprette bruker.',
  'user.error.oauthLoginFailed': 'OAuth-innlogging mislyktes.',

  // Auth client errors
  'auth.error.requestFailed': 'Forespørsel mislyktes',
  'auth.error.loginFailed': 'Innlogging mislyktes',
  'auth.error.registrationFailed': 'Registrering mislyktes',
  'auth.error.noRefreshToken': 'Ingen oppdateringstoken tilgjengelig',

  // Form validation
  'forms.required': 'Dette feltet er obligatorisk',
  'forms.min': 'Verdien må være minst {{min}}',
  'forms.max': 'Verdien må være høyst {{max}}',
  'forms.minLength': 'Må være minst {{minLength}} tegn',
  'forms.maxLength': 'Må være høyst {{maxLength}} tegn',
  'forms.invalidFormat': 'Ugyldig format',
  'forms.invalidEmail': 'Ugyldig e-postadresse',
  'forms.invalidUrl': 'Ugyldig URL',
  'forms.invalidValue': 'Ugyldig verdi',

  // HTTP client errors
  'http.error.requestFailed': 'Forespørsel mislyktes med status {{status}}.',
  'http.error.networkError': 'Nettverksfeil.',

  // Routing errors
  'routing.error.missingParam': 'Manglende parameter "{{name}}" for sti "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruten "{{name}}" ble ikke funnet',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter må brukes innenfor en MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push-varsler støttes ikke',
  'push.error.permissionNotGranted': 'Varslingstillatelse ikke gitt',

  // Utility errors
  'error.networkError': 'Nettverksfeil. Vennligst sjekk tilkoblingen din.',
  'error.timeout': 'Forespørsel tidsavbrudd. Vennligst prøv igjen.',
  'error.unauthorized': 'Du er ikke autorisert til å utføre denne handlingen.',
  'error.forbidden': 'Tilgang nektet.',
  'error.notFound': 'Ressurs ikke funnet.',
  'error.validationError': 'Vennligst sjekk inndataene dine og prøv igjen.',
  'error.serverError': 'Serverfeil. Vennligst prøv igjen senere.',
  'error.unknown': 'En uventet feil oppstod.',

  // AI conversation errors
  'conversation.error.messageRequired': 'melding er påkrevd',
  'conversation.error.aiNotConfigured': 'AI-leverandør ikke konfigurert',
  'conversation.error.unknownAiError': 'Ukjent AI-feil',
  'conversation.error.notFound': 'Ingen samtale funnet',
  'conversation.error.streamError': 'AI-strømmingsfeil',

  // Resource errors
  'resource.error.unknownError': 'Ukjent feil.',
  'resource.error.unableToCreate': 'Kan ikke opprette {{name}}.',
  'resource.error.unableToUpdate': 'Kan ikke oppdatere {{name}}.',
  'resource.error.unableToDelete': 'Kan ikke slette {{name}}.',
  'resource.error.notFound': 'Ikke funnet.',
  'resource.error.badRequest': 'Ugyldig forespørsel.',
  'resource.error.unauthorized': 'Uautorisert.',

  // Project errors
  'project.error.nameAndTypeRequired': 'navn og projectType er påkrevd',
  'project.error.notFound': 'Ikke funnet',

  // Device errors
  'device.error.unauthorized': 'Uautorisert.',
  'device.error.badRequest': 'Ugyldig forespørsel.',
  'device.error.notFound': 'Ikke funnet.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Kunne ikke lese {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Kunne ikke skrive {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Kunne ikke slette {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Betalingsleverandør er påkrevd.',
  'user.payment.subscriptionIdRequired': 'subscriptionId er påkrevd.',
  'user.payment.receiptAndPlanRequired': 'kvittering og planKey er påkrevd.',
  'user.payment.verificationNotConfigured':
    'Betalingsverifisering er ikke konfigurert for {{provider}}.',
  'user.payment.invalidPlan': 'Ugyldig plan.',
  'user.payment.verificationFailed': 'Kunne ikke verifisere abonnement.',
  'user.payment.unknownPlan': 'Ukjent plan.',
  'user.payment.invalidWebhookEvent': 'Ugyldig webhook-hendelse.',
}
