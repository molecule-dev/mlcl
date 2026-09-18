/**
 * Uzbek translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Yuklanmoqda...',
  'common.saving': 'Saqlanmoqda...',
  'common.close': 'Yopish',
  'common.goBack': 'Orqaga qaytish',
  'common.submit': 'Yuborish',
  'common.continue': 'Davom etish',

  // Auth - Login
  'auth.login.email': 'Elektron pochta',
  'auth.login.password': 'Parol',
  'auth.login.twoFactor': 'Ikki bosqichli tasdiqlash kodi (agar yoqilgan bo\'lsa)',
  'auth.login.signUp': 'Ro\'yxatdan o\'tish',
  'auth.login.loggingIn': 'Kirish amalga oshirilmoqda...',
  'auth.login.logIn': 'Kirish',
  'auth.login.forgotPassword': 'Parolni unutdingizmi?',

  // Auth - Signup
  'auth.signup.email': 'Elektron pochta (Majburiy)',
  'auth.signup.password': 'Parol (Majburiy)',
  'auth.signup.name': 'Ismingiz',
  'auth.signup.signingUp': 'Ro\'yxatdan o\'tilmoqda...',
  'auth.signup.signUp': 'Ro\'yxatdan o\'tish',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Agar ushbu elektron pochtaga tegishli hisob mavjud bo\'lsa, parolni tiklash havolasi yuborildi.',
  'auth.forgotPassword.email': 'Elektron pochta',
  'auth.forgotPassword.submitting': 'Yuborilmoqda...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Elektron pochta',
  'auth.resetPassword.token': 'Parolni tiklash kodi',
  'auth.resetPassword.newPassword': 'Yangi parolni kiriting',
  'auth.resetPassword.twoFactor': 'Ikki bosqichli tasdiqlash kodi (agar yoqilgan bo\'lsa)',
  'auth.resetPassword.loggingIn': 'Kirish amalga oshirilmoqda...',
  'auth.resetPassword.submit': 'Parolni o\'rnatish va kirish',

  // Home
  'home.greeting': 'Salom, ',
  'home.world': 'Dunyo',

  // Settings
  'settings.account': 'Hisob',
  'settings.email': 'Elektron pochta',
  'settings.authentication': 'Autentifikatsiya',
  'settings.changePassword': 'Parolni o\'zgartirish',
  'settings.twoFactor': 'Ikki bosqichli autentifikatsiya',
  'settings.notifications': 'Bildirishnomalar',
  'settings.pushNotifications': 'Push bildirishnomalar',
  'settings.billing': 'To\'lov',
  'settings.plan': 'Tarif: ',
  'settings.upgrade': 'Yangilash',
  'settings.devices': 'Qurilmalar',
  'settings.noDevices': 'Qurilmalar topilmadi',
  'settings.thisDevice': 'Bu qurilma',
  'settings.platform': 'Platforma',
  'settings.browser': 'Brauzer',
  'settings.network': 'Tarmoq',
  'settings.online': 'Onlayn',
  'settings.offline': 'Oflayn',
  'settings.unknown': 'Noma\'lum',
  'settings.logOut': 'Chiqish',
  'settings.deleteAccount': 'Hisobni o\'chirish',
  'settings.changePasswordModal.title': 'Parolni o\'zgartirish',
  'settings.changePasswordModal.error': 'Parolni o\'zgartirib bo\'lmadi.',
  'settings.changePasswordModal.currentPassword': 'Joriy parol',
  'settings.changePasswordModal.newPassword': 'Yangi parol',
  'settings.changePasswordModal.changing': 'O\'zgartirilmoqda...',
  'settings.deleteAccountModal.title': 'Hisobni o\'chirish',
  'settings.deleteAccountModal.warning':
    'Bu amalni ortga qaytarib bo\'lmaydi. Tasdiqlash uchun parolingizni kiriting.',
  'settings.deleteAccountModal.password': 'Parol',
  'settings.deleteAccountModal.deleting': 'O\'chirilmoqda...',
  'settings.changePasswordModal.submit': 'Parolni o\'zgartirish',
  'settings.deleteAccountModal.submit': 'Hisobni o\'chirish',
  'settings.failedToUpdateEmail': 'Elektron pochtani yangilash amalga oshmadi.',
  'settings.failedToDeleteAccount': 'Hisobni o\'chirish amalga oshmadi.',
  'settings.toggleTwoFactor': 'Ikki bosqichli autentifikatsiyani almashtirish',
  'settings.togglePushNotifications': 'Push bildirishnomalarni almashtirish',

  // Footer
  'footer.about': '{{appName}} haqida',
  'footer.privacyPolicy': 'Maxfiylik siyosati',
  'footer.termsOfService': 'Xizmat ko\'rsatish shartlari',
  'footer.language': 'Til',

  // OAuth
  'oauth.orContinueWith': 'Yoki quyidagi orqali davom eting',
  'oauth.continueWith': '{{provider}} orqali davom etish',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Mavzuni almashtirish',

  // User Menu
  'userMenu.open': 'Foydalanuvchi menyusini ochish',

  // Plan Updated
  'planUpdated.message': 'Tarifingiz yangilandi.',
  'planUpdated.thankYou': 'Rahmat!',
  'planUpdated.returnHome': 'Bosh sahifaga qaytish',

  // PWA
  'pwa.updateAvailable': 'Yangi versiya mavjud!',
  'pwa.update': 'Yangilash',
  'pwa.updating': 'Yangilanmoqda...',

  // User API errors
  'user.error.badRequest': "Noto'g'ri so'rov.",
  'user.error.notFound': 'Topilmadi.',
  'user.error.failedToCreateSession': "Sessiya yaratib bo'lmadi.",
  'user.error.usernameRequired': 'Foydalanuvchi nomi talab qilinadi.',
  'user.error.passwordRequired': 'Parol talab qilinadi.',
  'user.error.emailInvalid': "Email noto'g'ri.",
  'user.error.usernameUnavailable': 'Foydalanuvchi nomi mavjud emas.',
  'user.error.emailAlreadyRegistered': "Email allaqachon ro'yxatdan o'tgan.",
  'user.error.failedToHashPassword': "Parolni xeshlash muvaffaqiyatsiz bo'ldi.",
  'user.error.invalidCredentials': "Noto'g'ri hisob ma'lumotlari.",
  'user.error.invalidTwoFactorToken': "Noto'g'ri ikki bosqichli token.",
  'user.error.twoFactorVerificationUnavailable': 'Ikki bosqichli tekshirish mavjud emas.',
  'user.error.loginFailed': "Kirish muvaffaqiyatsiz bo'ldi.",
  'user.error.usernameCannotBeEmpty': "Foydalanuvchi nomi bo'sh bo'lishi mumkin emas.",
  'user.error.failedToUpdateUser': "Foydalanuvchini yangilab bo'lmadi.",
  'user.error.failedToDeleteUser': "Foydalanuvchini o'chirib bo'lmadi.",
  'user.error.failedToReadUser': "Foydalanuvchini o'qib bo'lmadi.",
  'user.error.emailRequired': 'Email talab qilinadi.',
  'user.error.failedToProcessPasswordReset': "Parolni tiklash jarayoni muvaffaqiyatsiz bo'ldi.",
  'user.error.newPasswordRequired': 'Yangi parol talab qilinadi.',
  'user.error.currentPasswordRequired': 'Joriy parol talab qilinadi.',
  'user.error.currentPasswordIncorrect': "Joriy parol noto'g'ri.",
  'user.error.failedToUpdatePassword': "Parolni yangilab bo'lmadi.",
  'user.error.planKeyRequired': 'planKey talab qilinadi.',
  'user.error.invalidPlan': "Noto'g'ri reja.",
  'user.error.failedToUpdateSubscription': "Obunani yangilab bo'lmadi.",
  'user.error.failedToUpdatePlan': "Rejani yangilab bo'lmadi.",
  'user.error.twoFactorNotAvailable': 'Ikki bosqichli autentifikatsiya mavjud emas.',
  'user.error.tokenRequired': 'Token talab qilinadi.',
  'user.error.noPendingTwoFactorSetup':
    'Kutilayotgan ikki bosqichli sozlash yo\'q. Avval "setup" bilan chaqiring.',
  'user.error.invalidToken': "Noto'g'ri token.",
  'user.error.twoFactorNotEnabled': 'Ikki bosqichli yoqilmagan.',
  'user.error.invalidAction': 'Noto\'g\'ri amal. "setup", "enable" yoki "disable" dan foydalaning.',
  'user.error.twoFactorOperationFailed': "Ikki bosqichli operatsiya muvaffaqiyatsiz bo'ldi.",
  'user.error.oauthServerNotConfigured': 'OAuth serveri "{{server}}" sozlanmagan.',
  'user.error.oauthVerificationFailed': "OAuth tekshiruvi muvaffaqiyatsiz bo'ldi.",
  'user.error.failedToCreateUser': "Foydalanuvchini yaratib bo'lmadi.",
  'user.error.oauthLoginFailed': "OAuth kirish muvaffaqiyatsiz bo'ldi.",

  // Auth client errors
  'auth.error.requestFailed': "So'rov muvaffaqiyatsiz bo'ldi",
  'auth.error.loginFailed': "Kirish muvaffaqiyatsiz bo'ldi",
  'auth.error.registrationFailed': "Ro'yxatdan o'tish muvaffaqiyatsiz bo'ldi",
  'auth.error.noRefreshToken': 'Yangilash tokeni mavjud emas',

  // Form validation
  'forms.required': 'Bu maydon talab qilinadi',
  'forms.min': "Qiymat kamida {{min}} bo'lishi kerak",
  'forms.max': "Qiymat ko'pi bilan {{max}} bo'lishi kerak",
  'forms.minLength': "Kamida {{minLength}} ta belgi bo'lishi kerak",
  'forms.maxLength': "Ko'pi bilan {{maxLength}} ta belgi bo'lishi kerak",
  'forms.invalidFormat': "Noto'g'ri format",
  'forms.invalidEmail': "Noto'g'ri elektron pochta manzili",
  'forms.invalidUrl': "Noto'g'ri URL",
  'forms.invalidValue': "Noto'g'ri qiymat",

  // HTTP client errors
  'http.error.requestFailed': "So'rov {{status}} holati bilan muvaffaqiyatsiz bo'ldi.",
  'http.error.networkError': 'Tarmoq xatoligi.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" yo\'li uchun "{{name}}" parametri topilmadi',
  'routing.error.routeNotFound': '"{{name}}" yo\'nalishi topilmadi',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider ichida ishlatilishi kerak',

  // Push notification errors
  'push.error.notSupported': "Push bildirishnomalari qo'llab-quvvatlanmaydi",
  'push.error.permissionNotGranted': 'Bildirishnoma ruxsati berilmagan',

  // Utility errors
  'error.networkError': 'Tarmoq xatoligi. Iltimos, ulanishingizni tekshiring.',
  'error.timeout': "So'rov vaqti tugadi. Iltimos, qayta urinib ko'ring.",
  'error.unauthorized': 'Siz bu amalni bajarishga vakolatli emassiz.',
  'error.forbidden': 'Kirish rad etildi.',
  'error.notFound': 'Resurs topilmadi.',
  'error.validationError': "Iltimos, kiritilgan ma'lumotlarni tekshirib, qayta urinib ko'ring.",
  'error.serverError': "Server xatoligi. Iltimos, keyinroq qayta urinib ko'ring.",
  'error.unknown': 'Kutilmagan xatolik yuz berdi.',

  // AI conversation errors
  'conversation.error.messageRequired': 'xabar talab qilinadi',
  'conversation.error.aiNotConfigured': 'AI provayder sozlanmagan',
  'conversation.error.unknownAiError': "Noma'lum AI xatoligi",
  'conversation.error.notFound': 'Suhbat topilmadi',
  'conversation.error.streamError': 'AI oqim xatoligi',

  // Resource errors
  'resource.error.unknownError': "Noma'lum xatolik.",
  'resource.error.unableToCreate': "{{name}} yaratib bo'lmadi.",
  'resource.error.unableToUpdate': "{{name}} yangilab bo'lmadi.",
  'resource.error.unableToDelete': "{{name}} o'chirib bo'lmadi.",
  'resource.error.notFound': 'Topilmadi.',
  'resource.error.badRequest': "Noto'g'ri so'rov.",
  'resource.error.unauthorized': 'Ruxsat berilmagan.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name va projectType talab qilinadi',
  'project.error.notFound': 'Topilmadi',

  // Device errors
  'device.error.unauthorized': 'Ruxsatsiz.',
  'device.error.badRequest': "Noto'g'ri so'rov.",
  'device.error.notFound': 'Topilmadi.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': "{{path}} o'qib bo'lmadi: {{error}}",
  'codeSandbox.docker.error.writeFailed': "{{path}} yozib bo'lmadi: {{error}}",
  'codeSandbox.docker.error.deleteFailed': "{{path}} o'chirib bo'lmadi: {{error}}",
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': "To'lov provayderi talab qilinadi.",
  'user.payment.subscriptionIdRequired': 'subscriptionId talab qilinadi.',
  'user.payment.receiptAndPlanRequired': 'receipt va planKey talab qilinadi.',
  'user.payment.verificationNotConfigured': "{{provider}} uchun to'lov tekshiruvi sozlanmagan.",
  'user.payment.invalidPlan': "Noto'g'ri reja.",
  'user.payment.verificationFailed': "Obunani tekshirish muvaffaqiyatsiz bo'ldi.",
  'user.payment.unknownPlan': "Noma'lum reja.",
  'user.payment.invalidWebhookEvent': "Noto'g'ri webhook hodisasi.",
}
