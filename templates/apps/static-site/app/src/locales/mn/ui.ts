/**
 * Mongolian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Ачааллаж байна...',
  'common.saving': 'Хадгалж байна...',
  'common.close': 'Хаах',
  'common.goBack': 'Буцах',
  'common.submit': 'Илгээх',
  'common.continue': 'Үргэлжлүүлэх',

  // Auth - Login
  'auth.login.email': 'Имэйл',
  'auth.login.password': 'Нууц үг',
  'auth.login.twoFactor': 'Хоёр шатлалт баталгаажуулалтын код (идэвхтэй бол)',
  'auth.login.signUp': 'Бүртгүүлэх',
  'auth.login.loggingIn': 'Нэвтэрч байна...',
  'auth.login.logIn': 'Нэвтрэх',
  'auth.login.forgotPassword': 'Нууц үгээ мартсан уу?',

  // Auth - Signup
  'auth.signup.email': 'Имэйл (Заавал)',
  'auth.signup.password': 'Нууц үг (Заавал)',
  'auth.signup.name': 'Таны нэр',
  'auth.signup.signingUp': 'Бүртгэж байна...',
  'auth.signup.signUp': 'Бүртгүүлэх',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Хэрэв энэ имэйл хаягтай бүртгэл байгаа бол нууц үг шинэчлэх холбоос илгээгдсэн.',
  'auth.forgotPassword.email': 'Имэйл',
  'auth.forgotPassword.submitting': 'Илгээж байна...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Имэйл',
  'auth.resetPassword.token': 'Нууц үг шинэчлэх код',
  'auth.resetPassword.newPassword': 'Шинэ нууц үг оруулна уу',
  'auth.resetPassword.twoFactor': 'Хоёр шатлалт баталгаажуулалтын код (идэвхтэй бол)',
  'auth.resetPassword.loggingIn': 'Нэвтэрч байна...',
  'auth.resetPassword.submit': 'Нууц үг тохируулж нэвтрэх',

  // Home
  'home.greeting': 'Сайн уу, ',
  'home.world': 'Дэлхий',

  // Settings
  'settings.account': 'Бүртгэл',
  'settings.email': 'Имэйл',
  'settings.authentication': 'Баталгаажуулалт',
  'settings.changePassword': 'Нууц үг солих',
  'settings.twoFactor': 'Хоёр шатлалт баталгаажуулалт',
  'settings.notifications': 'Мэдэгдэл',
  'settings.pushNotifications': 'Push мэдэгдэл',
  'settings.billing': 'Төлбөр',
  'settings.plan': 'Төлөвлөгөө: ',
  'settings.upgrade': 'Сайжруулах',
  'settings.devices': 'Төхөөрөмжүүд',
  'settings.noDevices': 'Төхөөрөмж олдсонгүй',
  'settings.thisDevice': 'Энэ төхөөрөмж',
  'settings.platform': 'Платформ',
  'settings.browser': 'Хөтөч',
  'settings.network': 'Сүлжээ',
  'settings.online': 'Онлайн',
  'settings.offline': 'Офлайн',
  'settings.unknown': 'Тодорхойгүй',
  'settings.logOut': 'Гарах',
  'settings.deleteAccount': 'Бүртгэл устгах',
  'settings.changePasswordModal.title': 'Нууц үг солих',
  'settings.changePasswordModal.error': 'Нууц үг солиход алдаа гарлаа.',
  'settings.changePasswordModal.currentPassword': 'Одоогийн нууц үг',
  'settings.changePasswordModal.newPassword': 'Шинэ нууц үг',
  'settings.changePasswordModal.changing': 'Солигдож байна...',
  'settings.deleteAccountModal.title': 'Бүртгэл устгах',
  'settings.deleteAccountModal.warning':
    'Энэ үйлдлийг буцаах боломжгүй. Баталгаажуулахын тулд нууц үгээ оруулна уу.',
  'settings.deleteAccountModal.password': 'Нууц үг',
  'settings.deleteAccountModal.deleting': 'Устгаж байна...',
  'settings.changePasswordModal.submit': 'Нууц үг солих',
  'settings.deleteAccountModal.submit': 'Бүртгэл устгах',
  'settings.failedToUpdateEmail': 'Имэйл шинэчлэлт амжилтгүй.',
  'settings.failedToDeleteAccount': 'Бүртгэл устгалт амжилтгүй.',
  'settings.toggleTwoFactor': 'Хоёр хүчин зүйлийн баталгаажуулалтыг сэлгэх',
  'settings.togglePushNotifications': 'Push мэдэгдлүүдийг сэлгэх',

  // Footer
  'footer.about': '{{appName}}-ийн тухай',
  'footer.privacyPolicy': 'Нууцлалын бодлого',
  'footer.termsOfService': 'Үйлчилгээний нөхцөл',
  'footer.language': 'Хэл',

  // OAuth
  'oauth.orContinueWith': 'Эсвэл дараахаар үргэлжлүүлэх',
  'oauth.continueWith': '{{provider}}-ээр үргэлжлүүлэх',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Загвар сольсон',

  // User Menu
  'userMenu.open': 'Хэрэглэгчийн цэс нээх',

  // Plan Updated
  'planUpdated.message': 'Таны төлөвлөгөө шинэчлэгдлээ.',
  'planUpdated.thankYou': 'Баярлалаа!',
  'planUpdated.returnHome': 'Нүүр хуудас руу буцах',

  // PWA
  'pwa.updateAvailable': 'Шинэ хувилбар боломжтой!',
  'pwa.update': 'Шинэчлэх',
  'pwa.updating': 'Шинэчилж байна...',

  // User API errors
  'user.error.badRequest': 'Буруу хүсэлт.',
  'user.error.notFound': 'Олдсонгүй.',
  'user.error.failedToCreateSession': 'Сессия үүсгэхэд алдаа гарлаа.',
  'user.error.usernameRequired': 'Хэрэглэгчийн нэр шаардлагатай.',
  'user.error.passwordRequired': 'Нууц үг шаардлагатай.',
  'user.error.emailInvalid': 'Имэйл буруу байна.',
  'user.error.usernameUnavailable': 'Хэрэглэгчийн нэр боломжгүй.',
  'user.error.emailAlreadyRegistered': 'Имэйл аль хэдийн бүртгэгдсэн.',
  'user.error.failedToHashPassword': 'Нууц үг хэшлэхэд алдаа гарлаа.',
  'user.error.invalidCredentials': 'Буруу итгэмжлэл.',
  'user.error.invalidTwoFactorToken': 'Буруу хоёр хүчин зүйлийн токен.',
  'user.error.twoFactorVerificationUnavailable': 'Хоёр хүчин зүйлийн баталгаажуулалт боломжгүй.',
  'user.error.loginFailed': 'Нэвтрэлт амжилтгүй.',
  'user.error.usernameCannotBeEmpty': 'Хэрэглэгчийн нэр хоосон байж болохгүй.',
  'user.error.failedToUpdateUser': 'Хэрэглэгч шинэчлэхэд алдаа гарлаа.',
  'user.error.failedToDeleteUser': 'Хэрэглэгч устгахад алдаа гарлаа.',
  'user.error.failedToReadUser': 'Хэрэглэгч уншихад алдаа гарлаа.',
  'user.error.emailRequired': 'Имэйл шаардлагатай.',
  'user.error.failedToProcessPasswordReset': 'Нууц үг шинэчлэх процесс амжилтгүй.',
  'user.error.newPasswordRequired': 'Шинэ нууц үг шаардлагатай.',
  'user.error.currentPasswordRequired': 'Одоогийн нууц үг шаардлагатай.',
  'user.error.currentPasswordIncorrect': 'Одоогийн нууц үг буруу байна.',
  'user.error.failedToUpdatePassword': 'Нууц үг шинэчлэхэд алдаа гарлаа.',
  'user.error.planKeyRequired': 'planKey шаардлагатай.',
  'user.error.invalidPlan': 'Буруу төлөвлөгөө.',
  'user.error.failedToUpdateSubscription': 'Захиалга шинэчлэхэд алдаа гарлаа.',
  'user.error.failedToUpdatePlan': 'Төлөвлөгөө шинэчлэхэд алдаа гарлаа.',
  'user.error.twoFactorNotAvailable': 'Хоёр хүчин зүйлийн баталгаажуулалт боломжгүй.',
  'user.error.tokenRequired': 'Токен шаардлагатай.',
  'user.error.noPendingTwoFactorSetup':
    'Хүлээгдэж буй хоёр хүчин зүйлийн тохиргоо байхгүй. Эхлээд "setup" үйлдлийг дуудна уу.',
  'user.error.invalidToken': 'Буруу токен.',
  'user.error.twoFactorNotEnabled': 'Хоёр хүчин зүйлийн баталгаажуулалт идэвхжээгүй.',
  'user.error.invalidAction': 'Буруу үйлдэл. "setup", "enable", эсвэл "disable" ашиглана уу.',
  'user.error.twoFactorOperationFailed': 'Хоёр хүчин зүйлийн үйлдэл амжилтгүй.',
  'user.error.oauthServerNotConfigured': 'OAuth сервер "{{server}}" тохируулагдаагүй.',
  'user.error.oauthVerificationFailed': 'OAuth баталгаажуулалт амжилтгүй.',
  'user.error.failedToCreateUser': 'Хэрэглэгч үүсгэхэд алдаа гарлаа.',
  'user.error.oauthLoginFailed': 'OAuth нэвтрэлт амжилтгүй.',

  // Auth client errors
  'auth.error.requestFailed': 'Хүсэлт амжилтгүй',
  'auth.error.loginFailed': 'Нэвтрэлт амжилтгүй',
  'auth.error.registrationFailed': 'Бүртгэл амжилтгүй',
  'auth.error.noRefreshToken': 'Шинэчлэх токен байхгүй',

  // Form validation
  'forms.required': 'Энэ талбар шаардлагатай',
  'forms.min': 'Утга хамгийн багадаа {{min}} байх ёстой',
  'forms.max': 'Утга хамгийн ихдээ {{max}} байх ёстой',
  'forms.minLength': 'Хамгийн багадаа {{minLength}} тэмдэгт байх ёстой',
  'forms.maxLength': 'Хамгийн ихдээ {{maxLength}} тэмдэгт байх ёстой',
  'forms.invalidFormat': 'Буруу формат',
  'forms.invalidEmail': 'Буруу имэйл хаяг',
  'forms.invalidUrl': 'Буруу URL',
  'forms.invalidValue': 'Буруу утга',

  // HTTP client errors
  'http.error.requestFailed': 'Хүсэлт {{status}} статустай амжилтгүй боллоо.',
  'http.error.networkError': 'Сүлжээний алдаа.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" замд "{{name}}" параметр байхгүй байна',
  'routing.error.routeNotFound': '"{{name}}" маршрут олдсонгүй',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter-ийг MoleculeRouterProvider дотор ашиглах ёстой',

  // Push notification errors
  'push.error.notSupported': 'Пуш мэдэгдэл дэмжигдэхгүй',
  'push.error.permissionNotGranted': 'Мэдэгдлийн зөвшөөрөл олгогдоогүй',

  // Utility errors
  'error.networkError': 'Сүлжээний алдаа. Холболтоо шалгана уу.',
  'error.timeout': 'Хүсэлтийн хугацаа дууссан. Дахин оролдоно уу.',
  'error.unauthorized': 'Та энэ үйлдлийг гүйцэтгэх эрхгүй.',
  'error.forbidden': 'Хандалт хориглогдсон.',
  'error.notFound': 'Нөөц олдсонгүй.',
  'error.validationError': 'Оролтоо шалгаад дахин оролдоно уу.',
  'error.serverError': 'Серверийн алдаа. Дараа дахин оролдоно уу.',
  'error.unknown': 'Гэнэтийн алдаа гарлаа.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message шаардлагатай',
  'conversation.error.aiNotConfigured': 'AI үйлчилгээ үзүүлэгч тохируулагдаагүй',
  'conversation.error.unknownAiError': 'Тодорхойгүй AI алдаа',
  'conversation.error.notFound': 'Яриа олдсонгүй',
  'conversation.error.streamError': 'AI стриминг алдаа',

  // Resource errors
  'resource.error.unknownError': 'Тодорхойгүй алдаа.',
  'resource.error.unableToCreate': '{{name}} үүсгэх боломжгүй.',
  'resource.error.unableToUpdate': '{{name}} шинэчлэх боломжгүй.',
  'resource.error.unableToDelete': '{{name}} устгах боломжгүй.',
  'resource.error.notFound': 'Олдсонгүй.',
  'resource.error.badRequest': 'Буруу хүсэлт.',
  'resource.error.unauthorized': 'Зөвшөөрөлгүй.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name болон projectType шаардлагатай',
  'project.error.notFound': 'Олдсонгүй',

  // Device errors
  'device.error.unauthorized': 'Зөвшөөрөлгүй.',
  'device.error.badRequest': 'Буруу хүсэлт.',
  'device.error.notFound': 'Олдсонгүй.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} унших амжилтгүй болсон: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} бичих амжилтгүй болсон: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} устгах амжилтгүй болсон: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Төлбөрийн нийлүүлэгч шаардлагатай.',
  'user.payment.subscriptionIdRequired': 'subscriptionId шаардлагатай.',
  'user.payment.receiptAndPlanRequired': 'receipt болон planKey шаардлагатай.',
  'user.payment.verificationNotConfigured':
    '{{provider}}-д төлбөрийн баталгаажуулалт тохируулагдаагүй байна.',
  'user.payment.invalidPlan': 'Буруу төлөвлөгөө.',
  'user.payment.verificationFailed': 'Захиалга баталгаажуулахад алдаа гарлаа.',
  'user.payment.unknownPlan': 'Тодорхойгүй төлөвлөгөө.',
  'user.payment.invalidWebhookEvent': 'Буруу вебхүк үйл явдал.',
}
