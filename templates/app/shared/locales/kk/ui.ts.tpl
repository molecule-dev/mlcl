/**
 * Kazakh translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Жүктелуде...',
  'common.saving': 'Сақталуда...',
  'common.close': 'Жабу',
  'common.goBack': 'Артқа қайту',
  'common.submit': 'Жіберу',
  'common.continue': 'Жалғастыру',

  // Auth - Login
  'auth.login.email': 'Электрондық пошта',
  'auth.login.password': 'Құпиясөз',
  'auth.login.twoFactor': 'Екі факторлы растау коды (қосылған болса)',
  'auth.login.signUp': 'Тіркелу',
  'auth.login.loggingIn': 'Кіру орындалуда...',
  'auth.login.logIn': 'Кіру',
  'auth.login.forgotPassword': 'Құпиясөзді ұмыттыңыз ба?',

  // Auth - Signup
  'auth.signup.email': 'Электрондық пошта (Міндетті)',
  'auth.signup.password': 'Құпиясөз (Міндетті)',
  'auth.signup.name': 'Атыңыз',
  'auth.signup.signingUp': 'Тіркелу орындалуда...',
  'auth.signup.signUp': 'Тіркелу',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Егер осы электрондық поштаға тіркелген тіркелгі бар болса, құпиясөзді қалпына келтіру сілтемесі жіберілді.',
  'auth.forgotPassword.email': 'Электрондық пошта',
  'auth.forgotPassword.submitting': 'Жіберілуде...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Электрондық пошта',
  'auth.resetPassword.token': 'Құпиясөзді қалпына келтіру коды',
  'auth.resetPassword.newPassword': 'Жаңа құпиясөзді енгізіңіз',
  'auth.resetPassword.twoFactor': 'Екі факторлы растау коды (қосылған болса)',
  'auth.resetPassword.loggingIn': 'Кіру орындалуда...',
  'auth.resetPassword.submit': 'Құпиясөзді орнату және кіру',

  // Home
  'home.greeting': 'Сәлем, ',
  'home.world': 'Әлем',

  // Settings
  'settings.account': 'Тіркелгі',
  'settings.email': 'Электрондық пошта',
  'settings.authentication': 'Аутентификация',
  'settings.changePassword': 'Құпиясөзді өзгерту',
  'settings.twoFactor': 'Екі факторлы аутентификация',
  'settings.notifications': 'Хабарландырулар',
  'settings.pushNotifications': 'Push хабарландырулар',
  'settings.billing': 'Төлем',
  'settings.plan': 'Тариф: ',
  'settings.upgrade': 'Жаңарту',
  'settings.devices': 'Құрылғылар',
  'settings.noDevices': 'Құрылғылар табылмады',
  'settings.thisDevice': 'Бұл құрылғы',
  'settings.platform': 'Платформа',
  'settings.browser': 'Браузер',
  'settings.network': 'Желі',
  'settings.online': 'Онлайн',
  'settings.offline': 'Офлайн',
  'settings.unknown': 'Белгісіз',
  'settings.logOut': 'Шығу',
  'settings.deleteAccount': 'Тіркелгіні жою',
  'settings.changePasswordModal.title': 'Құпиясөзді өзгерту',
  'settings.changePasswordModal.error': 'Құпиясөзді өзгерту сәтсіз аяқталды.',
  'settings.changePasswordModal.currentPassword': 'Ағымдағы құпиясөз',
  'settings.changePasswordModal.newPassword': 'Жаңа құпиясөз',
  'settings.changePasswordModal.changing': 'Өзгертілуде...',
  'settings.deleteAccountModal.title': 'Тіркелгіні жою',
  'settings.deleteAccountModal.warning':
    'Бұл әрекетті кері қайтару мүмкін емес. Растау үшін құпиясөзіңізді енгізіңіз.',
  'settings.deleteAccountModal.password': 'Құпиясөз',
  'settings.deleteAccountModal.deleting': 'Жойылуда...',
  'settings.changePasswordModal.submit': 'Құпиясөзді өзгерту',
  'settings.deleteAccountModal.submit': 'Тіркелгіні жою',
  'settings.failedToUpdateEmail': 'Электрондық поштаны жаңарту сәтсіз.',
  'settings.failedToDeleteAccount': 'Тіркелгіні жою сәтсіз.',
  'settings.toggleTwoFactor': 'Екі факторлы аутентификацияны ауыстыру',
  'settings.togglePushNotifications': 'Push хабарландыруларды ауыстыру',

  // Footer
  'footer.about': '{{appName}} туралы',
  'footer.privacyPolicy': 'Құпиялылық саясаты',
  'footer.termsOfService': 'Қызмет көрсету шарттары',
  'footer.language': 'Тіл',

  // OAuth
  'oauth.orContinueWith': 'Немесе мынамен жалғастырыңыз',
  'oauth.continueWith': '{{provider}} арқылы жалғастыру',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Тақырыпты ауыстыру',

  // User Menu
  'userMenu.open': 'Пайдаланушы мәзірін ашу',

  // Plan Updated
  'planUpdated.message': 'Тарифіңіз жаңартылды.',
  'planUpdated.thankYou': 'Рахмет!',
  'planUpdated.returnHome': 'Басты бетке оралу',

  // PWA
  'pwa.updateAvailable': 'Жаңа нұсқа қолжетімді!',
  'pwa.update': 'Жаңарту',
  'pwa.updating': 'Жаңартылуда...',

  // User API errors
  'user.error.badRequest': 'Жарамсыз сұраныс.',
  'user.error.notFound': 'Табылмады.',
  'user.error.failedToCreateSession': 'Сеанс жасау сәтсіз аяқталды.',
  'user.error.usernameRequired': 'Пайдаланушы аты қажет.',
  'user.error.passwordRequired': 'Құпия сөз қажет.',
  'user.error.emailInvalid': 'Электрондық пошта жарамсыз.',
  'user.error.usernameUnavailable': 'Пайдаланушы аты қолжетімсіз.',
  'user.error.emailAlreadyRegistered': 'Электрондық пошта бұрыннан тіркелген.',
  'user.error.failedToHashPassword': 'Құпия сөзді хэштеу сәтсіз аяқталды.',
  'user.error.invalidCredentials': 'Жарамсыз тіркелгі деректері.',
  'user.error.invalidTwoFactorToken': 'Жарамсыз екі факторлы токен.',
  'user.error.twoFactorVerificationUnavailable': 'Екі факторлы тексеру қолжетімсіз.',
  'user.error.loginFailed': 'Кіру сәтсіз аяқталды.',
  'user.error.usernameCannotBeEmpty': 'Пайдаланушы аты бос болуы мүмкін емес.',
  'user.error.failedToUpdateUser': 'Пайдаланушыны жаңарту сәтсіз аяқталды.',
  'user.error.failedToDeleteUser': 'Пайдаланушыны жою сәтсіз аяқталды.',
  'user.error.failedToReadUser': 'Пайдаланушыны оқу сәтсіз аяқталды.',
  'user.error.emailRequired': 'Электрондық пошта қажет.',
  'user.error.failedToProcessPasswordReset': 'Құпия сөзді қалпына келтіруді өңдеу сәтсіз аяқталды.',
  'user.error.newPasswordRequired': 'Жаңа құпия сөз қажет.',
  'user.error.currentPasswordRequired': 'Ағымдағы құпия сөз қажет.',
  'user.error.currentPasswordIncorrect': 'Ағымдағы құпия сөз дұрыс емес.',
  'user.error.failedToUpdatePassword': 'Құпия сөзді жаңарту сәтсіз аяқталды.',
  'user.error.planKeyRequired': 'planKey қажет.',
  'user.error.invalidPlan': 'Жарамсыз жоспар.',
  'user.error.failedToUpdateSubscription': 'Жазылымды жаңарту сәтсіз аяқталды.',
  'user.error.failedToUpdatePlan': 'Жоспарды жаңарту сәтсіз аяқталды.',
  'user.error.twoFactorNotAvailable': 'Екі факторлы аутентификация қолжетімсіз.',
  'user.error.tokenRequired': 'Токен қажет.',
  'user.error.noPendingTwoFactorSetup':
    'Күтудегі екі факторлы орнату жоқ. Алдымен "setup" арқылы шақырыңыз.',
  'user.error.invalidToken': 'Жарамсыз токен.',
  'user.error.twoFactorNotEnabled': 'Екі факторлы қосылмаған.',
  'user.error.invalidAction': 'Жарамсыз әрекет. "setup", "enable" немесе "disable" пайдаланыңыз.',
  'user.error.twoFactorOperationFailed': 'Екі факторлы операция сәтсіз аяқталды.',
  'user.error.oauthServerNotConfigured': 'OAuth сервері "{{server}}" конфигурацияланбаған.',
  'user.error.oauthVerificationFailed': 'OAuth тексеруі сәтсіз аяқталды.',
  'user.error.failedToCreateUser': 'Пайдаланушы жасау сәтсіз аяқталды.',
  'user.error.oauthLoginFailed': 'OAuth кіру сәтсіз аяқталды.',

  // Auth client errors
  'auth.error.requestFailed': 'Сұраныс сәтсіз аяқталды',
  'auth.error.loginFailed': 'Кіру сәтсіз аяқталды',
  'auth.error.registrationFailed': 'Тіркелу сәтсіз аяқталды',
  'auth.error.noRefreshToken': 'Жаңарту токені жоқ',

  // Form validation
  'forms.required': 'Бұл өріс міндетті',
  'forms.min': 'Мән кемінде {{min}} болуы керек',
  'forms.max': 'Мән ең көбі {{max}} болуы керек',
  'forms.minLength': 'Кемінде {{minLength}} таңба болуы керек',
  'forms.maxLength': 'Ең көбі {{maxLength}} таңба болуы керек',
  'forms.invalidFormat': 'Жарамсыз формат',
  'forms.invalidEmail': 'Жарамсыз электрондық пошта мекенжайы',
  'forms.invalidUrl': 'Жарамсыз URL',
  'forms.invalidValue': 'Жарамсыз мән',

  // HTTP client errors
  'http.error.requestFailed': 'Сұраныс {{status}} мәртебесімен сәтсіз аяқталды.',
  'http.error.networkError': 'Желі қатесі.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" жолы үшін "{{name}}" параметрі жоқ',
  'routing.error.routeNotFound': '"{{name}}" маршруты табылмады',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider ішінде қолданылуы керек',

  // Push notification errors
  'push.error.notSupported': 'Push хабарландырулар қолдау көрсетілмейді',
  'push.error.permissionNotGranted': 'Хабарландыру рұқсаты берілмеген',

  // Utility errors
  'error.networkError': 'Желі қатесі. Қосылымыңызды тексеріңіз.',
  'error.timeout': 'Сұраныс уақыты бітті. Қайта әрекеттеніңіз.',
  'error.unauthorized': 'Сіз бұл әрекетті орындауға рұқсат етілмегенсіз.',
  'error.forbidden': 'Қатынау тыйым салынды.',
  'error.notFound': 'Ресурс табылмады.',
  'error.validationError': 'Енгізілген деректерді тексеріп, қайта әрекеттеніңіз.',
  'error.serverError': 'Сервер қатесі. Кейінірек қайта әрекеттеніңіз.',
  'error.unknown': 'Күтпеген қате орын алды.',

  // AI conversation errors
  'conversation.error.messageRequired': 'хабарлама қажет',
  'conversation.error.aiNotConfigured': 'AI провайдері конфигурацияланбаған',
  'conversation.error.unknownAiError': 'Белгісіз AI қатесі',
  'conversation.error.notFound': 'Әңгіме табылмады',
  'conversation.error.streamError': 'AI ағын қатесі',

  // Resource errors
  'resource.error.unknownError': 'Белгісіз қате.',
  'resource.error.unableToCreate': '{{name}} жасау мүмкін болмады.',
  'resource.error.unableToUpdate': '{{name}} жаңарту мүмкін болмады.',
  'resource.error.unableToDelete': '{{name}} жою мүмкін болмады.',
  'resource.error.notFound': 'Табылмады.',
  'resource.error.badRequest': 'Жарамсыз сұраныс.',
  'resource.error.unauthorized': 'Рұқсат етілмеген.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name және projectType қажет',
  'project.error.notFound': 'Табылмады',

  // Device errors
  'device.error.unauthorized': 'Рұқсат етілмеген.',
  'device.error.badRequest': 'Қате сұраныс.',
  'device.error.notFound': 'Табылмады.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} оқу сәтсіз аяқталды: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} жазу сәтсіз аяқталды: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} жою сәтсіз аяқталды: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Төлем провайдері қажет.',
  'user.payment.subscriptionIdRequired': 'subscriptionId қажет.',
  'user.payment.receiptAndPlanRequired': 'receipt және planKey қажет.',
  'user.payment.verificationNotConfigured':
    '{{provider}} үшін төлем тексеруі конфигурацияланбаған.',
  'user.payment.invalidPlan': 'Жарамсыз жоспар.',
  'user.payment.verificationFailed': 'Жазылымды тексеру сәтсіз аяқталды.',
  'user.payment.unknownPlan': 'Белгісіз жоспар.',
  'user.payment.invalidWebhookEvent': 'Жарамсыз вебхук оқиғасы.',
}
