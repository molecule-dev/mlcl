/**
 * Catalan translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Carregant...',
  'common.saving': 'Desant...',
  'common.close': 'Tanca',
  'common.goBack': 'Torna enrere',
  'common.submit': 'Envia',
  'common.continue': 'Continua',

  // Auth - Login
  'auth.login.email': 'Correu electrònic',
  'auth.login.password': 'Contrasenya',
  'auth.login.twoFactor': 'Codi de doble factor (Si està activat)',
  'auth.login.signUp': 'Registra\'t',
  'auth.login.loggingIn': 'Iniciant sessió...',
  'auth.login.logIn': 'Inicia sessió',
  'auth.login.forgotPassword': 'Has oblidat la contrasenya?',

  // Auth - Signup
  'auth.signup.email': 'Correu electrònic (Obligatori)',
  'auth.signup.password': 'Contrasenya (Obligatori)',
  'auth.signup.name': 'El teu nom',
  'auth.signup.signingUp': 'Registrant...',
  'auth.signup.signUp': 'Registra\'t',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Si existeix un compte amb aquest correu electrònic, s\'ha enviat un enllaç per restablir la contrasenya.',
  'auth.forgotPassword.email': 'Correu electrònic',
  'auth.forgotPassword.submitting': 'Enviant...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Correu electrònic',
  'auth.resetPassword.token': 'Codi de restabliment de contrasenya',
  'auth.resetPassword.newPassword': 'Introdueix la nova contrasenya',
  'auth.resetPassword.twoFactor': 'Codi de doble factor (Si està activat)',
  'auth.resetPassword.loggingIn': 'Iniciant sessió...',
  'auth.resetPassword.submit': 'Estableix la contrasenya i inicia sessió',

  // Home
  'home.greeting': 'Hola, ',
  'home.world': 'Món',

  // Settings
  'settings.account': 'Compte',
  'settings.email': 'Correu electrònic',
  'settings.authentication': 'Autenticació',
  'settings.changePassword': 'Canvia la contrasenya',
  'settings.twoFactor': 'Autenticació de doble factor',
  'settings.notifications': 'Notificacions',
  'settings.pushNotifications': 'Notificacions push',
  'settings.billing': 'Facturació',
  'settings.plan': 'Pla: ',
  'settings.upgrade': 'Millora',
  'settings.devices': 'Dispositius',
  'settings.noDevices': 'No s\'han trobat dispositius',
  'settings.thisDevice': 'Aquest dispositiu',
  'settings.platform': 'Plataforma',
  'settings.browser': 'Navegador',
  'settings.network': 'Xarxa',
  'settings.online': 'En línia',
  'settings.offline': 'Fora de línia',
  'settings.unknown': 'Desconegut',
  'settings.logOut': 'Tanca la sessió',
  'settings.deleteAccount': 'Elimina el compte',
  'settings.changePasswordModal.title': 'Canvia la contrasenya',
  'settings.changePasswordModal.error': 'No s\'ha pogut canviar la contrasenya.',
  'settings.changePasswordModal.currentPassword': 'Contrasenya actual',
  'settings.changePasswordModal.newPassword': 'Nova contrasenya',
  'settings.changePasswordModal.changing': 'Canviant...',
  'settings.deleteAccountModal.title': 'Elimina el compte',
  'settings.deleteAccountModal.warning':
    'Aquesta acció no es pot desfer. Introdueix la teva contrasenya per confirmar.',
  'settings.deleteAccountModal.password': 'Contrasenya',
  'settings.deleteAccountModal.deleting': 'Eliminant...',
  'settings.changePasswordModal.submit': 'Canvia la contrasenya',
  'settings.deleteAccountModal.submit': 'Elimina el compte',
  'settings.failedToUpdateEmail': 'No s\'ha pogut actualitzar el correu electrònic.',
  'settings.failedToDeleteAccount': 'No s\'ha pogut eliminar el compte.',
  'settings.toggleTwoFactor': 'Commuta l\'autenticació de dos factors',
  'settings.togglePushNotifications': 'Commuta les notificacions push',

  // Footer
  'footer.about': 'Sobre {{appName}}',
  'footer.privacyPolicy': 'Política de privacitat',
  'footer.termsOfService': 'Termes del servei',
  'footer.language': 'Idioma',

  // OAuth
  'oauth.orContinueWith': 'O continua amb',
  'oauth.continueWith': 'Continua amb {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Canvia el tema',

  // User Menu
  'userMenu.open': 'Obre el menú d\'usuari',

  // Plan Updated
  'planUpdated.message': 'El teu pla s\'ha actualitzat.',
  'planUpdated.thankYou': 'Gràcies!',
  'planUpdated.returnHome': 'Torna a l\'inici',

  // PWA
  'pwa.updateAvailable': 'Nova versió disponible!',
  'pwa.update': 'Actualitzar',
  'pwa.updating': 'Actualitzant...',

  // User API errors
  'user.error.badRequest': 'Sol·licitud incorrecta.',
  'user.error.notFound': 'No trobat.',
  'user.error.failedToCreateSession': "No s'ha pogut crear la sessió.",
  'user.error.usernameRequired': "Es requereix un nom d'usuari.",
  'user.error.passwordRequired': 'Es requereix una contrasenya.',
  'user.error.emailInvalid': 'El correu electrònic no és vàlid.',
  'user.error.usernameUnavailable': "El nom d'usuari no està disponible.",
  'user.error.emailAlreadyRegistered': 'El correu electrònic ja està registrat.',
  'user.error.failedToHashPassword': "No s'ha pogut xifrar la contrasenya.",
  'user.error.invalidCredentials': 'Credencials no vàlides.',
  'user.error.invalidTwoFactorToken': 'Token de doble factor no vàlid.',
  'user.error.twoFactorVerificationUnavailable': 'Verificació de doble factor no disponible.',
  'user.error.loginFailed': "L'inici de sessió ha fallat.",
  'user.error.usernameCannotBeEmpty': "El nom d'usuari no pot estar buit.",
  'user.error.failedToUpdateUser': "No s'ha pogut actualitzar l'usuari.",
  'user.error.failedToDeleteUser': "No s'ha pogut eliminar l'usuari.",
  'user.error.failedToReadUser': "No s'ha pogut llegir l'usuari.",
  'user.error.emailRequired': 'Es requereix un correu electrònic.',
  'user.error.failedToProcessPasswordReset':
    "No s'ha pogut processar el restabliment de contrasenya.",
  'user.error.newPasswordRequired': 'Es requereix una contrasenya nova.',
  'user.error.currentPasswordRequired': 'Es requereix la contrasenya actual.',
  'user.error.currentPasswordIncorrect': 'La contrasenya actual és incorrecta.',
  'user.error.failedToUpdatePassword': "No s'ha pogut actualitzar la contrasenya.",
  'user.error.planKeyRequired': 'Es requereix planKey.',
  'user.error.invalidPlan': 'Pla no vàlid.',
  'user.error.failedToUpdateSubscription': "No s'ha pogut actualitzar la subscripció.",
  'user.error.failedToUpdatePlan': "No s'ha pogut actualitzar el pla.",
  'user.error.twoFactorNotAvailable': "L'autenticació de doble factor no està disponible.",
  'user.error.tokenRequired': 'Es requereix un token.',
  'user.error.noPendingTwoFactorSetup':
    'No hi ha cap configuració de doble factor pendent. Crideu primer amb l\'acció "setup".',
  'user.error.invalidToken': 'Token no vàlid.',
  'user.error.twoFactorNotEnabled': 'El doble factor no està activat.',
  'user.error.invalidAction': 'Acció no vàlida. Utilitzeu "setup", "enable" o "disable".',
  'user.error.twoFactorOperationFailed': "L'operació de doble factor ha fallat.",
  'user.error.oauthServerNotConfigured': 'El servidor OAuth "{{server}}" no està configurat.',
  'user.error.oauthVerificationFailed': 'La verificació OAuth ha fallat.',
  'user.error.failedToCreateUser': "No s'ha pogut crear l'usuari.",
  'user.error.oauthLoginFailed': "L'inici de sessió OAuth ha fallat.",

  // Auth client errors
  'auth.error.requestFailed': 'La sol·licitud ha fallat',
  'auth.error.loginFailed': "L'inici de sessió ha fallat",
  'auth.error.registrationFailed': 'El registre ha fallat',
  'auth.error.noRefreshToken': "No hi ha token d'actualització disponible",

  // Form validation
  'forms.required': 'Aquest camp és obligatori',
  'forms.min': 'El valor ha de ser com a mínim {{min}}',
  'forms.max': 'El valor ha de ser com a màxim {{max}}',
  'forms.minLength': 'Ha de tenir com a mínim {{minLength}} caràcters',
  'forms.maxLength': 'Ha de tenir com a màxim {{maxLength}} caràcters',
  'forms.invalidFormat': 'Format no vàlid',
  'forms.invalidEmail': 'Adreça de correu electrònic no vàlida',
  'forms.invalidUrl': 'URL no vàlida',
  'forms.invalidValue': 'Valor no vàlid',

  // HTTP client errors
  'http.error.requestFailed': "La sol·licitud ha fallat amb l'estat {{status}}.",
  'http.error.networkError': 'Error de xarxa.',

  // Routing errors
  'routing.error.missingParam': 'Falta el paràmetre "{{name}}" per al camí "{{pattern}}"',
  'routing.error.routeNotFound': 'La ruta "{{name}}" no s\'ha trobat',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter s'ha d'utilitzar dins d'un MoleculeRouterProvider",

  // Push notification errors
  'push.error.notSupported': 'Les notificacions push no són compatibles',
  'push.error.permissionNotGranted': 'Permís de notificació no concedit',

  // Utility errors
  'error.networkError': 'Error de xarxa. Si us plau, comproveu la vostra connexió.',
  'error.timeout': "La sol·licitud ha excedit el temps d'espera. Si us plau, torneu-ho a provar.",
  'error.unauthorized': 'No esteu autoritzat per realitzar aquesta acció.',
  'error.forbidden': 'Accés denegat.',
  'error.notFound': 'Recurs no trobat.',
  'error.validationError': 'Si us plau, comproveu les vostres dades i torneu-ho a provar.',
  'error.serverError': 'Error del servidor. Si us plau, torneu-ho a provar més tard.',
  'error.unknown': "S'ha produït un error inesperat.",

  // AI conversation errors
  'conversation.error.messageRequired': 'Es requereix un missatge',
  'conversation.error.aiNotConfigured': "Proveïdor d'IA no configurat",
  'conversation.error.unknownAiError': "Error d'IA desconegut",
  'conversation.error.notFound': "No s'ha trobat cap conversa",
  'conversation.error.streamError': "Error de transmissió d'IA",

  // Resource errors
  'resource.error.unknownError': 'Error desconegut.',
  'resource.error.unableToCreate': "No s'ha pogut crear {{name}}.",
  'resource.error.unableToUpdate': "No s'ha pogut actualitzar {{name}}.",
  'resource.error.unableToDelete': "No s'ha pogut eliminar {{name}}.",
  'resource.error.notFound': 'No trobat.',
  'resource.error.badRequest': 'Sol·licitud incorrecta.',
  'resource.error.unauthorized': 'No autoritzat.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Es requereixen nom i tipus de projecte',
  'project.error.notFound': 'No trobat',

  // Device errors
  'device.error.unauthorized': 'No autoritzat.',
  'device.error.badRequest': 'Sol·licitud incorrecta.',
  'device.error.notFound': 'No trobat.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': "No s'ha pogut llegir {{path}}: {{error}}",
  'codeSandbox.docker.error.writeFailed': "No s'ha pogut escriure {{path}}: {{error}}",
  'codeSandbox.docker.error.deleteFailed': "No s'ha pogut eliminar {{path}}: {{error}}",
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Es requereix el proveïdor de pagament.',
  'user.payment.subscriptionIdRequired': 'Es requereix subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Es requereixen receipt i planKey.',
  'user.payment.verificationNotConfigured':
    'La verificació de pagament no està configurada per a {{provider}}.',
  'user.payment.invalidPlan': 'Pla no vàlid.',
  'user.payment.verificationFailed': "No s'ha pogut verificar la subscripció.",
  'user.payment.unknownPlan': 'Pla desconegut.',
  'user.payment.invalidWebhookEvent': 'Esdeveniment de webhook no vàlid.',
}
