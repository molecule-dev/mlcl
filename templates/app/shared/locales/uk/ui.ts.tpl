/**
 * Ukrainian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Завантаження...',
  'common.saving': 'Збереження...',
  'common.close': 'Закрити',
  'common.goBack': 'Повернутися',
  'common.submit': 'Надіслати',
  'common.continue': 'Продовжити',

  // Auth - Login
  'auth.login.email': 'Електронна пошта',
  'auth.login.password': 'Пароль',
  'auth.login.twoFactor': 'Код двофакторної автентифікації (Якщо увімкнено)',
  'auth.login.signUp': 'Зареєструватися',
  'auth.login.loggingIn': 'Вхід...',
  'auth.login.logIn': 'Увійти',
  'auth.login.forgotPassword': 'Забули пароль?',

  // Auth - Signup
  'auth.signup.email': 'Електронна пошта (Обов\'язково)',
  'auth.signup.password': 'Пароль (Обов\'язково)',
  'auth.signup.name': 'Ваше ім\'я',
  'auth.signup.signingUp': 'Реєстрація...',
  'auth.signup.signUp': 'Зареєструватися',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Якщо обліковий запис з такою електронною поштою існує, посилання для скидання пароля було надіслано.',
  'auth.forgotPassword.email': 'Електронна пошта',
  'auth.forgotPassword.submitting': 'Надсилання...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Електронна пошта',
  'auth.resetPassword.token': 'Код скидання пароля',
  'auth.resetPassword.newPassword': 'Введіть новий пароль',
  'auth.resetPassword.twoFactor': 'Код двофакторної автентифікації (Якщо увімкнено)',
  'auth.resetPassword.loggingIn': 'Вхід...',
  'auth.resetPassword.submit': 'Встановити пароль та увійти',

  // Home
  'home.greeting': 'Привіт, ',
  'home.world': 'Світе',

  // Settings
  'settings.account': 'Обліковий запис',
  'settings.email': 'Електронна пошта',
  'settings.authentication': 'Автентифікація',
  'settings.changePassword': 'Змінити пароль',
  'settings.twoFactor': 'Двофакторна автентифікація',
  'settings.notifications': 'Сповіщення',
  'settings.pushNotifications': 'Push-сповіщення',
  'settings.billing': 'Оплата',
  'settings.plan': 'Тариф: ',
  'settings.upgrade': 'Покращити',
  'settings.devices': 'Пристрої',
  'settings.noDevices': 'Пристрої не знайдено',
  'settings.thisDevice': 'Цей пристрій',
  'settings.platform': 'Платформа',
  'settings.browser': 'Браузер',
  'settings.network': 'Мережа',
  'settings.online': 'Онлайн',
  'settings.offline': 'Офлайн',
  'settings.unknown': 'Невідомо',
  'settings.logOut': 'Вийти',
  'settings.deleteAccount': 'Видалити обліковий запис',
  'settings.changePasswordModal.title': 'Зміна пароля',
  'settings.changePasswordModal.error': 'Не вдалося змінити пароль.',
  'settings.changePasswordModal.currentPassword': 'Поточний пароль',
  'settings.changePasswordModal.newPassword': 'Новий пароль',
  'settings.changePasswordModal.changing': 'Зміна...',
  'settings.deleteAccountModal.title': 'Видалення облікового запису',
  'settings.deleteAccountModal.warning':
    'Цю дію неможливо скасувати. Введіть свій пароль для підтвердження.',
  'settings.deleteAccountModal.password': 'Пароль',
  'settings.deleteAccountModal.deleting': 'Видалення...',
  'settings.changePasswordModal.submit': 'Змінити пароль',
  'settings.deleteAccountModal.submit': 'Видалити обліковий запис',
  'settings.failedToUpdateEmail': 'Не вдалося оновити електронну пошту.',
  'settings.failedToDeleteAccount': 'Не вдалося видалити обліковий запис.',
  'settings.toggleTwoFactor': 'Перемкнути двофакторну автентифікацію',
  'settings.togglePushNotifications': 'Перемкнути push-сповіщення',

  // Footer
  'footer.about': 'Про {{appName}}',
  'footer.privacyPolicy': 'Політика конфіденційності',
  'footer.termsOfService': 'Умови використання',
  'footer.language': 'Мова',

  // OAuth
  'oauth.orContinueWith': 'Або продовжити з',
  'oauth.continueWith': 'Продовжити з {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Перемкнути тему',

  // User Menu
  'userMenu.open': 'Відкрити меню користувача',

  // Plan Updated
  'planUpdated.message': 'Ваш тариф оновлено.',
  'planUpdated.thankYou': 'Дякуємо!',
  'planUpdated.returnHome': 'Повернутися на головну',

  // PWA
  'pwa.updateAvailable': 'Доступна нова версія!',
  'pwa.update': 'Оновити',
  'pwa.updating': 'Оновлення...',

  // User API errors
  'user.error.badRequest': 'Некоректний запит.',
  'user.error.notFound': 'Не знайдено.',
  'user.error.failedToCreateSession': 'Не вдалося створити сесію.',
  'user.error.usernameRequired': "Ім'я користувача є обов'язковим.",
  'user.error.passwordRequired': "Пароль є обов'язковим.",
  'user.error.emailInvalid': 'Електронна пошта недійсна.',
  'user.error.usernameUnavailable': "Ім'я користувача недоступне.",
  'user.error.emailAlreadyRegistered': 'Електронна пошта вже зареєстрована.',
  'user.error.failedToHashPassword': 'Не вдалося хешувати пароль.',
  'user.error.invalidCredentials': 'Недійсні облікові дані.',
  'user.error.invalidTwoFactorToken': 'Недійсний двофакторний токен.',
  'user.error.twoFactorVerificationUnavailable': 'Двофакторна верифікація недоступна.',
  'user.error.loginFailed': 'Вхід не вдався.',
  'user.error.usernameCannotBeEmpty': "Ім'я користувача не може бути порожнім.",
  'user.error.failedToUpdateUser': 'Не вдалося оновити користувача.',
  'user.error.failedToDeleteUser': 'Не вдалося видалити користувача.',
  'user.error.failedToReadUser': 'Не вдалося прочитати користувача.',
  'user.error.emailRequired': "Електронна пошта є обов'язковою.",
  'user.error.failedToProcessPasswordReset': 'Не вдалося обробити скидання пароля.',
  'user.error.newPasswordRequired': "Новий пароль є обов'язковим.",
  'user.error.currentPasswordRequired': "Поточний пароль є обов'язковим.",
  'user.error.currentPasswordIncorrect': 'Поточний пароль неправильний.',
  'user.error.failedToUpdatePassword': 'Не вдалося оновити пароль.',
  'user.error.planKeyRequired': "planKey є обов'язковим.",
  'user.error.invalidPlan': 'Недійсний план.',
  'user.error.failedToUpdateSubscription': 'Не вдалося оновити підписку.',
  'user.error.failedToUpdatePlan': 'Не вдалося оновити план.',
  'user.error.twoFactorNotAvailable': 'Двофакторна автентифікація недоступна.',
  'user.error.tokenRequired': "Токен є обов'язковим.",
  'user.error.noPendingTwoFactorSetup':
    'Немає очікуваного двофакторного налаштування. Спершу викличте з дією "setup".',
  'user.error.invalidToken': 'Недійсний токен.',
  'user.error.twoFactorNotEnabled': 'Двофакторна автентифікація не увімкнена.',
  'user.error.invalidAction': 'Недійсна дія. Використовуйте "setup", "enable" або "disable".',
  'user.error.twoFactorOperationFailed': 'Двофакторна операція не вдалася.',
  'user.error.oauthServerNotConfigured': 'OAuth-сервер "{{server}}" не налаштований.',
  'user.error.oauthVerificationFailed': 'Верифікація OAuth не вдалася.',
  'user.error.failedToCreateUser': 'Не вдалося створити користувача.',
  'user.error.oauthLoginFailed': 'Вхід через OAuth не вдався.',

  // Auth client errors
  'auth.error.requestFailed': 'Запит не вдався',
  'auth.error.loginFailed': 'Вхід не вдався',
  'auth.error.registrationFailed': 'Реєстрація не вдалася',
  'auth.error.noRefreshToken': 'Немає доступного токена оновлення',

  // Form validation
  'forms.required': "Це поле є обов'язковим",
  'forms.min': 'Значення повинно бути щонайменше {{min}}',
  'forms.max': 'Значення повинно бути щонайбільше {{max}}',
  'forms.minLength': 'Повинно містити щонайменше {{minLength}} символів',
  'forms.maxLength': 'Повинно містити щонайбільше {{maxLength}} символів',
  'forms.invalidFormat': 'Недійсний формат',
  'forms.invalidEmail': 'Недійсна адреса електронної пошти',
  'forms.invalidUrl': 'Недійсний URL',
  'forms.invalidValue': 'Недійсне значення',

  // HTTP client errors
  'http.error.requestFailed': 'Запит не вдався зі статусом {{status}}.',
  'http.error.networkError': 'Помилка мережі.',

  // Routing errors
  'routing.error.missingParam': 'Відсутній параметр "{{name}}" для шляху "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не знайдено',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter повинен використовуватися всередині MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push-сповіщення не підтримуються',
  'push.error.permissionNotGranted': 'Дозвіл на сповіщення не надано',

  // Utility errors
  'error.networkError': "Помилка мережі. Будь ласка, перевірте з'єднання.",
  'error.timeout': 'Час очікування запиту вичерпано. Будь ласка, спробуйте знову.',
  'error.unauthorized': 'Ви не маєте прав для виконання цієї дії.',
  'error.forbidden': 'Доступ заборонено.',
  'error.notFound': 'Ресурс не знайдено.',
  'error.validationError': 'Будь ласка, перевірте введені дані та спробуйте знову.',
  'error.serverError': 'Помилка сервера. Будь ласка, спробуйте пізніше.',
  'error.unknown': 'Сталася непередбачена помилка.',

  // AI conversation errors
  'conversation.error.messageRequired': "message є обов'язковим",
  'conversation.error.aiNotConfigured': 'AI-провайдер не налаштований',
  'conversation.error.unknownAiError': 'Невідома помилка AI',
  'conversation.error.notFound': 'Розмову не знайдено',
  'conversation.error.streamError': 'Помилка потокової передачі AI',

  // Resource errors
  'resource.error.unknownError': 'Невідома помилка.',
  'resource.error.unableToCreate': 'Не вдалося створити {{name}}.',
  'resource.error.unableToUpdate': 'Не вдалося оновити {{name}}.',
  'resource.error.unableToDelete': 'Не вдалося видалити {{name}}.',
  'resource.error.notFound': 'Не знайдено.',
  'resource.error.badRequest': 'Некоректний запит.',
  'resource.error.unauthorized': 'Не авторизовано.',

  // Project errors
  'project.error.nameAndTypeRequired': "name та projectType є обов'язковими",
  'project.error.notFound': 'Не знайдено',

  // Device errors
  'device.error.unauthorized': 'Не авторизовано.',
  'device.error.badRequest': 'Невірний запит.',
  'device.error.notFound': 'Не знайдено.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Не вдалося прочитати {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Не вдалося записати {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Не вдалося видалити {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': "Платіжний провайдер є обов'язковим.",
  'user.payment.subscriptionIdRequired': "subscriptionId є обов'язковим.",
  'user.payment.receiptAndPlanRequired': "receipt та planKey є обов'язковими.",
  'user.payment.verificationNotConfigured': 'Верифікація платежу не налаштована для {{provider}}.',
  'user.payment.invalidPlan': 'Недійсний план.',
  'user.payment.verificationFailed': 'Не вдалося підтвердити підписку.',
  'user.payment.unknownPlan': 'Невідомий план.',
  'user.payment.invalidWebhookEvent': 'Недійсна подія вебхука.',
}
