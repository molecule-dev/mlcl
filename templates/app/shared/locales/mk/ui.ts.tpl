/**
 * Macedonian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Вчитување...',
  'common.saving': 'Зачувување...',
  'common.close': 'Затвори',
  'common.goBack': 'Назад',
  'common.submit': 'Испрати',
  'common.continue': 'Продолжи',

  // Auth - Login
  'auth.login.email': 'Е-пошта',
  'auth.login.password': 'Лозинка',
  'auth.login.twoFactor': 'Двофакторски токен (ако е овозможен)',
  'auth.login.signUp': 'Регистрација',
  'auth.login.loggingIn': 'Најавување...',
  'auth.login.logIn': 'Најави се',
  'auth.login.forgotPassword': 'Заборавена лозинка?',

  // Auth - Signup
  'auth.signup.email': 'Е-пошта (Задолжително)',
  'auth.signup.password': 'Лозинка (Задолжително)',
  'auth.signup.name': 'Вашето име',
  'auth.signup.signingUp': 'Регистрирање...',
  'auth.signup.signUp': 'Регистрација',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ако постои сметка со таа е-пошта, испратена е врска за ресетирање на лозинката.',
  'auth.forgotPassword.email': 'Е-пошта',
  'auth.forgotPassword.submitting': 'Испраќање...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Е-пошта',
  'auth.resetPassword.token': 'Токен за ресетирање на лозинка',
  'auth.resetPassword.newPassword': 'Внесете нова лозинка',
  'auth.resetPassword.twoFactor': 'Двофакторски токен (ако е овозможен)',
  'auth.resetPassword.loggingIn': 'Најавување...',
  'auth.resetPassword.submit': 'Постави лозинка и најави се',

  // Home
  'home.greeting': 'Здраво, ',
  'home.world': 'Свету',

  // Settings
  'settings.account': 'Сметка',
  'settings.email': 'Е-пошта',
  'settings.authentication': 'Автентикација',
  'settings.changePassword': 'Промени лозинка',
  'settings.twoFactor': 'Двофакторска автентикација',
  'settings.notifications': 'Известувања',
  'settings.pushNotifications': 'Push известувања',
  'settings.billing': 'Наплата',
  'settings.plan': 'План: ',
  'settings.upgrade': 'Надогради',
  'settings.devices': 'Уреди',
  'settings.noDevices': 'Нема пронајдени уреди',
  'settings.thisDevice': 'Овој уред',
  'settings.platform': 'Платформа',
  'settings.browser': 'Прелистувач',
  'settings.network': 'Мрежа',
  'settings.online': 'Онлајн',
  'settings.offline': 'Офлајн',
  'settings.unknown': 'Непознато',
  'settings.logOut': 'Одјави се',
  'settings.deleteAccount': 'Избриши сметка',
  'settings.changePasswordModal.title': 'Промена на лозинка',
  'settings.changePasswordModal.error': 'Промената на лозинката не успеа.',
  'settings.changePasswordModal.currentPassword': 'Тековна лозинка',
  'settings.changePasswordModal.newPassword': 'Нова лозинка',
  'settings.changePasswordModal.changing': 'Менување...',
  'settings.deleteAccountModal.title': 'Бришење на сметка',
  'settings.deleteAccountModal.warning':
    'Ова дејство не може да се поништи. Внесете ја вашата лозинка за потврда.',
  'settings.deleteAccountModal.password': 'Лозинка',
  'settings.deleteAccountModal.deleting': 'Бришење...',
  'settings.changePasswordModal.submit': 'Промени лозинка',
  'settings.deleteAccountModal.submit': 'Избриши сметка',
  'settings.failedToUpdateEmail': 'Неуспешно ажурирање на е-пошта.',
  'settings.failedToDeleteAccount': 'Неуспешно бришење на сметка.',
  'settings.toggleTwoFactor': 'Вклучи/исклучи двофакторска автентикација',
  'settings.togglePushNotifications': 'Вклучи/исклучи push известувања',

  // Footer
  'footer.about': 'За {{appName}}',
  'footer.privacyPolicy': 'Политика за приватност',
  'footer.termsOfService': 'Услови за користење',
  'footer.language': 'Јазик',

  // OAuth
  'oauth.orContinueWith': 'Или продолжете со',
  'oauth.continueWith': 'Продолжи со {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Промени тема',

  // User Menu
  'userMenu.open': 'Отвори корисничко мени',

  // Plan Updated
  'planUpdated.message': 'Вашиот план е ажуриран.',
  'planUpdated.thankYou': 'Ви благодариме!',
  'planUpdated.returnHome': 'Врати се на почетна',

  // PWA
  'pwa.updateAvailable': 'Достапна е нова верзија!',
  'pwa.update': 'Ажурирај',
  'pwa.updating': 'Се ажурира...',

  // User API errors
  'user.error.badRequest': 'Невалидно барање.',
  'user.error.notFound': 'Не е пронајдено.',
  'user.error.failedToCreateSession': 'Неуспешно создавање на сесија.',
  'user.error.usernameRequired': 'Корисничкото име е задолжително.',
  'user.error.passwordRequired': 'Лозинката е задолжителна.',
  'user.error.emailInvalid': 'Е-поштата е невалидна.',
  'user.error.usernameUnavailable': 'Корисничкото име не е достапно.',
  'user.error.emailAlreadyRegistered': 'Е-поштата е веќе регистрирана.',
  'user.error.failedToHashPassword': 'Неуспешно хеширање на лозинката.',
  'user.error.invalidCredentials': 'Невалидни акредитиви.',
  'user.error.invalidTwoFactorToken': 'Невалиден двофакторски токен.',
  'user.error.twoFactorVerificationUnavailable': 'Двофакторската верификација е недостапна.',
  'user.error.loginFailed': 'Најавата не успеа.',
  'user.error.usernameCannotBeEmpty': 'Корисничкото име не може да биде празно.',
  'user.error.failedToUpdateUser': 'Неуспешно ажурирање на корисникот.',
  'user.error.failedToDeleteUser': 'Неуспешно бришење на корисникот.',
  'user.error.failedToReadUser': 'Неуспешно читање на корисникот.',
  'user.error.emailRequired': 'Е-поштата е задолжителна.',
  'user.error.failedToProcessPasswordReset': 'Неуспешна обработка на ресетирање на лозинка.',
  'user.error.newPasswordRequired': 'Новата лозинка е задолжителна.',
  'user.error.currentPasswordRequired': 'Тековната лозинка е задолжителна.',
  'user.error.currentPasswordIncorrect': 'Тековната лозинка е неточна.',
  'user.error.failedToUpdatePassword': 'Неуспешно ажурирање на лозинката.',
  'user.error.planKeyRequired': 'planKey е задолжителен.',
  'user.error.invalidPlan': 'Невалиден план.',
  'user.error.failedToUpdateSubscription': 'Неуспешно ажурирање на претплатата.',
  'user.error.failedToUpdatePlan': 'Неуспешно ажурирање на планот.',
  'user.error.twoFactorNotAvailable': 'Двофакторската автентикација не е достапна.',
  'user.error.tokenRequired': 'Токенот е задолжителен.',
  'user.error.noPendingTwoFactorSetup':
    'Нема двофакторско поставување на чекање. Повикајте со акција "setup" прво.',
  'user.error.invalidToken': 'Невалиден токен.',
  'user.error.twoFactorNotEnabled': 'Двофакторската автентикација не е овозможена.',
  'user.error.invalidAction': 'Невалидна акција. Користете "setup", "enable" или "disable".',
  'user.error.twoFactorOperationFailed': 'Двофакторската операција не успеа.',
  'user.error.oauthServerNotConfigured': 'OAuth серверот "{{server}}" не е конфигуриран.',
  'user.error.oauthVerificationFailed': 'OAuth верификацијата не успеа.',
  'user.error.failedToCreateUser': 'Неуспешно создавање на корисник.',
  'user.error.oauthLoginFailed': 'OAuth најавата не успеа.',

  // Auth client errors
  'auth.error.requestFailed': 'Барањето не успеа',
  'auth.error.loginFailed': 'Најавата не успеа',
  'auth.error.registrationFailed': 'Регистрацијата не успеа',
  'auth.error.noRefreshToken': 'Нема достапен токен за освежување',

  // Form validation
  'forms.required': 'Ова поле е задолжително',
  'forms.min': 'Вредноста мора да биде најмалку {{min}}',
  'forms.max': 'Вредноста мора да биде најмногу {{max}}',
  'forms.minLength': 'Мора да има најмалку {{minLength}} знаци',
  'forms.maxLength': 'Мора да има најмногу {{maxLength}} знаци',
  'forms.invalidFormat': 'Невалиден формат',
  'forms.invalidEmail': 'Невалидна адреса за е-пошта',
  'forms.invalidUrl': 'Невалиден URL',
  'forms.invalidValue': 'Невалидна вредност',

  // HTTP client errors
  'http.error.requestFailed': 'Барањето не успеа со статус {{status}}.',
  'http.error.networkError': 'Мрежна грешка.',

  // Routing errors
  'routing.error.missingParam': 'Недостасува параметар "{{name}}" за патеката "{{pattern}}"',
  'routing.error.routeNotFound': 'Патеката "{{name}}" не е пронајдена',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter мора да се користи внатре во MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Пуш известувањата не се поддржани',
  'push.error.permissionNotGranted': 'Дозволата за известувања не е одобрена',

  // Utility errors
  'error.networkError': 'Мрежна грешка. Проверете ја вашата конекција.',
  'error.timeout': 'Барањето истече. Обидете се повторно.',
  'error.unauthorized': 'Не сте овластени да ја извршите оваа акција.',
  'error.forbidden': 'Пристапот е одбиен.',
  'error.notFound': 'Ресурсот не е пронајден.',
  'error.validationError': 'Проверете го вашиот внес и обидете се повторно.',
  'error.serverError': 'Грешка на серверот. Обидете се повторно подоцна.',
  'error.unknown': 'Настана неочекувана грешка.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message е задолжително',
  'conversation.error.aiNotConfigured': 'AI провајдерот не е конфигуриран',
  'conversation.error.unknownAiError': 'Непозната AI грешка',
  'conversation.error.notFound': 'Не е пронајден разговор',
  'conversation.error.streamError': 'Грешка при AI стриминг',

  // Resource errors
  'resource.error.unknownError': 'Непозната грешка.',
  'resource.error.unableToCreate': 'Не може да се создаде {{name}}.',
  'resource.error.unableToUpdate': 'Не може да се ажурира {{name}}.',
  'resource.error.unableToDelete': 'Не може да се избрише {{name}}.',
  'resource.error.notFound': 'Не е пронајдено.',
  'resource.error.badRequest': 'Невалидно барање.',
  'resource.error.unauthorized': 'Неовластено.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name и projectType се задолжителни',
  'project.error.notFound': 'Не е пронајдено',

  // Device errors
  'device.error.unauthorized': 'Неовластено.',
  'device.error.badRequest': 'Неисправно барање.',
  'device.error.notFound': 'Не е пронајдено.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Неуспешно читање на {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Неуспешно пишување на {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Неуспешно бришење на {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Потребен е давател на плаќање.',
  'user.payment.subscriptionIdRequired': 'subscriptionId е задолжителен.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey се задолжителни.',
  'user.payment.verificationNotConfigured':
    'Верификацијата на плаќањето не е конфигурирана за {{provider}}.',
  'user.payment.invalidPlan': 'Невалиден план.',
  'user.payment.verificationFailed': 'Верификацијата на претплатата не успеа.',
  'user.payment.unknownPlan': 'Непознат план.',
  'user.payment.invalidWebhookEvent': 'Невалиден веб-кука настан.',
}
