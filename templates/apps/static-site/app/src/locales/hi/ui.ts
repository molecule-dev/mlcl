/**
 * Hindi translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'लोड हो रहा है...',
  'common.saving': 'सहेजा जा रहा है...',
  'common.close': 'बंद करें',
  'common.goBack': 'वापस जाएं',
  'common.submit': 'जमा करें',
  'common.continue': 'जारी रखें',

  // Auth - Login
  'auth.login.email': 'ईमेल',
  'auth.login.password': 'पासवर्ड',
  'auth.login.twoFactor': 'दो-कारक टोकन (यदि सक्षम हो)',
  'auth.login.signUp': 'साइन अप करें',
  'auth.login.loggingIn': 'लॉग इन हो रहा है...',
  'auth.login.logIn': 'लॉग इन करें',
  'auth.login.forgotPassword': 'पासवर्ड भूल गए?',

  // Auth - Signup
  'auth.signup.email': 'ईमेल (आवश्यक)',
  'auth.signup.password': 'पासवर्ड (आवश्यक)',
  'auth.signup.name': 'आपका नाम',
  'auth.signup.signingUp': 'साइन अप हो रहा है...',
  'auth.signup.signUp': 'साइन अप करें',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'यदि उस ईमेल से कोई खाता मौजूद है, तो पासवर्ड रीसेट लिंक भेजा गया है।',
  'auth.forgotPassword.email': 'ईमेल',
  'auth.forgotPassword.submitting': 'भेजा जा रहा है...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ईमेल',
  'auth.resetPassword.token': 'पासवर्ड रीसेट टोकन',
  'auth.resetPassword.newPassword': 'नया पासवर्ड',
  'auth.resetPassword.twoFactor': 'दो-कारक टोकन (यदि सक्षम हो)',
  'auth.resetPassword.loggingIn': 'लॉग इन हो रहा है...',
  'auth.resetPassword.submit': 'पासवर्ड सेट करें और लॉग इन करें',

  // Home
  'home.greeting': 'नमस्ते, ',
  'home.world': 'दुनिया',

  // Settings
  'settings.account': 'खाता',
  'settings.email': 'ईमेल',
  'settings.authentication': 'प्रमाणीकरण',
  'settings.changePassword': 'पासवर्ड बदलें',
  'settings.twoFactor': 'दो-कारक प्रमाणीकरण',
  'settings.notifications': 'सूचनाएं',
  'settings.pushNotifications': 'पुश सूचनाएं',
  'settings.billing': 'बिलिंग',
  'settings.plan': 'योजना: ',
  'settings.upgrade': 'अपग्रेड करें',
  'settings.devices': 'डिवाइस',
  'settings.noDevices': 'कोई डिवाइस नहीं मिला',
  'settings.thisDevice': 'यह डिवाइस',
  'settings.platform': 'प्लेटफॉर्म',
  'settings.browser': 'ब्राउज़र',
  'settings.network': 'नेटवर्क',
  'settings.online': 'ऑनलाइन',
  'settings.offline': 'ऑफलाइन',
  'settings.unknown': 'अज्ञात',
  'settings.logOut': 'लॉग आउट',
  'settings.deleteAccount': 'खाता हटाएं',
  'settings.changePasswordModal.title': 'पासवर्ड बदलें',
  'settings.changePasswordModal.error': 'पासवर्ड बदलने में विफल।',
  'settings.changePasswordModal.currentPassword': 'वर्तमान पासवर्ड',
  'settings.changePasswordModal.newPassword': 'नया पासवर्ड',
  'settings.changePasswordModal.changing': 'बदला जा रहा है...',
  'settings.deleteAccountModal.title': 'खाता हटाएं',
  'settings.deleteAccountModal.warning':
    'यह क्रिया पूर्ववत नहीं की जा सकती। पुष्टि के लिए अपना पासवर्ड दर्ज करें।',
  'settings.deleteAccountModal.password': 'पासवर्ड',
  'settings.deleteAccountModal.deleting': 'हटाया जा रहा है...',
  'settings.changePasswordModal.submit': 'पासवर्ड बदलें',
  'settings.deleteAccountModal.submit': 'खाता हटाएं',
  'settings.failedToUpdateEmail': 'ईमेल अपडेट करने में विफल।',
  'settings.failedToDeleteAccount': 'खाता हटाने में विफल।',
  'settings.toggleTwoFactor': 'दो-कारक प्रमाणीकरण टॉगल करें',
  'settings.togglePushNotifications': 'पुश सूचनाएं टॉगल करें',

  // Footer
  'footer.about': '{{appName}} के बारे में',
  'footer.privacyPolicy': 'गोपनीयता नीति',
  'footer.termsOfService': 'सेवा की शर्तें',
  'footer.language': 'भाषा',

  // OAuth
  'oauth.orContinueWith': 'या इसके साथ जारी रखें',
  'oauth.continueWith': '{{provider}} के साथ जारी रखें',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'थीम बदलें',

  // User Menu
  'userMenu.open': 'उपयोगकर्ता मेनू खोलें',

  // Plan Updated
  'planUpdated.message': 'आपकी योजना अपडेट कर दी गई है।',
  'planUpdated.thankYou': 'धन्यवाद!',
  'planUpdated.returnHome': 'होम पर लौटें',

  // PWA
  'pwa.updateAvailable': 'नया संस्करण उपलब्ध है!',
  'pwa.update': 'अपडेट करें',
  'pwa.updating': 'अपडेट हो रहा है...',

  // User API errors
  'user.error.badRequest': 'खराब अनुरोध।',
  'user.error.notFound': 'नहीं मिला।',
  'user.error.failedToCreateSession': 'सत्र बनाने में विफल।',
  'user.error.usernameRequired': 'उपयोगकर्ता नाम आवश्यक है।',
  'user.error.passwordRequired': 'पासवर्ड आवश्यक है।',
  'user.error.emailInvalid': 'ईमेल अमान्य है।',
  'user.error.usernameUnavailable': 'उपयोगकर्ता नाम अनुपलब्ध है।',
  'user.error.emailAlreadyRegistered': 'ईमेल पहले से पंजीकृत है।',
  'user.error.failedToHashPassword': 'पासवर्ड हैश करने में विफल।',
  'user.error.invalidCredentials': 'अमान्य क्रेडेंशियल।',
  'user.error.invalidTwoFactorToken': 'अमान्य दो-कारक टोकन।',
  'user.error.twoFactorVerificationUnavailable': 'दो-कारक सत्यापन अनुपलब्ध।',
  'user.error.loginFailed': 'लॉगिन विफल।',
  'user.error.usernameCannotBeEmpty': 'उपयोगकर्ता नाम खाली नहीं हो सकता।',
  'user.error.failedToUpdateUser': 'उपयोगकर्ता अपडेट करने में विफल।',
  'user.error.failedToDeleteUser': 'उपयोगकर्ता हटाने में विफल।',
  'user.error.failedToReadUser': 'उपयोगकर्ता पढ़ने में विफल।',
  'user.error.emailRequired': 'ईमेल आवश्यक है।',
  'user.error.failedToProcessPasswordReset': 'पासवर्ड रीसेट प्रक्रिया में विफल।',
  'user.error.newPasswordRequired': 'नया पासवर्ड आवश्यक है।',
  'user.error.currentPasswordRequired': 'वर्तमान पासवर्ड आवश्यक है।',
  'user.error.currentPasswordIncorrect': 'वर्तमान पासवर्ड गलत है।',
  'user.error.failedToUpdatePassword': 'पासवर्ड अपडेट करने में विफल।',
  'user.error.planKeyRequired': 'planKey आवश्यक है।',
  'user.error.invalidPlan': 'अमान्य प्लान।',
  'user.error.failedToUpdateSubscription': 'सब्सक्रिप्शन अपडेट करने में विफल।',
  'user.error.failedToUpdatePlan': 'प्लान अपडेट करने में विफल।',
  'user.error.twoFactorNotAvailable': 'दो-कारक प्रमाणीकरण उपलब्ध नहीं है।',
  'user.error.tokenRequired': 'टोकन आवश्यक है।',
  'user.error.noPendingTwoFactorSetup':
    'कोई लंबित दो-कारक सेटअप नहीं। पहले "setup" एक्शन के साथ कॉल करें।',
  'user.error.invalidToken': 'अमान्य टोकन।',
  'user.error.twoFactorNotEnabled': 'दो-कारक सक्षम नहीं है।',
  'user.error.invalidAction': 'अमान्य एक्शन। "setup", "enable", या "disable" उपयोग करें।',
  'user.error.twoFactorOperationFailed': 'दो-कारक ऑपरेशन विफल।',
  'user.error.oauthServerNotConfigured': 'OAuth सर्वर "{{server}}" कॉन्फ़िगर नहीं है।',
  'user.error.oauthVerificationFailed': 'OAuth सत्यापन विफल।',
  'user.error.failedToCreateUser': 'उपयोगकर्ता बनाने में विफल।',
  'user.error.oauthLoginFailed': 'OAuth लॉगिन विफल।',

  // Auth client errors
  'auth.error.requestFailed': 'अनुरोध विफल',
  'auth.error.loginFailed': 'लॉगिन विफल',
  'auth.error.registrationFailed': 'पंजीकरण विफल',
  'auth.error.noRefreshToken': 'कोई रिफ़्रेश टोकन उपलब्ध नहीं',

  // Form validation
  'forms.required': 'यह फ़ील्ड आवश्यक है',
  'forms.min': 'मान कम से कम {{min}} होना चाहिए',
  'forms.max': 'मान अधिकतम {{max}} होना चाहिए',
  'forms.minLength': 'कम से कम {{minLength}} वर्ण होने चाहिए',
  'forms.maxLength': 'अधिकतम {{maxLength}} वर्ण होने चाहिए',
  'forms.invalidFormat': 'अमान्य प्रारूप',
  'forms.invalidEmail': 'अमान्य ईमेल पता',
  'forms.invalidUrl': 'अमान्य URL',
  'forms.invalidValue': 'अमान्य मान',

  // HTTP client errors
  'http.error.requestFailed': 'स्टेटस {{status}} के साथ अनुरोध विफल।',
  'http.error.networkError': 'नेटवर्क त्रुटि।',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" पथ के लिए "{{name}}" पैरामीटर गायब है',
  'routing.error.routeNotFound': 'रूट "{{name}}" नहीं मिला',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter का उपयोग MoleculeRouterProvider के अंदर किया जाना चाहिए',

  // Push notification errors
  'push.error.notSupported': 'पुश सूचनाएँ समर्थित नहीं हैं',
  'push.error.permissionNotGranted': 'सूचना अनुमति नहीं दी गई',

  // Utility errors
  'error.networkError': 'नेटवर्क त्रुटि। अपना कनेक्शन जाँचें।',
  'error.timeout': 'अनुरोध का समय समाप्त। पुनः प्रयास करें।',
  'error.unauthorized': 'आप यह कार्य करने के लिए अधिकृत नहीं हैं।',
  'error.forbidden': 'पहुँच अस्वीकृत।',
  'error.notFound': 'संसाधन नहीं मिला।',
  'error.validationError': 'अपना इनपुट जाँचें और पुनः प्रयास करें।',
  'error.serverError': 'सर्वर त्रुटि। बाद में पुनः प्रयास करें।',
  'error.unknown': 'एक अप्रत्याशित त्रुटि हुई।',

  // AI conversation errors
  'conversation.error.messageRequired': 'message आवश्यक है',
  'conversation.error.aiNotConfigured': 'AI प्रोवाइडर कॉन्फ़िगर नहीं है',
  'conversation.error.unknownAiError': 'अज्ञात AI त्रुटि',
  'conversation.error.notFound': 'कोई वार्तालाप नहीं मिला',
  'conversation.error.streamError': 'AI स्ट्रीमिंग त्रुटि',

  // Resource errors
  'resource.error.unknownError': 'अज्ञात त्रुटि।',
  'resource.error.unableToCreate': '{{name}} बनाने में असमर्थ।',
  'resource.error.unableToUpdate': '{{name}} अपडेट करने में असमर्थ।',
  'resource.error.unableToDelete': '{{name}} हटाने में असमर्थ।',
  'resource.error.notFound': 'नहीं मिला।',
  'resource.error.badRequest': 'खराब अनुरोध।',
  'resource.error.unauthorized': 'अनधिकृत।',

  // Project errors
  'project.error.nameAndTypeRequired': 'name और projectType आवश्यक हैं',
  'project.error.notFound': 'नहीं मिला',

  // Device errors
  'device.error.unauthorized': 'अनधिकृत।',
  'device.error.badRequest': 'गलत अनुरोध।',
  'device.error.notFound': 'नहीं मिला।',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} पढ़ने में विफल: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} लिखने में विफल: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} हटाने में विफल: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'भुगतान प्रदाता आवश्यक है।',
  'user.payment.subscriptionIdRequired': 'subscriptionId आवश्यक है।',
  'user.payment.receiptAndPlanRequired': 'receipt और planKey आवश्यक हैं।',
  'user.payment.verificationNotConfigured': '{{provider}} के लिए भुगतान सत्यापन कॉन्फ़िगर नहीं है।',
  'user.payment.invalidPlan': 'अमान्य प्लान।',
  'user.payment.verificationFailed': 'सब्सक्रिप्शन सत्यापित करने में विफल।',
  'user.payment.unknownPlan': 'अज्ञात प्लान।',
  'user.payment.invalidWebhookEvent': 'अमान्य वेबहुक इवेंट।',
}
