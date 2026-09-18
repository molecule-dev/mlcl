/**
 * Russian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Загрузка...',
  'common.saving': 'Сохранение...',
  'common.close': 'Закрыть',
  'common.goBack': 'Назад',
  'common.submit': 'Отправить',
  'common.continue': 'Продолжить',

  // Auth - Login
  'auth.login.email': 'Электронная почта',
  'auth.login.password': 'Пароль',
  'auth.login.twoFactor': 'Токен двухфакторной аутентификации (если включена)',
  'auth.login.signUp': 'Зарегистрироваться',
  'auth.login.loggingIn': 'Вход...',
  'auth.login.logIn': 'Войти',
  'auth.login.forgotPassword': 'Забыли пароль?',

  // Auth - Signup
  'auth.signup.email': 'Электронная почта (обязательно)',
  'auth.signup.password': 'Пароль (обязательно)',
  'auth.signup.name': 'Ваше имя',
  'auth.signup.signingUp': 'Регистрация...',
  'auth.signup.signUp': 'Зарегистрироваться',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Если учётная запись с таким адресом существует, ссылка для сброса пароля была отправлена.',
  'auth.forgotPassword.email': 'Электронная почта',
  'auth.forgotPassword.submitting': 'Отправка...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Электронная почта',
  'auth.resetPassword.token': 'Токен сброса пароля',
  'auth.resetPassword.newPassword': 'Новый пароль',
  'auth.resetPassword.twoFactor': 'Токен двухфакторной аутентификации (если включена)',
  'auth.resetPassword.loggingIn': 'Вход...',
  'auth.resetPassword.submit': 'Установить пароль и войти',

  // Home
  'home.greeting': 'Привет, ',
  'home.world': 'Мир',

  // Settings
  'settings.account': 'Аккаунт',
  'settings.email': 'Электронная почта',
  'settings.authentication': 'Аутентификация',
  'settings.changePassword': 'Изменить пароль',
  'settings.twoFactor': 'Двухфакторная аутентификация',
  'settings.notifications': 'Уведомления',
  'settings.pushNotifications': 'Push-уведомления',
  'settings.billing': 'Оплата',
  'settings.plan': 'Тариф: ',
  'settings.upgrade': 'Улучшить',
  'settings.devices': 'Устройства',
  'settings.noDevices': 'Устройства не найдены',
  'settings.thisDevice': 'Это устройство',
  'settings.platform': 'Платформа',
  'settings.browser': 'Браузер',
  'settings.network': 'Сеть',
  'settings.online': 'В сети',
  'settings.offline': 'Не в сети',
  'settings.unknown': 'Неизвестно',
  'settings.logOut': 'Выйти',
  'settings.deleteAccount': 'Удалить аккаунт',
  'settings.changePasswordModal.title': 'Изменить пароль',
  'settings.changePasswordModal.error': 'Не удалось изменить пароль.',
  'settings.changePasswordModal.currentPassword': 'Текущий пароль',
  'settings.changePasswordModal.newPassword': 'Новый пароль',
  'settings.changePasswordModal.changing': 'Изменение...',
  'settings.deleteAccountModal.title': 'Удалить аккаунт',
  'settings.deleteAccountModal.warning':
    'Это действие нельзя отменить. Введите пароль для подтверждения.',
  'settings.deleteAccountModal.password': 'Пароль',
  'settings.deleteAccountModal.deleting': 'Удаление...',
  'settings.changePasswordModal.submit': 'Изменить пароль',
  'settings.deleteAccountModal.submit': 'Удалить аккаунт',
  'settings.failedToUpdateEmail': 'Не удалось обновить электронную почту.',
  'settings.failedToDeleteAccount': 'Не удалось удалить аккаунт.',
  'settings.toggleTwoFactor': 'Переключить двухфакторную аутентификацию',
  'settings.togglePushNotifications': 'Переключить push-уведомления',

  // Footer
  'footer.about': 'О {{appName}}',
  'footer.privacyPolicy': 'Политика конфиденциальности',
  'footer.termsOfService': 'Условия использования',
  'footer.language': 'Язык',

  // OAuth
  'oauth.orContinueWith': 'Или продолжить через',
  'oauth.continueWith': 'Продолжить через {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Сменить тему',

  // User Menu
  'userMenu.open': 'Открыть меню пользователя',

  // Plan Updated
  'planUpdated.message': 'Ваш тариф был обновлён.',
  'planUpdated.thankYou': 'Спасибо!',
  'planUpdated.returnHome': 'На главную',

  // PWA
  'pwa.updateAvailable': 'Доступна новая версия!',
  'pwa.update': 'Обновить',
  'pwa.updating': 'Обновление...',

  // User API errors
  'user.error.badRequest': 'Некорректный запрос.',
  'user.error.notFound': 'Не найдено.',
  'user.error.failedToCreateSession': 'Не удалось создать сессию.',
  'user.error.usernameRequired': 'Имя пользователя обязательно.',
  'user.error.passwordRequired': 'Пароль обязателен.',
  'user.error.emailInvalid': 'Электронная почта недействительна.',
  'user.error.usernameUnavailable': 'Имя пользователя недоступно.',
  'user.error.emailAlreadyRegistered': 'Электронная почта уже зарегистрирована.',
  'user.error.failedToHashPassword': 'Не удалось хешировать пароль.',
  'user.error.invalidCredentials': 'Недействительные учётные данные.',
  'user.error.invalidTwoFactorToken': 'Недействительный двухфакторный токен.',
  'user.error.twoFactorVerificationUnavailable': 'Двухфакторная верификация недоступна.',
  'user.error.loginFailed': 'Вход не удался.',
  'user.error.usernameCannotBeEmpty': 'Имя пользователя не может быть пустым.',
  'user.error.failedToUpdateUser': 'Не удалось обновить пользователя.',
  'user.error.failedToDeleteUser': 'Не удалось удалить пользователя.',
  'user.error.failedToReadUser': 'Не удалось прочитать пользователя.',
  'user.error.emailRequired': 'Электронная почта обязательна.',
  'user.error.failedToProcessPasswordReset': 'Не удалось обработать сброс пароля.',
  'user.error.newPasswordRequired': 'Новый пароль обязателен.',
  'user.error.currentPasswordRequired': 'Текущий пароль обязателен.',
  'user.error.currentPasswordIncorrect': 'Текущий пароль неверен.',
  'user.error.failedToUpdatePassword': 'Не удалось обновить пароль.',
  'user.error.planKeyRequired': 'planKey обязателен.',
  'user.error.invalidPlan': 'Недействительный план.',
  'user.error.failedToUpdateSubscription': 'Не удалось обновить подписку.',
  'user.error.failedToUpdatePlan': 'Не удалось обновить план.',
  'user.error.twoFactorNotAvailable': 'Двухфакторная аутентификация недоступна.',
  'user.error.tokenRequired': 'Токен обязателен.',
  'user.error.noPendingTwoFactorSetup':
    'Нет ожидающей двухфакторной настройки. Сначала вызовите с действием "setup".',
  'user.error.invalidToken': 'Недействительный токен.',
  'user.error.twoFactorNotEnabled': 'Двухфакторная аутентификация не включена.',
  'user.error.invalidAction':
    'Недействительное действие. Используйте "setup", "enable" или "disable".',
  'user.error.twoFactorOperationFailed': 'Двухфакторная операция не удалась.',
  'user.error.oauthServerNotConfigured': 'OAuth-сервер "{{server}}" не настроен.',
  'user.error.oauthVerificationFailed': 'Верификация OAuth не удалась.',
  'user.error.failedToCreateUser': 'Не удалось создать пользователя.',
  'user.error.oauthLoginFailed': 'Вход через OAuth не удался.',

  // Auth client errors
  'auth.error.requestFailed': 'Запрос не удался',
  'auth.error.loginFailed': 'Вход не удался',
  'auth.error.registrationFailed': 'Регистрация не удалась',
  'auth.error.noRefreshToken': 'Нет доступного токена обновления',

  // Form validation
  'forms.required': 'Это поле обязательно',
  'forms.min': 'Значение должно быть не менее {{min}}',
  'forms.max': 'Значение должно быть не более {{max}}',
  'forms.minLength': 'Должно содержать не менее {{minLength}} символов',
  'forms.maxLength': 'Должно содержать не более {{maxLength}} символов',
  'forms.invalidFormat': 'Неверный формат',
  'forms.invalidEmail': 'Неверный адрес электронной почты',
  'forms.invalidUrl': 'Неверный URL',
  'forms.invalidValue': 'Неверное значение',

  // HTTP client errors
  'http.error.requestFailed': 'Запрос не удался со статусом {{status}}.',
  'http.error.networkError': 'Ошибка сети.',

  // Routing errors
  'routing.error.missingParam': 'Отсутствует параметр "{{name}}" для пути "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не найден',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter должен использоваться внутри MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push-уведомления не поддерживаются',
  'push.error.permissionNotGranted': 'Разрешение на уведомления не предоставлено',

  // Utility errors
  'error.networkError': 'Ошибка сети. Пожалуйста, проверьте подключение.',
  'error.timeout': 'Время ожидания запроса истекло. Пожалуйста, попробуйте снова.',
  'error.unauthorized': 'У вас нет прав для выполнения этого действия.',
  'error.forbidden': 'Доступ запрещён.',
  'error.notFound': 'Ресурс не найден.',
  'error.validationError': 'Пожалуйста, проверьте введённые данные и попробуйте снова.',
  'error.serverError': 'Ошибка сервера. Пожалуйста, попробуйте позже.',
  'error.unknown': 'Произошла непредвиденная ошибка.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message обязательно',
  'conversation.error.aiNotConfigured': 'AI-провайдер не настроен',
  'conversation.error.unknownAiError': 'Неизвестная ошибка AI',
  'conversation.error.notFound': 'Разговор не найден',
  'conversation.error.streamError': 'Ошибка потоковой передачи AI',

  // Resource errors
  'resource.error.unknownError': 'Неизвестная ошибка.',
  'resource.error.unableToCreate': 'Не удалось создать {{name}}.',
  'resource.error.unableToUpdate': 'Не удалось обновить {{name}}.',
  'resource.error.unableToDelete': 'Не удалось удалить {{name}}.',
  'resource.error.notFound': 'Не найдено.',
  'resource.error.badRequest': 'Некорректный запрос.',
  'resource.error.unauthorized': 'Не авторизован.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name и projectType обязательны',
  'project.error.notFound': 'Не найдено',

  // Device errors
  'device.error.unauthorized': 'Не авторизован.',
  'device.error.badRequest': 'Неверный запрос.',
  'device.error.notFound': 'Не найдено.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Не удалось прочитать {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Не удалось записать {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Не удалось удалить {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Платёжный провайдер обязателен.',
  'user.payment.subscriptionIdRequired': 'subscriptionId обязателен.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey обязательны.',
  'user.payment.verificationNotConfigured': 'Верификация платежа не настроена для {{provider}}.',
  'user.payment.invalidPlan': 'Недействительный план.',
  'user.payment.verificationFailed': 'Не удалось подтвердить подписку.',
  'user.payment.unknownPlan': 'Неизвестный план.',
  'user.payment.invalidWebhookEvent': 'Недопустимое событие вебхука.',
}
