/**
 * Arabic translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'جارٍ التحميل...',
  'common.saving': 'جارٍ الحفظ...',
  'common.close': 'إغلاق',
  'common.goBack': 'رجوع',
  'common.submit': 'إرسال',
  'common.continue': 'متابعة',

  // Auth - Login
  'auth.login.email': 'البريد الإلكتروني',
  'auth.login.password': 'كلمة المرور',
  'auth.login.twoFactor': 'رمز المصادقة الثنائية (إذا كان مفعّلاً)',
  'auth.login.signUp': 'إنشاء حساب',
  'auth.login.loggingIn': 'جارٍ تسجيل الدخول...',
  'auth.login.logIn': 'تسجيل الدخول',
  'auth.login.forgotPassword': 'نسيت كلمة المرور؟',

  // Auth - Signup
  'auth.signup.email': 'البريد الإلكتروني (مطلوب)',
  'auth.signup.password': 'كلمة المرور (مطلوبة)',
  'auth.signup.name': 'اسمك',
  'auth.signup.signingUp': 'جارٍ إنشاء الحساب...',
  'auth.signup.signUp': 'إنشاء حساب',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'إذا كان هناك حساب مرتبط بهذا البريد الإلكتروني، فقد تم إرسال رابط إعادة تعيين كلمة المرور.',
  'auth.forgotPassword.email': 'البريد الإلكتروني',
  'auth.forgotPassword.submitting': 'جارٍ الإرسال...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'البريد الإلكتروني',
  'auth.resetPassword.token': 'رمز إعادة تعيين كلمة المرور',
  'auth.resetPassword.newPassword': 'كلمة المرور الجديدة',
  'auth.resetPassword.twoFactor': 'رمز المصادقة الثنائية (إذا كان مفعّلاً)',
  'auth.resetPassword.loggingIn': 'جارٍ تسجيل الدخول...',
  'auth.resetPassword.submit': 'تعيين كلمة المرور وتسجيل الدخول',

  // Home
  'home.greeting': 'مرحباً، ',
  'home.world': 'العالم',

  // Settings
  'settings.account': 'الحساب',
  'settings.email': 'البريد الإلكتروني',
  'settings.authentication': 'المصادقة',
  'settings.changePassword': 'تغيير كلمة المرور',
  'settings.twoFactor': 'المصادقة الثنائية',
  'settings.notifications': 'الإشعارات',
  'settings.pushNotifications': 'الإشعارات الفورية',
  'settings.billing': 'الفواتير',
  'settings.plan': 'الخطة: ',
  'settings.upgrade': 'ترقية',
  'settings.devices': 'الأجهزة',
  'settings.noDevices': 'لم يتم العثور على أجهزة',
  'settings.thisDevice': 'هذا الجهاز',
  'settings.platform': 'المنصة',
  'settings.browser': 'المتصفح',
  'settings.network': 'الشبكة',
  'settings.online': 'متصل',
  'settings.offline': 'غير متصل',
  'settings.unknown': 'غير معروف',
  'settings.logOut': 'تسجيل الخروج',
  'settings.deleteAccount': 'حذف الحساب',
  'settings.changePasswordModal.title': 'تغيير كلمة المرور',
  'settings.changePasswordModal.error': 'فشل تغيير كلمة المرور.',
  'settings.changePasswordModal.currentPassword': 'كلمة المرور الحالية',
  'settings.changePasswordModal.newPassword': 'كلمة المرور الجديدة',
  'settings.changePasswordModal.changing': 'جارٍ التغيير...',
  'settings.deleteAccountModal.title': 'حذف الحساب',
  'settings.deleteAccountModal.warning':
    'لا يمكن التراجع عن هذا الإجراء. يرجى إدخال كلمة المرور للتأكيد.',
  'settings.deleteAccountModal.password': 'كلمة المرور',
  'settings.deleteAccountModal.deleting': 'جارٍ الحذف...',
  'settings.changePasswordModal.submit': 'تغيير كلمة المرور',
  'settings.deleteAccountModal.submit': 'حذف الحساب',
  'settings.failedToUpdateEmail': 'فشل تحديث البريد الإلكتروني.',
  'settings.failedToDeleteAccount': 'فشل حذف الحساب.',
  'settings.toggleTwoFactor': 'تبديل المصادقة الثنائية',
  'settings.togglePushNotifications': 'تبديل الإشعارات الفورية',

  // Footer
  'footer.about': 'حول {{appName}}',
  'footer.privacyPolicy': 'سياسة الخصوصية',
  'footer.termsOfService': 'شروط الخدمة',
  'footer.language': 'اللغة',

  // OAuth
  'oauth.orContinueWith': 'أو المتابعة باستخدام',
  'oauth.continueWith': 'المتابعة باستخدام {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'تبديل السمة',

  // User Menu
  'userMenu.open': 'فتح قائمة المستخدم',

  // Plan Updated
  'planUpdated.message': 'تم تحديث خطتك.',
  'planUpdated.thankYou': 'شكراً لك!',
  'planUpdated.returnHome': 'العودة للرئيسية',

  // PWA
  'pwa.updateAvailable': 'يتوفر إصدار جديد!',
  'pwa.update': 'تحديث',
  'pwa.updating': 'جارٍ التحديث...',

  // User API errors
  'user.error.badRequest': 'طلب غير صالح.',
  'user.error.notFound': 'غير موجود.',
  'user.error.failedToCreateSession': 'فشل إنشاء الجلسة.',
  'user.error.usernameRequired': 'اسم المستخدم مطلوب.',
  'user.error.passwordRequired': 'كلمة المرور مطلوبة.',
  'user.error.emailInvalid': 'البريد الإلكتروني غير صالح.',
  'user.error.usernameUnavailable': 'اسم المستخدم غير متاح.',
  'user.error.emailAlreadyRegistered': 'البريد الإلكتروني مسجل بالفعل.',
  'user.error.failedToHashPassword': 'فشل تشفير كلمة المرور.',
  'user.error.invalidCredentials': 'بيانات اعتماد غير صالحة.',
  'user.error.invalidTwoFactorToken': 'رمز التحقق الثنائي غير صالح.',
  'user.error.twoFactorVerificationUnavailable': 'التحقق الثنائي غير متاح.',
  'user.error.loginFailed': 'فشل تسجيل الدخول.',
  'user.error.usernameCannotBeEmpty': 'لا يمكن أن يكون اسم المستخدم فارغًا.',
  'user.error.failedToUpdateUser': 'فشل تحديث المستخدم.',
  'user.error.failedToDeleteUser': 'فشل حذف المستخدم.',
  'user.error.failedToReadUser': 'فشل قراءة المستخدم.',
  'user.error.emailRequired': 'البريد الإلكتروني مطلوب.',
  'user.error.failedToProcessPasswordReset': 'فشلت معالجة إعادة تعيين كلمة المرور.',
  'user.error.newPasswordRequired': 'كلمة المرور الجديدة مطلوبة.',
  'user.error.currentPasswordRequired': 'كلمة المرور الحالية مطلوبة.',
  'user.error.currentPasswordIncorrect': 'كلمة المرور الحالية غير صحيحة.',
  'user.error.failedToUpdatePassword': 'فشل تحديث كلمة المرور.',
  'user.error.planKeyRequired': 'مطلوب planKey.',
  'user.error.invalidPlan': 'خطة غير صالحة.',
  'user.error.failedToUpdateSubscription': 'فشل تحديث الاشتراك.',
  'user.error.failedToUpdatePlan': 'فشل تحديث الخطة.',
  'user.error.twoFactorNotAvailable': 'المصادقة الثنائية غير متاحة.',
  'user.error.tokenRequired': 'الرمز مطلوب.',
  'user.error.noPendingTwoFactorSetup': 'لا يوجد إعداد ثنائي معلق. اتصل بإجراء "setup" أولاً.',
  'user.error.invalidToken': 'رمز غير صالح.',
  'user.error.twoFactorNotEnabled': 'المصادقة الثنائية غير مفعلة.',
  'user.error.invalidAction': 'إجراء غير صالح. استخدم "setup" أو "enable" أو "disable".',
  'user.error.twoFactorOperationFailed': 'فشلت عملية المصادقة الثنائية.',
  'user.error.oauthServerNotConfigured': 'خادم OAuth "{{server}}" غير مكوّن.',
  'user.error.oauthVerificationFailed': 'فشل التحقق من OAuth.',
  'user.error.failedToCreateUser': 'فشل إنشاء المستخدم.',
  'user.error.oauthLoginFailed': 'فشل تسجيل الدخول عبر OAuth.',

  // Auth client errors
  'auth.error.requestFailed': 'فشل الطلب',
  'auth.error.loginFailed': 'فشل تسجيل الدخول',
  'auth.error.registrationFailed': 'فشل التسجيل',
  'auth.error.noRefreshToken': 'لا يوجد رمز تحديث متاح',

  // Form validation
  'forms.required': 'هذا الحقل مطلوب',
  'forms.min': 'يجب أن تكون القيمة {{min}} على الأقل',
  'forms.max': 'يجب أن تكون القيمة {{max}} على الأكثر',
  'forms.minLength': 'يجب أن يكون {{minLength}} أحرف على الأقل',
  'forms.maxLength': 'يجب أن يكون {{maxLength}} أحرف على الأكثر',
  'forms.invalidFormat': 'تنسيق غير صالح',
  'forms.invalidEmail': 'عنوان بريد إلكتروني غير صالح',
  'forms.invalidUrl': 'عنوان URL غير صالح',
  'forms.invalidValue': 'قيمة غير صالحة',

  // HTTP client errors
  'http.error.requestFailed': 'فشل الطلب بالحالة {{status}}.',
  'http.error.networkError': 'خطأ في الشبكة.',

  // Routing errors
  'routing.error.missingParam': 'المعامل "{{name}}" مفقود للمسار "{{pattern}}"',
  'routing.error.routeNotFound': 'المسار "{{name}}" غير موجود',
  'routing.error.useMoleculeRouterOutsideProvider':
    'يجب استخدام useMoleculeRouter داخل MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'الإشعارات الفورية غير مدعومة',
  'push.error.permissionNotGranted': 'لم يتم منح إذن الإشعارات',

  // Utility errors
  'error.networkError': 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
  'error.timeout': 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
  'error.unauthorized': 'غير مصرح لك بتنفيذ هذا الإجراء.',
  'error.forbidden': 'تم رفض الوصول.',
  'error.notFound': 'المورد غير موجود.',
  'error.validationError': 'يرجى التحقق من إدخالك والمحاولة مرة أخرى.',
  'error.serverError': 'خطأ في الخادم. يرجى المحاولة لاحقًا.',
  'error.unknown': 'حدث خطأ غير متوقع.',

  // AI conversation errors
  'conversation.error.messageRequired': 'الرسالة مطلوبة',
  'conversation.error.aiNotConfigured': 'لم يتم تكوين مزود الذكاء الاصطناعي',
  'conversation.error.unknownAiError': 'خطأ غير معروف في الذكاء الاصطناعي',
  'conversation.error.notFound': 'لم يتم العثور على محادثة',
  'conversation.error.streamError': 'خطأ في بث الذكاء الاصطناعي',

  // Resource errors
  'resource.error.unknownError': 'خطأ غير معروف.',
  'resource.error.unableToCreate': 'تعذر إنشاء {{name}}.',
  'resource.error.unableToUpdate': 'تعذر تحديث {{name}}.',
  'resource.error.unableToDelete': 'تعذر حذف {{name}}.',
  'resource.error.notFound': 'غير موجود.',
  'resource.error.badRequest': 'طلب غير صالح.',
  'resource.error.unauthorized': 'غير مصرح.',

  // Project errors
  'project.error.nameAndTypeRequired': 'مطلوب name و projectType',
  'project.error.notFound': 'غير موجود',

  // Device errors
  'device.error.unauthorized': 'غير مصرح.',
  'device.error.badRequest': 'طلب غير صالح.',
  'device.error.notFound': 'غير موجود.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'فشل في قراءة {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'فشل في كتابة {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'فشل في حذف {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'مزود الدفع مطلوب.',
  'user.payment.subscriptionIdRequired': 'مطلوب subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'مطلوب receipt و planKey.',
  'user.payment.verificationNotConfigured': 'لم يتم تكوين التحقق من الدفع لـ {{provider}}.',
  'user.payment.invalidPlan': 'خطة غير صالحة.',
  'user.payment.verificationFailed': 'فشل التحقق من الاشتراك.',
  'user.payment.unknownPlan': 'خطة غير معروفة.',
  'user.payment.invalidWebhookEvent': 'حدث خطاف غير صالح.',
}
