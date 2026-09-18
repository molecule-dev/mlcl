/**
 * Serbian (Latin script) translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Učitavanje...',
  'common.saving': 'Čuvanje...',
  'common.close': 'Zatvori',
  'common.goBack': 'Nazad',
  'common.submit': 'Pošalji',
  'common.continue': 'Nastavi',

  // Auth - Login
  'auth.login.email': 'E-pošta',
  'auth.login.password': 'Lozinka',
  'auth.login.twoFactor': 'Dvofaktorski token (ako je omogućen)',
  'auth.login.signUp': 'Registracija',
  'auth.login.loggingIn': 'Prijavljivanje...',
  'auth.login.logIn': 'Prijavi se',
  'auth.login.forgotPassword': 'Zaboravljena lozinka?',

  // Auth - Signup
  'auth.signup.email': 'E-pošta (Obavezno)',
  'auth.signup.password': 'Lozinka (Obavezno)',
  'auth.signup.name': 'Vaše ime',
  'auth.signup.signingUp': 'Registracija u toku...',
  'auth.signup.signUp': 'Registracija',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ako postoji nalog sa tom e-poštom, link za resetovanje lozinke je poslat.',
  'auth.forgotPassword.email': 'E-pošta',
  'auth.forgotPassword.submitting': 'Slanje...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-pošta',
  'auth.resetPassword.token': 'Token za resetovanje lozinke',
  'auth.resetPassword.newPassword': 'Unesite novu lozinku',
  'auth.resetPassword.twoFactor': 'Dvofaktorski token (ako je omogućen)',
  'auth.resetPassword.loggingIn': 'Prijavljivanje...',
  'auth.resetPassword.submit': 'Postavi lozinku i prijavi se',

  // Home
  'home.greeting': 'Zdravo, ',
  'home.world': 'Svete',

  // Settings
  'settings.account': 'Nalog',
  'settings.email': 'E-pošta',
  'settings.authentication': 'Autentifikacija',
  'settings.changePassword': 'Promeni lozinku',
  'settings.twoFactor': 'Dvofaktorska autentifikacija',
  'settings.notifications': 'Obaveštenja',
  'settings.pushNotifications': 'Push obaveštenja',
  'settings.billing': 'Naplata',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Nadogradi',
  'settings.devices': 'Uređaji',
  'settings.noDevices': 'Nema pronađenih uređaja',
  'settings.thisDevice': 'Ovaj uređaj',
  'settings.platform': 'Platforma',
  'settings.browser': 'Pregledač',
  'settings.network': 'Mreža',
  'settings.online': 'Na mreži',
  'settings.offline': 'Van mreže',
  'settings.unknown': 'Nepoznato',
  'settings.logOut': 'Odjavi se',
  'settings.deleteAccount': 'Obriši nalog',
  'settings.changePasswordModal.title': 'Promena lozinke',
  'settings.changePasswordModal.error': 'Promena lozinke nije uspela.',
  'settings.changePasswordModal.currentPassword': 'Trenutna lozinka',
  'settings.changePasswordModal.newPassword': 'Nova lozinka',
  'settings.changePasswordModal.changing': 'Menjanje...',
  'settings.deleteAccountModal.title': 'Brisanje naloga',
  'settings.deleteAccountModal.warning':
    'Ova radnja se ne može poništiti. Unesite lozinku za potvrdu.',
  'settings.deleteAccountModal.password': 'Lozinka',
  'settings.deleteAccountModal.deleting': 'Brisanje...',
  'settings.changePasswordModal.submit': 'Promeni lozinku',
  'settings.deleteAccountModal.submit': 'Obriši nalog',
  'settings.failedToUpdateEmail': 'Ажурирање е-поште није успело.',
  'settings.failedToDeleteAccount': 'Брисање налога није успело.',
  'settings.toggleTwoFactor': 'Укључи/искључи двофакторску аутентификацију',
  'settings.togglePushNotifications': 'Укључи/искључи push обавештења',

  // Footer
  'footer.about': 'O {{appName}}u',
  'footer.privacyPolicy': 'Politika privatnosti',
  'footer.termsOfService': 'Uslovi korišćenja',
  'footer.language': 'Језик',

  // OAuth
  'oauth.orContinueWith': 'Ili nastavite putem',
  'oauth.continueWith': 'Nastavi putem {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Promeni temu',

  // User Menu
  'userMenu.open': 'Otvori korisnički meni',

  // Plan Updated
  'planUpdated.message': 'Vaš plan je ažuriran.',
  'planUpdated.thankYou': 'Hvala!',
  'planUpdated.returnHome': 'Povratak na početnu',

  // PWA
  'pwa.updateAvailable': 'Нова верзија доступна!',
  'pwa.update': 'Ажурирај',
  'pwa.updating': 'Ажурирање...',

  // User API errors
  'user.error.badRequest': 'Неважећи захтев.',
  'user.error.notFound': 'Није пронађено.',
  'user.error.failedToCreateSession': 'Креирање сесије није успело.',
  'user.error.usernameRequired': 'Корисничко име је обавезно.',
  'user.error.passwordRequired': 'Лозинка је обавезна.',
  'user.error.emailInvalid': 'Имејл је неважећи.',
  'user.error.usernameUnavailable': 'Корисничко име није доступно.',
  'user.error.emailAlreadyRegistered': 'Имејл је већ регистрован.',
  'user.error.failedToHashPassword': 'Хеширање лозинке није успело.',
  'user.error.invalidCredentials': 'Неважећи акредитиви.',
  'user.error.invalidTwoFactorToken': 'Неважећи двофакторски токен.',
  'user.error.twoFactorVerificationUnavailable': 'Двофакторска верификација није доступна.',
  'user.error.loginFailed': 'Пријава није успела.',
  'user.error.usernameCannotBeEmpty': 'Корисничко име не може бити празно.',
  'user.error.failedToUpdateUser': 'Ажурирање корисника није успело.',
  'user.error.failedToDeleteUser': 'Брисање корисника није успело.',
  'user.error.failedToReadUser': 'Читање корисника није успело.',
  'user.error.emailRequired': 'Имејл је обавезан.',
  'user.error.failedToProcessPasswordReset': 'Обрада ресетовања лозинке није успела.',
  'user.error.newPasswordRequired': 'Нова лозинка је обавезна.',
  'user.error.currentPasswordRequired': 'Тренутна лозинка је обавезна.',
  'user.error.currentPasswordIncorrect': 'Тренутна лозинка је нетачна.',
  'user.error.failedToUpdatePassword': 'Ажурирање лозинке није успело.',
  'user.error.planKeyRequired': 'planKey је обавезан.',
  'user.error.invalidPlan': 'Неважећи план.',
  'user.error.failedToUpdateSubscription': 'Ажурирање претплате није успело.',
  'user.error.failedToUpdatePlan': 'Ажурирање плана није успело.',
  'user.error.twoFactorNotAvailable': 'Двофакторска аутентификација није доступна.',
  'user.error.tokenRequired': 'Токен је обавезан.',
  'user.error.noPendingTwoFactorSetup':
    'Нема двофакторског подешавања на чекању. Позовите са акцијом "setup" прво.',
  'user.error.invalidToken': 'Неважећи токен.',
  'user.error.twoFactorNotEnabled': 'Двофакторска аутентификација није омогућена.',
  'user.error.invalidAction': 'Неважећа радња. Користите "setup", "enable" или "disable".',
  'user.error.twoFactorOperationFailed': 'Двофакторска операција није успела.',
  'user.error.oauthServerNotConfigured': 'OAuth сервер "{{server}}" није конфигурисан.',
  'user.error.oauthVerificationFailed': 'OAuth верификација није успела.',
  'user.error.failedToCreateUser': 'Креирање корисника није успело.',
  'user.error.oauthLoginFailed': 'OAuth пријава није успела.',

  // Auth client errors
  'auth.error.requestFailed': 'Захтев није успео',
  'auth.error.loginFailed': 'Пријава није успела',
  'auth.error.registrationFailed': 'Регистрација није успела',
  'auth.error.noRefreshToken': 'Нема доступног токена за освежавање',

  // Form validation
  'forms.required': 'Ово поље је обавезно',
  'forms.min': 'Вредност мора бити најмање {{min}}',
  'forms.max': 'Вредност мора бити највише {{max}}',
  'forms.minLength': 'Мора имати најмање {{minLength}} карактера',
  'forms.maxLength': 'Мора имати највише {{maxLength}} карактера',
  'forms.invalidFormat': 'Неважећи формат',
  'forms.invalidEmail': 'Неважећа адреса е-поште',
  'forms.invalidUrl': 'Неважећи URL',
  'forms.invalidValue': 'Неважећа вредност',

  // HTTP client errors
  'http.error.requestFailed': 'Захтев није успео са статусом {{status}}.',
  'http.error.networkError': 'Мрежна грешка.',

  // Routing errors
  'routing.error.missingParam': 'Недостаје параметар "{{name}}" за путању "{{pattern}}"',
  'routing.error.routeNotFound': 'Путања "{{name}}" није пронађена',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter мора да се користи унутар MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push обавештења нису подржана',
  'push.error.permissionNotGranted': 'Дозвола за обавештења није одобрена',

  // Utility errors
  'error.networkError': 'Мрежна грешка. Молимо проверите вашу везу.',
  'error.timeout': 'Захтев је истекао. Молимо покушајте поново.',
  'error.unauthorized': 'Нисте овлашћени да извршите ову радњу.',
  'error.forbidden': 'Приступ одбијен.',
  'error.notFound': 'Ресурс није пронађен.',
  'error.validationError': 'Молимо проверите унос и покушајте поново.',
  'error.serverError': 'Грешка сервера. Молимо покушајте поново касније.',
  'error.unknown': 'Дошло је до неочекиване грешке.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message је обавезан',
  'conversation.error.aiNotConfigured': 'AI провајдер није конфигурисан',
  'conversation.error.unknownAiError': 'Непозната AI грешка',
  'conversation.error.notFound': 'Разговор није пронађен',
  'conversation.error.streamError': 'Грешка AI стримовања',

  // Resource errors
  'resource.error.unknownError': 'Непозната грешка.',
  'resource.error.unableToCreate': 'Није могуће креирати {{name}}.',
  'resource.error.unableToUpdate': 'Није могуће ажурирати {{name}}.',
  'resource.error.unableToDelete': 'Није могуће обрисати {{name}}.',
  'resource.error.notFound': 'Није пронађено.',
  'resource.error.badRequest': 'Неважећи захтев.',
  'resource.error.unauthorized': 'Неовлашћено.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name и projectType су обавезни',
  'project.error.notFound': 'Није пронађено',

  // Device errors
  'device.error.unauthorized': 'Неовлашћено.',
  'device.error.badRequest': 'Неисправан захтев.',
  'device.error.notFound': 'Није пронађено.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Неуспело читање {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Неуспело писање {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Неуспело брисање {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Провајдер плаћања је обавезан.',
  'user.payment.subscriptionIdRequired': 'subscriptionId је обавезан.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey су обавезни.',
  'user.payment.verificationNotConfigured':
    'Верификација плаћања није конфигурисана за {{provider}}.',
  'user.payment.invalidPlan': 'Неважећи план.',
  'user.payment.verificationFailed': 'Верификација претплате није успела.',
  'user.payment.unknownPlan': 'Непознат план.',
  'user.payment.invalidWebhookEvent': 'Неважећи webhook догађај.',
}
