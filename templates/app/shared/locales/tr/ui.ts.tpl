/**
 * Turkish translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Yükleniyor...',
  'common.saving': 'Kaydediliyor...',
  'common.close': 'Kapat',
  'common.goBack': 'Geri dön',
  'common.submit': 'Gönder',
  'common.continue': 'Devam et',

  // Auth - Login
  'auth.login.email': 'E-posta',
  'auth.login.password': 'Şifre',
  'auth.login.twoFactor': 'İki faktörlü doğrulama kodu (etkinse)',
  'auth.login.signUp': 'Kayıt ol',
  'auth.login.loggingIn': 'Giriş yapılıyor...',
  'auth.login.logIn': 'Giriş yap',
  'auth.login.forgotPassword': 'Şifrenizi mi unuttunuz?',

  // Auth - Signup
  'auth.signup.email': 'E-posta (zorunlu)',
  'auth.signup.password': 'Şifre (zorunlu)',
  'auth.signup.name': 'Adınız',
  'auth.signup.signingUp': 'Kayıt olunuyor...',
  'auth.signup.signUp': 'Kayıt ol',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Bu e-posta adresine ait bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.',
  'auth.forgotPassword.email': 'E-posta',
  'auth.forgotPassword.submitting': 'Gönderiliyor...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-posta',
  'auth.resetPassword.token': 'Şifre sıfırlama kodu',
  'auth.resetPassword.newPassword': 'Yeni şifre',
  'auth.resetPassword.twoFactor': 'İki faktörlü doğrulama kodu (etkinse)',
  'auth.resetPassword.loggingIn': 'Giriş yapılıyor...',
  'auth.resetPassword.submit': 'Şifreyi belirle ve giriş yap',

  // Home
  'home.greeting': 'Merhaba, ',
  'home.world': 'Dünya',

  // Settings
  'settings.account': 'Hesap',
  'settings.email': 'E-posta',
  'settings.authentication': 'Kimlik doğrulama',
  'settings.changePassword': 'Şifre değiştir',
  'settings.twoFactor': 'İki faktörlü kimlik doğrulama',
  'settings.notifications': 'Bildirimler',
  'settings.pushNotifications': 'Anlık bildirimler',
  'settings.billing': 'Faturalandırma',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Yükselt',
  'settings.devices': 'Cihazlar',
  'settings.noDevices': 'Cihaz bulunamadı',
  'settings.thisDevice': 'Bu cihaz',
  'settings.platform': 'Platform',
  'settings.browser': 'Tarayıcı',
  'settings.network': 'Ağ',
  'settings.online': 'Çevrimiçi',
  'settings.offline': 'Çevrimdışı',
  'settings.unknown': 'Bilinmiyor',
  'settings.logOut': 'Çıkış yap',
  'settings.deleteAccount': 'Hesabı sil',
  'settings.changePasswordModal.title': 'Şifre değiştir',
  'settings.changePasswordModal.error': 'Şifre değiştirilemedi.',
  'settings.changePasswordModal.currentPassword': 'Mevcut şifre',
  'settings.changePasswordModal.newPassword': 'Yeni şifre',
  'settings.changePasswordModal.changing': 'Değiştiriliyor...',
  'settings.deleteAccountModal.title': 'Hesabı sil',
  'settings.deleteAccountModal.warning':
    'Bu işlem geri alınamaz. Onaylamak için şifrenizi girin.',
  'settings.deleteAccountModal.password': 'Şifre',
  'settings.deleteAccountModal.deleting': 'Siliniyor...',
  'settings.changePasswordModal.submit': 'Şifre değiştir',
  'settings.deleteAccountModal.submit': 'Hesabı sil',
  'settings.failedToUpdateEmail': 'E-posta güncellenemedi.',
  'settings.failedToDeleteAccount': 'Hesap silinemedi.',
  'settings.toggleTwoFactor': 'İki faktörlü kimlik doğrulamayı değiştir',
  'settings.togglePushNotifications': 'Anlık bildirimleri değiştir',

  // Footer
  'footer.about': '{{appName}} Hakkında',
  'footer.privacyPolicy': 'Gizlilik Politikası',
  'footer.termsOfService': 'Hizmet Şartları',
  'footer.language': 'Dil',

  // OAuth
  'oauth.orContinueWith': 'Veya şununla devam et',
  'oauth.continueWith': '{{provider}} ile devam et',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Tema değiştir',

  // User Menu
  'userMenu.open': 'Kullanıcı menüsünü aç',

  // Plan Updated
  'planUpdated.message': 'Planınız güncellendi.',
  'planUpdated.thankYou': 'Teşekkürler!',
  'planUpdated.returnHome': 'Ana sayfaya dön',

  // PWA
  'pwa.updateAvailable': 'Yeni sürüm mevcut!',
  'pwa.update': 'Güncelle',
  'pwa.updating': 'Güncelleniyor...',

  // User API errors
  'user.error.badRequest': 'Geçersiz istek.',
  'user.error.notFound': 'Bulunamadı.',
  'user.error.failedToCreateSession': 'Oturum oluşturulamadı.',
  'user.error.usernameRequired': 'Kullanıcı adı gereklidir.',
  'user.error.passwordRequired': 'Şifre gereklidir.',
  'user.error.emailInvalid': 'E-posta geçersiz.',
  'user.error.usernameUnavailable': 'Kullanıcı adı mevcut değil.',
  'user.error.emailAlreadyRegistered': 'E-posta zaten kayıtlı.',
  'user.error.failedToHashPassword': 'Şifre hashleme başarısız oldu.',
  'user.error.invalidCredentials': 'Geçersiz kimlik bilgileri.',
  'user.error.invalidTwoFactorToken': 'Geçersiz iki faktörlü jeton.',
  'user.error.twoFactorVerificationUnavailable': 'İki faktörlü doğrulama kullanılamıyor.',
  'user.error.loginFailed': 'Giriş başarısız oldu.',
  'user.error.usernameCannotBeEmpty': 'Kullanıcı adı boş olamaz.',
  'user.error.failedToUpdateUser': 'Kullanıcı güncellenemedi.',
  'user.error.failedToDeleteUser': 'Kullanıcı silinemedi.',
  'user.error.failedToReadUser': 'Kullanıcı okunamadı.',
  'user.error.emailRequired': 'E-posta gereklidir.',
  'user.error.failedToProcessPasswordReset': 'Şifre sıfırlama işlemi başarısız oldu.',
  'user.error.newPasswordRequired': 'Yeni şifre gereklidir.',
  'user.error.currentPasswordRequired': 'Mevcut şifre gereklidir.',
  'user.error.currentPasswordIncorrect': 'Mevcut şifre yanlış.',
  'user.error.failedToUpdatePassword': 'Şifre güncellenemedi.',
  'user.error.planKeyRequired': 'planKey gereklidir.',
  'user.error.invalidPlan': 'Geçersiz plan.',
  'user.error.failedToUpdateSubscription': 'Abonelik güncellenemedi.',
  'user.error.failedToUpdatePlan': 'Plan güncellenemedi.',
  'user.error.twoFactorNotAvailable': 'İki faktörlü kimlik doğrulama kullanılamıyor.',
  'user.error.tokenRequired': 'Jeton gereklidir.',
  'user.error.noPendingTwoFactorSetup':
    'Bekleyen iki faktörlü kurulum yok. Önce "setup" ile çağırın.',
  'user.error.invalidToken': 'Geçersiz jeton.',
  'user.error.twoFactorNotEnabled': 'İki faktörlü etkin değil.',
  'user.error.invalidAction': 'Geçersiz işlem. "setup", "enable" veya "disable" kullanın.',
  'user.error.twoFactorOperationFailed': 'İki faktörlü işlem başarısız oldu.',
  'user.error.oauthServerNotConfigured': 'OAuth sunucusu "{{server}}" yapılandırılmamış.',
  'user.error.oauthVerificationFailed': 'OAuth doğrulaması başarısız oldu.',
  'user.error.failedToCreateUser': 'Kullanıcı oluşturulamadı.',
  'user.error.oauthLoginFailed': 'OAuth girişi başarısız oldu.',

  // Auth client errors
  'auth.error.requestFailed': 'İstek başarısız oldu',
  'auth.error.loginFailed': 'Giriş başarısız oldu',
  'auth.error.registrationFailed': 'Kayıt başarısız oldu',
  'auth.error.noRefreshToken': 'Yenileme jetonu mevcut değil',

  // Form validation
  'forms.required': 'Bu alan zorunludur',
  'forms.min': 'Değer en az {{min}} olmalıdır',
  'forms.max': 'Değer en fazla {{max}} olmalıdır',
  'forms.minLength': 'En az {{minLength}} karakter olmalıdır',
  'forms.maxLength': 'En fazla {{maxLength}} karakter olmalıdır',
  'forms.invalidFormat': 'Geçersiz biçim',
  'forms.invalidEmail': 'Geçersiz e-posta adresi',
  'forms.invalidUrl': 'Geçersiz URL',
  'forms.invalidValue': 'Geçersiz değer',

  // HTTP client errors
  'http.error.requestFailed': 'İstek {{status}} durumuyla başarısız oldu.',
  'http.error.networkError': 'Ağ hatası.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" yolu için "{{name}}" parametresi eksik',
  'routing.error.routeNotFound': '"{{name}}" rotası bulunamadı',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter bir MoleculeRouterProvider içinde kullanılmalıdır',

  // Push notification errors
  'push.error.notSupported': 'Push bildirimleri desteklenmiyor',
  'push.error.permissionNotGranted': 'Bildirim izni verilmedi',

  // Utility errors
  'error.networkError': 'Ağ hatası. Lütfen bağlantınızı kontrol edin.',
  'error.timeout': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
  'error.unauthorized': 'Bu işlemi gerçekleştirme yetkiniz yok.',
  'error.forbidden': 'Erişim engellendi.',
  'error.notFound': 'Kaynak bulunamadı.',
  'error.validationError': 'Lütfen girdinizi kontrol edip tekrar deneyin.',
  'error.serverError': 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
  'error.unknown': 'Beklenmeyen bir hata oluştu.',

  // AI conversation errors
  'conversation.error.messageRequired': 'mesaj gereklidir',
  'conversation.error.aiNotConfigured': 'AI sağlayıcısı yapılandırılmamış',
  'conversation.error.unknownAiError': 'Bilinmeyen AI hatası',
  'conversation.error.notFound': 'Konuşma bulunamadı',
  'conversation.error.streamError': 'AI akış hatası',

  // Resource errors
  'resource.error.unknownError': 'Bilinmeyen hata.',
  'resource.error.unableToCreate': '{{name}} oluşturulamadı.',
  'resource.error.unableToUpdate': '{{name}} güncellenemedi.',
  'resource.error.unableToDelete': '{{name}} silinemedi.',
  'resource.error.notFound': 'Bulunamadı.',
  'resource.error.badRequest': 'Geçersiz istek.',
  'resource.error.unauthorized': 'Yetkisiz.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name ve projectType gereklidir',
  'project.error.notFound': 'Bulunamadı',

  // Device errors
  'device.error.unauthorized': 'Yetkisiz.',
  'device.error.badRequest': 'Geçersiz istek.',
  'device.error.notFound': 'Bulunamadı.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} okunamadı: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} yazılamadı: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} silinemedi: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Ödeme sağlayıcısı gereklidir.',
  'user.payment.subscriptionIdRequired': 'subscriptionId gereklidir.',
  'user.payment.receiptAndPlanRequired': 'receipt ve planKey gereklidir.',
  'user.payment.verificationNotConfigured':
    '{{provider}} için ödeme doğrulaması yapılandırılmamış.',
  'user.payment.invalidPlan': 'Geçersiz plan.',
  'user.payment.verificationFailed': 'Abonelik doğrulaması başarısız oldu.',
  'user.payment.unknownPlan': 'Bilinmeyen plan.',
  'user.payment.invalidWebhookEvent': 'Geçersiz webhook olayı.',
}
