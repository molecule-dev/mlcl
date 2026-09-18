/**
 * Galician translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Cargando...',
  'common.saving': 'Gardando...',
  'common.close': 'Pechar',
  'common.goBack': 'Volver',
  'common.submit': 'Enviar',
  'common.continue': 'Continuar',

  // Auth - Login
  'auth.login.email': 'Correo electrónico',
  'auth.login.password': 'Contrasinal',
  'auth.login.twoFactor': 'Código de dobre factor (Se está activado)',
  'auth.login.signUp': 'Rexistrarse',
  'auth.login.loggingIn': 'Iniciando sesión...',
  'auth.login.logIn': 'Iniciar sesión',
  'auth.login.forgotPassword': 'Esqueceu o contrasinal?',

  // Auth - Signup
  'auth.signup.email': 'Correo electrónico (Obrigatorio)',
  'auth.signup.password': 'Contrasinal (Obrigatorio)',
  'auth.signup.name': 'O seu nome',
  'auth.signup.signingUp': 'Rexistrando...',
  'auth.signup.signUp': 'Rexistrarse',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Se existe unha conta con ese correo electrónico, enviouse unha ligazón para restablecer o contrasinal.',
  'auth.forgotPassword.email': 'Correo electrónico',
  'auth.forgotPassword.submitting': 'Enviando...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Correo electrónico',
  'auth.resetPassword.token': 'Código de restablecemento do contrasinal',
  'auth.resetPassword.newPassword': 'Introduza o novo contrasinal',
  'auth.resetPassword.twoFactor': 'Código de dobre factor (Se está activado)',
  'auth.resetPassword.loggingIn': 'Iniciando sesión...',
  'auth.resetPassword.submit': 'Establecer contrasinal e iniciar sesión',

  // Home
  'home.greeting': 'Ola, ',
  'home.world': 'Mundo',

  // Settings
  'settings.account': 'Conta',
  'settings.email': 'Correo electrónico',
  'settings.authentication': 'Autenticación',
  'settings.changePassword': 'Cambiar contrasinal',
  'settings.twoFactor': 'Autenticación de dobre factor',
  'settings.notifications': 'Notificacións',
  'settings.pushNotifications': 'Notificacións push',
  'settings.billing': 'Facturación',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Mellorar',
  'settings.devices': 'Dispositivos',
  'settings.noDevices': 'Non se atoparon dispositivos',
  'settings.thisDevice': 'Este dispositivo',
  'settings.platform': 'Plataforma',
  'settings.browser': 'Navegador',
  'settings.network': 'Rede',
  'settings.online': 'En liña',
  'settings.offline': 'Fora de liña',
  'settings.unknown': 'Descoñecido',
  'settings.logOut': 'Pechar sesión',
  'settings.deleteAccount': 'Eliminar conta',
  'settings.changePasswordModal.title': 'Cambiar contrasinal',
  'settings.changePasswordModal.error': 'Non se puido cambiar o contrasinal.',
  'settings.changePasswordModal.currentPassword': 'Contrasinal actual',
  'settings.changePasswordModal.newPassword': 'Novo contrasinal',
  'settings.changePasswordModal.changing': 'Cambiando...',
  'settings.deleteAccountModal.title': 'Eliminar conta',
  'settings.deleteAccountModal.warning':
    'Esta acción non se pode desfacer. Introduza o seu contrasinal para confirmar.',
  'settings.deleteAccountModal.password': 'Contrasinal',
  'settings.deleteAccountModal.deleting': 'Eliminando...',
  'settings.changePasswordModal.submit': 'Cambiar contrasinal',
  'settings.deleteAccountModal.submit': 'Eliminar conta',
  'settings.failedToUpdateEmail': 'Erro ao actualizar o correo electrónico.',
  'settings.failedToDeleteAccount': 'Erro ao eliminar a conta.',
  'settings.toggleTwoFactor': 'Alternar autenticación de dous factores',
  'settings.togglePushNotifications': 'Alternar notificacións push',

  // Footer
  'footer.about': 'Sobre {{appName}}',
  'footer.privacyPolicy': 'Política de privacidade',
  'footer.termsOfService': 'Termos do servizo',
  'footer.language': 'Idioma',

  // OAuth
  'oauth.orContinueWith': 'Ou continuar con',
  'oauth.continueWith': 'Continuar con {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Cambiar tema',

  // User Menu
  'userMenu.open': 'Abrir menú de usuario',

  // Plan Updated
  'planUpdated.message': 'O seu plan foi actualizado.',
  'planUpdated.thankYou': 'Grazas!',
  'planUpdated.returnHome': 'Volver ao inicio',

  // PWA
  'pwa.updateAvailable': 'Nova versión dispoñible!',
  'pwa.update': 'Actualizar',
  'pwa.updating': 'Actualizando...',

  // User API errors
  'user.error.badRequest': 'Solicitude incorrecta.',
  'user.error.notFound': 'Non atopado.',
  'user.error.failedToCreateSession': 'Non se puido crear a sesión.',
  'user.error.usernameRequired': 'Requírese un nome de usuario.',
  'user.error.passwordRequired': 'Requírese un contrasinal.',
  'user.error.emailInvalid': 'O correo electrónico non é válido.',
  'user.error.usernameUnavailable': 'O nome de usuario non está dispoñible.',
  'user.error.emailAlreadyRegistered': 'O correo electrónico xa está rexistrado.',
  'user.error.failedToHashPassword': 'Non se puido cifrar o contrasinal.',
  'user.error.invalidCredentials': 'Credenciais non válidas.',
  'user.error.invalidTwoFactorToken': 'Token de dobre factor non válido.',
  'user.error.twoFactorVerificationUnavailable': 'Verificación de dobre factor non dispoñible.',
  'user.error.loginFailed': 'O inicio de sesión fallou.',
  'user.error.usernameCannotBeEmpty': 'O nome de usuario non pode estar baleiro.',
  'user.error.failedToUpdateUser': 'Non se puido actualizar o usuario.',
  'user.error.failedToDeleteUser': 'Non se puido eliminar o usuario.',
  'user.error.failedToReadUser': 'Non se puido ler o usuario.',
  'user.error.emailRequired': 'Requírese un correo electrónico.',
  'user.error.failedToProcessPasswordReset':
    'Non se puido procesar o restablecemento de contrasinal.',
  'user.error.newPasswordRequired': 'Requírese un contrasinal novo.',
  'user.error.currentPasswordRequired': 'Requírese o contrasinal actual.',
  'user.error.currentPasswordIncorrect': 'O contrasinal actual é incorrecto.',
  'user.error.failedToUpdatePassword': 'Non se puido actualizar o contrasinal.',
  'user.error.planKeyRequired': 'Requírese planKey.',
  'user.error.invalidPlan': 'Plan non válido.',
  'user.error.failedToUpdateSubscription': 'Non se puido actualizar a subscrición.',
  'user.error.failedToUpdatePlan': 'Non se puido actualizar o plan.',
  'user.error.twoFactorNotAvailable': 'A autenticación de dobre factor non está dispoñible.',
  'user.error.tokenRequired': 'Requírese un token.',
  'user.error.noPendingTwoFactorSetup':
    'Non hai configuración de dobre factor pendente. Chame primeiro coa acción "setup".',
  'user.error.invalidToken': 'Token non válido.',
  'user.error.twoFactorNotEnabled': 'O dobre factor non está activado.',
  'user.error.invalidAction': 'Acción non válida. Use "setup", "enable" ou "disable".',
  'user.error.twoFactorOperationFailed': 'A operación de dobre factor fallou.',
  'user.error.oauthServerNotConfigured': 'O servidor OAuth "{{server}}" non está configurado.',
  'user.error.oauthVerificationFailed': 'A verificación OAuth fallou.',
  'user.error.failedToCreateUser': 'Non se puido crear o usuario.',
  'user.error.oauthLoginFailed': 'O inicio de sesión OAuth fallou.',

  // Auth client errors
  'auth.error.requestFailed': 'A solicitude fallou',
  'auth.error.loginFailed': 'O inicio de sesión fallou',
  'auth.error.registrationFailed': 'O rexistro fallou',
  'auth.error.noRefreshToken': 'Non hai token de actualización dispoñible',

  // Form validation
  'forms.required': 'Este campo é obrigatorio',
  'forms.min': 'O valor debe ser polo menos {{min}}',
  'forms.max': 'O valor debe ser como máximo {{max}}',
  'forms.minLength': 'Debe ter polo menos {{minLength}} caracteres',
  'forms.maxLength': 'Debe ter como máximo {{maxLength}} caracteres',
  'forms.invalidFormat': 'Formato non válido',
  'forms.invalidEmail': 'Enderezo de correo electrónico non válido',
  'forms.invalidUrl': 'URL non válido',
  'forms.invalidValue': 'Valor non válido',

  // HTTP client errors
  'http.error.requestFailed': 'A solicitude fallou co estado {{status}}.',
  'http.error.networkError': 'Erro de rede.',

  // Routing errors
  'routing.error.missingParam': 'Falta o parámetro "{{name}}" para a ruta "{{pattern}}"',
  'routing.error.routeNotFound': 'Non se atopou a ruta "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter debe usarse dentro dun MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'As notificacións push non son compatibles',
  'push.error.permissionNotGranted': 'Permiso de notificación non concedido',

  // Utility errors
  'error.networkError': 'Erro de rede. Por favor, comprobe a súa conexión.',
  'error.timeout': 'A solicitude excedeu o tempo de espera. Por favor, inténteo de novo.',
  'error.unauthorized': 'Non está autorizado para realizar esta acción.',
  'error.forbidden': 'Acceso denegado.',
  'error.notFound': 'Recurso non atopado.',
  'error.validationError': 'Por favor, comprobe os seus datos e inténteo de novo.',
  'error.serverError': 'Erro do servidor. Por favor, inténteo de novo máis tarde.',
  'error.unknown': 'Produciuse un erro inesperado.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Requírese unha mensaxe',
  'conversation.error.aiNotConfigured': 'Provedor de IA non configurado',
  'conversation.error.unknownAiError': 'Erro de IA descoñecido',
  'conversation.error.notFound': 'Non se atopou ningunha conversa',
  'conversation.error.streamError': 'Erro de transmisión de IA',

  // Resource errors
  'resource.error.unknownError': 'Erro descoñecido.',
  'resource.error.unableToCreate': 'Non se puido crear {{name}}.',
  'resource.error.unableToUpdate': 'Non se puido actualizar {{name}}.',
  'resource.error.unableToDelete': 'Non se puido eliminar {{name}}.',
  'resource.error.notFound': 'Non atopado.',
  'resource.error.badRequest': 'Solicitude incorrecta.',
  'resource.error.unauthorized': 'Non autorizado.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Requírense nome e tipo de proxecto',
  'project.error.notFound': 'Non atopado',

  // Device errors
  'device.error.unauthorized': 'Non autorizado.',
  'device.error.badRequest': 'Solicitude incorrecta.',
  'device.error.notFound': 'Non atopado.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Erro ao ler {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Erro ao escribir {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Erro ao eliminar {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Requírese o provedor de pagamento.',
  'user.payment.subscriptionIdRequired': 'Requírese subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Requírense receipt e planKey.',
  'user.payment.verificationNotConfigured':
    'A verificación de pagamento non está configurada para {{provider}}.',
  'user.payment.invalidPlan': 'Plan non válido.',
  'user.payment.verificationFailed': 'Non se puido verificar a subscrición.',
  'user.payment.unknownPlan': 'Plan descoñecido.',
  'user.payment.invalidWebhookEvent': 'Evento de webhook non válido.',
}
