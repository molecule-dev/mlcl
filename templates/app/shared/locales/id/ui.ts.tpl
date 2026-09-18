/**
 * Indonesian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Memuat...',
  'common.saving': 'Menyimpan...',
  'common.close': 'Tutup',
  'common.goBack': 'Kembali',
  'common.submit': 'Kirim',
  'common.continue': 'Lanjutkan',

  // Auth - Login
  'auth.login.email': 'Email',
  'auth.login.password': 'Kata sandi',
  'auth.login.twoFactor': 'Token Autentikasi Dua Faktor (Jika diaktifkan)',
  'auth.login.signUp': 'Daftar',
  'auth.login.loggingIn': 'Sedang masuk...',
  'auth.login.logIn': 'Masuk',
  'auth.login.forgotPassword': 'Lupa kata sandi?',

  // Auth - Signup
  'auth.signup.email': 'Email (Wajib)',
  'auth.signup.password': 'Kata sandi (Wajib)',
  'auth.signup.name': 'Nama Anda',
  'auth.signup.signingUp': 'Sedang mendaftar...',
  'auth.signup.signUp': 'Daftar',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Jika akun dengan email tersebut ada, tautan pengaturan ulang kata sandi telah dikirim.',
  'auth.forgotPassword.email': 'Email',
  'auth.forgotPassword.submitting': 'Mengirim...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Email',
  'auth.resetPassword.token': 'Token Pengaturan Ulang Kata Sandi',
  'auth.resetPassword.newPassword': 'Masukkan Kata Sandi Baru',
  'auth.resetPassword.twoFactor': 'Token Autentikasi Dua Faktor (Jika diaktifkan)',
  'auth.resetPassword.loggingIn': 'Sedang masuk...',
  'auth.resetPassword.submit': 'Atur kata sandi & masuk',

  // Home
  'home.greeting': 'Halo, ',
  'home.world': 'Dunia',

  // Settings
  'settings.account': 'Akun',
  'settings.email': 'Email',
  'settings.authentication': 'Autentikasi',
  'settings.changePassword': 'Ubah kata sandi',
  'settings.twoFactor': 'Autentikasi dua faktor',
  'settings.notifications': 'Notifikasi',
  'settings.pushNotifications': 'Notifikasi push',
  'settings.billing': 'Tagihan',
  'settings.plan': 'Paket: ',
  'settings.upgrade': 'Tingkatkan',
  'settings.devices': 'Perangkat',
  'settings.noDevices': 'Tidak ada perangkat ditemukan',
  'settings.thisDevice': 'Perangkat Ini',
  'settings.platform': 'Platform',
  'settings.browser': 'Browser',
  'settings.network': 'Jaringan',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Tidak diketahui',
  'settings.logOut': 'Keluar',
  'settings.deleteAccount': 'Hapus akun',
  'settings.changePasswordModal.title': 'Ubah Kata Sandi',
  'settings.changePasswordModal.error': 'Gagal mengubah kata sandi.',
  'settings.changePasswordModal.currentPassword': 'Kata Sandi Saat Ini',
  'settings.changePasswordModal.newPassword': 'Kata Sandi Baru',
  'settings.changePasswordModal.changing': 'Mengubah...',
  'settings.deleteAccountModal.title': 'Hapus Akun',
  'settings.deleteAccountModal.warning':
    'Tindakan ini tidak dapat dibatalkan. Silakan masukkan kata sandi Anda untuk konfirmasi.',
  'settings.deleteAccountModal.password': 'Kata Sandi',
  'settings.deleteAccountModal.deleting': 'Menghapus...',
  'settings.changePasswordModal.submit': 'Ubah kata sandi',
  'settings.deleteAccountModal.submit': 'Hapus akun',
  'settings.failedToUpdateEmail': 'Gagal memperbarui email.',
  'settings.failedToDeleteAccount': 'Gagal menghapus akun.',
  'settings.toggleTwoFactor': 'Alihkan autentikasi dua faktor',
  'settings.togglePushNotifications': 'Alihkan notifikasi push',

  // Footer
  'footer.about': 'Tentang {{appName}}',
  'footer.privacyPolicy': 'Kebijakan Privasi',
  'footer.termsOfService': 'Ketentuan Layanan',
  'footer.language': 'Bahasa',

  // OAuth
  'oauth.orContinueWith': 'Atau lanjutkan dengan',
  'oauth.continueWith': 'Lanjutkan dengan {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Ganti tema',

  // User Menu
  'userMenu.open': 'Buka menu pengguna',

  // Plan Updated
  'planUpdated.message': 'Paket Anda telah diperbarui.',
  'planUpdated.thankYou': 'Terima kasih!',
  'planUpdated.returnHome': 'Kembali ke beranda',

  // PWA
  'pwa.updateAvailable': 'Versi baru tersedia!',
  'pwa.update': 'Perbarui',
  'pwa.updating': 'Memperbarui...',

  // User API errors
  'user.error.badRequest': 'Permintaan tidak valid.',
  'user.error.notFound': 'Tidak ditemukan.',
  'user.error.failedToCreateSession': 'Gagal membuat sesi.',
  'user.error.usernameRequired': 'Username diperlukan.',
  'user.error.passwordRequired': 'Password diperlukan.',
  'user.error.emailInvalid': 'Email tidak valid.',
  'user.error.usernameUnavailable': 'Username tidak tersedia.',
  'user.error.emailAlreadyRegistered': 'Email sudah terdaftar.',
  'user.error.failedToHashPassword': 'Gagal meng-hash password.',
  'user.error.invalidCredentials': 'Kredensial tidak valid.',
  'user.error.invalidTwoFactorToken': 'Token two-factor tidak valid.',
  'user.error.twoFactorVerificationUnavailable': 'Verifikasi two-factor tidak tersedia.',
  'user.error.loginFailed': 'Login gagal.',
  'user.error.usernameCannotBeEmpty': 'Username tidak boleh kosong.',
  'user.error.failedToUpdateUser': 'Gagal memperbarui pengguna.',
  'user.error.failedToDeleteUser': 'Gagal menghapus pengguna.',
  'user.error.failedToReadUser': 'Gagal membaca pengguna.',
  'user.error.emailRequired': 'Email diperlukan.',
  'user.error.failedToProcessPasswordReset': 'Gagal memproses reset password.',
  'user.error.newPasswordRequired': 'Password baru diperlukan.',
  'user.error.currentPasswordRequired': 'Password saat ini diperlukan.',
  'user.error.currentPasswordIncorrect': 'Password saat ini salah.',
  'user.error.failedToUpdatePassword': 'Gagal memperbarui password.',
  'user.error.planKeyRequired': 'planKey diperlukan.',
  'user.error.invalidPlan': 'Paket tidak valid.',
  'user.error.failedToUpdateSubscription': 'Gagal memperbarui langganan.',
  'user.error.failedToUpdatePlan': 'Gagal memperbarui paket.',
  'user.error.twoFactorNotAvailable': 'Autentikasi two-factor tidak tersedia.',
  'user.error.tokenRequired': 'Token diperlukan.',
  'user.error.noPendingTwoFactorSetup':
    'Tidak ada pengaturan two-factor yang tertunda. Panggil dengan action "setup" terlebih dahulu.',
  'user.error.invalidToken': 'Token tidak valid.',
  'user.error.twoFactorNotEnabled': 'Two-factor tidak diaktifkan.',
  'user.error.invalidAction': 'Action tidak valid. Gunakan "setup", "enable", atau "disable".',
  'user.error.twoFactorOperationFailed': 'Operasi two-factor gagal.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" belum dikonfigurasi.',
  'user.error.oauthVerificationFailed': 'Verifikasi OAuth gagal.',
  'user.error.failedToCreateUser': 'Gagal membuat pengguna.',
  'user.error.oauthLoginFailed': 'Login OAuth gagal.',

  // Auth client errors
  'auth.error.requestFailed': 'Permintaan gagal',
  'auth.error.loginFailed': 'Login gagal',
  'auth.error.registrationFailed': 'Pendaftaran gagal',
  'auth.error.noRefreshToken': 'Tidak ada refresh token yang tersedia',

  // Form validation
  'forms.required': 'Bidang ini wajib diisi',
  'forms.min': 'Nilai harus minimal {{min}}',
  'forms.max': 'Nilai harus maksimal {{max}}',
  'forms.minLength': 'Harus minimal {{minLength}} karakter',
  'forms.maxLength': 'Harus maksimal {{maxLength}} karakter',
  'forms.invalidFormat': 'Format tidak valid',
  'forms.invalidEmail': 'Alamat email tidak valid',
  'forms.invalidUrl': 'URL tidak valid',
  'forms.invalidValue': 'Nilai tidak valid',

  // HTTP client errors
  'http.error.requestFailed': 'Permintaan gagal dengan status {{status}}.',
  'http.error.networkError': 'Kesalahan jaringan.',

  // Routing errors
  'routing.error.missingParam': 'Parameter "{{name}}" tidak ditemukan untuk path "{{pattern}}"',
  'routing.error.routeNotFound': 'Rute "{{name}}" tidak ditemukan',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter harus digunakan di dalam MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Notifikasi push tidak didukung',
  'push.error.permissionNotGranted': 'Izin notifikasi tidak diberikan',

  // Utility errors
  'error.networkError': 'Kesalahan jaringan. Silakan periksa koneksi Anda.',
  'error.timeout': 'Permintaan habis waktu. Silakan coba lagi.',
  'error.unauthorized': 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  'error.forbidden': 'Akses ditolak.',
  'error.notFound': 'Sumber daya tidak ditemukan.',
  'error.validationError': 'Silakan periksa masukan Anda dan coba lagi.',
  'error.serverError': 'Kesalahan server. Silakan coba lagi nanti.',
  'error.unknown': 'Terjadi kesalahan yang tidak terduga.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message diperlukan',
  'conversation.error.aiNotConfigured': 'AI provider belum dikonfigurasi',
  'conversation.error.unknownAiError': 'Kesalahan AI tidak diketahui',
  'conversation.error.notFound': 'Percakapan tidak ditemukan',
  'conversation.error.streamError': 'Kesalahan streaming AI',

  // Resource errors
  'resource.error.unknownError': 'Kesalahan tidak diketahui.',
  'resource.error.unableToCreate': 'Tidak dapat membuat {{name}}.',
  'resource.error.unableToUpdate': 'Tidak dapat memperbarui {{name}}.',
  'resource.error.unableToDelete': 'Tidak dapat menghapus {{name}}.',
  'resource.error.notFound': 'Tidak ditemukan.',
  'resource.error.badRequest': 'Permintaan tidak valid.',
  'resource.error.unauthorized': 'Tidak sah.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name dan projectType diperlukan',
  'project.error.notFound': 'Tidak ditemukan',

  // Device errors
  'device.error.unauthorized': 'Tidak diizinkan.',
  'device.error.badRequest': 'Permintaan tidak valid.',
  'device.error.notFound': 'Tidak ditemukan.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Gagal membaca {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Gagal menulis {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Gagal menghapus {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Penyedia pembayaran diperlukan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId diperlukan.',
  'user.payment.receiptAndPlanRequired': 'receipt dan planKey diperlukan.',
  'user.payment.verificationNotConfigured':
    'Verifikasi pembayaran belum dikonfigurasi untuk {{provider}}.',
  'user.payment.invalidPlan': 'Paket tidak valid.',
  'user.payment.verificationFailed': 'Gagal memverifikasi langganan.',
  'user.payment.unknownPlan': 'Paket tidak dikenal.',
  'user.payment.invalidWebhookEvent': 'Event webhook tidak valid.',
}
