/**
 * Sinhala translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'පූරණය වෙමින්...',
  'common.saving': 'සුරකිමින්...',
  'common.close': 'වසන්න',
  'common.goBack': 'ආපසු යන්න',
  'common.submit': 'ඉදිරිපත් කරන්න',
  'common.continue': 'ඉදිරියට යන්න',

  // Auth - Login
  'auth.login.email': 'විද්‍යුත් තැපෑල',
  'auth.login.password': 'මුරපදය',
  'auth.login.twoFactor': 'ද්වි-සාධක ටෝකනය (සක්‍රිය නම්)',
  'auth.login.signUp': 'ලියාපදිංචි වන්න',
  'auth.login.loggingIn': 'පිවිසෙමින්...',
  'auth.login.logIn': 'පිවිසෙන්න',
  'auth.login.forgotPassword': 'මුරපදය අමතකද?',

  // Auth - Signup
  'auth.signup.email': 'විද්‍යුත් තැපෑල (අවශ්‍යයි)',
  'auth.signup.password': 'මුරපදය (අවශ්‍යයි)',
  'auth.signup.name': 'ඔබේ නම',
  'auth.signup.signingUp': 'ලියාපදිංචි වෙමින්...',
  'auth.signup.signUp': 'ලියාපදිංචි වන්න',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'එම විද්‍යුත් තැපෑලට ගිණුමක් තිබේ නම්, මුරපද යළි පිහිටුවීමේ සබැඳියක් යවා ඇත.',
  'auth.forgotPassword.email': 'විද්‍යුත් තැපෑල',
  'auth.forgotPassword.submitting': 'ඉදිරිපත් කරමින්...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'විද්‍යුත් තැපෑල',
  'auth.resetPassword.token': 'මුරපද යළි පිහිටුවීමේ ටෝකනය',
  'auth.resetPassword.newPassword': 'නව මුරපදය ඇතුළත් කරන්න',
  'auth.resetPassword.twoFactor': 'ද්වි-සාධක ටෝකනය (සක්‍රිය නම්)',
  'auth.resetPassword.loggingIn': 'පිවිසෙමින්...',
  'auth.resetPassword.submit': 'මුරපදය සකසා පිවිසෙන්න',

  // Home
  'home.greeting': 'ආයුබෝවන්, ',
  'home.world': 'ලෝකය',

  // Settings
  'settings.account': 'ගිණුම',
  'settings.email': 'විද්‍යුත් තැපෑල',
  'settings.authentication': 'සත්‍යාපනය',
  'settings.changePassword': 'මුරපදය වෙනස් කරන්න',
  'settings.twoFactor': 'ද්වි-සාධක සත්‍යාපනය',
  'settings.notifications': 'දැනුම්දීම්',
  'settings.pushNotifications': 'පුෂ් දැනුම්දීම්',
  'settings.billing': 'බිල්පත්කරණය',
  'settings.plan': 'සැලැස්ම: ',
  'settings.upgrade': 'උත්ශ්‍රේණි කරන්න',
  'settings.devices': 'උපාංග',
  'settings.noDevices': 'උපාංග හමු නොවීය',
  'settings.thisDevice': 'මෙම උපාංගය',
  'settings.platform': 'වේදිකාව',
  'settings.browser': 'බ්‍රවුසරය',
  'settings.network': 'ජාලය',
  'settings.online': 'සබැඳි',
  'settings.offline': 'නොබැඳි',
  'settings.unknown': 'නොදන්නා',
  'settings.logOut': 'පිටවන්න',
  'settings.deleteAccount': 'ගිණුම මකන්න',
  'settings.changePasswordModal.title': 'මුරපදය වෙනස් කරන්න',
  'settings.changePasswordModal.error': 'මුරපදය වෙනස් කිරීම අසාර්ථකයි.',
  'settings.changePasswordModal.currentPassword': 'වත්මන් මුරපදය',
  'settings.changePasswordModal.newPassword': 'නව මුරපදය',
  'settings.changePasswordModal.changing': 'වෙනස් කරමින්...',
  'settings.deleteAccountModal.title': 'ගිණුම මකන්න',
  'settings.deleteAccountModal.warning':
    'මෙම ක්‍රියාව අහෝසි කළ නොහැක. තහවුරු කිරීමට ඔබේ මුරපදය ඇතුළත් කරන්න.',
  'settings.deleteAccountModal.password': 'මුරපදය',
  'settings.deleteAccountModal.deleting': 'මකමින්...',
  'settings.changePasswordModal.submit': 'මුරපදය වෙනස් කරන්න',
  'settings.deleteAccountModal.submit': 'ගිණුම මකන්න',
  'settings.failedToUpdateEmail': 'ඊමේල් යාවත්කාලීන කිරීම අසාර්ථකයි.',
  'settings.failedToDeleteAccount': 'ගිණුම මකා දැමීම අසාර්ථකයි.',
  'settings.toggleTwoFactor': 'ද්වි-සාධක සත්‍යාපනය ටොගල් කරන්න',
  'settings.togglePushNotifications': 'පුෂ් දැනුම්දීම් ටොගල් කරන්න',

  // Footer
  'footer.about': '{{appName}} ගැන',
  'footer.privacyPolicy': 'පෞද්ගලිකත්ව ප්‍රතිපත්තිය',
  'footer.termsOfService': 'සේවා නියම',
  'footer.language': 'භාෂාව',

  // OAuth
  'oauth.orContinueWith': 'හෝ මේ සමඟ ඉදිරියට යන්න',
  'oauth.continueWith': '{{provider}} සමඟ ඉදිරියට යන්න',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'තේමාව මාරු කරන්න',

  // User Menu
  'userMenu.open': 'පරිශීලක මෙනුව විවෘත කරන්න',

  // Plan Updated
  'planUpdated.message': 'ඔබේ සැලැස්ම යාවත්කාලීන කරන ලදී.',
  'planUpdated.thankYou': 'ස්තූතියි!',
  'planUpdated.returnHome': 'මුල් පිටුවට ආපසු යන්න',

  // PWA
  'pwa.updateAvailable': 'නව අනුවාදය ලබා ගත හැක!',
  'pwa.update': 'යාවත්කාලීන කරන්න',
  'pwa.updating': 'යාවත්කාලීන වෙමින්...',

  // User API errors
  'user.error.badRequest': 'නරක ඉල්ලීමක්.',
  'user.error.notFound': 'හමු නොවීය.',
  'user.error.failedToCreateSession': 'සැසිය සෑදීමට අසමත් විය.',
  'user.error.usernameRequired': 'පරිශීලක නාමය අවශ්‍යයි.',
  'user.error.passwordRequired': 'මුරපදය අවශ්‍යයි.',
  'user.error.emailInvalid': 'ඊමේල් අවලංගුයි.',
  'user.error.usernameUnavailable': 'පරිශීලක නාමය නොමැත.',
  'user.error.emailAlreadyRegistered': 'ඊමේල් දැනටමත් ලියාපදිංචි වී ඇත.',
  'user.error.failedToHashPassword': 'මුරපදය හැෂ් කිරීමට අසමත් විය.',
  'user.error.invalidCredentials': 'අවලංගු අක්තපත්‍ර.',
  'user.error.invalidTwoFactorToken': 'අවලංගු ද්වි-සාධක ටෝකනය.',
  'user.error.twoFactorVerificationUnavailable': 'ද්වි-සාධක සත්‍යාපනය නොමැත.',
  'user.error.loginFailed': 'පිවිසීම අසාර්ථක විය.',
  'user.error.usernameCannotBeEmpty': 'පරිශීලක නාමය හිස් විය නොහැක.',
  'user.error.failedToUpdateUser': 'පරිශීලකයා යාවත්කාලීන කිරීමට අසමත් විය.',
  'user.error.failedToDeleteUser': 'පරිශීලකයා මකා දැමීමට අසමත් විය.',
  'user.error.failedToReadUser': 'පරිශීලකයා කියවීමට අසමත් විය.',
  'user.error.emailRequired': 'ඊමේල් අවශ්‍යයි.',
  'user.error.failedToProcessPasswordReset': 'මුරපද යළි පිහිටුවීම සැකසීමට අසමත් විය.',
  'user.error.newPasswordRequired': 'නව මුරපදය අවශ්‍යයි.',
  'user.error.currentPasswordRequired': 'වත්මන් මුරපදය අවශ්‍යයි.',
  'user.error.currentPasswordIncorrect': 'වත්මන් මුරපදය වැරදිය.',
  'user.error.failedToUpdatePassword': 'මුරපදය යාවත්කාලීන කිරීමට අසමත් විය.',
  'user.error.planKeyRequired': 'planKey අවශ්‍යයි.',
  'user.error.invalidPlan': 'අවලංගු සැලැස්ම.',
  'user.error.failedToUpdateSubscription': 'දායකත්වය යාවත්කාලීන කිරීමට අසමත් විය.',
  'user.error.failedToUpdatePlan': 'සැලැස්ම යාවත්කාලීන කිරීමට අසමත් විය.',
  'user.error.twoFactorNotAvailable': 'ද්වි-සාධක සත්‍යාපනය නොමැත.',
  'user.error.tokenRequired': 'ටෝකනය අවශ්‍යයි.',
  'user.error.noPendingTwoFactorSetup':
    'බලාපොරොත්තු වන ද්වි-සාධක සැකසුමක් නැත. පළමුව "setup" ක්‍රියාව සමග ඇමතන්න.',
  'user.error.invalidToken': 'අවලංගු ටෝකනය.',
  'user.error.twoFactorNotEnabled': 'ද්වි-සාධකය සක්‍රිය නැත.',
  'user.error.invalidAction': 'අවලංගු ක්‍රියාව. "setup", "enable", හෝ "disable" භාවිතා කරන්න.',
  'user.error.twoFactorOperationFailed': 'ද්වි-සාධක මෙහෙයුම අසාර්ථක විය.',
  'user.error.oauthServerNotConfigured': 'OAuth සේවාදායකය "{{server}}" වින්‍යාස කර නැත.',
  'user.error.oauthVerificationFailed': 'OAuth සත්‍යාපනය අසාර්ථක විය.',
  'user.error.failedToCreateUser': 'පරිශීලකයා සෑදීමට අසමත් විය.',
  'user.error.oauthLoginFailed': 'OAuth පිවිසීම අසාර්ථක විය.',

  // Auth client errors
  'auth.error.requestFailed': 'ඉල්ලීම අසාර්ථක විය',
  'auth.error.loginFailed': 'පිවිසීම අසාර්ථක විය',
  'auth.error.registrationFailed': 'ලියාපදිංචිය අසාර්ථක විය',
  'auth.error.noRefreshToken': 'නැවුම් ටෝකනයක් නොමැත',

  // Form validation
  'forms.required': 'මෙම ක්ෂේත්‍රය අවශ්‍යයි',
  'forms.min': 'අගය අවම වශයෙන් {{min}} විය යුතුය',
  'forms.max': 'අගය උපරිම වශයෙන් {{max}} විය යුතුය',
  'forms.minLength': 'අවම වශයෙන් අක්ෂර {{minLength}} ක් තිබිය යුතුය',
  'forms.maxLength': 'උපරිම වශයෙන් අක්ෂර {{maxLength}} ක් තිබිය යුතුය',
  'forms.invalidFormat': 'වලංගු නොවන ආකෘතිය',
  'forms.invalidEmail': 'වලංගු නොවන විද්‍යුත් තැපැල් ලිපිනය',
  'forms.invalidUrl': 'වලංගු නොවන URL',
  'forms.invalidValue': 'වලංගු නොවන අගය',

  // HTTP client errors
  'http.error.requestFailed': 'තත්ත්වය {{status}} සමග ඉල්ලීම අසාර්ථක විය.',
  'http.error.networkError': 'ජාල දෝෂයක්.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" මාර්ගය සඳහා "{{name}}" පරාමිතිය නැත',
  'routing.error.routeNotFound': '"{{name}}" මාර්ගය හමු නොවීය',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider තුළ භාවිතා කළ යුතුය',

  // Push notification errors
  'push.error.notSupported': 'පුෂ් දැනුම්දීම් සහාය නොදක්වයි',
  'push.error.permissionNotGranted': 'දැනුම්දීම් අවසරය ලබා දී නැත',

  // Utility errors
  'error.networkError': 'ජාල දෝෂයක්. ඔබේ සම්බන්ධතාවය පරීක්ෂා කරන්න.',
  'error.timeout': 'ඉල්ලීම කාලය ඉක්මවීය. නැවත උත්සාහ කරන්න.',
  'error.unauthorized': 'ඔබට මෙම ක්‍රියාව සිදු කිරීමට අධිකාරය නැත.',
  'error.forbidden': 'ප්‍රවේශය ප්‍රතික්ෂේප විය.',
  'error.notFound': 'සම්පත හමු නොවීය.',
  'error.validationError': 'ඔබේ ආදානය පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
  'error.serverError': 'සේවාදායක දෝෂයක්. පසුව නැවත උත්සාහ කරන්න.',
  'error.unknown': 'අනපේක්ෂිත දෝෂයක් ඇති විය.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message අවශ්‍යයි',
  'conversation.error.aiNotConfigured': 'AI සපයන්නා වින්‍යාස කර නැත',
  'conversation.error.unknownAiError': 'නොදන්නා AI දෝෂයක්',
  'conversation.error.notFound': 'සංවාදයක් හමු නොවීය',
  'conversation.error.streamError': 'AI ප්‍රවාහ දෝෂයක්',

  // Resource errors
  'resource.error.unknownError': 'නොදන්නා දෝෂයක්.',
  'resource.error.unableToCreate': '{{name}} සෑදීමට නොහැක.',
  'resource.error.unableToUpdate': '{{name}} යාවත්කාලීන කිරීමට නොහැක.',
  'resource.error.unableToDelete': '{{name}} මකා දැමීමට නොහැක.',
  'resource.error.notFound': 'හමු නොවීය.',
  'resource.error.badRequest': 'නරක ඉල්ලීමක්.',
  'resource.error.unauthorized': 'අනවසර.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name සහ projectType අවශ්‍යයි',
  'project.error.notFound': 'හමු නොවීය',

  // Device errors
  'device.error.unauthorized': 'අනවසරයි.',
  'device.error.badRequest': 'වැරදි ඉල්ලීමක්.',
  'device.error.notFound': 'සොයාගත නොහැක.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} කියවීමට අසමත් විය: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} ලිවීමට අසමත් විය: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} මකා දැමීමට අසමත් විය: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ගෙවීම් සපයන්නා අවශ්‍යයි.',
  'user.payment.subscriptionIdRequired': 'subscriptionId අවශ්‍යයි.',
  'user.payment.receiptAndPlanRequired': 'receipt සහ planKey අවශ්‍යයි.',
  'user.payment.verificationNotConfigured': '{{provider}} සඳහා ගෙවීම් සත්‍යාපනය වින්‍යාස කර නැත.',
  'user.payment.invalidPlan': 'අවලංගු සැලැස්ම.',
  'user.payment.verificationFailed': 'දායකත්වය සත්‍යාපනය කිරීමට අසමත් විය.',
  'user.payment.unknownPlan': 'නොදන්නා සැලැස්ම.',
  'user.payment.invalidWebhookEvent': 'අවලංගු වෙබ්හූක් සිදුවීම.',
}
