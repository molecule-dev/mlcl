/**
 * Hebrew translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'טוען...',
  'common.saving': 'שומר...',
  'common.close': 'סגור',
  'common.goBack': 'חזרה',
  'common.submit': 'שליחה',
  'common.continue': 'המשך',

  // Auth - Login
  'auth.login.email': 'אימייל',
  'auth.login.password': 'סיסמה',
  'auth.login.twoFactor': 'קוד אימות דו-שלבי (אם מופעל)',
  'auth.login.signUp': 'הרשמה',
  'auth.login.loggingIn': 'מתחבר...',
  'auth.login.logIn': 'התחברות',
  'auth.login.forgotPassword': 'שכחת סיסמה?',

  // Auth - Signup
  'auth.signup.email': 'אימייל (שדה חובה)',
  'auth.signup.password': 'סיסמה (שדה חובה)',
  'auth.signup.name': 'השם שלך',
  'auth.signup.signingUp': 'נרשם...',
  'auth.signup.signUp': 'הרשמה',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'אם קיים חשבון עם כתובת אימייל זו, נשלח קישור לאיפוס סיסמה.',
  'auth.forgotPassword.email': 'אימייל',
  'auth.forgotPassword.submitting': 'שולח...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'אימייל',
  'auth.resetPassword.token': 'קוד איפוס סיסמה',
  'auth.resetPassword.newPassword': 'הזן סיסמה חדשה',
  'auth.resetPassword.twoFactor': 'קוד אימות דו-שלבי (אם מופעל)',
  'auth.resetPassword.loggingIn': 'מתחבר...',
  'auth.resetPassword.submit': 'הגדר סיסמה והתחבר',

  // Home
  'home.greeting': 'שלום, ',
  'home.world': 'עולם',

  // Settings
  'settings.account': 'חשבון',
  'settings.email': 'אימייל',
  'settings.authentication': 'אימות',
  'settings.changePassword': 'שינוי סיסמה',
  'settings.twoFactor': 'אימות דו-שלבי',
  'settings.notifications': 'התראות',
  'settings.pushNotifications': 'התראות דחיפה',
  'settings.billing': 'חיוב',
  'settings.plan': 'מסלול: ',
  'settings.upgrade': 'שדרוג',
  'settings.devices': 'מכשירים',
  'settings.noDevices': 'לא נמצאו מכשירים',
  'settings.thisDevice': 'מכשיר זה',
  'settings.platform': 'פלטפורמה',
  'settings.browser': 'דפדפן',
  'settings.network': 'רשת',
  'settings.online': 'מחובר',
  'settings.offline': 'מנותק',
  'settings.unknown': 'לא ידוע',
  'settings.logOut': 'התנתקות',
  'settings.deleteAccount': 'מחיקת חשבון',
  'settings.changePasswordModal.title': 'שינוי סיסמה',
  'settings.changePasswordModal.error': 'שינוי הסיסמה נכשל.',
  'settings.changePasswordModal.currentPassword': 'סיסמה נוכחית',
  'settings.changePasswordModal.newPassword': 'סיסמה חדשה',
  'settings.changePasswordModal.changing': 'משנה...',
  'settings.deleteAccountModal.title': 'מחיקת חשבון',
  'settings.deleteAccountModal.warning':
    'לא ניתן לבטל פעולה זו. אנא הזן את הסיסמה שלך לאישור.',
  'settings.deleteAccountModal.password': 'סיסמה',
  'settings.deleteAccountModal.deleting': 'מוחק...',
  'settings.changePasswordModal.submit': 'שינוי סיסמה',
  'settings.deleteAccountModal.submit': 'מחיקת חשבון',
  'settings.failedToUpdateEmail': 'עדכון הדוא״ל נכשל.',
  'settings.failedToDeleteAccount': 'מחיקת החשבון נכשלה.',
  'settings.toggleTwoFactor': 'החלף אימות דו-שלבי',
  'settings.togglePushNotifications': 'החלף התראות דחיפה',

  // Footer
  'footer.about': 'אודות {{appName}}',
  'footer.privacyPolicy': 'מדיניות פרטיות',
  'footer.termsOfService': 'תנאי שימוש',
  'footer.language': 'שפה',

  // OAuth
  'oauth.orContinueWith': 'או המשך באמצעות',
  'oauth.continueWith': 'המשך באמצעות {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'החלפת ערכת נושא',

  // User Menu
  'userMenu.open': 'פתיחת תפריט משתמש',

  // Plan Updated
  'planUpdated.message': 'המסלול שלך עודכן.',
  'planUpdated.thankYou': 'תודה!',
  'planUpdated.returnHome': 'חזרה לדף הבית',

  // PWA
  'pwa.updateAvailable': 'גרסה חדשה זמינה!',
  'pwa.update': 'עדכן',
  'pwa.updating': 'מעדכן...',

  // User API errors
  'user.error.badRequest': 'בקשה שגויה.',
  'user.error.notFound': 'לא נמצא.',
  'user.error.failedToCreateSession': 'יצירת הפעלה נכשלה.',
  'user.error.usernameRequired': 'שם משתמש נדרש.',
  'user.error.passwordRequired': 'סיסמה נדרשת.',
  'user.error.emailInvalid': 'הדוא"ל אינו תקין.',
  'user.error.usernameUnavailable': 'שם המשתמש אינו זמין.',
  'user.error.emailAlreadyRegistered': 'הדוא"ל כבר רשום.',
  'user.error.failedToHashPassword': 'גיבוב הסיסמה נכשל.',
  'user.error.invalidCredentials': 'אישורים לא תקינים.',
  'user.error.invalidTwoFactorToken': 'אסימון דו-שלבי לא תקין.',
  'user.error.twoFactorVerificationUnavailable': 'אימות דו-שלבי אינו זמין.',
  'user.error.loginFailed': 'ההתחברות נכשלה.',
  'user.error.usernameCannotBeEmpty': 'שם המשתמש לא יכול להיות ריק.',
  'user.error.failedToUpdateUser': 'עדכון המשתמש נכשל.',
  'user.error.failedToDeleteUser': 'מחיקת המשתמש נכשלה.',
  'user.error.failedToReadUser': 'קריאת המשתמש נכשלה.',
  'user.error.emailRequired': 'דוא"ל נדרש.',
  'user.error.failedToProcessPasswordReset': 'עיבוד איפוס הסיסמה נכשל.',
  'user.error.newPasswordRequired': 'סיסמה חדשה נדרשת.',
  'user.error.currentPasswordRequired': 'הסיסמה הנוכחית נדרשת.',
  'user.error.currentPasswordIncorrect': 'הסיסמה הנוכחית שגויה.',
  'user.error.failedToUpdatePassword': 'עדכון הסיסמה נכשל.',
  'user.error.planKeyRequired': 'נדרש planKey.',
  'user.error.invalidPlan': 'תוכנית לא תקינה.',
  'user.error.failedToUpdateSubscription': 'עדכון המנוי נכשל.',
  'user.error.failedToUpdatePlan': 'עדכון התוכנית נכשל.',
  'user.error.twoFactorNotAvailable': 'אימות דו-שלבי אינו זמין.',
  'user.error.tokenRequired': 'אסימון נדרש.',
  'user.error.noPendingTwoFactorSetup': 'אין הגדרה דו-שלבית ממתינה. התקשר עם פעולת "setup" תחילה.',
  'user.error.invalidToken': 'אסימון לא תקין.',
  'user.error.twoFactorNotEnabled': 'אימות דו-שלבי אינו מופעל.',
  'user.error.invalidAction': 'פעולה לא תקינה. השתמש ב-"setup", "enable" או "disable".',
  'user.error.twoFactorOperationFailed': 'פעולת האימות הדו-שלבי נכשלה.',
  'user.error.oauthServerNotConfigured': 'שרת OAuth "{{server}}" אינו מוגדר.',
  'user.error.oauthVerificationFailed': 'אימות OAuth נכשל.',
  'user.error.failedToCreateUser': 'יצירת המשתמש נכשלה.',
  'user.error.oauthLoginFailed': 'התחברות OAuth נכשלה.',

  // Auth client errors
  'auth.error.requestFailed': 'הבקשה נכשלה',
  'auth.error.loginFailed': 'ההתחברות נכשלה',
  'auth.error.registrationFailed': 'ההרשמה נכשלה',
  'auth.error.noRefreshToken': 'אין אסימון רענון זמין',

  // Form validation
  'forms.required': 'שדה זה הוא חובה',
  'forms.min': 'הערך חייב להיות לפחות {{min}}',
  'forms.max': 'הערך חייב להיות לכל היותר {{max}}',
  'forms.minLength': 'חייב להכיל לפחות {{minLength}} תווים',
  'forms.maxLength': 'חייב להכיל לכל היותר {{maxLength}} תווים',
  'forms.invalidFormat': 'פורמט לא חוקי',
  'forms.invalidEmail': 'כתובת אימייל לא חוקית',
  'forms.invalidUrl': 'URL לא חוקי',
  'forms.invalidValue': 'ערך לא חוקי',

  // HTTP client errors
  'http.error.requestFailed': 'הבקשה נכשלה עם סטטוס {{status}}.',
  'http.error.networkError': 'שגיאת רשת.',

  // Routing errors
  'routing.error.missingParam': 'פרמטר "{{name}}" חסר עבור נתיב "{{pattern}}"',
  'routing.error.routeNotFound': 'הנתיב "{{name}}" לא נמצא',
  'routing.error.useMoleculeRouterOutsideProvider':
    'יש להשתמש ב-useMoleculeRouter בתוך MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'התראות דחיפה אינן נתמכות',
  'push.error.permissionNotGranted': 'הרשאת התראות לא ניתנה',

  // Utility errors
  'error.networkError': 'שגיאת רשת. אנא בדוק את החיבור שלך.',
  'error.timeout': 'זמן הבקשה פג. אנא נסה שוב.',
  'error.unauthorized': 'אינך מורשה לבצע פעולה זו.',
  'error.forbidden': 'הגישה נדחתה.',
  'error.notFound': 'המשאב לא נמצא.',
  'error.validationError': 'אנא בדוק את הקלט שלך ונסה שוב.',
  'error.serverError': 'שגיאת שרת. אנא נסה שוב מאוחר יותר.',
  'error.unknown': 'אירעה שגיאה בלתי צפויה.',

  // AI conversation errors
  'conversation.error.messageRequired': 'נדרשת הודעה',
  'conversation.error.aiNotConfigured': 'ספק AI לא הוגדר',
  'conversation.error.unknownAiError': 'שגיאת AI לא ידועה',
  'conversation.error.notFound': 'לא נמצאה שיחה',
  'conversation.error.streamError': 'שגיאת הזרמת AI',

  // Resource errors
  'resource.error.unknownError': 'שגיאה לא ידועה.',
  'resource.error.unableToCreate': 'לא ניתן ליצור את {{name}}.',
  'resource.error.unableToUpdate': 'לא ניתן לעדכן את {{name}}.',
  'resource.error.unableToDelete': 'לא ניתן למחוק את {{name}}.',
  'resource.error.notFound': 'לא נמצא.',
  'resource.error.badRequest': 'בקשה שגויה.',
  'resource.error.unauthorized': 'לא מורשה.',

  // Project errors
  'project.error.nameAndTypeRequired': 'נדרשים name ו-projectType',
  'project.error.notFound': 'לא נמצא',

  // Device errors
  'device.error.unauthorized': 'לא מורשה.',
  'device.error.badRequest': 'בקשה שגויה.',
  'device.error.notFound': 'לא נמצא.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'נכשל בקריאת {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'נכשל בכתיבת {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'נכשל במחיקת {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'נדרש ספק תשלום.',
  'user.payment.subscriptionIdRequired': 'נדרש subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'נדרשים receipt ו-planKey.',
  'user.payment.verificationNotConfigured': 'אימות תשלום לא הוגדר עבור {{provider}}.',
  'user.payment.invalidPlan': 'תוכנית לא תקינה.',
  'user.payment.verificationFailed': 'אימות המנוי נכשל.',
  'user.payment.unknownPlan': 'תוכנית לא ידועה.',
  'user.payment.invalidWebhookEvent': 'אירוע webhook לא תקין.',
}
