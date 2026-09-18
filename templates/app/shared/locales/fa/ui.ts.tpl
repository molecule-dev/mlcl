/**
 * Persian (Farsi) translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'در حال بارگذاری...',
  'common.saving': 'در حال ذخیره...',
  'common.close': 'بستن',
  'common.goBack': 'بازگشت',
  'common.submit': 'ارسال',
  'common.continue': 'ادامه',

  // Auth - Login
  'auth.login.email': 'ایمیل',
  'auth.login.password': 'رمز عبور',
  'auth.login.twoFactor': 'کد احراز هویت دو مرحله‌ای (در صورت فعال بودن)',
  'auth.login.signUp': 'ثبت‌نام',
  'auth.login.loggingIn': 'در حال ورود...',
  'auth.login.logIn': 'ورود',
  'auth.login.forgotPassword': 'رمز عبور را فراموش کرده‌اید؟',

  // Auth - Signup
  'auth.signup.email': 'ایمیل (الزامی)',
  'auth.signup.password': 'رمز عبور (الزامی)',
  'auth.signup.name': 'نام شما',
  'auth.signup.signingUp': 'در حال ثبت‌نام...',
  'auth.signup.signUp': 'ثبت‌نام',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'اگر حسابی با این ایمیل وجود داشته باشد، لینک بازنشانی رمز عبور ارسال شده است.',
  'auth.forgotPassword.email': 'ایمیل',
  'auth.forgotPassword.submitting': 'در حال ارسال...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ایمیل',
  'auth.resetPassword.token': 'کد بازنشانی رمز عبور',
  'auth.resetPassword.newPassword': 'رمز عبور جدید را وارد کنید',
  'auth.resetPassword.twoFactor': 'کد احراز هویت دو مرحله‌ای (در صورت فعال بودن)',
  'auth.resetPassword.loggingIn': 'در حال ورود...',
  'auth.resetPassword.submit': 'تنظیم رمز عبور و ورود',

  // Home
  'home.greeting': 'سلام، ',
  'home.world': 'دنیا',

  // Settings
  'settings.account': 'حساب کاربری',
  'settings.email': 'ایمیل',
  'settings.authentication': 'احراز هویت',
  'settings.changePassword': 'تغییر رمز عبور',
  'settings.twoFactor': 'احراز هویت دو مرحله‌ای',
  'settings.notifications': 'اعلان‌ها',
  'settings.pushNotifications': 'اعلان‌های فوری',
  'settings.billing': 'صورتحساب',
  'settings.plan': 'طرح: ',
  'settings.upgrade': 'ارتقا',
  'settings.devices': 'دستگاه‌ها',
  'settings.noDevices': 'دستگاهی یافت نشد',
  'settings.thisDevice': 'این دستگاه',
  'settings.platform': 'پلتفرم',
  'settings.browser': 'مرورگر',
  'settings.network': 'شبکه',
  'settings.online': 'آنلاین',
  'settings.offline': 'آفلاین',
  'settings.unknown': 'نامشخص',
  'settings.logOut': 'خروج',
  'settings.deleteAccount': 'حذف حساب کاربری',
  'settings.changePasswordModal.title': 'تغییر رمز عبور',
  'settings.changePasswordModal.error': 'تغییر رمز عبور ناموفق بود.',
  'settings.changePasswordModal.currentPassword': 'رمز عبور فعلی',
  'settings.changePasswordModal.newPassword': 'رمز عبور جدید',
  'settings.changePasswordModal.changing': 'در حال تغییر...',
  'settings.deleteAccountModal.title': 'حذف حساب کاربری',
  'settings.deleteAccountModal.warning':
    'این عمل قابل بازگشت نیست. لطفاً رمز عبور خود را برای تأیید وارد کنید.',
  'settings.deleteAccountModal.password': 'رمز عبور',
  'settings.deleteAccountModal.deleting': 'در حال حذف...',
  'settings.changePasswordModal.submit': 'تغییر رمز عبور',
  'settings.deleteAccountModal.submit': 'حذف حساب کاربری',
  'settings.failedToUpdateEmail': 'به‌روزرسانی ایمیل ناموفق بود.',
  'settings.failedToDeleteAccount': 'حذف حساب ناموفق بود.',
  'settings.toggleTwoFactor': 'تغییر وضعیت احراز هویت دو مرحله‌ای',
  'settings.togglePushNotifications': 'تغییر وضعیت اعلان‌های فوری',

  // Footer
  'footer.about': 'درباره {{appName}}',
  'footer.privacyPolicy': 'سیاست حفظ حریم خصوصی',
  'footer.termsOfService': 'شرایط استفاده از خدمات',
  'footer.language': 'زبان',

  // OAuth
  'oauth.orContinueWith': 'یا ادامه با',
  'oauth.continueWith': 'ادامه با {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'تغییر پوسته',

  // User Menu
  'userMenu.open': 'باز کردن منوی کاربر',

  // Plan Updated
  'planUpdated.message': 'طرح شما به‌روزرسانی شد.',
  'planUpdated.thankYou': 'متشکریم!',
  'planUpdated.returnHome': 'بازگشت به صفحه اصلی',

  // PWA
  'pwa.updateAvailable': 'نسخه جدید موجود است!',
  'pwa.update': 'به‌روزرسانی',
  'pwa.updating': 'در حال به‌روزرسانی...',

  // User API errors
  'user.error.badRequest': 'درخواست نامعتبر.',
  'user.error.notFound': 'یافت نشد.',
  'user.error.failedToCreateSession': 'ایجاد نشست ناموفق بود.',
  'user.error.usernameRequired': 'نام کاربری الزامی است.',
  'user.error.passwordRequired': 'رمز عبور الزامی است.',
  'user.error.emailInvalid': 'ایمیل نامعتبر است.',
  'user.error.usernameUnavailable': 'نام کاربری در دسترس نیست.',
  'user.error.emailAlreadyRegistered': 'ایمیل قبلاً ثبت شده است.',
  'user.error.failedToHashPassword': 'هش کردن رمز عبور ناموفق بود.',
  'user.error.invalidCredentials': 'اعتبارنامه‌های نامعتبر.',
  'user.error.invalidTwoFactorToken': 'توکن دو مرحله‌ای نامعتبر.',
  'user.error.twoFactorVerificationUnavailable': 'تأیید دو مرحله‌ای در دسترس نیست.',
  'user.error.loginFailed': 'ورود ناموفق بود.',
  'user.error.usernameCannotBeEmpty': 'نام کاربری نمی‌تواند خالی باشد.',
  'user.error.failedToUpdateUser': 'به‌روزرسانی کاربر ناموفق بود.',
  'user.error.failedToDeleteUser': 'حذف کاربر ناموفق بود.',
  'user.error.failedToReadUser': 'خواندن کاربر ناموفق بود.',
  'user.error.emailRequired': 'ایمیل الزامی است.',
  'user.error.failedToProcessPasswordReset': 'پردازش بازنشانی رمز عبور ناموفق بود.',
  'user.error.newPasswordRequired': 'رمز عبور جدید الزامی است.',
  'user.error.currentPasswordRequired': 'رمز عبور فعلی الزامی است.',
  'user.error.currentPasswordIncorrect': 'رمز عبور فعلی نادرست است.',
  'user.error.failedToUpdatePassword': 'به‌روزرسانی رمز عبور ناموفق بود.',
  'user.error.planKeyRequired': 'planKey الزامی است.',
  'user.error.invalidPlan': 'طرح نامعتبر.',
  'user.error.failedToUpdateSubscription': 'به‌روزرسانی اشتراک ناموفق بود.',
  'user.error.failedToUpdatePlan': 'به‌روزرسانی طرح ناموفق بود.',
  'user.error.twoFactorNotAvailable': 'احراز هویت دو مرحله‌ای در دسترس نیست.',
  'user.error.tokenRequired': 'توکن الزامی است.',
  'user.error.noPendingTwoFactorSetup':
    'تنظیم دو مرحله‌ای در انتظاری وجود ندارد. ابتدا با "setup" فراخوانی کنید.',
  'user.error.invalidToken': 'توکن نامعتبر.',
  'user.error.twoFactorNotEnabled': 'دو مرحله‌ای فعال نیست.',
  'user.error.invalidAction': 'عملیات نامعتبر. از "setup"، "enable" یا "disable" استفاده کنید.',
  'user.error.twoFactorOperationFailed': 'عملیات دو مرحله‌ای ناموفق بود.',
  'user.error.oauthServerNotConfigured': 'سرور OAuth "{{server}}" پیکربندی نشده است.',
  'user.error.oauthVerificationFailed': 'تأیید OAuth ناموفق بود.',
  'user.error.failedToCreateUser': 'ایجاد کاربر ناموفق بود.',
  'user.error.oauthLoginFailed': 'ورود OAuth ناموفق بود.',

  // Auth client errors
  'auth.error.requestFailed': 'درخواست ناموفق بود',
  'auth.error.loginFailed': 'ورود ناموفق بود',
  'auth.error.registrationFailed': 'ثبت‌نام ناموفق بود',
  'auth.error.noRefreshToken': 'توکن بازآوری موجود نیست',

  // Form validation
  'forms.required': 'این فیلد الزامی است',
  'forms.min': 'مقدار باید حداقل {{min}} باشد',
  'forms.max': 'مقدار باید حداکثر {{max}} باشد',
  'forms.minLength': 'باید حداقل {{minLength}} کاراکتر باشد',
  'forms.maxLength': 'باید حداکثر {{maxLength}} کاراکتر باشد',
  'forms.invalidFormat': 'قالب نامعتبر',
  'forms.invalidEmail': 'آدرس ایمیل نامعتبر',
  'forms.invalidUrl': 'URL نامعتبر',
  'forms.invalidValue': 'مقدار نامعتبر',

  // HTTP client errors
  'http.error.requestFailed': 'درخواست با وضعیت {{status}} ناموفق بود.',
  'http.error.networkError': 'خطای شبکه.',

  // Routing errors
  'routing.error.missingParam': 'پارامتر "{{name}}" برای مسیر "{{pattern}}" وجود ندارد',
  'routing.error.routeNotFound': 'مسیر "{{name}}" یافت نشد',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter باید درون MoleculeRouterProvider استفاده شود',

  // Push notification errors
  'push.error.notSupported': 'اعلان‌های فشاری پشتیبانی نمی‌شوند',
  'push.error.permissionNotGranted': 'مجوز اعلان داده نشده',

  // Utility errors
  'error.networkError': 'خطای شبکه. لطفاً اتصال خود را بررسی کنید.',
  'error.timeout': 'مهلت درخواست به پایان رسید. لطفاً دوباره تلاش کنید.',
  'error.unauthorized': 'شما مجاز به انجام این عملیات نیستید.',
  'error.forbidden': 'دسترسی رد شد.',
  'error.notFound': 'منبع یافت نشد.',
  'error.validationError': 'لطفاً ورودی خود را بررسی کرده و دوباره تلاش کنید.',
  'error.serverError': 'خطای سرور. لطفاً بعداً دوباره تلاش کنید.',
  'error.unknown': 'خطای غیرمنتظره‌ای رخ داد.',

  // AI conversation errors
  'conversation.error.messageRequired': 'پیام الزامی است',
  'conversation.error.aiNotConfigured': 'ارائه‌دهنده هوش مصنوعی پیکربندی نشده',
  'conversation.error.unknownAiError': 'خطای نامشخص هوش مصنوعی',
  'conversation.error.notFound': 'مکالمه‌ای یافت نشد',
  'conversation.error.streamError': 'خطای جریان هوش مصنوعی',

  // Resource errors
  'resource.error.unknownError': 'خطای نامشخص.',
  'resource.error.unableToCreate': 'ایجاد {{name}} امکان‌پذیر نبود.',
  'resource.error.unableToUpdate': 'به‌روزرسانی {{name}} امکان‌پذیر نبود.',
  'resource.error.unableToDelete': 'حذف {{name}} امکان‌پذیر نبود.',
  'resource.error.notFound': 'یافت نشد.',
  'resource.error.badRequest': 'درخواست نامعتبر.',
  'resource.error.unauthorized': 'غیرمجاز.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name و projectType الزامی هستند',
  'project.error.notFound': 'یافت نشد',

  // Device errors
  'device.error.unauthorized': 'غیرمجاز.',
  'device.error.badRequest': 'درخواست نامعتبر.',
  'device.error.notFound': 'یافت نشد.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'خواندن {{path}} ناموفق بود: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'نوشتن {{path}} ناموفق بود: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'حذف {{path}} ناموفق بود: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ارائه‌دهنده پرداخت الزامی است.',
  'user.payment.subscriptionIdRequired': 'subscriptionId الزامی است.',
  'user.payment.receiptAndPlanRequired': 'receipt و planKey الزامی هستند.',
  'user.payment.verificationNotConfigured': 'تأیید پرداخت برای {{provider}} پیکربندی نشده است.',
  'user.payment.invalidPlan': 'طرح نامعتبر.',
  'user.payment.verificationFailed': 'تأیید اشتراک ناموفق بود.',
  'user.payment.unknownPlan': 'طرح نامشخص.',
  'user.payment.invalidWebhookEvent': 'رویداد وب‌هوک نامعتبر.',
}
