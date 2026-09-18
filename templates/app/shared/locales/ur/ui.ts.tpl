/**
 * Urdu translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'لوڈ ہو رہا ہے...',
  'common.saving': 'محفوظ ہو رہا ہے...',
  'common.close': 'بند کریں',
  'common.goBack': 'واپس جائیں',
  'common.submit': 'جمع کرائیں',
  'common.continue': 'جاری رکھیں',

  // Auth - Login
  'auth.login.email': 'ای میل',
  'auth.login.password': 'پاس ورڈ',
  'auth.login.twoFactor': 'دو مرحلی تصدیقی کوڈ (اگر فعال ہو)',
  'auth.login.signUp': 'سائن اپ',
  'auth.login.loggingIn': 'لاگ ان ہو رہا ہے...',
  'auth.login.logIn': 'لاگ ان',
  'auth.login.forgotPassword': 'پاس ورڈ بھول گئے؟',

  // Auth - Signup
  'auth.signup.email': 'ای میل (ضروری)',
  'auth.signup.password': 'پاس ورڈ (ضروری)',
  'auth.signup.name': 'آپ کا نام',
  'auth.signup.signingUp': 'سائن اپ ہو رہا ہے...',
  'auth.signup.signUp': 'سائن اپ',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'اگر اس ای میل سے کوئی اکاؤنٹ موجود ہے تو پاس ورڈ دوبارہ ترتیب دینے کا لنک بھیج دیا گیا ہے۔',
  'auth.forgotPassword.email': 'ای میل',
  'auth.forgotPassword.submitting': 'جمع ہو رہا ہے...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ای میل',
  'auth.resetPassword.token': 'پاس ورڈ دوبارہ ترتیب دینے کا کوڈ',
  'auth.resetPassword.newPassword': 'نیا پاس ورڈ درج کریں',
  'auth.resetPassword.twoFactor': 'دو مرحلی تصدیقی کوڈ (اگر فعال ہو)',
  'auth.resetPassword.loggingIn': 'لاگ ان ہو رہا ہے...',
  'auth.resetPassword.submit': 'پاس ورڈ مقرر کریں اور لاگ ان ہوں',

  // Home
  'home.greeting': 'ہیلو، ',
  'home.world': 'دنیا',

  // Settings
  'settings.account': 'اکاؤنٹ',
  'settings.email': 'ای میل',
  'settings.authentication': 'تصدیق',
  'settings.changePassword': 'پاس ورڈ تبدیل کریں',
  'settings.twoFactor': 'دو مرحلی تصدیق',
  'settings.notifications': 'اطلاعات',
  'settings.pushNotifications': 'پش اطلاعات',
  'settings.billing': 'بلنگ',
  'settings.plan': 'پلان: ',
  'settings.upgrade': 'اپ گریڈ',
  'settings.devices': 'آلات',
  'settings.noDevices': 'کوئی آلہ نہیں ملا',
  'settings.thisDevice': 'یہ آلہ',
  'settings.platform': 'پلیٹ فارم',
  'settings.browser': 'براؤزر',
  'settings.network': 'نیٹ ورک',
  'settings.online': 'آن لائن',
  'settings.offline': 'آف لائن',
  'settings.unknown': 'نامعلوم',
  'settings.logOut': 'لاگ آؤٹ',
  'settings.deleteAccount': 'اکاؤنٹ حذف کریں',
  'settings.changePasswordModal.title': 'پاس ورڈ تبدیل کریں',
  'settings.changePasswordModal.error': 'پاس ورڈ تبدیل کرنے میں ناکامی۔',
  'settings.changePasswordModal.currentPassword': 'موجودہ پاس ورڈ',
  'settings.changePasswordModal.newPassword': 'نیا پاس ورڈ',
  'settings.changePasswordModal.changing': 'تبدیل ہو رہا ہے...',
  'settings.deleteAccountModal.title': 'اکاؤنٹ حذف کریں',
  'settings.deleteAccountModal.warning':
    'یہ عمل واپس نہیں ہو سکتا۔ تصدیق کے لیے براہ کرم اپنا پاس ورڈ درج کریں۔',
  'settings.deleteAccountModal.password': 'پاس ورڈ',
  'settings.deleteAccountModal.deleting': 'حذف ہو رہا ہے...',
  'settings.changePasswordModal.submit': 'پاس ورڈ تبدیل کریں',
  'settings.deleteAccountModal.submit': 'اکاؤنٹ حذف کریں',
  'settings.failedToUpdateEmail': 'ای میل اپ ڈیٹ کرنے میں ناکام۔',
  'settings.failedToDeleteAccount': 'اکاؤنٹ حذف کرنے میں ناکام۔',
  'settings.toggleTwoFactor': 'دو عنصری توثیق ٹوگل کریں',
  'settings.togglePushNotifications': 'پش نوٹیفکیشنز ٹوگل کریں',

  // Footer
  'footer.about': '{{appName}} کے بارے میں',
  'footer.privacyPolicy': 'رازداری کی پالیسی',
  'footer.termsOfService': 'شرائط و ضوابط',
  'footer.language': 'زبان',

  // OAuth
  'oauth.orContinueWith': 'یا اس کے ذریعے جاری رکھیں',
  'oauth.continueWith': '{{provider}} کے ذریعے جاری رکھیں',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'تھیم تبدیل کریں',

  // User Menu
  'userMenu.open': 'صارف مینو کھولیں',

  // Plan Updated
  'planUpdated.message': 'آپ کا پلان اپ ڈیٹ ہو گیا ہے۔',
  'planUpdated.thankYou': 'شکریہ!',
  'planUpdated.returnHome': 'ہوم پیج پر واپس جائیں',

  // PWA
  'pwa.updateAvailable': 'نیا ورژن دستیاب ہے!',
  'pwa.update': 'اپ ڈیٹ',
  'pwa.updating': 'اپ ڈیٹ ہو رہا ہے...',

  // User API errors
  'user.error.badRequest': 'خراب درخواست۔',
  'user.error.notFound': 'نہیں ملا۔',
  'user.error.failedToCreateSession': 'سیشن بنانے میں ناکامی۔',
  'user.error.usernameRequired': 'صارف نام درکار ہے۔',
  'user.error.passwordRequired': 'پاس ورڈ درکار ہے۔',
  'user.error.emailInvalid': 'ای میل غلط ہے۔',
  'user.error.usernameUnavailable': 'صارف نام دستیاب نہیں ہے۔',
  'user.error.emailAlreadyRegistered': 'ای میل پہلے سے رجسٹرڈ ہے۔',
  'user.error.failedToHashPassword': 'پاس ورڈ ہیش کرنے میں ناکامی۔',
  'user.error.invalidCredentials': 'غلط اسناد۔',
  'user.error.invalidTwoFactorToken': 'غلط دو عنصری ٹوکن۔',
  'user.error.twoFactorVerificationUnavailable': 'دو عنصری تصدیق دستیاب نہیں۔',
  'user.error.loginFailed': 'لاگ ان ناکام۔',
  'user.error.usernameCannotBeEmpty': 'صارف نام خالی نہیں ہو سکتا۔',
  'user.error.failedToUpdateUser': 'صارف کو اپ ڈیٹ کرنے میں ناکامی۔',
  'user.error.failedToDeleteUser': 'صارف کو حذف کرنے میں ناکامی۔',
  'user.error.failedToReadUser': 'صارف کو پڑھنے میں ناکامی۔',
  'user.error.emailRequired': 'ای میل درکار ہے۔',
  'user.error.failedToProcessPasswordReset': 'پاس ورڈ ری سیٹ عمل میں ناکامی۔',
  'user.error.newPasswordRequired': 'نیا پاس ورڈ درکار ہے۔',
  'user.error.currentPasswordRequired': 'موجودہ پاس ورڈ درکار ہے۔',
  'user.error.currentPasswordIncorrect': 'موجودہ پاس ورڈ غلط ہے۔',
  'user.error.failedToUpdatePassword': 'پاس ورڈ اپ ڈیٹ کرنے میں ناکامی۔',
  'user.error.planKeyRequired': 'planKey درکار ہے۔',
  'user.error.invalidPlan': 'غلط پلان۔',
  'user.error.failedToUpdateSubscription': 'سبسکرپشن اپ ڈیٹ کرنے میں ناکامی۔',
  'user.error.failedToUpdatePlan': 'پلان اپ ڈیٹ کرنے میں ناکامی۔',
  'user.error.twoFactorNotAvailable': 'دو عنصری تصدیق دستیاب نہیں ہے۔',
  'user.error.tokenRequired': 'ٹوکن درکار ہے۔',
  'user.error.noPendingTwoFactorSetup':
    'کوئی زیر التوا دو عنصری سیٹ اپ نہیں۔ پہلے "setup" عمل کے ساتھ کال کریں۔',
  'user.error.invalidToken': 'غلط ٹوکن۔',
  'user.error.twoFactorNotEnabled': 'دو عنصری فعال نہیں ہے۔',
  'user.error.invalidAction': 'غلط عمل۔ "setup"، "enable"، یا "disable" استعمال کریں۔',
  'user.error.twoFactorOperationFailed': 'دو عنصری آپریشن ناکام۔',
  'user.error.oauthServerNotConfigured': 'OAuth سرور "{{server}}" کنفیگر نہیں ہے۔',
  'user.error.oauthVerificationFailed': 'OAuth تصدیق ناکام۔',
  'user.error.failedToCreateUser': 'صارف بنانے میں ناکامی۔',
  'user.error.oauthLoginFailed': 'OAuth لاگ ان ناکام۔',

  // Auth client errors
  'auth.error.requestFailed': 'درخواست ناکام',
  'auth.error.loginFailed': 'لاگ ان ناکام',
  'auth.error.registrationFailed': 'رجسٹریشن ناکام',
  'auth.error.noRefreshToken': 'کوئی ریفریش ٹوکن دستیاب نہیں',

  // Form validation
  'forms.required': 'یہ فیلڈ ضروری ہے',
  'forms.min': 'قیمت کم از کم {{min}} ہونی چاہیے',
  'forms.max': 'قیمت زیادہ سے زیادہ {{max}} ہونی چاہیے',
  'forms.minLength': 'کم از کم {{minLength}} حروف ہونے چاہیئں',
  'forms.maxLength': 'زیادہ سے زیادہ {{maxLength}} حروف ہونے چاہیئں',
  'forms.invalidFormat': 'غلط فارمیٹ',
  'forms.invalidEmail': 'غلط ای میل پتہ',
  'forms.invalidUrl': 'غلط URL',
  'forms.invalidValue': 'غلط قیمت',

  // HTTP client errors
  'http.error.requestFailed': 'حالت {{status}} کے ساتھ درخواست ناکام۔',
  'http.error.networkError': 'نیٹ ورک خرابی۔',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" راستے کے لیے "{{name}}" پیرامیٹر موجود نہیں',
  'routing.error.routeNotFound': '"{{name}}" راستہ نہیں ملا',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter کو MoleculeRouterProvider کے اندر استعمال کیا جانا چاہیے',

  // Push notification errors
  'push.error.notSupported': 'پش اطلاعات معاون نہیں ہیں',
  'push.error.permissionNotGranted': 'اطلاع کی اجازت نہیں دی گئی',

  // Utility errors
  'error.networkError': 'نیٹ ورک خرابی۔ اپنا کنکشن چیک کریں۔',
  'error.timeout': 'درخواست کا وقت ختم ہو گیا۔ دوبارہ کوشش کریں۔',
  'error.unauthorized': 'آپ کو یہ عمل کرنے کا اختیار نہیں ہے۔',
  'error.forbidden': 'رسائی سے انکار۔',
  'error.notFound': 'وسیلہ نہیں ملا۔',
  'error.validationError': 'اپنا ان پٹ چیک کریں اور دوبارہ کوشش کریں۔',
  'error.serverError': 'سرور خرابی۔ بعد میں دوبارہ کوشش کریں۔',
  'error.unknown': 'ایک غیر متوقع خرابی ہوئی۔',

  // AI conversation errors
  'conversation.error.messageRequired': 'message درکار ہے',
  'conversation.error.aiNotConfigured': 'AI فراہم کنندہ کنفیگر نہیں ہے',
  'conversation.error.unknownAiError': 'نامعلوم AI خرابی',
  'conversation.error.notFound': 'کوئی گفتگو نہیں ملی',
  'conversation.error.streamError': 'AI سٹریمنگ خرابی',

  // Resource errors
  'resource.error.unknownError': 'نامعلوم خرابی۔',
  'resource.error.unableToCreate': '{{name}} بنانے سے قاصر۔',
  'resource.error.unableToUpdate': '{{name}} اپ ڈیٹ کرنے سے قاصر۔',
  'resource.error.unableToDelete': '{{name}} حذف کرنے سے قاصر۔',
  'resource.error.notFound': 'نہیں ملا۔',
  'resource.error.badRequest': 'خراب درخواست۔',
  'resource.error.unauthorized': 'غیر مجاز۔',

  // Project errors
  'project.error.nameAndTypeRequired': 'name اور projectType درکار ہیں',
  'project.error.notFound': 'نہیں ملا',

  // Device errors
  'device.error.unauthorized': 'غیر مجاز۔',
  'device.error.badRequest': 'غلط درخواست۔',
  'device.error.notFound': 'نہیں ملا۔',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} پڑھنے میں ناکام: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} لکھنے میں ناکام: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} حذف کرنے میں ناکام: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ادائیگی فراہم کنندہ درکار ہے۔',
  'user.payment.subscriptionIdRequired': 'subscriptionId درکار ہے۔',
  'user.payment.receiptAndPlanRequired': 'receipt اور planKey درکار ہیں۔',
  'user.payment.verificationNotConfigured': '{{provider}} کے لیے ادائیگی کی تصدیق کنفیگر نہیں ہے۔',
  'user.payment.invalidPlan': 'غلط پلان۔',
  'user.payment.verificationFailed': 'سبسکرپشن کی تصدیق میں ناکامی۔',
  'user.payment.unknownPlan': 'نامعلوم پلان۔',
  'user.payment.invalidWebhookEvent': 'غلط ویب ہک ایونٹ۔',
}
