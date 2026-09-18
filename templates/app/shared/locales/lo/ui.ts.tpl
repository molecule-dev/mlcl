/**
 * Lao translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'ກຳລັງໂຫລດ...',
  'common.saving': 'ກຳລັງບັນທຶກ...',
  'common.close': 'ປິດ',
  'common.goBack': 'ກັບຄືນ',
  'common.submit': 'ສົ່ງ',
  'common.continue': 'ສືບຕໍ່',

  // Auth - Login
  'auth.login.email': 'ອີເມວ',
  'auth.login.password': 'ລະຫັດຜ່ານ',
  'auth.login.twoFactor': 'ໂທເຄັນຢືນຢັນສອງຂັ້ນຕອນ (ຖ້າເປີດໃຊ້ງານ)',
  'auth.login.signUp': 'ລົງທະບຽນ',
  'auth.login.loggingIn': 'ກຳລັງເຂົ້າສູ່ລະບົບ...',
  'auth.login.logIn': 'ເຂົ້າສູ່ລະບົບ',
  'auth.login.forgotPassword': 'ລືມລະຫັດຜ່ານ?',

  // Auth - Signup
  'auth.signup.email': 'ອີເມວ (ຈຳເປັນ)',
  'auth.signup.password': 'ລະຫັດຜ່ານ (ຈຳເປັນ)',
  'auth.signup.name': 'ຊື່ຂອງທ່ານ',
  'auth.signup.signingUp': 'ກຳລັງລົງທະບຽນ...',
  'auth.signup.signUp': 'ລົງທະບຽນ',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'ຖ້າມີບັນຊີທີ່ໃຊ້ອີເມວນັ້ນ ລິ້ງຣີເຊັດລະຫັດຜ່ານໄດ້ຖືກສົ່ງໄປແລ້ວ.',
  'auth.forgotPassword.email': 'ອີເມວ',
  'auth.forgotPassword.submitting': 'ກຳລັງສົ່ງ...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ອີເມວ',
  'auth.resetPassword.token': 'ໂທເຄັນຣີເຊັດລະຫັດຜ່ານ',
  'auth.resetPassword.newPassword': 'ປ້ອນລະຫັດຜ່ານໃໝ່',
  'auth.resetPassword.twoFactor': 'ໂທເຄັນຢືນຢັນສອງຂັ້ນຕອນ (ຖ້າເປີດໃຊ້ງານ)',
  'auth.resetPassword.loggingIn': 'ກຳລັງເຂົ້າສູ່ລະບົບ...',
  'auth.resetPassword.submit': 'ຕັ້ງລະຫັດຜ່ານ ແລະ ເຂົ້າສູ່ລະບົບ',

  // Home
  'home.greeting': 'ສະບາຍດີ, ',
  'home.world': 'ໂລກ',

  // Settings
  'settings.account': 'ບັນຊີ',
  'settings.email': 'ອີເມວ',
  'settings.authentication': 'ການຢືນຢັນຕົວຕົນ',
  'settings.changePassword': 'ປ່ຽນລະຫັດຜ່ານ',
  'settings.twoFactor': 'ການຢືນຢັນສອງຂັ້ນຕອນ',
  'settings.notifications': 'ການແຈ້ງເຕືອນ',
  'settings.pushNotifications': 'ການແຈ້ງເຕືອນແບບພຸດ',
  'settings.billing': 'ການຮຽກເກັບເງິນ',
  'settings.plan': 'ແພັກເກດ: ',
  'settings.upgrade': 'ອັບເກຣດ',
  'settings.devices': 'ອຸປະກອນ',
  'settings.noDevices': 'ບໍ່ພົບອຸປະກອນ',
  'settings.thisDevice': 'ອຸປະກອນນີ້',
  'settings.platform': 'ແພລດຟອມ',
  'settings.browser': 'ບຣາວເຊີ',
  'settings.network': 'ເຄືອຂ່າຍ',
  'settings.online': 'ອອນລາຍ',
  'settings.offline': 'ອອບລາຍ',
  'settings.unknown': 'ບໍ່ຮູ້',
  'settings.logOut': 'ອອກຈາກລະບົບ',
  'settings.deleteAccount': 'ລຶບບັນຊີ',
  'settings.changePasswordModal.title': 'ປ່ຽນລະຫັດຜ່ານ',
  'settings.changePasswordModal.error': 'ປ່ຽນລະຫັດຜ່ານບໍ່ສຳເລັດ.',
  'settings.changePasswordModal.currentPassword': 'ລະຫັດຜ່ານປັດຈຸບັນ',
  'settings.changePasswordModal.newPassword': 'ລະຫັດຜ່ານໃໝ່',
  'settings.changePasswordModal.changing': 'ກຳລັງປ່ຽນ...',
  'settings.deleteAccountModal.title': 'ລຶບບັນຊີ',
  'settings.deleteAccountModal.warning':
    'ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້. ກະລຸນາປ້ອນລະຫັດຜ່ານຂອງທ່ານເພື່ອຢືນຢັນ.',
  'settings.deleteAccountModal.password': 'ລະຫັດຜ່ານ',
  'settings.deleteAccountModal.deleting': 'ກຳລັງລຶບ...',
  'settings.changePasswordModal.submit': 'ປ່ຽນລະຫັດຜ່ານ',
  'settings.deleteAccountModal.submit': 'ລຶບບັນຊີ',
  'settings.failedToUpdateEmail': 'ບໍ່ສາມາດອັບເດດອີເມລໄດ້.',
  'settings.failedToDeleteAccount': 'ບໍ່ສາມາດລຶບບັນຊີໄດ້.',
  'settings.toggleTwoFactor': 'ສະຫຼັບການຢືນຢັນສອງຂັ້ນຕອນ',
  'settings.togglePushNotifications': 'ສະຫຼັບການແຈ້ງເຕືອນ push',

  // Footer
  'footer.about': 'ກ່ຽວກັບ {{appName}}',
  'footer.privacyPolicy': 'ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ',
  'footer.termsOfService': 'ເງື່ອນໄຂການບໍລິການ',
  'footer.language': 'ພາສາ',

  // OAuth
  'oauth.orContinueWith': 'ຫຼື ສືບຕໍ່ດ້ວຍ',
  'oauth.continueWith': 'ສືບຕໍ່ດ້ວຍ {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'ສະຫຼັບຮູບແບບ',

  // User Menu
  'userMenu.open': 'ເປີດເມນູຜູ້ໃຊ້',

  // Plan Updated
  'planUpdated.message': 'ແພັກເກດຂອງທ່ານໄດ້ຮັບການອັບເດດແລ້ວ.',
  'planUpdated.thankYou': 'ຂອບໃຈ!',
  'planUpdated.returnHome': 'ກັບໄປໜ້າຫຼັກ',

  // PWA
  'pwa.updateAvailable': 'ເວີຊັ່ນໃໝ່ມີໃຫ້ແລ້ວ!',
  'pwa.update': 'ອັບເດດ',
  'pwa.updating': 'ກຳລັງອັບເດດ...',

  // User API errors
  'user.error.badRequest': 'ຄຳຂໍບໍ່ຖືກຕ້ອງ.',
  'user.error.notFound': 'ບໍ່ພົບ.',
  'user.error.failedToCreateSession': 'ບໍ່ສາມາດສ້າງ session ໄດ້.',
  'user.error.usernameRequired': 'ຕ້ອງການຊື່ຜູ້ໃຊ້.',
  'user.error.passwordRequired': 'ຕ້ອງການລະຫັດຜ່ານ.',
  'user.error.emailInvalid': 'ອີເມວບໍ່ຖືກຕ້ອງ.',
  'user.error.usernameUnavailable': 'ຊື່ຜູ້ໃຊ້ບໍ່ພ້ອມໃຊ້ງານ.',
  'user.error.emailAlreadyRegistered': 'ອີເມວໄດ້ລົງທະບຽນແລ້ວ.',
  'user.error.failedToHashPassword': 'ບໍ່ສາມາດ hash ລະຫັດຜ່ານໄດ້.',
  'user.error.invalidCredentials': 'ຂໍ້ມູນປະຈຳຕົວບໍ່ຖືກຕ້ອງ.',
  'user.error.invalidTwoFactorToken': 'Token two-factor ບໍ່ຖືກຕ້ອງ.',
  'user.error.twoFactorVerificationUnavailable': 'ການຢືນຢັນ two-factor ບໍ່ພ້ອມໃຊ້ງານ.',
  'user.error.loginFailed': 'ການເຂົ້າສູ່ລະບົບລົ້ມເຫຼວ.',
  'user.error.usernameCannotBeEmpty': 'ຊື່ຜູ້ໃຊ້ບໍ່ສາມາດຫວ່າງເປົ່າ.',
  'user.error.failedToUpdateUser': 'ບໍ່ສາມາດອັບເດດຜູ້ໃຊ້ໄດ້.',
  'user.error.failedToDeleteUser': 'ບໍ່ສາມາດລຶບຜູ້ໃຊ້ໄດ້.',
  'user.error.failedToReadUser': 'ບໍ່ສາມາດອ່ານຜູ້ໃຊ້ໄດ້.',
  'user.error.emailRequired': 'ຕ້ອງການອີເມວ.',
  'user.error.failedToProcessPasswordReset': 'ບໍ່ສາມາດດຳເນີນການຕັ້ງລະຫັດຜ່ານໃໝ່ໄດ້.',
  'user.error.newPasswordRequired': 'ຕ້ອງການລະຫັດຜ່ານໃໝ່.',
  'user.error.currentPasswordRequired': 'ຕ້ອງການລະຫັດຜ່ານປັດຈຸບັນ.',
  'user.error.currentPasswordIncorrect': 'ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ.',
  'user.error.failedToUpdatePassword': 'ບໍ່ສາມາດອັບເດດລະຫັດຜ່ານໄດ້.',
  'user.error.planKeyRequired': 'ຕ້ອງການ planKey.',
  'user.error.invalidPlan': 'ແຜນບໍ່ຖືກຕ້ອງ.',
  'user.error.failedToUpdateSubscription': 'ບໍ່ສາມາດອັບເດດການສະໝັກສະມາຊິກໄດ້.',
  'user.error.failedToUpdatePlan': 'ບໍ່ສາມາດອັບເດດແຜນໄດ້.',
  'user.error.twoFactorNotAvailable': 'ການພິສູດຕົວຕົນ two-factor ບໍ່ພ້ອມໃຊ້ງານ.',
  'user.error.tokenRequired': 'ຕ້ອງການ token.',
  'user.error.noPendingTwoFactorSetup':
    'ບໍ່ມີການຕັ້ງຄ່າ two-factor ທີ່ລໍຖ້າ. ກະລຸນາເອີ້ນດ້ວຍ action "setup" ກ່ອນ.',
  'user.error.invalidToken': 'Token ບໍ່ຖືກຕ້ອງ.',
  'user.error.twoFactorNotEnabled': 'Two-factor ບໍ່ໄດ້ເປີດໃຊ້ງານ.',
  'user.error.invalidAction': 'Action ບໍ່ຖືກຕ້ອງ. ໃຊ້ "setup", "enable", ຫຼື "disable".',
  'user.error.twoFactorOperationFailed': 'ການດຳເນີນການ two-factor ລົ້ມເຫຼວ.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ.',
  'user.error.oauthVerificationFailed': 'ການຢືນຢັນ OAuth ລົ້ມເຫຼວ.',
  'user.error.failedToCreateUser': 'ບໍ່ສາມາດສ້າງຜູ້ໃຊ້ໄດ້.',
  'user.error.oauthLoginFailed': 'ການເຂົ້າສູ່ລະບົບ OAuth ລົ້ມເຫຼວ.',

  // Auth client errors
  'auth.error.requestFailed': 'ຄຳຂໍລົ້ມເຫຼວ',
  'auth.error.loginFailed': 'ການເຂົ້າສູ່ລະບົບລົ້ມເຫຼວ',
  'auth.error.registrationFailed': 'ການລົງທະບຽນລົ້ມເຫຼວ',
  'auth.error.noRefreshToken': 'ບໍ່ມີ refresh token ທີ່ພ້ອມໃຊ້ງານ',

  // Form validation
  'forms.required': 'ຊ່ອງນີ້ຈຳເປັນຕ້ອງກອກ',
  'forms.min': 'ຄ່າຕ້ອງຢ່າງໜ້ອຍ {{min}}',
  'forms.max': 'ຄ່າຕ້ອງບໍ່ເກີນ {{max}}',
  'forms.minLength': 'ຕ້ອງມີຢ່າງໜ້ອຍ {{minLength}} ຕົວອັກສອນ',
  'forms.maxLength': 'ຕ້ອງບໍ່ເກີນ {{maxLength}} ຕົວອັກສອນ',
  'forms.invalidFormat': 'ຮູບແບບບໍ່ຖືກຕ້ອງ',
  'forms.invalidEmail': 'ທີ່ຢູ່ອີເມວບໍ່ຖືກຕ້ອງ',
  'forms.invalidUrl': 'URL ບໍ່ຖືກຕ້ອງ',
  'forms.invalidValue': 'ຄ່າບໍ່ຖືກຕ້ອງ',

  // HTTP client errors
  'http.error.requestFailed': 'ຄຳຂໍລົ້ມເຫຼວດ້ວຍສະຖານະ {{status}}.',
  'http.error.networkError': 'ຂໍ້ຜິດພາດເຄືອຂ່າຍ.',

  // Routing errors
  'routing.error.missingParam': 'ຂາດພາຣາມິເຕີ "{{name}}" ສຳລັບເສັ້ນທາງ "{{pattern}}"',
  'routing.error.routeNotFound': 'ບໍ່ພົບເສັ້ນທາງ "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ຕ້ອງໃຊ້ພາຍໃນ MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'ບໍ່ຮອງຮັບການແຈ້ງເຕືອນ push',
  'push.error.permissionNotGranted': 'ບໍ່ໄດ້ອະນຸຍາດການແຈ້ງເຕືອນ',

  // Utility errors
  'error.networkError': 'ຂໍ້ຜິດພາດເຄືອຂ່າຍ. ກະລຸນາກວດສອບການເຊື່ອມຕໍ່ຂອງທ່ານ.',
  'error.timeout': 'ໝົດເວລາຄຳຂໍ. ກະລຸນາລອງໃໝ່.',
  'error.unauthorized': 'ທ່ານບໍ່ໄດ້ຮັບອະນຸຍາດໃຫ້ດຳເນີນການນີ້.',
  'error.forbidden': 'ການເຂົ້າເຖິງຖືກປະຕິເສດ.',
  'error.notFound': 'ບໍ່ພົບຊັບພະຍາກອນ.',
  'error.validationError': 'ກະລຸນາກວດສອບຂໍ້ມູນເຂົ້າຂອງທ່ານແລ້ວລອງໃໝ່.',
  'error.serverError': 'ຂໍ້ຜິດພາດເຊີບເວີ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.',
  'error.unknown': 'ເກີດຂໍ້ຜິດພາດທີ່ບໍ່ຄາດຄິດ.',

  // AI conversation errors
  'conversation.error.messageRequired': 'ຕ້ອງການ message',
  'conversation.error.aiNotConfigured': 'AI provider ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ',
  'conversation.error.unknownAiError': 'ຂໍ້ຜິດພາດ AI ບໍ່ຮູ້ສາເຫດ',
  'conversation.error.notFound': 'ບໍ່ພົບການສົນທະນາ',
  'conversation.error.streamError': 'ຂໍ້ຜິດພາດ AI streaming',

  // Resource errors
  'resource.error.unknownError': 'ຂໍ້ຜິດພາດບໍ່ຮູ້ສາເຫດ.',
  'resource.error.unableToCreate': 'ບໍ່ສາມາດສ້າງ {{name}} ໄດ້.',
  'resource.error.unableToUpdate': 'ບໍ່ສາມາດອັບເດດ {{name}} ໄດ້.',
  'resource.error.unableToDelete': 'ບໍ່ສາມາດລຶບ {{name}} ໄດ້.',
  'resource.error.notFound': 'ບໍ່ພົບ.',
  'resource.error.badRequest': 'ຄຳຂໍບໍ່ຖືກຕ້ອງ.',
  'resource.error.unauthorized': 'ບໍ່ໄດ້ຮັບອະນຸຍາດ.',

  // Project errors
  'project.error.nameAndTypeRequired': 'ຕ້ອງການ name ແລະ projectType',
  'project.error.notFound': 'ບໍ່ພົບ',

  // Device errors
  'device.error.unauthorized': 'ບໍ່ໄດ້ຮັບອະນุญາດ.',
  'device.error.badRequest': 'ຄຳຂໍບໍ່ຖືກຕ້ອງ.',
  'device.error.notFound': 'ບໍ່ພົບ.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'ການອ່ານ {{path}} ລົ້ມເຫລວ: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'ການຂຽນ {{path}} ລົ້ມເຫລວ: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'ການລຶບ {{path}} ລົ້ມເຫລວ: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ຕ້ອງການຜູ້ໃຫ້ບໍລິການຊຳລະເງິນ.',
  'user.payment.subscriptionIdRequired': 'ຕ້ອງການ subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'ຕ້ອງການ receipt ແລະ planKey.',
  'user.payment.verificationNotConfigured':
    'ການຢືນຢັນການຊຳລະເງິນຍັງບໍ່ໄດ້ຕັ້ງຄ່າສຳລັບ {{provider}}.',
  'user.payment.invalidPlan': 'ແຜນບໍ່ຖືກຕ້ອງ.',
  'user.payment.verificationFailed': 'ບໍ່ສາມາດຢືນຢັນການສະໝັກສະມາຊິກໄດ້.',
  'user.payment.unknownPlan': 'ແຜນບໍ່ຮູ້ຈັກ.',
  'user.payment.invalidWebhookEvent': 'ເຫດການ webhook ບໍ່ຖືກຕ້ອງ.',
}
