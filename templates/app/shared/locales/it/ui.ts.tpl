/**
 * Italian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Caricamento...',
  'common.saving': 'Salvataggio...',
  'common.close': 'Chiudi',
  'common.goBack': 'Indietro',
  'common.submit': 'Invia',
  'common.continue': 'Continua',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Password',
  'auth.login.twoFactor': 'Token a due fattori (se abilitato)',
  'auth.login.signUp': 'Registrati',
  'auth.login.loggingIn': 'Accesso in corso...',
  'auth.login.logIn': 'Accedi',
  'auth.login.forgotPassword': 'Password dimenticata?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (obbligatoria)',
  'auth.signup.password': 'Password (obbligatoria)',
  'auth.signup.name': 'Il tuo nome',
  'auth.signup.signingUp': 'Registrazione in corso...',
  'auth.signup.signUp': 'Registrati',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Se esiste un account con questa e-mail, è stato inviato un link per reimpostare la password.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Invio in corso...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Token di reimpostazione',
  'auth.resetPassword.newPassword': 'Nuova password',
  'auth.resetPassword.twoFactor': 'Token a due fattori (se abilitato)',
  'auth.resetPassword.loggingIn': 'Accesso in corso...',
  'auth.resetPassword.submit': 'Imposta password e accedi',

  // Home
  'home.greeting': 'Ciao, ',
  'home.world': 'Mondo',

  // Settings
  'settings.account': 'Account',
  'settings.email': 'E-mail',
  'settings.authentication': 'Autenticazione',
  'settings.changePassword': 'Cambia password',
  'settings.twoFactor': 'Autenticazione a due fattori',
  'settings.notifications': 'Notifiche',
  'settings.pushNotifications': 'Notifiche push',
  'settings.billing': 'Fatturazione',
  'settings.plan': 'Piano: ',
  'settings.upgrade': 'Aggiorna',
  'settings.devices': 'Dispositivi',
  'settings.noDevices': 'Nessun dispositivo trovato',
  'settings.thisDevice': 'Questo dispositivo',
  'settings.platform': 'Piattaforma',
  'settings.browser': 'Browser',
  'settings.network': 'Rete',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Sconosciuto',
  'settings.logOut': 'Esci',
  'settings.deleteAccount': 'Elimina account',
  'settings.changePasswordModal.title': 'Cambia password',
  'settings.changePasswordModal.error': 'Impossibile cambiare la password.',
  'settings.changePasswordModal.currentPassword': 'Password attuale',
  'settings.changePasswordModal.newPassword': 'Nuova password',
  'settings.changePasswordModal.changing': 'Modifica in corso...',
  'settings.deleteAccountModal.title': 'Elimina account',
  'settings.deleteAccountModal.warning':
    'Questa azione non può essere annullata. Inserisci la tua password per confermare.',
  'settings.deleteAccountModal.password': 'Password',
  'settings.deleteAccountModal.deleting': 'Eliminazione in corso...',
  'settings.changePasswordModal.submit': 'Cambia password',
  'settings.deleteAccountModal.submit': 'Elimina account',
  'settings.failedToUpdateEmail': 'Impossibile aggiornare l\'email.',
  'settings.failedToDeleteAccount': 'Impossibile eliminare l\'account.',
  'settings.toggleTwoFactor': 'Attiva/disattiva l\'autenticazione a due fattori',
  'settings.togglePushNotifications': 'Attiva/disattiva le notifiche push',

  // Footer
  'footer.about': 'Informazioni su {{appName}}',
  'footer.privacyPolicy': 'Informativa sulla privacy',
  'footer.termsOfService': 'Termini di servizio',
  'footer.language': 'Lingua',

  // OAuth
  'oauth.orContinueWith': 'Oppure continua con',
  'oauth.continueWith': 'Continua con {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Cambia tema',

  // User Menu
  'userMenu.open': 'Apri menu utente',

  // Plan Updated
  'planUpdated.message': 'Il tuo piano è stato aggiornato.',
  'planUpdated.thankYou': 'Grazie!',
  'planUpdated.returnHome': 'Torna alla home',

  // PWA
  'pwa.updateAvailable': 'Nuova versione disponibile!',
  'pwa.update': 'Aggiorna',
  'pwa.updating': 'Aggiornamento...',

  // User API errors
  'user.error.badRequest': 'Richiesta non valida.',
  'user.error.notFound': 'Non trovato.',
  'user.error.failedToCreateSession': 'Impossibile creare la sessione.',
  'user.error.usernameRequired': 'Il nome utente è obbligatorio.',
  'user.error.passwordRequired': 'La password è obbligatoria.',
  'user.error.emailInvalid': "L'indirizzo email non è valido.",
  'user.error.usernameUnavailable': 'Il nome utente non è disponibile.',
  'user.error.emailAlreadyRegistered': "L'indirizzo email è già registrato.",
  'user.error.failedToHashPassword': 'Impossibile cifrare la password.',
  'user.error.invalidCredentials': 'Credenziali non valide.',
  'user.error.invalidTwoFactorToken': 'Token a due fattori non valido.',
  'user.error.twoFactorVerificationUnavailable': 'Verifica a due fattori non disponibile.',
  'user.error.loginFailed': "L'accesso è fallito.",
  'user.error.usernameCannotBeEmpty': 'Il nome utente non può essere vuoto.',
  'user.error.failedToUpdateUser': "Impossibile aggiornare l'utente.",
  'user.error.failedToDeleteUser': "Impossibile eliminare l'utente.",
  'user.error.failedToReadUser': "Impossibile leggere l'utente.",
  'user.error.emailRequired': "L'indirizzo email è obbligatorio.",
  'user.error.failedToProcessPasswordReset':
    'Impossibile elaborare la reimpostazione della password.',
  'user.error.newPasswordRequired': 'Una nuova password è obbligatoria.',
  'user.error.currentPasswordRequired': 'La password attuale è obbligatoria.',
  'user.error.currentPasswordIncorrect': 'La password attuale non è corretta.',
  'user.error.failedToUpdatePassword': 'Impossibile aggiornare la password.',
  'user.error.planKeyRequired': 'planKey è obbligatorio.',
  'user.error.invalidPlan': 'Piano non valido.',
  'user.error.failedToUpdateSubscription': "Impossibile aggiornare l'abbonamento.",
  'user.error.failedToUpdatePlan': 'Impossibile aggiornare il piano.',
  'user.error.twoFactorNotAvailable': "L'autenticazione a due fattori non è disponibile.",
  'user.error.tokenRequired': 'Il token è obbligatorio.',
  'user.error.noPendingTwoFactorSetup':
    'Nessuna configurazione a due fattori in sospeso. Chiamare prima con l\'azione "setup".',
  'user.error.invalidToken': 'Token non valido.',
  'user.error.twoFactorNotEnabled': "L'autenticazione a due fattori non è attivata.",
  'user.error.invalidAction': 'Azione non valida. Utilizzare "setup", "enable" o "disable".',
  'user.error.twoFactorOperationFailed': "L'operazione a due fattori è fallita.",
  'user.error.oauthServerNotConfigured': 'Il server OAuth "{{server}}" non è configurato.',
  'user.error.oauthVerificationFailed': 'La verifica OAuth è fallita.',
  'user.error.failedToCreateUser': "Impossibile creare l'utente.",
  'user.error.oauthLoginFailed': "L'accesso OAuth è fallito.",

  // Auth client errors
  'auth.error.requestFailed': 'La richiesta è fallita',
  'auth.error.loginFailed': "L'accesso è fallito",
  'auth.error.registrationFailed': 'La registrazione è fallita',
  'auth.error.noRefreshToken': 'Nessun token di aggiornamento disponibile',

  // Form validation
  'forms.required': 'Questo campo è obbligatorio',
  'forms.min': 'Il valore deve essere almeno {{min}}',
  'forms.max': 'Il valore deve essere al massimo {{max}}',
  'forms.minLength': 'Deve contenere almeno {{minLength}} caratteri',
  'forms.maxLength': 'Deve contenere al massimo {{maxLength}} caratteri',
  'forms.invalidFormat': 'Formato non valido',
  'forms.invalidEmail': 'Indirizzo email non valido',
  'forms.invalidUrl': 'URL non valido',
  'forms.invalidValue': 'Valore non valido',

  // HTTP client errors
  'http.error.requestFailed': 'La richiesta è fallita con lo stato {{status}}.',
  'http.error.networkError': 'Errore di rete.',

  // Routing errors
  'routing.error.missingParam': 'Parametro "{{name}}" mancante per il percorso "{{pattern}}"',
  'routing.error.routeNotFound': 'Percorso "{{name}}" non trovato',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter deve essere utilizzato all'interno di un MoleculeRouterProvider",

  // Push notification errors
  'push.error.notSupported': 'Le notifiche push non sono supportate',
  'push.error.permissionNotGranted': 'Permesso di notifica non concesso',

  // Utility errors
  'error.networkError': 'Errore di rete. Si prega di controllare la connessione.',
  'error.timeout': 'La richiesta è scaduta. Si prega di riprovare.',
  'error.unauthorized': 'Non sei autorizzato a eseguire questa azione.',
  'error.forbidden': 'Accesso negato.',
  'error.notFound': 'Risorsa non trovata.',
  'error.validationError': 'Si prega di controllare i dati inseriti e riprovare.',
  'error.serverError': 'Errore del server. Si prega di riprovare più tardi.',
  'error.unknown': 'Si è verificato un errore imprevisto.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Il messaggio è obbligatorio',
  'conversation.error.aiNotConfigured': 'Provider IA non configurato',
  'conversation.error.unknownAiError': 'Errore IA sconosciuto',
  'conversation.error.notFound': 'Nessuna conversazione trovata',
  'conversation.error.streamError': 'Errore di streaming IA',

  // Resource errors
  'resource.error.unknownError': 'Errore sconosciuto.',
  'resource.error.unableToCreate': 'Impossibile creare {{name}}.',
  'resource.error.unableToUpdate': 'Impossibile aggiornare {{name}}.',
  'resource.error.unableToDelete': 'Impossibile eliminare {{name}}.',
  'resource.error.notFound': 'Non trovato.',
  'resource.error.badRequest': 'Richiesta non valida.',
  'resource.error.unauthorized': 'Non autorizzato.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Nome e tipo di progetto sono obbligatori',
  'project.error.notFound': 'Non trovato',

  // Device errors
  'device.error.unauthorized': 'Non autorizzato.',
  'device.error.badRequest': 'Richiesta non valida.',
  'device.error.notFound': 'Non trovato.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Impossibile leggere {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Impossibile scrivere {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Impossibile eliminare {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Il fornitore di pagamento è obbligatorio.',
  'user.payment.subscriptionIdRequired': 'subscriptionId è obbligatorio.',
  'user.payment.receiptAndPlanRequired': 'receipt e planKey sono obbligatori.',
  'user.payment.verificationNotConfigured':
    'La verifica del pagamento non è configurata per {{provider}}.',
  'user.payment.invalidPlan': 'Piano non valido.',
  'user.payment.verificationFailed': "Impossibile verificare l'abbonamento.",
  'user.payment.unknownPlan': 'Piano sconosciuto.',
  'user.payment.invalidWebhookEvent': 'Evento webhook non valido.',
}
