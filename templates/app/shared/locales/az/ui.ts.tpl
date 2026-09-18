/**
 * Azerbaijani translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Yüklənir...',
  'common.saving': 'Saxlanılır...',
  'common.close': 'Bağla',
  'common.goBack': 'Geri qayıt',
  'common.submit': 'Göndər',
  'common.continue': 'Davam et',

  // Auth - Login
  'auth.login.email': 'E-poçt',
  'auth.login.password': 'Şifrə',
  'auth.login.twoFactor': 'İki faktorlu doğrulama kodu (aktivdirsə)',
  'auth.login.signUp': 'Qeydiyyatdan keç',
  'auth.login.loggingIn': 'Daxil olunur...',
  'auth.login.logIn': 'Daxil ol',
  'auth.login.forgotPassword': 'Şifrəni unutmusunuz?',

  // Auth - Signup
  'auth.signup.email': 'E-poçt (Tələb olunur)',
  'auth.signup.password': 'Şifrə (Tələb olunur)',
  'auth.signup.name': 'Adınız',
  'auth.signup.signingUp': 'Qeydiyyat edilir...',
  'auth.signup.signUp': 'Qeydiyyatdan keç',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Bu e-poçt ünvanına aid hesab varsa, şifrə sıfırlama linki göndərildi.',
  'auth.forgotPassword.email': 'E-poçt',
  'auth.forgotPassword.submitting': 'Göndərilir...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-poçt',
  'auth.resetPassword.token': 'Şifrə sıfırlama kodu',
  'auth.resetPassword.newPassword': 'Yeni şifrəni daxil edin',
  'auth.resetPassword.twoFactor': 'İki faktorlu doğrulama kodu (aktivdirsə)',
  'auth.resetPassword.loggingIn': 'Daxil olunur...',
  'auth.resetPassword.submit': 'Şifrəni təyin et və daxil ol',

  // Home
  'home.greeting': 'Salam, ',
  'home.world': 'Dünya',

  // Settings
  'settings.account': 'Hesab',
  'settings.email': 'E-poçt',
  'settings.authentication': 'Doğrulama',
  'settings.changePassword': 'Şifrəni dəyiş',
  'settings.twoFactor': 'İki faktorlu doğrulama',
  'settings.notifications': 'Bildirişlər',
  'settings.pushNotifications': 'Push bildirişlər',
  'settings.billing': 'Ödəniş',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Yüksəlt',
  'settings.devices': 'Cihazlar',
  'settings.noDevices': 'Cihaz tapılmadı',
  'settings.thisDevice': 'Bu cihaz',
  'settings.platform': 'Platforma',
  'settings.browser': 'Brauzer',
  'settings.network': 'Şəbəkə',
  'settings.online': 'Onlayn',
  'settings.offline': 'Oflayn',
  'settings.unknown': 'Naməlum',
  'settings.logOut': 'Çıxış',
  'settings.deleteAccount': 'Hesabı sil',
  'settings.changePasswordModal.title': 'Şifrəni dəyiş',
  'settings.changePasswordModal.error': 'Şifrəni dəyişmək alınmadı.',
  'settings.changePasswordModal.currentPassword': 'Cari şifrə',
  'settings.changePasswordModal.newPassword': 'Yeni şifrə',
  'settings.changePasswordModal.changing': 'Dəyişdirilir...',
  'settings.deleteAccountModal.title': 'Hesabı sil',
  'settings.deleteAccountModal.warning':
    'Bu əməliyyat geri qaytarıla bilməz. Təsdiqləmək üçün şifrənizi daxil edin.',
  'settings.deleteAccountModal.password': 'Şifrə',
  'settings.deleteAccountModal.deleting': 'Silinir...',
  'settings.changePasswordModal.submit': 'Şifrəni dəyiş',
  'settings.deleteAccountModal.submit': 'Hesabı sil',
  'settings.failedToUpdateEmail': 'E-poçtu yeniləmək alınmadı.',
  'settings.failedToDeleteAccount': 'Hesabı silmək alınmadı.',
  'settings.toggleTwoFactor': 'İki faktorlu autentifikasiyanı dəyişdir',
  'settings.togglePushNotifications': 'Push bildirişlərini dəyişdir',

  // Footer
  'footer.about': '{{appName}} haqqında',
  'footer.privacyPolicy': 'Gizlilik Siyasəti',
  'footer.termsOfService': 'Xidmət Şərtləri',
  'footer.language': 'Dil',

  // OAuth
  'oauth.orContinueWith': 'Və ya bununla davam edin',
  'oauth.continueWith': '{{provider}} ilə davam et',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Temanı dəyiş',

  // User Menu
  'userMenu.open': 'İstifadəçi menyusunu aç',

  // Plan Updated
  'planUpdated.message': 'Planınız yeniləndi.',
  'planUpdated.thankYou': 'Təşəkkürlər!',
  'planUpdated.returnHome': 'Ana səhifəyə qayıt',

  // PWA
  'pwa.updateAvailable': 'Yeni versiya mövcuddur!',
  'pwa.update': 'Yenilə',
  'pwa.updating': 'Yenilənir...',

  // User API errors
  'user.error.badRequest': 'Yanlış sorğu.',
  'user.error.notFound': 'Tapılmadı.',
  'user.error.failedToCreateSession': 'Sessiya yaradıla bilmədi.',
  'user.error.usernameRequired': 'İstifadəçi adı tələb olunur.',
  'user.error.passwordRequired': 'Parol tələb olunur.',
  'user.error.emailInvalid': 'E-poçt yanlışdır.',
  'user.error.usernameUnavailable': 'İstifadəçi adı mövcud deyil.',
  'user.error.emailAlreadyRegistered': 'E-poçt artıq qeydiyyatdan keçib.',
  'user.error.failedToHashPassword': 'Parolun heşlənməsi uğursuz oldu.',
  'user.error.invalidCredentials': 'Yanlış etimadnamələr.',
  'user.error.invalidTwoFactorToken': 'Yanlış iki faktorlu token.',
  'user.error.twoFactorVerificationUnavailable': 'İki faktorlu doğrulama əlçatmazdır.',
  'user.error.loginFailed': 'Giriş uğursuz oldu.',
  'user.error.usernameCannotBeEmpty': 'İstifadəçi adı boş ola bilməz.',
  'user.error.failedToUpdateUser': 'İstifadəçi yenilənə bilmədi.',
  'user.error.failedToDeleteUser': 'İstifadəçi silinə bilmədi.',
  'user.error.failedToReadUser': 'İstifadəçi oxuna bilmədi.',
  'user.error.emailRequired': 'E-poçt tələb olunur.',
  'user.error.failedToProcessPasswordReset': 'Parol sıfırlama əməliyyatı uğursuz oldu.',
  'user.error.newPasswordRequired': 'Yeni parol tələb olunur.',
  'user.error.currentPasswordRequired': 'Cari parol tələb olunur.',
  'user.error.currentPasswordIncorrect': 'Cari parol yanlışdır.',
  'user.error.failedToUpdatePassword': 'Parol yenilənə bilmədi.',
  'user.error.planKeyRequired': 'planKey tələb olunur.',
  'user.error.invalidPlan': 'Yanlış plan.',
  'user.error.failedToUpdateSubscription': 'Abunəlik yenilənə bilmədi.',
  'user.error.failedToUpdatePlan': 'Plan yenilənə bilmədi.',
  'user.error.twoFactorNotAvailable': 'İki faktorlu autentifikasiya mövcud deyil.',
  'user.error.tokenRequired': 'Token tələb olunur.',
  'user.error.noPendingTwoFactorSetup':
    'Gözləyən iki faktorlu quraşdırma yoxdur. Əvvəlcə "setup" ilə çağırın.',
  'user.error.invalidToken': 'Yanlış token.',
  'user.error.twoFactorNotEnabled': 'İki faktorlu aktiv deyil.',
  'user.error.invalidAction': 'Yanlış əməliyyat. "setup", "enable" və ya "disable" istifadə edin.',
  'user.error.twoFactorOperationFailed': 'İki faktorlu əməliyyat uğursuz oldu.',
  'user.error.oauthServerNotConfigured': 'OAuth serveri "{{server}}" konfiqurasiya edilməyib.',
  'user.error.oauthVerificationFailed': 'OAuth doğrulaması uğursuz oldu.',
  'user.error.failedToCreateUser': 'İstifadəçi yaradıla bilmədi.',
  'user.error.oauthLoginFailed': 'OAuth girişi uğursuz oldu.',

  // Auth client errors
  'auth.error.requestFailed': 'Sorğu uğursuz oldu',
  'auth.error.loginFailed': 'Giriş uğursuz oldu',
  'auth.error.registrationFailed': 'Qeydiyyat uğursuz oldu',
  'auth.error.noRefreshToken': 'Yeniləmə tokeni mövcud deyil',

  // Form validation
  'forms.required': 'Bu sahə tələb olunur',
  'forms.min': 'Dəyər ən azı {{min}} olmalıdır',
  'forms.max': 'Dəyər ən çoxu {{max}} olmalıdır',
  'forms.minLength': 'Ən azı {{minLength}} simvol olmalıdır',
  'forms.maxLength': 'Ən çoxu {{maxLength}} simvol olmalıdır',
  'forms.invalidFormat': 'Yanlış format',
  'forms.invalidEmail': 'Yanlış e-poçt ünvanı',
  'forms.invalidUrl': 'Yanlış URL',
  'forms.invalidValue': 'Yanlış dəyər',

  // HTTP client errors
  'http.error.requestFailed': 'Sorğu {{status}} statusu ilə uğursuz oldu.',
  'http.error.networkError': 'Şəbəkə xətası.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" yolu üçün "{{name}}" parametri yoxdur',
  'routing.error.routeNotFound': '"{{name}}" marşrutu tapılmadı',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider daxilində istifadə edilməlidir',

  // Push notification errors
  'push.error.notSupported': 'Push bildirişləri dəstəklənmir',
  'push.error.permissionNotGranted': 'Bildiriş icazəsi verilməyib',

  // Utility errors
  'error.networkError': 'Şəbəkə xətası. Zəhmət olmasa bağlantınızı yoxlayın.',
  'error.timeout': 'Sorğu vaxtı bitdi. Zəhmət olmasa yenidən cəhd edin.',
  'error.unauthorized': 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur.',
  'error.forbidden': 'Giriş rədd edildi.',
  'error.notFound': 'Resurs tapılmadı.',
  'error.validationError': 'Zəhmət olmasa daxil etdiklərinizi yoxlayın və yenidən cəhd edin.',
  'error.serverError': 'Server xətası. Zəhmət olmasa sonra yenidən cəhd edin.',
  'error.unknown': 'Gözlənilməz xəta baş verdi.',

  // AI conversation errors
  'conversation.error.messageRequired': 'mesaj tələb olunur',
  'conversation.error.aiNotConfigured': 'AI provayderi konfiqurasiya edilməyib',
  'conversation.error.unknownAiError': 'Naməlum AI xətası',
  'conversation.error.notFound': 'Söhbət tapılmadı',
  'conversation.error.streamError': 'AI axın xətası',

  // Resource errors
  'resource.error.unknownError': 'Naməlum xəta.',
  'resource.error.unableToCreate': '{{name}} yaradıla bilmədi.',
  'resource.error.unableToUpdate': '{{name}} yenilənə bilmədi.',
  'resource.error.unableToDelete': '{{name}} silinə bilmədi.',
  'resource.error.notFound': 'Tapılmadı.',
  'resource.error.badRequest': 'Yanlış sorğu.',
  'resource.error.unauthorized': 'İcazəsiz.',

  // Project errors
  'project.error.nameAndTypeRequired': 'ad və projectType tələb olunur',
  'project.error.notFound': 'Tapılmadı',

  // Device errors
  'device.error.unauthorized': 'İcazəsiz.',
  'device.error.badRequest': 'Yanlış sorğu.',
  'device.error.notFound': 'Tapılmadı.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} oxunmadı: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} yazılmadı: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} silinmədi: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Ödəniş provayderi tələb olunur.',
  'user.payment.subscriptionIdRequired': 'subscriptionId tələb olunur.',
  'user.payment.receiptAndPlanRequired': 'receipt və planKey tələb olunur.',
  'user.payment.verificationNotConfigured':
    '{{provider}} üçün ödəniş doğrulaması konfiqurasiya edilməyib.',
  'user.payment.invalidPlan': 'Yanlış plan.',
  'user.payment.verificationFailed': 'Abunəlik doğrulanması uğursuz oldu.',
  'user.payment.unknownPlan': 'Naməlum plan.',
  'user.payment.invalidWebhookEvent': 'Yanlış webhook hadisəsi.',
}
