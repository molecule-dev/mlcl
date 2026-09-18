/**
 * Bulgarian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Зареждане...',
  'common.saving': 'Запазване...',
  'common.close': 'Затвори',
  'common.goBack': 'Назад',
  'common.submit': 'Изпрати',
  'common.continue': 'Продължи',

  // Auth - Login
  'auth.login.email': 'Имейл',
  'auth.login.password': 'Парола',
  'auth.login.twoFactor': 'Двуфакторен токен (ако е включен)',
  'auth.login.signUp': 'Регистрация',
  'auth.login.loggingIn': 'Влизане...',
  'auth.login.logIn': 'Вход',
  'auth.login.forgotPassword': 'Забравена парола?',

  // Auth - Signup
  'auth.signup.email': 'Имейл (Задължително)',
  'auth.signup.password': 'Парола (Задължително)',
  'auth.signup.name': 'Вашето име',
  'auth.signup.signingUp': 'Регистриране...',
  'auth.signup.signUp': 'Регистрация',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ако съществува акаунт с този имейл, линк за нулиране на паролата е изпратен.',
  'auth.forgotPassword.email': 'Имейл',
  'auth.forgotPassword.submitting': 'Изпращане...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Имейл',
  'auth.resetPassword.token': 'Токен за нулиране на парола',
  'auth.resetPassword.newPassword': 'Въведете нова парола',
  'auth.resetPassword.twoFactor': 'Двуфакторен токен (ако е включен)',
  'auth.resetPassword.loggingIn': 'Влизане...',
  'auth.resetPassword.submit': 'Задай парола и влез',

  // Home
  'home.greeting': 'Здравей, ',
  'home.world': 'Свят',

  // Settings
  'settings.account': 'Акаунт',
  'settings.email': 'Имейл',
  'settings.authentication': 'Удостоверяване',
  'settings.changePassword': 'Смяна на парола',
  'settings.twoFactor': 'Двуфакторно удостоверяване',
  'settings.notifications': 'Известия',
  'settings.pushNotifications': 'Пуш известия',
  'settings.billing': 'Фактуриране',
  'settings.plan': 'План: ',
  'settings.upgrade': 'Надграждане',
  'settings.devices': 'Устройства',
  'settings.noDevices': 'Няма намерени устройства',
  'settings.thisDevice': 'Това устройство',
  'settings.platform': 'Платформа',
  'settings.browser': 'Браузър',
  'settings.network': 'Мрежа',
  'settings.online': 'Онлайн',
  'settings.offline': 'Офлайн',
  'settings.unknown': 'Неизвестно',
  'settings.logOut': 'Изход',
  'settings.deleteAccount': 'Изтриване на акаунт',
  'settings.changePasswordModal.title': 'Смяна на парола',
  'settings.changePasswordModal.error': 'Неуспешна смяна на паролата.',
  'settings.changePasswordModal.currentPassword': 'Текуща парола',
  'settings.changePasswordModal.newPassword': 'Нова парола',
  'settings.changePasswordModal.changing': 'Смяна...',
  'settings.deleteAccountModal.title': 'Изтриване на акаунт',
  'settings.deleteAccountModal.warning':
    'Това действие не може да бъде отменено. Моля, въведете паролата си за потвърждение.',
  'settings.deleteAccountModal.password': 'Парола',
  'settings.deleteAccountModal.deleting': 'Изтриване...',
  'settings.changePasswordModal.submit': 'Смяна на парола',
  'settings.deleteAccountModal.submit': 'Изтриване на акаунт',
  'settings.failedToUpdateEmail': 'Неуспешно обновяване на имейла.',
  'settings.failedToDeleteAccount': 'Неуспешно изтриване на акаунта.',
  'settings.toggleTwoFactor': 'Превключване на двуфакторно удостоверяване',
  'settings.togglePushNotifications': 'Превключване на push известията',

  // Footer
  'footer.about': 'За {{appName}}',
  'footer.privacyPolicy': 'Политика за поверителност',
  'footer.termsOfService': 'Условия за ползване',
  'footer.language': 'Език',

  // OAuth
  'oauth.orContinueWith': 'Или продължете с',
  'oauth.continueWith': 'Продължи с {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Превключване на тема',

  // User Menu
  'userMenu.open': 'Отвори потребителско меню',

  // Plan Updated
  'planUpdated.message': 'Вашият план беше обновен.',
  'planUpdated.thankYou': 'Благодарим!',
  'planUpdated.returnHome': 'Към началната страница',

  // PWA
  'pwa.updateAvailable': 'Налична е нова версия!',
  'pwa.update': 'Актуализирай',
  'pwa.updating': 'Актуализиране...',

  // User API errors
  'user.error.badRequest': 'Невалидна заявка.',
  'user.error.notFound': 'Не е намерено.',
  'user.error.failedToCreateSession': 'Неуспешно създаване на сесия.',
  'user.error.usernameRequired': 'Потребителското име е задължително.',
  'user.error.passwordRequired': 'Паролата е задължителна.',
  'user.error.emailInvalid': 'Имейлът е невалиден.',
  'user.error.usernameUnavailable': 'Потребителското име не е налично.',
  'user.error.emailAlreadyRegistered': 'Имейлът вече е регистриран.',
  'user.error.failedToHashPassword': 'Неуспешно хеширане на паролата.',
  'user.error.invalidCredentials': 'Невалидни идентификационни данни.',
  'user.error.invalidTwoFactorToken': 'Невалиден двуфакторен токен.',
  'user.error.twoFactorVerificationUnavailable': 'Двуфакторната верификация не е налична.',
  'user.error.loginFailed': 'Неуспешно влизане.',
  'user.error.usernameCannotBeEmpty': 'Потребителското име не може да бъде празно.',
  'user.error.failedToUpdateUser': 'Неуспешно актуализиране на потребителя.',
  'user.error.failedToDeleteUser': 'Неуспешно изтриване на потребителя.',
  'user.error.failedToReadUser': 'Неуспешно четене на потребителя.',
  'user.error.emailRequired': 'Имейлът е задължителен.',
  'user.error.failedToProcessPasswordReset': 'Неуспешна обработка на нулиране на парола.',
  'user.error.newPasswordRequired': 'Новата парола е задължителна.',
  'user.error.currentPasswordRequired': 'Текущата парола е задължителна.',
  'user.error.currentPasswordIncorrect': 'Текущата парола е неправилна.',
  'user.error.failedToUpdatePassword': 'Неуспешно актуализиране на паролата.',
  'user.error.planKeyRequired': 'planKey е задължителен.',
  'user.error.invalidPlan': 'Невалиден план.',
  'user.error.failedToUpdateSubscription': 'Неуспешно актуализиране на абонамента.',
  'user.error.failedToUpdatePlan': 'Неуспешно актуализиране на плана.',
  'user.error.twoFactorNotAvailable': 'Двуфакторната автентикация не е налична.',
  'user.error.tokenRequired': 'Токенът е задължителен.',
  'user.error.noPendingTwoFactorSetup':
    'Няма чакаща двуфакторна настройка. Извикайте с действие "setup" първо.',
  'user.error.invalidToken': 'Невалиден токен.',
  'user.error.twoFactorNotEnabled': 'Двуфакторната автентикация не е активирана.',
  'user.error.invalidAction': 'Невалидно действие. Използвайте "setup", "enable" или "disable".',
  'user.error.twoFactorOperationFailed': 'Двуфакторната операция е неуспешна.',
  'user.error.oauthServerNotConfigured': 'OAuth сървър "{{server}}" не е конфигуриран.',
  'user.error.oauthVerificationFailed': 'OAuth верификацията е неуспешна.',
  'user.error.failedToCreateUser': 'Неуспешно създаване на потребител.',
  'user.error.oauthLoginFailed': 'OAuth влизането е неуспешно.',

  // Auth client errors
  'auth.error.requestFailed': 'Заявката е неуспешна',
  'auth.error.loginFailed': 'Неуспешно влизане',
  'auth.error.registrationFailed': 'Неуспешна регистрация',
  'auth.error.noRefreshToken': 'Няма наличен токен за опресняване',

  // Form validation
  'forms.required': 'Това поле е задължително',
  'forms.min': 'Стойността трябва да бъде поне {{min}}',
  'forms.max': 'Стойността трябва да бъде най-много {{max}}',
  'forms.minLength': 'Трябва да бъде поне {{minLength}} символа',
  'forms.maxLength': 'Трябва да бъде най-много {{maxLength}} символа',
  'forms.invalidFormat': 'Невалиден формат',
  'forms.invalidEmail': 'Невалиден имейл адрес',
  'forms.invalidUrl': 'Невалиден URL',
  'forms.invalidValue': 'Невалидна стойност',

  // HTTP client errors
  'http.error.requestFailed': 'Заявката е неуспешна със статус {{status}}.',
  'http.error.networkError': 'Мрежова грешка.',

  // Routing errors
  'routing.error.missingParam': 'Липсващ параметър "{{name}}" за път "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрутът "{{name}}" не е намерен',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter трябва да се използва в MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Пуш известията не се поддържат',
  'push.error.permissionNotGranted': 'Разрешението за известия не е предоставено',

  // Utility errors
  'error.networkError': 'Мрежова грешка. Моля, проверете връзката си.',
  'error.timeout': 'Времето за заявката изтече. Моля, опитайте отново.',
  'error.unauthorized': 'Нямате право да извършите това действие.',
  'error.forbidden': 'Достъпът е отказан.',
  'error.notFound': 'Ресурсът не е намерен.',
  'error.validationError': 'Моля, проверете въведените данни и опитайте отново.',
  'error.serverError': 'Сървърна грешка. Моля, опитайте отново по-късно.',
  'error.unknown': 'Възникна неочаквана грешка.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message е задължително',
  'conversation.error.aiNotConfigured': 'AI доставчикът не е конфигуриран',
  'conversation.error.unknownAiError': 'Неизвестна AI грешка',
  'conversation.error.notFound': 'Не е намерен разговор',
  'conversation.error.streamError': 'Грешка при AI поточно предаване',

  // Resource errors
  'resource.error.unknownError': 'Неизвестна грешка.',
  'resource.error.unableToCreate': 'Не може да се създаде {{name}}.',
  'resource.error.unableToUpdate': 'Не може да се актуализира {{name}}.',
  'resource.error.unableToDelete': 'Не може да се изтрие {{name}}.',
  'resource.error.notFound': 'Не е намерено.',
  'resource.error.badRequest': 'Невалидна заявка.',
  'resource.error.unauthorized': 'Неоторизиран.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name и projectType са задължителни',
  'project.error.notFound': 'Не е намерено',

  // Device errors
  'device.error.unauthorized': 'Неоторизиран.',
  'device.error.badRequest': 'Невалидна заявка.',
  'device.error.notFound': 'Не е намерено.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Неуспешно четене на {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Неуспешно записване на {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Неуспешно изтриване на {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Доставчикът на плащане е задължителен.',
  'user.payment.subscriptionIdRequired': 'subscriptionId е задължителен.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey са задължителни.',
  'user.payment.verificationNotConfigured':
    'Верификацията на плащането не е конфигурирана за {{provider}}.',
  'user.payment.invalidPlan': 'Невалиден план.',
  'user.payment.verificationFailed': 'Неуспешна верификация на абонамента.',
  'user.payment.unknownPlan': 'Неизвестен план.',
  'user.payment.invalidWebhookEvent': 'Невалидно уебхук събитие.',
}
