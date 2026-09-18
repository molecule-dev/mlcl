/**
 * Spanish translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Cargando...',
  'common.saving': 'Guardando...',
  'common.close': 'Cerrar',
  'common.goBack': 'Volver',
  'common.submit': 'Enviar',
  'common.continue': 'Continuar',

  // Auth - Login
  'auth.login.email': 'Correo electrónico',
  'auth.login.password': 'Contraseña',
  'auth.login.twoFactor': 'Token de doble factor (si está habilitado)',
  'auth.login.signUp': 'Registrarse',
  'auth.login.loggingIn': 'Iniciando sesión...',
  'auth.login.logIn': 'Iniciar sesión',
  'auth.login.forgotPassword': '¿Olvidaste tu contraseña?',

  // Auth - Signup
  'auth.signup.email': 'Correo electrónico (obligatorio)',
  'auth.signup.password': 'Contraseña (obligatoria)',
  'auth.signup.name': 'Tu nombre',
  'auth.signup.signingUp': 'Registrando...',
  'auth.signup.signUp': 'Registrarse',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.',
  'auth.forgotPassword.email': 'Correo electrónico',
  'auth.forgotPassword.submitting': 'Enviando...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Correo electrónico',
  'auth.resetPassword.token': 'Token de restablecimiento',
  'auth.resetPassword.newPassword': 'Nueva contraseña',
  'auth.resetPassword.twoFactor': 'Token de doble factor (si está habilitado)',
  'auth.resetPassword.loggingIn': 'Iniciando sesión...',
  'auth.resetPassword.submit': 'Establecer contraseña e iniciar sesión',

  // Home
  'home.greeting': 'Hola, ',
  'home.world': 'Mundo',

  // Settings
  'settings.account': 'Cuenta',
  'settings.email': 'Correo electrónico',
  'settings.authentication': 'Autenticación',
  'settings.changePassword': 'Cambiar contraseña',
  'settings.twoFactor': 'Autenticación de doble factor',
  'settings.notifications': 'Notificaciones',
  'settings.pushNotifications': 'Notificaciones push',
  'settings.billing': 'Facturación',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Mejorar plan',
  'settings.devices': 'Dispositivos',
  'settings.noDevices': 'No se encontraron dispositivos',
  'settings.thisDevice': 'Este dispositivo',
  'settings.platform': 'Plataforma',
  'settings.browser': 'Navegador',
  'settings.network': 'Red',
  'settings.online': 'En línea',
  'settings.offline': 'Sin conexión',
  'settings.unknown': 'Desconocido',
  'settings.logOut': 'Cerrar sesión',
  'settings.deleteAccount': 'Eliminar cuenta',
  'settings.changePasswordModal.title': 'Cambiar contraseña',
  'settings.changePasswordModal.error': 'Error al cambiar la contraseña.',
  'settings.changePasswordModal.currentPassword': 'Contraseña actual',
  'settings.changePasswordModal.newPassword': 'Nueva contraseña',
  'settings.changePasswordModal.changing': 'Cambiando...',
  'settings.deleteAccountModal.title': 'Eliminar cuenta',
  'settings.deleteAccountModal.warning':
    'Esta acción no se puede deshacer. Ingresa tu contraseña para confirmar.',
  'settings.deleteAccountModal.password': 'Contraseña',
  'settings.deleteAccountModal.deleting': 'Eliminando...',
  'settings.changePasswordModal.submit': 'Cambiar contraseña',
  'settings.deleteAccountModal.submit': 'Eliminar cuenta',
  'settings.failedToUpdateEmail': 'Error al actualizar el correo electrónico.',
  'settings.failedToDeleteAccount': 'Error al eliminar la cuenta.',
  'settings.toggleTwoFactor': 'Alternar autenticación de doble factor',
  'settings.togglePushNotifications': 'Alternar notificaciones push',

  // Footer
  'footer.about': 'Acerca de {{appName}}',
  'footer.privacyPolicy': 'Política de privacidad',
  'footer.termsOfService': 'Términos de servicio',
  'footer.language': 'Idioma',

  // OAuth
  'oauth.orContinueWith': 'O continuar con',
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
  'planUpdated.message': 'Tu plan ha sido actualizado.',
  'planUpdated.thankYou': '¡Gracias!',
  'planUpdated.returnHome': 'Volver al inicio',

  // PWA
  'pwa.updateAvailable': '¡Nueva versión disponible!',
  'pwa.update': 'Actualizar',
  'pwa.updating': 'Actualizando...',

  // User API errors
  'user.error.badRequest': 'Solicitud incorrecta.',
  'user.error.notFound': 'No encontrado.',
  'user.error.failedToCreateSession': 'No se pudo crear la sesión.',
  'user.error.usernameRequired': 'Se requiere un nombre de usuario.',
  'user.error.passwordRequired': 'Se requiere una contraseña.',
  'user.error.emailInvalid': 'El correo electrónico no es válido.',
  'user.error.usernameUnavailable': 'El nombre de usuario no está disponible.',
  'user.error.emailAlreadyRegistered': 'El correo electrónico ya está registrado.',
  'user.error.failedToHashPassword': 'No se pudo cifrar la contraseña.',
  'user.error.invalidCredentials': 'Credenciales no válidas.',
  'user.error.invalidTwoFactorToken': 'Token de doble factor no válido.',
  'user.error.twoFactorVerificationUnavailable': 'Verificación de doble factor no disponible.',
  'user.error.loginFailed': 'El inicio de sesión falló.',
  'user.error.usernameCannotBeEmpty': 'El nombre de usuario no puede estar vacío.',
  'user.error.failedToUpdateUser': 'No se pudo actualizar el usuario.',
  'user.error.failedToDeleteUser': 'No se pudo eliminar el usuario.',
  'user.error.failedToReadUser': 'No se pudo leer el usuario.',
  'user.error.emailRequired': 'Se requiere un correo electrónico.',
  'user.error.failedToProcessPasswordReset':
    'No se pudo procesar el restablecimiento de contraseña.',
  'user.error.newPasswordRequired': 'Se requiere una contraseña nueva.',
  'user.error.currentPasswordRequired': 'Se requiere la contraseña actual.',
  'user.error.currentPasswordIncorrect': 'La contraseña actual es incorrecta.',
  'user.error.failedToUpdatePassword': 'No se pudo actualizar la contraseña.',
  'user.error.planKeyRequired': 'Se requiere planKey.',
  'user.error.invalidPlan': 'Plan no válido.',
  'user.error.failedToUpdateSubscription': 'No se pudo actualizar la suscripción.',
  'user.error.failedToUpdatePlan': 'No se pudo actualizar el plan.',
  'user.error.twoFactorNotAvailable': 'La autenticación de doble factor no está disponible.',
  'user.error.tokenRequired': 'Se requiere un token.',
  'user.error.noPendingTwoFactorSetup':
    'No hay configuración de doble factor pendiente. Llame primero con la acción "setup".',
  'user.error.invalidToken': 'Token no válido.',
  'user.error.twoFactorNotEnabled': 'El doble factor no está activado.',
  'user.error.invalidAction': 'Acción no válida. Use "setup", "enable" o "disable".',
  'user.error.twoFactorOperationFailed': 'La operación de doble factor falló.',
  'user.error.oauthServerNotConfigured': 'El servidor OAuth "{{server}}" no está configurado.',
  'user.error.oauthVerificationFailed': 'La verificación OAuth falló.',
  'user.error.failedToCreateUser': 'No se pudo crear el usuario.',
  'user.error.oauthLoginFailed': 'El inicio de sesión OAuth falló.',

  // Auth client errors
  'auth.error.requestFailed': 'La solicitud falló',
  'auth.error.loginFailed': 'El inicio de sesión falló',
  'auth.error.registrationFailed': 'El registro falló',
  'auth.error.noRefreshToken': 'No hay token de actualización disponible',

  // Form validation
  'forms.required': 'Este campo es obligatorio',
  'forms.min': 'El valor debe ser al menos {{min}}',
  'forms.max': 'El valor debe ser como máximo {{max}}',
  'forms.minLength': 'Debe tener al menos {{minLength}} caracteres',
  'forms.maxLength': 'Debe tener como máximo {{maxLength}} caracteres',
  'forms.invalidFormat': 'Formato no válido',
  'forms.invalidEmail': 'Dirección de correo electrónico no válida',
  'forms.invalidUrl': 'URL no válida',
  'forms.invalidValue': 'Valor no válido',

  // HTTP client errors
  'http.error.requestFailed': 'La solicitud falló con el estado {{status}}.',
  'http.error.networkError': 'Error de red.',

  // Routing errors
  'routing.error.missingParam': 'Falta el parámetro "{{name}}" para la ruta "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" no encontrada',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter debe usarse dentro de un MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Las notificaciones push no son compatibles',
  'push.error.permissionNotGranted': 'Permiso de notificación no concedido',

  // Utility errors
  'error.networkError': 'Error de red. Por favor, compruebe su conexión.',
  'error.timeout': 'La solicitud ha excedido el tiempo de espera. Por favor, inténtelo de nuevo.',
  'error.unauthorized': 'No está autorizado para realizar esta acción.',
  'error.forbidden': 'Acceso denegado.',
  'error.notFound': 'Recurso no encontrado.',
  'error.validationError': 'Por favor, compruebe sus datos e inténtelo de nuevo.',
  'error.serverError': 'Error del servidor. Por favor, inténtelo de nuevo más tarde.',
  'error.unknown': 'Se produjo un error inesperado.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Se requiere un mensaje',
  'conversation.error.aiNotConfigured': 'Proveedor de IA no configurado',
  'conversation.error.unknownAiError': 'Error de IA desconocido',
  'conversation.error.notFound': 'No se encontró ninguna conversación',
  'conversation.error.streamError': 'Error de transmisión de IA',

  // Resource errors
  'resource.error.unknownError': 'Error desconocido.',
  'resource.error.unableToCreate': 'No se pudo crear {{name}}.',
  'resource.error.unableToUpdate': 'No se pudo actualizar {{name}}.',
  'resource.error.unableToDelete': 'No se pudo eliminar {{name}}.',
  'resource.error.notFound': 'No encontrado.',
  'resource.error.badRequest': 'Solicitud incorrecta.',
  'resource.error.unauthorized': 'No autorizado.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Se requieren nombre y tipo de proyecto',
  'project.error.notFound': 'No encontrado',

  // Device errors
  'device.error.unauthorized': 'No autorizado.',
  'device.error.badRequest': 'Solicitud incorrecta.',
  'device.error.notFound': 'No encontrado.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Error al leer {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Error al escribir {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Error al eliminar {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Se requiere el proveedor de pago.',
  'user.payment.subscriptionIdRequired': 'Se requiere subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Se requieren receipt y planKey.',
  'user.payment.verificationNotConfigured':
    'La verificación de pago no está configurada para {{provider}}.',
  'user.payment.invalidPlan': 'Plan no válido.',
  'user.payment.verificationFailed': 'No se pudo verificar la suscripción.',
  'user.payment.unknownPlan': 'Plan desconocido.',
  'user.payment.invalidWebhookEvent': 'Evento de webhook no válido.',
}
