/**
 * Amharic translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'በመጫን ላይ...',
  'common.saving': 'በማስቀመጥ ላይ...',
  'common.close': 'ዝጋ',
  'common.goBack': 'ተመለስ',
  'common.submit': 'አስገባ',
  'common.continue': 'ቀጥል',

  // Auth - Login
  'auth.login.email': 'ኢሜይል',
  'auth.login.password': 'የይለፍ ቃል',
  'auth.login.twoFactor': 'ባለሁለት-ደረጃ ማረጋገጫ ቶከን (ከነቃ)',
  'auth.login.signUp': 'ተመዝገብ',
  'auth.login.loggingIn': 'በመግባት ላይ...',
  'auth.login.logIn': 'ግባ',
  'auth.login.forgotPassword': 'የይለፍ ቃልዎን ረሱ?',

  // Auth - Signup
  'auth.signup.email': 'ኢሜይል (ያስፈልጋል)',
  'auth.signup.password': 'የይለፍ ቃል (ያስፈልጋል)',
  'auth.signup.name': 'ስምዎ',
  'auth.signup.signingUp': 'በመመዝገብ ላይ...',
  'auth.signup.signUp': 'ተመዝገብ',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'በዚያ ኢሜይል መለያ ካለ፣ የይለፍ ቃል ዳግም ማቀናበሪያ አገናኝ ተልኳል።',
  'auth.forgotPassword.email': 'ኢሜይል',
  'auth.forgotPassword.submitting': 'በማስገባት ላይ...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ኢሜይል',
  'auth.resetPassword.token': 'የይለፍ ቃል ዳግም ማቀናበሪያ ቶከን',
  'auth.resetPassword.newPassword': 'አዲስ የይለፍ ቃል ያስገቡ',
  'auth.resetPassword.twoFactor': 'ባለሁለት-ደረጃ ማረጋገጫ ቶከን (ከነቃ)',
  'auth.resetPassword.loggingIn': 'በመግባት ላይ...',
  'auth.resetPassword.submit': 'የይለፍ ቃል አዘጋጅ እና ግባ',

  // Home
  'home.greeting': 'ሰላም፣ ',
  'home.world': 'ዓለም',

  // Settings
  'settings.account': 'መለያ',
  'settings.email': 'ኢሜይል',
  'settings.authentication': 'ማረጋገጫ',
  'settings.changePassword': 'የይለፍ ቃል ቀይር',
  'settings.twoFactor': 'ባለሁለት-ደረጃ ማረጋገጫ',
  'settings.notifications': 'ማሳወቂያዎች',
  'settings.pushNotifications': 'የግፋ ማሳወቂያዎች',
  'settings.billing': 'ክፍያ',
  'settings.plan': 'እቅድ: ',
  'settings.upgrade': 'አሻሽል',
  'settings.devices': 'መሣሪያዎች',
  'settings.noDevices': 'ምንም መሣሪያ አልተገኘም',
  'settings.thisDevice': 'ይህ መሣሪያ',
  'settings.platform': 'መድረክ',
  'settings.browser': 'አሳሽ',
  'settings.network': 'አውታረ መረብ',
  'settings.online': 'በመስመር ላይ',
  'settings.offline': 'ከመስመር ውጭ',
  'settings.unknown': 'ያልታወቀ',
  'settings.logOut': 'ውጣ',
  'settings.deleteAccount': 'መለያ ሰርዝ',
  'settings.changePasswordModal.title': 'የይለፍ ቃል ቀይር',
  'settings.changePasswordModal.error': 'የይለፍ ቃል መቀየር አልተሳካም።',
  'settings.changePasswordModal.currentPassword': 'የአሁኑ የይለፍ ቃል',
  'settings.changePasswordModal.newPassword': 'አዲስ የይለፍ ቃል',
  'settings.changePasswordModal.changing': 'በመቀየር ላይ...',
  'settings.deleteAccountModal.title': 'መለያ ሰርዝ',
  'settings.deleteAccountModal.warning':
    'ይህ ድርጊት ሊቀለበስ አይችልም። እባክዎ ለማረጋገጥ የይለፍ ቃልዎን ያስገቡ።',
  'settings.deleteAccountModal.password': 'የይለፍ ቃል',
  'settings.deleteAccountModal.deleting': 'በመሰረዝ ላይ...',
  'settings.changePasswordModal.submit': 'የይለፍ ቃል ቀይር',
  'settings.deleteAccountModal.submit': 'መለያ ሰርዝ',
  'settings.failedToUpdateEmail': 'ኢሜልን ማዘመን አልተሳካም።',
  'settings.failedToDeleteAccount': 'መለያን መሰረዝ አልተሳካም።',
  'settings.toggleTwoFactor': 'ባለሁለት-ደረጃ ማረጋገጫ ቀያይር',
  'settings.togglePushNotifications': 'የግፋ ማሳወቂያዎችን ቀያይር',

  // Footer
  'footer.about': 'ስለ {{appName}}',
  'footer.privacyPolicy': 'የግላዊነት ፖሊሲ',
  'footer.termsOfService': 'የአገልግሎት ውል',
  'footer.language': 'ቋንቋ',

  // OAuth
  'oauth.orContinueWith': 'ወይም ቀጥል በ',
  'oauth.continueWith': 'በ{{provider}} ቀጥል',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'ገጽታ ቀይር',

  // User Menu
  'userMenu.open': 'የተጠቃሚ ምናሌ ክፈት',

  // Plan Updated
  'planUpdated.message': 'እቅድዎ ተዘምኗል።',
  'planUpdated.thankYou': 'አመሰግናለሁ!',
  'planUpdated.returnHome': 'ወደ መነሻ ተመለስ',

  // PWA
  'pwa.updateAvailable': 'አዲስ ስሪት ይገኛል!',
  'pwa.update': 'አዘምን',
  'pwa.updating': 'በማዘመን ላይ...',

  // User API errors
  'user.error.badRequest': 'ልክ ያልሆነ ጥያቄ።',
  'user.error.notFound': 'አልተገኘም።',
  'user.error.failedToCreateSession': 'ክፍለ ጊዜ መፍጠር አልተሳካም።',
  'user.error.usernameRequired': 'የተጠቃሚ ስም ያስፈልጋል።',
  'user.error.passwordRequired': 'የይለፍ ቃል ያስፈልጋል።',
  'user.error.emailInvalid': 'ኢሜይል ልክ ያልሆነ ነው።',
  'user.error.usernameUnavailable': 'የተጠቃሚ ስም አይገኝም።',
  'user.error.emailAlreadyRegistered': 'ኢሜይል ቀድሞ ተመዝግቧል።',
  'user.error.failedToHashPassword': 'የይለፍ ቃልን ማሰወር አልተሳካም።',
  'user.error.invalidCredentials': 'ልክ ያልሆኑ ምስክርነቶች።',
  'user.error.invalidTwoFactorToken': 'ልክ ያልሆነ ባለሁለት ደረጃ ቶከን።',
  'user.error.twoFactorVerificationUnavailable': 'ባለሁለት ደረጃ ማረጋገጫ አይገኝም።',
  'user.error.loginFailed': 'መግባት አልተሳካም።',
  'user.error.usernameCannotBeEmpty': 'የተጠቃሚ ስም ባዶ መሆን አይችልም።',
  'user.error.failedToUpdateUser': 'ተጠቃሚን ማዘመን አልተሳካም።',
  'user.error.failedToDeleteUser': 'ተጠቃሚን መሰረዝ አልተሳካም።',
  'user.error.failedToReadUser': 'ተጠቃሚን ማንበብ አልተሳካም።',
  'user.error.emailRequired': 'ኢሜይል ያስፈልጋል።',
  'user.error.failedToProcessPasswordReset': 'የይለፍ ቃል ዳግም ማስጀመርን ማስኬድ አልተሳካም።',
  'user.error.newPasswordRequired': 'አዲስ የይለፍ ቃል ያስፈልጋል።',
  'user.error.currentPasswordRequired': 'የአሁኑ የይለፍ ቃል ያስፈልጋል።',
  'user.error.currentPasswordIncorrect': 'የአሁኑ የይለፍ ቃል ትክክል አይደለም።',
  'user.error.failedToUpdatePassword': 'የይለፍ ቃልን ማዘመን አልተሳካም።',
  'user.error.planKeyRequired': 'planKey ያስፈልጋል።',
  'user.error.invalidPlan': 'ልክ ያልሆነ ዕቅድ።',
  'user.error.failedToUpdateSubscription': 'ምዝገባን ማዘመን አልተሳካም።',
  'user.error.failedToUpdatePlan': 'ዕቅድን ማዘመን አልተሳካም።',
  'user.error.twoFactorNotAvailable': 'ባለሁለት ደረጃ ማረጋገጫ አይገኝም።',
  'user.error.tokenRequired': 'ቶከን ያስፈልጋል።',
  'user.error.noPendingTwoFactorSetup':
    'ምንም በመጠባበቅ ላይ ያለ ባለሁለት ደረጃ ማዋቀር የለም። በ"setup" ድርጊት መጀመሪያ ይደውሉ።',
  'user.error.invalidToken': 'ልክ ያልሆነ ቶከን።',
  'user.error.twoFactorNotEnabled': 'ባለሁለት ደረጃ አልነቃም።',
  'user.error.invalidAction': 'ልክ ያልሆነ ድርጊት። "setup"፣ "enable" ወይም "disable" ይጠቀሙ።',
  'user.error.twoFactorOperationFailed': 'ባለሁለት ደረጃ ስራ አልተሳካም።',
  'user.error.oauthServerNotConfigured': 'OAuth አገልጋይ "{{server}}" አልተዋቀረም።',
  'user.error.oauthVerificationFailed': 'OAuth ማረጋገጫ አልተሳካም።',
  'user.error.failedToCreateUser': 'ተጠቃሚን መፍጠር አልተሳካም።',
  'user.error.oauthLoginFailed': 'OAuth መግቢያ አልተሳካም።',

  // Auth client errors
  'auth.error.requestFailed': 'ጥያቄ አልተሳካም',
  'auth.error.loginFailed': 'መግባት አልተሳካም',
  'auth.error.registrationFailed': 'ምዝገባ አልተሳካም',
  'auth.error.noRefreshToken': 'ምንም የማደስ ቶከን የለም',

  // Form validation
  'forms.required': 'ይህ መስክ አስፈላጊ ነው',
  'forms.min': 'ዋጋው ቢያንስ {{min}} መሆን አለበት',
  'forms.max': 'ዋጋው ቢበዛ {{max}} መሆን አለበት',
  'forms.minLength': 'ቢያንስ {{minLength}} ቁምፊዎች መሆን አለበት',
  'forms.maxLength': 'ቢበዛ {{maxLength}} ቁምፊዎች መሆን አለበት',
  'forms.invalidFormat': 'ልክ ያልሆነ ቅርጸት',
  'forms.invalidEmail': 'ልክ ያልሆነ የኢሜል አድራሻ',
  'forms.invalidUrl': 'ልክ ያልሆነ URL',
  'forms.invalidValue': 'ልክ ያልሆነ ዋጋ',

  // HTTP client errors
  'http.error.requestFailed': 'ጥያቄ በሁኔታ {{status}} አልተሳካም።',
  'http.error.networkError': 'የአውታረ መረብ ስህተት።',

  // Routing errors
  'routing.error.missingParam': 'ለመንገድ "{{pattern}}" "{{name}}" መለኪያ የለም',
  'routing.error.routeNotFound': '"{{name}}" መንገድ አልተገኘም',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter በ MoleculeRouterProvider ውስጥ መጠቀም አለበት',

  // Push notification errors
  'push.error.notSupported': 'የማሳወቂያ ግፊት አይደገፍም',
  'push.error.permissionNotGranted': 'የማሳወቂያ ፈቃድ አልተሰጠም',

  // Utility errors
  'error.networkError': 'የአውታረ መረብ ስህተት። እባክዎ ግንኙነትዎን ያረጋግጡ።',
  'error.timeout': 'የጥያቄ ጊዜ አልፏል። እባክዎ እንደገና ይሞክሩ።',
  'error.unauthorized': 'ይህን ድርጊት ለመፈጸም ስልጣን የለዎትም።',
  'error.forbidden': 'መዳረሻ ተከልክሏል።',
  'error.notFound': 'ንብረት አልተገኘም።',
  'error.validationError': 'እባክዎ ግብዓትዎን ያረጋግጡ እና እንደገና ይሞክሩ።',
  'error.serverError': 'የአገልጋይ ስህተት። እባክዎ ቆይተው እንደገና ይሞክሩ።',
  'error.unknown': 'ያልተጠበቀ ስህተት ተከስቷል።',

  // AI conversation errors
  'conversation.error.messageRequired': 'መልእክት ያስፈልጋል',
  'conversation.error.aiNotConfigured': 'የAI አቅራቢ አልተዋቀረም',
  'conversation.error.unknownAiError': 'ያልታወቀ የAI ስህተት',
  'conversation.error.notFound': 'ምንም ውይይት አልተገኘም',
  'conversation.error.streamError': 'የAI ዥረት ስህተት',

  // Resource errors
  'resource.error.unknownError': 'ያልታወቀ ስህተት።',
  'resource.error.unableToCreate': '{{name}}ን መፍጠር አልተቻለም።',
  'resource.error.unableToUpdate': '{{name}}ን ማዘመን አልተቻለም።',
  'resource.error.unableToDelete': '{{name}}ን መሰረዝ አልተቻለም።',
  'resource.error.notFound': 'አልተገኘም።',
  'resource.error.badRequest': 'ልክ ያልሆነ ጥያቄ።',
  'resource.error.unauthorized': 'ያልተፈቀደ።',

  // Project errors
  'project.error.nameAndTypeRequired': 'ስም እና projectType ያስፈልጋሉ',
  'project.error.notFound': 'አልተገኘም',

  // Device errors
  'device.error.unauthorized': 'ያልተፈቀደ።',
  'device.error.badRequest': 'መጥፎ ጥያቄ።',
  'device.error.notFound': 'አልተገኘም።',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} ማንበብ አልተሳካም: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} መጻፍ አልተሳካም: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} መሰረዝ አልተሳካም: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'የክፍያ አቅራቢ ያስፈልጋል።',
  'user.payment.subscriptionIdRequired': 'subscriptionId ያስፈልጋል።',
  'user.payment.receiptAndPlanRequired': 'ደረሰኝ እና planKey ያስፈልጋሉ።',
  'user.payment.verificationNotConfigured': 'የክፍያ ማረጋገጫ ለ{{provider}} አልተዋቀረም።',
  'user.payment.invalidPlan': 'ልክ ያልሆነ ዕቅድ።',
  'user.payment.verificationFailed': 'ምዝገባን ማረጋገጥ አልተሳካም።',
  'user.payment.unknownPlan': 'ያልታወቀ ዕቅድ።',
  'user.payment.invalidWebhookEvent': 'ልክ ያልሆነ የዌብሁክ ክስተት።',
}
