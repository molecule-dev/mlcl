/**
 * Portuguese translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Carregando...',
  'common.saving': 'Salvando...',
  'common.close': 'Fechar',
  'common.goBack': 'Voltar',
  'common.submit': 'Enviar',
  'common.continue': 'Continuar',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Senha',
  'auth.login.twoFactor': 'Token de dois fatores (se habilitado)',
  'auth.login.signUp': 'Cadastrar-se',
  'auth.login.loggingIn': 'Entrando...',
  'auth.login.logIn': 'Entrar',
  'auth.login.forgotPassword': 'Esqueceu a senha?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (obrigatório)',
  'auth.signup.password': 'Senha (obrigatória)',
  'auth.signup.name': 'Seu nome',
  'auth.signup.signingUp': 'Cadastrando...',
  'auth.signup.signUp': 'Cadastrar-se',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Se uma conta com esse e-mail existir, um link de redefinição de senha foi enviado.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Enviando...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Token de redefinição',
  'auth.resetPassword.newPassword': 'Nova senha',
  'auth.resetPassword.twoFactor': 'Token de dois fatores (se habilitado)',
  'auth.resetPassword.loggingIn': 'Entrando...',
  'auth.resetPassword.submit': 'Definir senha e entrar',

  // Home
  'home.greeting': 'Olá, ',
  'home.world': 'Mundo',

  // Settings
  'settings.account': 'Conta',
  'settings.email': 'E-mail',
  'settings.authentication': 'Autenticação',
  'settings.changePassword': 'Alterar senha',
  'settings.twoFactor': 'Autenticação de dois fatores',
  'settings.notifications': 'Notificações',
  'settings.pushNotifications': 'Notificações push',
  'settings.billing': 'Faturamento',
  'settings.plan': 'Plano: ',
  'settings.upgrade': 'Atualizar plano',
  'settings.devices': 'Dispositivos',
  'settings.noDevices': 'Nenhum dispositivo encontrado',
  'settings.thisDevice': 'Este dispositivo',
  'settings.platform': 'Plataforma',
  'settings.browser': 'Navegador',
  'settings.network': 'Rede',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Desconhecido',
  'settings.logOut': 'Sair',
  'settings.deleteAccount': 'Excluir conta',
  'settings.changePasswordModal.title': 'Alterar senha',
  'settings.changePasswordModal.error': 'Falha ao alterar a senha.',
  'settings.changePasswordModal.currentPassword': 'Senha atual',
  'settings.changePasswordModal.newPassword': 'Nova senha',
  'settings.changePasswordModal.changing': 'Alterando...',
  'settings.deleteAccountModal.title': 'Excluir conta',
  'settings.deleteAccountModal.warning':
    'Esta ação não pode ser desfeita. Digite sua senha para confirmar.',
  'settings.deleteAccountModal.password': 'Senha',
  'settings.deleteAccountModal.deleting': 'Excluindo...',
  'settings.changePasswordModal.submit': 'Alterar senha',
  'settings.deleteAccountModal.submit': 'Excluir conta',
  'settings.failedToUpdateEmail': 'Falha ao atualizar o e-mail.',
  'settings.failedToDeleteAccount': 'Falha ao excluir a conta.',
  'settings.toggleTwoFactor': 'Alternar autenticação de dois fatores',
  'settings.togglePushNotifications': 'Alternar notificações push',

  // Footer
  'footer.about': 'Sobre o {{appName}}',
  'footer.privacyPolicy': 'Política de privacidade',
  'footer.termsOfService': 'Termos de serviço',
  'footer.language': 'Idioma',

  // OAuth
  'oauth.orContinueWith': 'Ou continuar com',
  'oauth.continueWith': 'Continuar com {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Alternar tema',

  // User Menu
  'userMenu.open': 'Abrir menu do usuário',

  // Plan Updated
  'planUpdated.message': 'Seu plano foi atualizado.',
  'planUpdated.thankYou': 'Obrigado!',
  'planUpdated.returnHome': 'Voltar ao início',

  // PWA
  'pwa.updateAvailable': 'Nova versão disponível!',
  'pwa.update': 'Atualizar',
  'pwa.updating': 'Atualizando...',

  // User API errors
  'user.error.badRequest': 'Pedido inválido.',
  'user.error.notFound': 'Não encontrado.',
  'user.error.failedToCreateSession': 'Não foi possível criar a sessão.',
  'user.error.usernameRequired': 'O nome de utilizador é obrigatório.',
  'user.error.passwordRequired': 'A palavra-passe é obrigatória.',
  'user.error.emailInvalid': 'O endereço de e-mail é inválido.',
  'user.error.usernameUnavailable': 'O nome de utilizador não está disponível.',
  'user.error.emailAlreadyRegistered': 'O endereço de e-mail já está registado.',
  'user.error.failedToHashPassword': 'Não foi possível cifrar a palavra-passe.',
  'user.error.invalidCredentials': 'Credenciais inválidas.',
  'user.error.invalidTwoFactorToken': 'Token de dois fatores inválido.',
  'user.error.twoFactorVerificationUnavailable': 'Verificação de dois fatores indisponível.',
  'user.error.loginFailed': 'O início de sessão falhou.',
  'user.error.usernameCannotBeEmpty': 'O nome de utilizador não pode estar vazio.',
  'user.error.failedToUpdateUser': 'Não foi possível atualizar o utilizador.',
  'user.error.failedToDeleteUser': 'Não foi possível eliminar o utilizador.',
  'user.error.failedToReadUser': 'Não foi possível ler o utilizador.',
  'user.error.emailRequired': 'O endereço de e-mail é obrigatório.',
  'user.error.failedToProcessPasswordReset':
    'Não foi possível processar a redefinição da palavra-passe.',
  'user.error.newPasswordRequired': 'Uma nova palavra-passe é obrigatória.',
  'user.error.currentPasswordRequired': 'A palavra-passe atual é obrigatória.',
  'user.error.currentPasswordIncorrect': 'A palavra-passe atual está incorreta.',
  'user.error.failedToUpdatePassword': 'Não foi possível atualizar a palavra-passe.',
  'user.error.planKeyRequired': 'planKey é obrigatório.',
  'user.error.invalidPlan': 'Plano inválido.',
  'user.error.failedToUpdateSubscription': 'Não foi possível atualizar a subscrição.',
  'user.error.failedToUpdatePlan': 'Não foi possível atualizar o plano.',
  'user.error.twoFactorNotAvailable': 'A autenticação de dois fatores não está disponível.',
  'user.error.tokenRequired': 'O token é obrigatório.',
  'user.error.noPendingTwoFactorSetup':
    'Nenhuma configuração de dois fatores pendente. Chame primeiro com a ação "setup".',
  'user.error.invalidToken': 'Token inválido.',
  'user.error.twoFactorNotEnabled': 'A autenticação de dois fatores não está ativada.',
  'user.error.invalidAction': 'Ação inválida. Utilize "setup", "enable" ou "disable".',
  'user.error.twoFactorOperationFailed': 'A operação de dois fatores falhou.',
  'user.error.oauthServerNotConfigured': 'O servidor OAuth "{{server}}" não está configurado.',
  'user.error.oauthVerificationFailed': 'A verificação OAuth falhou.',
  'user.error.failedToCreateUser': 'Não foi possível criar o utilizador.',
  'user.error.oauthLoginFailed': 'O início de sessão OAuth falhou.',

  // Auth client errors
  'auth.error.requestFailed': 'O pedido falhou',
  'auth.error.loginFailed': 'O início de sessão falhou',
  'auth.error.registrationFailed': 'O registo falhou',
  'auth.error.noRefreshToken': 'Nenhum token de atualização disponível',

  // Form validation
  'forms.required': 'Este campo é obrigatório',
  'forms.min': 'O valor deve ser no mínimo {{min}}',
  'forms.max': 'O valor deve ser no máximo {{max}}',
  'forms.minLength': 'Deve ter no mínimo {{minLength}} caracteres',
  'forms.maxLength': 'Deve ter no máximo {{maxLength}} caracteres',
  'forms.invalidFormat': 'Formato inválido',
  'forms.invalidEmail': 'Endereço de e-mail inválido',
  'forms.invalidUrl': 'URL inválido',
  'forms.invalidValue': 'Valor inválido',

  // HTTP client errors
  'http.error.requestFailed': 'O pedido falhou com o estado {{status}}.',
  'http.error.networkError': 'Erro de rede.',

  // Routing errors
  'routing.error.missingParam': 'Parâmetro "{{name}}" ausente para o caminho "{{pattern}}"',
  'routing.error.routeNotFound': 'Rota "{{name}}" não encontrada',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter deve ser usado dentro de um MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'As notificações push não são suportadas',
  'push.error.permissionNotGranted': 'Permissão de notificação não concedida',

  // Utility errors
  'error.networkError': 'Erro de rede. Por favor, verifique a sua ligação.',
  'error.timeout': 'O pedido expirou. Por favor, tente novamente.',
  'error.unauthorized': 'Não está autorizado a realizar esta ação.',
  'error.forbidden': 'Acesso negado.',
  'error.notFound': 'Recurso não encontrado.',
  'error.validationError': 'Por favor, verifique os seus dados e tente novamente.',
  'error.serverError': 'Erro do servidor. Por favor, tente novamente mais tarde.',
  'error.unknown': 'Ocorreu um erro inesperado.',

  // AI conversation errors
  'conversation.error.messageRequired': 'A mensagem é obrigatória',
  'conversation.error.aiNotConfigured': 'Fornecedor de IA não configurado',
  'conversation.error.unknownAiError': 'Erro de IA desconhecido',
  'conversation.error.notFound': 'Nenhuma conversa encontrada',
  'conversation.error.streamError': 'Erro de transmissão de IA',

  // Resource errors
  'resource.error.unknownError': 'Erro desconhecido.',
  'resource.error.unableToCreate': 'Não foi possível criar {{name}}.',
  'resource.error.unableToUpdate': 'Não foi possível atualizar {{name}}.',
  'resource.error.unableToDelete': 'Não foi possível eliminar {{name}}.',
  'resource.error.notFound': 'Não encontrado.',
  'resource.error.badRequest': 'Pedido inválido.',
  'resource.error.unauthorized': 'Não autorizado.',

  // Project errors
  'project.error.nameAndTypeRequired': 'O nome e o tipo de projeto são obrigatórios',
  'project.error.notFound': 'Não encontrado',

  // Device errors
  'device.error.unauthorized': 'Não autorizado.',
  'device.error.badRequest': 'Requisição inválida.',
  'device.error.notFound': 'Não encontrado.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Falha ao ler {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Falha ao escrever {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Falha ao excluir {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'O fornecedor de pagamento é obrigatório.',
  'user.payment.subscriptionIdRequired': 'subscriptionId é obrigatório.',
  'user.payment.receiptAndPlanRequired': 'receipt e planKey são obrigatórios.',
  'user.payment.verificationNotConfigured':
    'A verificação de pagamento não está configurada para {{provider}}.',
  'user.payment.invalidPlan': 'Plano inválido.',
  'user.payment.verificationFailed': 'Não foi possível verificar a subscrição.',
  'user.payment.unknownPlan': 'Plano desconhecido.',
  'user.payment.invalidWebhookEvent': 'Evento de webhook inválido.',
}
