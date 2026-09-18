/**
 * German translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Laden...',
  'common.saving': 'Speichern...',
  'common.close': 'Schließen',
  'common.goBack': 'Zurück',
  'common.submit': 'Absenden',
  'common.continue': 'Weiter',

  // Auth - Login
  'auth.login.email': 'E-Mail',
  'auth.login.password': 'Passwort',
  'auth.login.twoFactor': 'Zwei-Faktor-Token (falls aktiviert)',
  'auth.login.signUp': 'Registrieren',
  'auth.login.loggingIn': 'Anmeldung läuft...',
  'auth.login.logIn': 'Anmelden',
  'auth.login.forgotPassword': 'Passwort vergessen?',

  // Auth - Signup
  'auth.signup.email': 'E-Mail (erforderlich)',
  'auth.signup.password': 'Passwort (erforderlich)',
  'auth.signup.name': 'Ihr Name',
  'auth.signup.signingUp': 'Registrierung läuft...',
  'auth.signup.signUp': 'Registrieren',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.',
  'auth.forgotPassword.email': 'E-Mail',
  'auth.forgotPassword.submitting': 'Wird gesendet...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-Mail',
  'auth.resetPassword.token': 'Zurücksetzungs-Token',
  'auth.resetPassword.newPassword': 'Neues Passwort',
  'auth.resetPassword.twoFactor': 'Zwei-Faktor-Token (falls aktiviert)',
  'auth.resetPassword.loggingIn': 'Anmeldung läuft...',
  'auth.resetPassword.submit': 'Passwort festlegen und anmelden',

  // Home
  'home.greeting': 'Hallo, ',
  'home.world': 'Welt',

  // Settings
  'settings.account': 'Konto',
  'settings.email': 'E-Mail',
  'settings.authentication': 'Authentifizierung',
  'settings.changePassword': 'Passwort ändern',
  'settings.twoFactor': 'Zwei-Faktor-Authentifizierung',
  'settings.notifications': 'Benachrichtigungen',
  'settings.pushNotifications': 'Push-Benachrichtigungen',
  'settings.billing': 'Abrechnung',
  'settings.plan': 'Tarif: ',
  'settings.upgrade': 'Upgraden',
  'settings.devices': 'Geräte',
  'settings.noDevices': 'Keine Geräte gefunden',
  'settings.thisDevice': 'Dieses Gerät',
  'settings.platform': 'Plattform',
  'settings.browser': 'Browser',
  'settings.network': 'Netzwerk',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Unbekannt',
  'settings.logOut': 'Abmelden',
  'settings.deleteAccount': 'Konto löschen',
  'settings.changePasswordModal.title': 'Passwort ändern',
  'settings.changePasswordModal.error': 'Passwort konnte nicht geändert werden.',
  'settings.changePasswordModal.currentPassword': 'Aktuelles Passwort',
  'settings.changePasswordModal.newPassword': 'Neues Passwort',
  'settings.changePasswordModal.changing': 'Wird geändert...',
  'settings.deleteAccountModal.title': 'Konto löschen',
  'settings.deleteAccountModal.warning':
    'Diese Aktion kann nicht rückgängig gemacht werden. Bitte geben Sie Ihr Passwort zur Bestätigung ein.',
  'settings.deleteAccountModal.password': 'Passwort',
  'settings.deleteAccountModal.deleting': 'Wird gelöscht...',
  'settings.changePasswordModal.submit': 'Passwort ändern',
  'settings.deleteAccountModal.submit': 'Konto löschen',
  'settings.failedToUpdateEmail': 'E-Mail konnte nicht aktualisiert werden.',
  'settings.failedToDeleteAccount': 'Konto konnte nicht gelöscht werden.',
  'settings.toggleTwoFactor': 'Zwei-Faktor-Authentifizierung umschalten',
  'settings.togglePushNotifications': 'Push-Benachrichtigungen umschalten',

  // Footer
  'footer.about': 'Über {{appName}}',
  'footer.privacyPolicy': 'Datenschutzrichtlinie',
  'footer.termsOfService': 'Nutzungsbedingungen',
  'footer.language': 'Sprache',

  // OAuth
  'oauth.orContinueWith': 'Oder fortfahren mit',
  'oauth.continueWith': 'Fortfahren mit {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Thema wechseln',

  // User Menu
  'userMenu.open': 'Benutzermenü öffnen',

  // Plan Updated
  'planUpdated.message': 'Ihr Tarif wurde aktualisiert.',
  'planUpdated.thankYou': 'Vielen Dank!',
  'planUpdated.returnHome': 'Zur Startseite',

  // PWA
  'pwa.updateAvailable': 'Neue Version verfügbar!',
  'pwa.update': 'Aktualisieren',
  'pwa.updating': 'Wird aktualisiert...',

  // User API errors
  'user.error.badRequest': 'Ungültige Anfrage.',
  'user.error.notFound': 'Nicht gefunden.',
  'user.error.failedToCreateSession': 'Sitzung konnte nicht erstellt werden.',
  'user.error.usernameRequired': 'Benutzername ist erforderlich.',
  'user.error.passwordRequired': 'Passwort ist erforderlich.',
  'user.error.emailInvalid': 'E-Mail ist ungültig.',
  'user.error.usernameUnavailable': 'Benutzername ist nicht verfügbar.',
  'user.error.emailAlreadyRegistered': 'E-Mail ist bereits registriert.',
  'user.error.failedToHashPassword': 'Passwort konnte nicht gehasht werden.',
  'user.error.invalidCredentials': 'Ungültige Anmeldedaten.',
  'user.error.invalidTwoFactorToken': 'Ungültiges Zwei-Faktor-Token.',
  'user.error.twoFactorVerificationUnavailable': 'Zwei-Faktor-Verifizierung nicht verfügbar.',
  'user.error.loginFailed': 'Anmeldung fehlgeschlagen.',
  'user.error.usernameCannotBeEmpty': 'Benutzername darf nicht leer sein.',
  'user.error.failedToUpdateUser': 'Benutzer konnte nicht aktualisiert werden.',
  'user.error.failedToDeleteUser': 'Benutzer konnte nicht gelöscht werden.',
  'user.error.failedToReadUser': 'Benutzer konnte nicht gelesen werden.',
  'user.error.emailRequired': 'E-Mail ist erforderlich.',
  'user.error.failedToProcessPasswordReset':
    'Passwortzurücksetzung konnte nicht verarbeitet werden.',
  'user.error.newPasswordRequired': 'Neues Passwort ist erforderlich.',
  'user.error.currentPasswordRequired': 'Aktuelles Passwort ist erforderlich.',
  'user.error.currentPasswordIncorrect': 'Aktuelles Passwort ist falsch.',
  'user.error.failedToUpdatePassword': 'Passwort konnte nicht aktualisiert werden.',
  'user.error.planKeyRequired': 'planKey ist erforderlich.',
  'user.error.invalidPlan': 'Ungültiger Tarif.',
  'user.error.failedToUpdateSubscription': 'Abonnement konnte nicht aktualisiert werden.',
  'user.error.failedToUpdatePlan': 'Tarif konnte nicht aktualisiert werden.',
  'user.error.twoFactorNotAvailable': 'Zwei-Faktor-Authentifizierung ist nicht verfügbar.',
  'user.error.tokenRequired': 'Token ist erforderlich.',
  'user.error.noPendingTwoFactorSetup':
    'Keine ausstehende Zwei-Faktor-Einrichtung. Rufen Sie zuerst mit der Aktion "setup" auf.',
  'user.error.invalidToken': 'Ungültiges Token.',
  'user.error.twoFactorNotEnabled': 'Zwei-Faktor ist nicht aktiviert.',
  'user.error.invalidAction': 'Ungültige Aktion. Verwenden Sie "setup", "enable" oder "disable".',
  'user.error.twoFactorOperationFailed': 'Zwei-Faktor-Vorgang fehlgeschlagen.',
  'user.error.oauthServerNotConfigured': 'OAuth-Server "{{server}}" ist nicht konfiguriert.',
  'user.error.oauthVerificationFailed': 'OAuth-Verifizierung fehlgeschlagen.',
  'user.error.failedToCreateUser': 'Benutzer konnte nicht erstellt werden.',
  'user.error.oauthLoginFailed': 'OAuth-Anmeldung fehlgeschlagen.',

  // Auth client errors
  'auth.error.requestFailed': 'Anfrage fehlgeschlagen',
  'auth.error.loginFailed': 'Anmeldung fehlgeschlagen',
  'auth.error.registrationFailed': 'Registrierung fehlgeschlagen',
  'auth.error.noRefreshToken': 'Kein Aktualisierungstoken verfügbar',

  // Form validation
  'forms.required': 'Dieses Feld ist erforderlich',
  'forms.min': 'Der Wert muss mindestens {{min}} betragen',
  'forms.max': 'Der Wert darf höchstens {{max}} betragen',
  'forms.minLength': 'Muss mindestens {{minLength}} Zeichen lang sein',
  'forms.maxLength': 'Darf höchstens {{maxLength}} Zeichen lang sein',
  'forms.invalidFormat': 'Ungültiges Format',
  'forms.invalidEmail': 'Ungültige E-Mail-Adresse',
  'forms.invalidUrl': 'Ungültige URL',
  'forms.invalidValue': 'Ungültiger Wert',

  // HTTP client errors
  'http.error.requestFailed': 'Anfrage fehlgeschlagen mit Status {{status}}.',
  'http.error.networkError': 'Netzwerkfehler.',

  // Routing errors
  'routing.error.missingParam': 'Fehlender Parameter "{{name}}" für Pfad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" nicht gefunden',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter muss innerhalb eines MoleculeRouterProvider verwendet werden',

  // Push notification errors
  'push.error.notSupported': 'Push-Benachrichtigungen werden nicht unterstützt',
  'push.error.permissionNotGranted': 'Benachrichtigungsberechtigung nicht erteilt',

  // Utility errors
  'error.networkError': 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.',
  'error.timeout': 'Zeitüberschreitung der Anfrage. Bitte versuchen Sie es erneut.',
  'error.unauthorized': 'Sie sind nicht berechtigt, diese Aktion auszuführen.',
  'error.forbidden': 'Zugriff verweigert.',
  'error.notFound': 'Ressource nicht gefunden.',
  'error.validationError': 'Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.',
  'error.serverError': 'Serverfehler. Bitte versuchen Sie es später erneut.',
  'error.unknown': 'Ein unerwarteter Fehler ist aufgetreten.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Nachricht ist erforderlich',
  'conversation.error.aiNotConfigured': 'KI-Anbieter nicht konfiguriert',
  'conversation.error.unknownAiError': 'Unbekannter KI-Fehler',
  'conversation.error.notFound': 'Keine Konversation gefunden',
  'conversation.error.streamError': 'KI-Streaming-Fehler',

  // Resource errors
  'resource.error.unknownError': 'Unbekannter Fehler.',
  'resource.error.unableToCreate': '{{name}} konnte nicht erstellt werden.',
  'resource.error.unableToUpdate': '{{name}} konnte nicht aktualisiert werden.',
  'resource.error.unableToDelete': '{{name}} konnte nicht gelöscht werden.',
  'resource.error.notFound': 'Nicht gefunden.',
  'resource.error.badRequest': 'Ungültige Anfrage.',
  'resource.error.unauthorized': 'Nicht autorisiert.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Name und projectType sind erforderlich',
  'project.error.notFound': 'Nicht gefunden',

  // Device errors
  'device.error.unauthorized': 'Nicht autorisiert.',
  'device.error.badRequest': 'Ungültige Anfrage.',
  'device.error.notFound': 'Nicht gefunden.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Fehler beim Lesen von {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Fehler beim Schreiben von {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Fehler beim Löschen von {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker-API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Zahlungsanbieter ist erforderlich.',
  'user.payment.subscriptionIdRequired': 'subscriptionId ist erforderlich.',
  'user.payment.receiptAndPlanRequired': 'Quittung und planKey sind erforderlich.',
  'user.payment.verificationNotConfigured':
    'Zahlungsverifizierung ist nicht für {{provider}} konfiguriert.',
  'user.payment.invalidPlan': 'Ungültiger Tarif.',
  'user.payment.verificationFailed': 'Abonnement konnte nicht verifiziert werden.',
  'user.payment.unknownPlan': 'Unbekannter Tarif.',
  'user.payment.invalidWebhookEvent': 'Ungültiges Webhook-Ereignis.',
}
