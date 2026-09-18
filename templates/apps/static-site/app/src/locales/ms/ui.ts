/**
 * Malay translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Memuatkan...',
  'common.saving': 'Menyimpan...',
  'common.close': 'Tutup',
  'common.goBack': 'Kembali',
  'common.submit': 'Hantar',
  'common.continue': 'Teruskan',

  // Auth - Login
  'auth.login.email': 'E-mel',
  'auth.login.password': 'Kata laluan',
  'auth.login.twoFactor': 'Token Pengesahan Dua Faktor (Jika diaktifkan)',
  'auth.login.signUp': 'Daftar',
  'auth.login.loggingIn': 'Sedang log masuk...',
  'auth.login.logIn': 'Log masuk',
  'auth.login.forgotPassword': 'Lupa kata laluan?',

  // Auth - Signup
  'auth.signup.email': 'E-mel (Wajib)',
  'auth.signup.password': 'Kata laluan (Wajib)',
  'auth.signup.name': 'Nama anda',
  'auth.signup.signingUp': 'Sedang mendaftar...',
  'auth.signup.signUp': 'Daftar',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Jika akaun dengan e-mel tersebut wujud, pautan tetapan semula kata laluan telah dihantar.',
  'auth.forgotPassword.email': 'E-mel',
  'auth.forgotPassword.submitting': 'Menghantar...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mel',
  'auth.resetPassword.token': 'Token Tetapan Semula Kata Laluan',
  'auth.resetPassword.newPassword': 'Masukkan Kata Laluan Baharu',
  'auth.resetPassword.twoFactor': 'Token Pengesahan Dua Faktor (Jika diaktifkan)',
  'auth.resetPassword.loggingIn': 'Sedang log masuk...',
  'auth.resetPassword.submit': 'Tetapkan kata laluan & log masuk',

  // Home
  'home.greeting': 'Hai, ',
  'home.world': 'Dunia',

  // Settings
  'settings.account': 'Akaun',
  'settings.email': 'E-mel',
  'settings.authentication': 'Pengesahan',
  'settings.changePassword': 'Tukar kata laluan',
  'settings.twoFactor': 'Pengesahan dua faktor',
  'settings.notifications': 'Pemberitahuan',
  'settings.pushNotifications': 'Pemberitahuan push',
  'settings.billing': 'Pengebilan',
  'settings.plan': 'Pelan: ',
  'settings.upgrade': 'Naik taraf',
  'settings.devices': 'Peranti',
  'settings.noDevices': 'Tiada peranti ditemui',
  'settings.thisDevice': 'Peranti Ini',
  'settings.platform': 'Platform',
  'settings.browser': 'Pelayar',
  'settings.network': 'Rangkaian',
  'settings.online': 'Dalam talian',
  'settings.offline': 'Luar talian',
  'settings.unknown': 'Tidak diketahui',
  'settings.logOut': 'Log keluar',
  'settings.deleteAccount': 'Padam akaun',
  'settings.changePasswordModal.title': 'Tukar Kata Laluan',
  'settings.changePasswordModal.error': 'Gagal menukar kata laluan.',
  'settings.changePasswordModal.currentPassword': 'Kata Laluan Semasa',
  'settings.changePasswordModal.newPassword': 'Kata Laluan Baharu',
  'settings.changePasswordModal.changing': 'Menukar...',
  'settings.deleteAccountModal.title': 'Padam Akaun',
  'settings.deleteAccountModal.warning':
    'Tindakan ini tidak boleh dibuat asal. Sila masukkan kata laluan anda untuk mengesahkan.',
  'settings.deleteAccountModal.password': 'Kata Laluan',
  'settings.deleteAccountModal.deleting': 'Memadam...',
  'settings.changePasswordModal.submit': 'Tukar kata laluan',
  'settings.deleteAccountModal.submit': 'Padam akaun',
  'settings.failedToUpdateEmail': 'Gagal mengemas kini e-mel.',
  'settings.failedToDeleteAccount': 'Gagal memadam akaun.',
  'settings.toggleTwoFactor': 'Togol pengesahan dua faktor',
  'settings.togglePushNotifications': 'Togol pemberitahuan tolak',

  // Footer
  'footer.about': 'Tentang {{appName}}',
  'footer.privacyPolicy': 'Dasar Privasi',
  'footer.termsOfService': 'Terma Perkhidmatan',
  'footer.language': 'Bahasa',

  // OAuth
  'oauth.orContinueWith': 'Atau teruskan dengan',
  'oauth.continueWith': 'Teruskan dengan {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Tukar tema',

  // User Menu
  'userMenu.open': 'Buka menu pengguna',

  // Plan Updated
  'planUpdated.message': 'Pelan anda telah dikemas kini.',
  'planUpdated.thankYou': 'Terima kasih!',
  'planUpdated.returnHome': 'Kembali ke laman utama',

  // PWA
  'pwa.updateAvailable': 'Versi baharu tersedia!',
  'pwa.update': 'Kemas kini',
  'pwa.updating': 'Mengemas kini...',

  // User API errors
  'user.error.badRequest': 'Permintaan tidak sah.',
  'user.error.notFound': 'Tidak dijumpai.',
  'user.error.failedToCreateSession': 'Gagal mencipta sesi.',
  'user.error.usernameRequired': 'Nama pengguna diperlukan.',
  'user.error.passwordRequired': 'Kata laluan diperlukan.',
  'user.error.emailInvalid': 'Emel tidak sah.',
  'user.error.usernameUnavailable': 'Nama pengguna tidak tersedia.',
  'user.error.emailAlreadyRegistered': 'Emel sudah didaftarkan.',
  'user.error.failedToHashPassword': 'Gagal meng-hash kata laluan.',
  'user.error.invalidCredentials': 'Kelayakan tidak sah.',
  'user.error.invalidTwoFactorToken': 'Token two-factor tidak sah.',
  'user.error.twoFactorVerificationUnavailable': 'Pengesahan two-factor tidak tersedia.',
  'user.error.loginFailed': 'Log masuk gagal.',
  'user.error.usernameCannotBeEmpty': 'Nama pengguna tidak boleh kosong.',
  'user.error.failedToUpdateUser': 'Gagal mengemas kini pengguna.',
  'user.error.failedToDeleteUser': 'Gagal memadamkan pengguna.',
  'user.error.failedToReadUser': 'Gagal membaca pengguna.',
  'user.error.emailRequired': 'Emel diperlukan.',
  'user.error.failedToProcessPasswordReset': 'Gagal memproses tetapan semula kata laluan.',
  'user.error.newPasswordRequired': 'Kata laluan baharu diperlukan.',
  'user.error.currentPasswordRequired': 'Kata laluan semasa diperlukan.',
  'user.error.currentPasswordIncorrect': 'Kata laluan semasa tidak betul.',
  'user.error.failedToUpdatePassword': 'Gagal mengemas kini kata laluan.',
  'user.error.planKeyRequired': 'planKey diperlukan.',
  'user.error.invalidPlan': 'Pelan tidak sah.',
  'user.error.failedToUpdateSubscription': 'Gagal mengemas kini langganan.',
  'user.error.failedToUpdatePlan': 'Gagal mengemas kini pelan.',
  'user.error.twoFactorNotAvailable': 'Pengesahan two-factor tidak tersedia.',
  'user.error.tokenRequired': 'Token diperlukan.',
  'user.error.noPendingTwoFactorSetup':
    'Tiada persediaan two-factor yang menunggu. Panggil dengan action "setup" dahulu.',
  'user.error.invalidToken': 'Token tidak sah.',
  'user.error.twoFactorNotEnabled': 'Two-factor tidak diaktifkan.',
  'user.error.invalidAction': 'Action tidak sah. Gunakan "setup", "enable", atau "disable".',
  'user.error.twoFactorOperationFailed': 'Operasi two-factor gagal.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" tidak dikonfigurasi.',
  'user.error.oauthVerificationFailed': 'Pengesahan OAuth gagal.',
  'user.error.failedToCreateUser': 'Gagal mencipta pengguna.',
  'user.error.oauthLoginFailed': 'Log masuk OAuth gagal.',

  // Auth client errors
  'auth.error.requestFailed': 'Permintaan gagal',
  'auth.error.loginFailed': 'Log masuk gagal',
  'auth.error.registrationFailed': 'Pendaftaran gagal',
  'auth.error.noRefreshToken': 'Tiada refresh token tersedia',

  // Form validation
  'forms.required': 'Medan ini diperlukan',
  'forms.min': 'Nilai mestilah sekurang-kurangnya {{min}}',
  'forms.max': 'Nilai mestilah paling banyak {{max}}',
  'forms.minLength': 'Mestilah sekurang-kurangnya {{minLength}} aksara',
  'forms.maxLength': 'Mestilah paling banyak {{maxLength}} aksara',
  'forms.invalidFormat': 'Format tidak sah',
  'forms.invalidEmail': 'Alamat e-mel tidak sah',
  'forms.invalidUrl': 'URL tidak sah',
  'forms.invalidValue': 'Nilai tidak sah',

  // HTTP client errors
  'http.error.requestFailed': 'Permintaan gagal dengan status {{status}}.',
  'http.error.networkError': 'Ralat rangkaian.',

  // Routing errors
  'routing.error.missingParam': 'Parameter "{{name}}" tiada untuk laluan "{{pattern}}"',
  'routing.error.routeNotFound': 'Laluan "{{name}}" tidak dijumpai',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter mesti digunakan dalam MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Pemberitahuan push tidak disokong',
  'push.error.permissionNotGranted': 'Kebenaran pemberitahuan tidak diberikan',

  // Utility errors
  'error.networkError': 'Ralat rangkaian. Sila semak sambungan anda.',
  'error.timeout': 'Permintaan tamat masa. Sila cuba lagi.',
  'error.unauthorized': 'Anda tidak dibenarkan melakukan tindakan ini.',
  'error.forbidden': 'Akses ditolak.',
  'error.notFound': 'Sumber tidak dijumpai.',
  'error.validationError': 'Sila semak input anda dan cuba lagi.',
  'error.serverError': 'Ralat pelayan. Sila cuba lagi kemudian.',
  'error.unknown': 'Ralat tidak dijangka telah berlaku.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message diperlukan',
  'conversation.error.aiNotConfigured': 'AI provider tidak dikonfigurasi',
  'conversation.error.unknownAiError': 'Ralat AI tidak diketahui',
  'conversation.error.notFound': 'Tiada perbualan dijumpai',
  'conversation.error.streamError': 'Ralat streaming AI',

  // Resource errors
  'resource.error.unknownError': 'Ralat tidak diketahui.',
  'resource.error.unableToCreate': 'Tidak dapat mencipta {{name}}.',
  'resource.error.unableToUpdate': 'Tidak dapat mengemas kini {{name}}.',
  'resource.error.unableToDelete': 'Tidak dapat memadamkan {{name}}.',
  'resource.error.notFound': 'Tidak dijumpai.',
  'resource.error.badRequest': 'Permintaan tidak sah.',
  'resource.error.unauthorized': 'Tidak dibenarkan.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name dan projectType diperlukan',
  'project.error.notFound': 'Tidak dijumpai',

  // Device errors
  'device.error.unauthorized': 'Tidak dibenarkan.',
  'device.error.badRequest': 'Permintaan tidak sah.',
  'device.error.notFound': 'Tidak ditemui.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Gagal membaca {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Gagal menulis {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Gagal memadam {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Penyedia pembayaran diperlukan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId diperlukan.',
  'user.payment.receiptAndPlanRequired': 'receipt dan planKey diperlukan.',
  'user.payment.verificationNotConfigured':
    'Pengesahan pembayaran tidak dikonfigurasi untuk {{provider}}.',
  'user.payment.invalidPlan': 'Pelan tidak sah.',
  'user.payment.verificationFailed': 'Gagal mengesahkan langganan.',
  'user.payment.unknownPlan': 'Pelan tidak dikenali.',
  'user.payment.invalidWebhookEvent': 'Acara webhook tidak sah.',
}
