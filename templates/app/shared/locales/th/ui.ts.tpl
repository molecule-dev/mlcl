/**
 * Thai translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'กำลังโหลด...',
  'common.saving': 'กำลังบันทึก...',
  'common.close': 'ปิด',
  'common.goBack': 'ย้อนกลับ',
  'common.submit': 'ส่ง',
  'common.continue': 'ดำเนินการต่อ',

  // Auth - Login
  'auth.login.email': 'อีเมล',
  'auth.login.password': 'รหัสผ่าน',
  'auth.login.twoFactor': 'โทเค็นยืนยันตัวตนสองชั้น (หากเปิดใช้งาน)',
  'auth.login.signUp': 'สมัครสมาชิก',
  'auth.login.loggingIn': 'กำลังเข้าสู่ระบบ...',
  'auth.login.logIn': 'เข้าสู่ระบบ',
  'auth.login.forgotPassword': 'ลืมรหัสผ่าน?',

  // Auth - Signup
  'auth.signup.email': 'อีเมล (จำเป็น)',
  'auth.signup.password': 'รหัสผ่าน (จำเป็น)',
  'auth.signup.name': 'ชื่อของคุณ',
  'auth.signup.signingUp': 'กำลังสมัครสมาชิก...',
  'auth.signup.signUp': 'สมัครสมาชิก',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'หากมีบัญชีที่ใช้อีเมลนี้อยู่ ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปแล้ว',
  'auth.forgotPassword.email': 'อีเมล',
  'auth.forgotPassword.submitting': 'กำลังส่ง...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'อีเมล',
  'auth.resetPassword.token': 'โทเค็นรีเซ็ตรหัสผ่าน',
  'auth.resetPassword.newPassword': 'ป้อนรหัสผ่านใหม่',
  'auth.resetPassword.twoFactor': 'โทเค็นยืนยันตัวตนสองชั้น (หากเปิดใช้งาน)',
  'auth.resetPassword.loggingIn': 'กำลังเข้าสู่ระบบ...',
  'auth.resetPassword.submit': 'ตั้งรหัสผ่านและเข้าสู่ระบบ',

  // Home
  'home.greeting': 'สวัสดี, ',
  'home.world': 'โลก',

  // Settings
  'settings.account': 'บัญชี',
  'settings.email': 'อีเมล',
  'settings.authentication': 'การยืนยันตัวตน',
  'settings.changePassword': 'เปลี่ยนรหัสผ่าน',
  'settings.twoFactor': 'การยืนยันตัวตนสองชั้น',
  'settings.notifications': 'การแจ้งเตือน',
  'settings.pushNotifications': 'การแจ้งเตือนแบบพุช',
  'settings.billing': 'การเรียกเก็บเงิน',
  'settings.plan': 'แผน: ',
  'settings.upgrade': 'อัปเกรด',
  'settings.devices': 'อุปกรณ์',
  'settings.noDevices': 'ไม่พบอุปกรณ์',
  'settings.thisDevice': 'อุปกรณ์นี้',
  'settings.platform': 'แพลตฟอร์ม',
  'settings.browser': 'เบราว์เซอร์',
  'settings.network': 'เครือข่าย',
  'settings.online': 'ออนไลน์',
  'settings.offline': 'ออฟไลน์',
  'settings.unknown': 'ไม่ทราบ',
  'settings.logOut': 'ออกจากระบบ',
  'settings.deleteAccount': 'ลบบัญชี',
  'settings.changePasswordModal.title': 'เปลี่ยนรหัสผ่าน',
  'settings.changePasswordModal.error': 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
  'settings.changePasswordModal.currentPassword': 'รหัสผ่านปัจจุบัน',
  'settings.changePasswordModal.newPassword': 'รหัสผ่านใหม่',
  'settings.changePasswordModal.changing': 'กำลังเปลี่ยน...',
  'settings.deleteAccountModal.title': 'ลบบัญชี',
  'settings.deleteAccountModal.warning':
    'การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณาป้อนรหัสผ่านเพื่อยืนยัน',
  'settings.deleteAccountModal.password': 'รหัสผ่าน',
  'settings.deleteAccountModal.deleting': 'กำลังลบ...',
  'settings.changePasswordModal.submit': 'เปลี่ยนรหัสผ่าน',
  'settings.deleteAccountModal.submit': 'ลบบัญชี',
  'settings.failedToUpdateEmail': 'ไม่สามารถอัปเดตอีเมลได้',
  'settings.failedToDeleteAccount': 'ไม่สามารถลบบัญชีได้',
  'settings.toggleTwoFactor': 'สลับการยืนยันตัวตนสองขั้นตอน',
  'settings.togglePushNotifications': 'สลับการแจ้งเตือนแบบพุช',

  // Footer
  'footer.about': 'เกี่ยวกับ {{appName}}',
  'footer.privacyPolicy': 'นโยบายความเป็นส่วนตัว',
  'footer.termsOfService': 'ข้อกำหนดการให้บริการ',
  'footer.language': 'ภาษา',

  // OAuth
  'oauth.orContinueWith': 'หรือดำเนินการต่อด้วย',
  'oauth.continueWith': 'ดำเนินการต่อด้วย {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'สลับธีม',

  // User Menu
  'userMenu.open': 'เปิดเมนูผู้ใช้',

  // Plan Updated
  'planUpdated.message': 'แผนของคุณได้รับการอัปเดตแล้ว',
  'planUpdated.thankYou': 'ขอบคุณ!',
  'planUpdated.returnHome': 'กลับหน้าหลัก',

  // PWA
  'pwa.updateAvailable': 'มีเวอร์ชันใหม่พร้อมใช้งาน!',
  'pwa.update': 'อัปเดต',
  'pwa.updating': 'กำลังอัปเดต...',

  // User API errors
  'user.error.badRequest': 'คำขอไม่ถูกต้อง',
  'user.error.notFound': 'ไม่พบ',
  'user.error.failedToCreateSession': 'สร้างเซสชันไม่สำเร็จ',
  'user.error.usernameRequired': 'ต้องระบุชื่อผู้ใช้',
  'user.error.passwordRequired': 'ต้องระบุรหัสผ่าน',
  'user.error.emailInvalid': 'อีเมลไม่ถูกต้อง',
  'user.error.usernameUnavailable': 'ชื่อผู้ใช้ไม่พร้อมใช้งาน',
  'user.error.emailAlreadyRegistered': 'อีเมลลงทะเบียนแล้ว',
  'user.error.failedToHashPassword': 'แฮชรหัสผ่านไม่สำเร็จ',
  'user.error.invalidCredentials': 'ข้อมูลรับรองไม่ถูกต้อง',
  'user.error.invalidTwoFactorToken': 'โทเค็น two-factor ไม่ถูกต้อง',
  'user.error.twoFactorVerificationUnavailable': 'การยืนยัน two-factor ไม่พร้อมใช้งาน',
  'user.error.loginFailed': 'เข้าสู่ระบบไม่สำเร็จ',
  'user.error.usernameCannotBeEmpty': 'ชื่อผู้ใช้ต้องไม่ว่างเปล่า',
  'user.error.failedToUpdateUser': 'อัปเดตผู้ใช้ไม่สำเร็จ',
  'user.error.failedToDeleteUser': 'ลบผู้ใช้ไม่สำเร็จ',
  'user.error.failedToReadUser': 'อ่านผู้ใช้ไม่สำเร็จ',
  'user.error.emailRequired': 'ต้องระบุอีเมล',
  'user.error.failedToProcessPasswordReset': 'ดำเนินการรีเซ็ตรหัสผ่านไม่สำเร็จ',
  'user.error.newPasswordRequired': 'ต้องระบุรหัสผ่านใหม่',
  'user.error.currentPasswordRequired': 'ต้องระบุรหัสผ่านปัจจุบัน',
  'user.error.currentPasswordIncorrect': 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
  'user.error.failedToUpdatePassword': 'อัปเดตรหัสผ่านไม่สำเร็จ',
  'user.error.planKeyRequired': 'ต้องระบุ planKey',
  'user.error.invalidPlan': 'แผนไม่ถูกต้อง',
  'user.error.failedToUpdateSubscription': 'อัปเดตการสมัครสมาชิกไม่สำเร็จ',
  'user.error.failedToUpdatePlan': 'อัปเดตแผนไม่สำเร็จ',
  'user.error.twoFactorNotAvailable': 'การยืนยันตัวตน two-factor ไม่พร้อมใช้งาน',
  'user.error.tokenRequired': 'ต้องระบุโทเค็น',
  'user.error.noPendingTwoFactorSetup':
    'ไม่มีการตั้งค่า two-factor ที่รออยู่ เรียกด้วย action "setup" ก่อน',
  'user.error.invalidToken': 'โทเค็นไม่ถูกต้อง',
  'user.error.twoFactorNotEnabled': 'ยังไม่ได้เปิดใช้งาน two-factor',
  'user.error.invalidAction': 'Action ไม่ถูกต้อง ใช้ "setup", "enable" หรือ "disable"',
  'user.error.twoFactorOperationFailed': 'การดำเนินการ two-factor ล้มเหลว',
  'user.error.oauthServerNotConfigured': 'ยังไม่ได้กำหนดค่า OAuth server "{{server}}"',
  'user.error.oauthVerificationFailed': 'การยืนยัน OAuth ล้มเหลว',
  'user.error.failedToCreateUser': 'สร้างผู้ใช้ไม่สำเร็จ',
  'user.error.oauthLoginFailed': 'เข้าสู่ระบบ OAuth ไม่สำเร็จ',

  // Auth client errors
  'auth.error.requestFailed': 'คำขอล้มเหลว',
  'auth.error.loginFailed': 'เข้าสู่ระบบล้มเหลว',
  'auth.error.registrationFailed': 'การลงทะเบียนล้มเหลว',
  'auth.error.noRefreshToken': 'ไม่มี refresh token ที่พร้อมใช้งาน',

  // Form validation
  'forms.required': 'จำเป็นต้องกรอกช่องนี้',
  'forms.min': 'ค่าต้องไม่น้อยกว่า {{min}}',
  'forms.max': 'ค่าต้องไม่มากกว่า {{max}}',
  'forms.minLength': 'ต้องมีอย่างน้อย {{minLength}} ตัวอักษร',
  'forms.maxLength': 'ต้องมีไม่เกิน {{maxLength}} ตัวอักษร',
  'forms.invalidFormat': 'รูปแบบไม่ถูกต้อง',
  'forms.invalidEmail': 'ที่อยู่อีเมลไม่ถูกต้อง',
  'forms.invalidUrl': 'URL ไม่ถูกต้อง',
  'forms.invalidValue': 'ค่าไม่ถูกต้อง',

  // HTTP client errors
  'http.error.requestFailed': 'คำขอล้มเหลวด้วยสถานะ {{status}}',
  'http.error.networkError': 'ข้อผิดพลาดเครือข่าย',

  // Routing errors
  'routing.error.missingParam': 'พารามิเตอร์ "{{name}}" หายไปสำหรับเส้นทาง "{{pattern}}"',
  'routing.error.routeNotFound': 'ไม่พบเส้นทาง "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ต้องใช้ภายใน MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'ไม่รองรับการแจ้งเตือนแบบพุช',
  'push.error.permissionNotGranted': 'ไม่ได้ให้สิทธิ์การแจ้งเตือน',

  // Utility errors
  'error.networkError': 'ข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อของคุณ',
  'error.timeout': 'คำขอหมดเวลา กรุณาลองใหม่อีกครั้ง',
  'error.unauthorized': 'คุณไม่ได้รับอนุญาตให้ดำเนินการนี้',
  'error.forbidden': 'การเข้าถึงถูกปฏิเสธ',
  'error.notFound': 'ไม่พบทรัพยากร',
  'error.validationError': 'กรุณาตรวจสอบข้อมูลของคุณแล้วลองใหม่',
  'error.serverError': 'ข้อผิดพลาดเซิร์ฟเวอร์ กรุณาลองใหม่ภายหลัง',
  'error.unknown': 'เกิดข้อผิดพลาดที่ไม่คาดคิด',

  // AI conversation errors
  'conversation.error.messageRequired': 'ต้องระบุ message',
  'conversation.error.aiNotConfigured': 'ยังไม่ได้กำหนดค่า AI provider',
  'conversation.error.unknownAiError': 'ข้อผิดพลาด AI ที่ไม่ทราบสาเหตุ',
  'conversation.error.notFound': 'ไม่พบการสนทนา',
  'conversation.error.streamError': 'ข้อผิดพลาด AI streaming',

  // Resource errors
  'resource.error.unknownError': 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',
  'resource.error.unableToCreate': 'ไม่สามารถสร้าง {{name}} ได้',
  'resource.error.unableToUpdate': 'ไม่สามารถอัปเดต {{name}} ได้',
  'resource.error.unableToDelete': 'ไม่สามารถลบ {{name}} ได้',
  'resource.error.notFound': 'ไม่พบ',
  'resource.error.badRequest': 'คำขอไม่ถูกต้อง',
  'resource.error.unauthorized': 'ไม่ได้รับอนุญาต',

  // Project errors
  'project.error.nameAndTypeRequired': 'ต้องระบุ name และ projectType',
  'project.error.notFound': 'ไม่พบ',

  // Device errors
  'device.error.unauthorized': 'ไม่ได้รับอนุญาต',
  'device.error.badRequest': 'คำขอไม่ถูกต้อง',
  'device.error.notFound': 'ไม่พบ',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'การอ่าน {{path}} ล้มเหลว: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'การเขียน {{path}} ล้มเหลว: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'การลบ {{path}} ล้มเหลว: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ต้องระบุผู้ให้บริการชำระเงิน',
  'user.payment.subscriptionIdRequired': 'ต้องระบุ subscriptionId',
  'user.payment.receiptAndPlanRequired': 'ต้องระบุ receipt และ planKey',
  'user.payment.verificationNotConfigured':
    'ยังไม่ได้กำหนดค่าการยืนยันการชำระเงินสำหรับ {{provider}}',
  'user.payment.invalidPlan': 'แผนไม่ถูกต้อง',
  'user.payment.verificationFailed': 'ยืนยันการสมัครสมาชิกไม่สำเร็จ',
  'user.payment.unknownPlan': 'แผนที่ไม่รู้จัก',
  'user.payment.invalidWebhookEvent': 'เหตุการณ์ webhook ไม่ถูกต้อง',
}
