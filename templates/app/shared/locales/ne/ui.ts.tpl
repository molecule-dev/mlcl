/**
 * Nepali translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'लोड हुँदैछ...',
  'common.saving': 'सुरक्षित गरिँदैछ...',
  'common.close': 'बन्द गर्नुहोस्',
  'common.goBack': 'पछाडि जानुहोस्',
  'common.submit': 'पेश गर्नुहोस्',
  'common.continue': 'जारी राख्नुहोस्',

  // Auth - Login
  'auth.login.email': 'इमेल',
  'auth.login.password': 'पासवर्ड',
  'auth.login.twoFactor': 'दुई-चरण टोकन (सक्षम भएमा)',
  'auth.login.signUp': 'साइन अप गर्नुहोस्',
  'auth.login.loggingIn': 'लग इन हुँदैछ...',
  'auth.login.logIn': 'लग इन गर्नुहोस्',
  'auth.login.forgotPassword': 'पासवर्ड बिर्सनुभयो?',

  // Auth - Signup
  'auth.signup.email': 'इमेल (आवश्यक)',
  'auth.signup.password': 'पासवर्ड (आवश्यक)',
  'auth.signup.name': 'तपाईंको नाम',
  'auth.signup.signingUp': 'साइन अप हुँदैछ...',
  'auth.signup.signUp': 'साइन अप गर्नुहोस्',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'यदि त्यो इमेलसँग कुनै खाता छ भने, पासवर्ड रिसेट लिङ्क पठाइएको छ।',
  'auth.forgotPassword.email': 'इमेल',
  'auth.forgotPassword.submitting': 'पेश गरिँदैछ...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'इमेल',
  'auth.resetPassword.token': 'पासवर्ड रिसेट टोकन',
  'auth.resetPassword.newPassword': 'नयाँ पासवर्ड प्रविष्ट गर्नुहोस्',
  'auth.resetPassword.twoFactor': 'दुई-चरण टोकन (सक्षम भएमा)',
  'auth.resetPassword.loggingIn': 'लग इन हुँदैछ...',
  'auth.resetPassword.submit': 'पासवर्ड सेट गर्नुहोस् र लग इन गर्नुहोस्',

  // Home
  'home.greeting': 'नमस्ते, ',
  'home.world': 'संसार',

  // Settings
  'settings.account': 'खाता',
  'settings.email': 'इमेल',
  'settings.authentication': 'प्रमाणीकरण',
  'settings.changePassword': 'पासवर्ड परिवर्तन गर्नुहोस्',
  'settings.twoFactor': 'दुई-चरण प्रमाणीकरण',
  'settings.notifications': 'सूचनाहरू',
  'settings.pushNotifications': 'पुश सूचनाहरू',
  'settings.billing': 'बिलिङ',
  'settings.plan': 'योजना: ',
  'settings.upgrade': 'अपग्रेड गर्नुहोस्',
  'settings.devices': 'उपकरणहरू',
  'settings.noDevices': 'कुनै उपकरण भेटिएन',
  'settings.thisDevice': 'यो उपकरण',
  'settings.platform': 'प्लेटफर्म',
  'settings.browser': 'ब्राउजर',
  'settings.network': 'नेटवर्क',
  'settings.online': 'अनलाइन',
  'settings.offline': 'अफलाइन',
  'settings.unknown': 'अज्ञात',
  'settings.logOut': 'लग आउट',
  'settings.deleteAccount': 'खाता मेटाउनुहोस्',
  'settings.changePasswordModal.title': 'पासवर्ड परिवर्तन गर्नुहोस्',
  'settings.changePasswordModal.error': 'पासवर्ड परिवर्तन गर्न असफल भयो।',
  'settings.changePasswordModal.currentPassword': 'हालको पासवर्ड',
  'settings.changePasswordModal.newPassword': 'नयाँ पासवर्ड',
  'settings.changePasswordModal.changing': 'परिवर्तन हुँदैछ...',
  'settings.deleteAccountModal.title': 'खाता मेटाउनुहोस्',
  'settings.deleteAccountModal.warning':
    'यो कार्य पूर्ववत गर्न सकिँदैन। पुष्टि गर्न आफ्नो पासवर्ड प्रविष्ट गर्नुहोस्।',
  'settings.deleteAccountModal.password': 'पासवर्ड',
  'settings.deleteAccountModal.deleting': 'मेटाइँदैछ...',
  'settings.changePasswordModal.submit': 'पासवर्ड परिवर्तन गर्नुहोस्',
  'settings.deleteAccountModal.submit': 'खाता मेटाउनुहोस्',
  'settings.failedToUpdateEmail': 'इमेल अपडेट गर्न असफल।',
  'settings.failedToDeleteAccount': 'खाता मेटाउन असफल।',
  'settings.toggleTwoFactor': 'दुई-कारक प्रमाणीकरण टगल गर्नुहोस्',
  'settings.togglePushNotifications': 'पुश सूचनाहरू टगल गर्नुहोस्',

  // Footer
  'footer.about': '{{appName}} बारेमा',
  'footer.privacyPolicy': 'गोपनीयता नीति',
  'footer.termsOfService': 'सेवाका सर्तहरू',
  'footer.language': 'भाषा',

  // OAuth
  'oauth.orContinueWith': 'वा यसबाट जारी राख्नुहोस्',
  'oauth.continueWith': '{{provider}} बाट जारी राख्नुहोस्',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'थिम परिवर्तन गर्नुहोस्',

  // User Menu
  'userMenu.open': 'प्रयोगकर्ता मेनु खोल्नुहोस्',

  // Plan Updated
  'planUpdated.message': 'तपाईंको योजना अपडेट गरिएको छ।',
  'planUpdated.thankYou': 'धन्यवाद!',
  'planUpdated.returnHome': 'गृहपृष्ठमा फर्कनुहोस्',

  // PWA
  'pwa.updateAvailable': 'नयाँ संस्करण उपलब्ध छ!',
  'pwa.update': 'अपडेट',
  'pwa.updating': 'अपडेट हुँदैछ...',

  // User API errors
  'user.error.badRequest': 'खराब अनुरोध।',
  'user.error.notFound': 'फेला परेन।',
  'user.error.failedToCreateSession': 'सत्र सिर्जना गर्न असफल।',
  'user.error.usernameRequired': 'प्रयोगकर्ता नाम आवश्यक छ।',
  'user.error.passwordRequired': 'पासवर्ड आवश्यक छ।',
  'user.error.emailInvalid': 'इमेल अमान्य छ।',
  'user.error.usernameUnavailable': 'प्रयोगकर्ता नाम अनुपलब्ध छ।',
  'user.error.emailAlreadyRegistered': 'इमेल पहिले नै दर्ता गरिएको छ।',
  'user.error.failedToHashPassword': 'पासवर्ड ह्यास गर्न असफल।',
  'user.error.invalidCredentials': 'अमान्य प्रमाणपत्रहरू।',
  'user.error.invalidTwoFactorToken': 'अमान्य दुई-कारक टोकन।',
  'user.error.twoFactorVerificationUnavailable': 'दुई-कारक प्रमाणीकरण अनुपलब्ध।',
  'user.error.loginFailed': 'लगइन असफल।',
  'user.error.usernameCannotBeEmpty': 'प्रयोगकर्ता नाम खाली हुन सक्दैन।',
  'user.error.failedToUpdateUser': 'प्रयोगकर्ता अपडेट गर्न असफल।',
  'user.error.failedToDeleteUser': 'प्रयोगकर्ता मेटाउन असफल।',
  'user.error.failedToReadUser': 'प्रयोगकर्ता पढ्न असफल।',
  'user.error.emailRequired': 'इमेल आवश्यक छ।',
  'user.error.failedToProcessPasswordReset': 'पासवर्ड रिसेट प्रक्रिया गर्न असफल।',
  'user.error.newPasswordRequired': 'नयाँ पासवर्ड आवश्यक छ।',
  'user.error.currentPasswordRequired': 'हालको पासवर्ड आवश्यक छ।',
  'user.error.currentPasswordIncorrect': 'हालको पासवर्ड गलत छ।',
  'user.error.failedToUpdatePassword': 'पासवर्ड अपडेट गर्न असफल।',
  'user.error.planKeyRequired': 'planKey आवश्यक छ।',
  'user.error.invalidPlan': 'अमान्य योजना।',
  'user.error.failedToUpdateSubscription': 'सदस्यता अपडेट गर्न असफल।',
  'user.error.failedToUpdatePlan': 'योजना अपडेट गर्न असफल।',
  'user.error.twoFactorNotAvailable': 'दुई-कारक प्रमाणीकरण उपलब्ध छैन।',
  'user.error.tokenRequired': 'टोकन आवश्यक छ।',
  'user.error.noPendingTwoFactorSetup':
    'कुनै बाँकी दुई-कारक सेटअप छैन। पहिले "setup" कार्यसँग कल गर्नुहोस्।',
  'user.error.invalidToken': 'अमान्य टोकन।',
  'user.error.twoFactorNotEnabled': 'दुई-कारक सक्रिय छैन।',
  'user.error.invalidAction': 'अमान्य कार्य। "setup", "enable", वा "disable" प्रयोग गर्नुहोस्।',
  'user.error.twoFactorOperationFailed': 'दुई-कारक अपरेसन असफल।',
  'user.error.oauthServerNotConfigured': 'OAuth सर्भर "{{server}}" कन्फिगर गरिएको छैन।',
  'user.error.oauthVerificationFailed': 'OAuth प्रमाणीकरण असफल।',
  'user.error.failedToCreateUser': 'प्रयोगकर्ता सिर्जना गर्न असफल।',
  'user.error.oauthLoginFailed': 'OAuth लगइन असफल।',

  // Auth client errors
  'auth.error.requestFailed': 'अनुरोध असफल',
  'auth.error.loginFailed': 'लगइन असफल',
  'auth.error.registrationFailed': 'दर्ता असफल',
  'auth.error.noRefreshToken': 'कुनै रिफ्रेश टोकन उपलब्ध छैन',

  // Form validation
  'forms.required': 'यो फिल्ड आवश्यक छ',
  'forms.min': 'मान कम्तिमा {{min}} हुनुपर्छ',
  'forms.max': 'मान अधिकतम {{max}} हुनुपर्छ',
  'forms.minLength': 'कम्तिमा {{minLength}} वर्णहरू हुनुपर्छ',
  'forms.maxLength': 'अधिकतम {{maxLength}} वर्णहरू हुनुपर्छ',
  'forms.invalidFormat': 'अमान्य ढाँचा',
  'forms.invalidEmail': 'अमान्य इमेल ठेगाना',
  'forms.invalidUrl': 'अमान्य URL',
  'forms.invalidValue': 'अमान्य मान',

  // HTTP client errors
  'http.error.requestFailed': 'स्थिति {{status}} सहित अनुरोध असफल।',
  'http.error.networkError': 'नेटवर्क त्रुटि।',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" बाटोको लागि "{{name}}" प्यारामिटर छैन',
  'routing.error.routeNotFound': '"{{name}}" मार्ग फेला परेन',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter लाई MoleculeRouterProvider भित्र प्रयोग गर्नुपर्छ',

  // Push notification errors
  'push.error.notSupported': 'पुश सूचनाहरू समर्थित छैनन्',
  'push.error.permissionNotGranted': 'सूचना अनुमति दिइएको छैन',

  // Utility errors
  'error.networkError': 'नेटवर्क त्रुटि। तपाईंको जडान जाँच गर्नुहोस्।',
  'error.timeout': 'अनुरोधको समय सकियो। पुनः प्रयास गर्नुहोस्।',
  'error.unauthorized': 'तपाईं यो कार्य गर्न अधिकृत हुनुहुन्न।',
  'error.forbidden': 'पहुँच अस्वीकृत।',
  'error.notFound': 'स्रोत फेला परेन।',
  'error.validationError': 'तपाईंको इनपुट जाँच गर्नुहोस् र पुनः प्रयास गर्नुहोस्।',
  'error.serverError': 'सर्भर त्रुटि। पछि पुनः प्रयास गर्नुहोस्।',
  'error.unknown': 'एउटा अनपेक्षित त्रुटि भयो।',

  // AI conversation errors
  'conversation.error.messageRequired': 'message आवश्यक छ',
  'conversation.error.aiNotConfigured': 'AI प्रोभाइडर कन्फिगर गरिएको छैन',
  'conversation.error.unknownAiError': 'अज्ञात AI त्रुटि',
  'conversation.error.notFound': 'कुनै कुराकानी फेला परेन',
  'conversation.error.streamError': 'AI स्ट्रिमिङ त्रुटि',

  // Resource errors
  'resource.error.unknownError': 'अज्ञात त्रुटि।',
  'resource.error.unableToCreate': '{{name}} सिर्जना गर्न असमर्थ।',
  'resource.error.unableToUpdate': '{{name}} अपडेट गर्न असमर्थ।',
  'resource.error.unableToDelete': '{{name}} मेटाउन असमर्थ।',
  'resource.error.notFound': 'फेला परेन।',
  'resource.error.badRequest': 'खराब अनुरोध।',
  'resource.error.unauthorized': 'अनधिकृत।',

  // Project errors
  'project.error.nameAndTypeRequired': 'name र projectType आवश्यक छन्',
  'project.error.notFound': 'फेला परेन',

  // Device errors
  'device.error.unauthorized': 'अनधिकृत।',
  'device.error.badRequest': 'खराब अनुरोध।',
  'device.error.notFound': 'फेला परेन।',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} पढ्न असफल: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} लेख्न असफल: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} मेट्न असफल: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'भुक्तानी प्रदायक आवश्यक छ।',
  'user.payment.subscriptionIdRequired': 'subscriptionId आवश्यक छ।',
  'user.payment.receiptAndPlanRequired': 'receipt र planKey आवश्यक छन्।',
  'user.payment.verificationNotConfigured':
    '{{provider}} को लागि भुक्तानी प्रमाणीकरण कन्फिगर गरिएको छैन।',
  'user.payment.invalidPlan': 'अमान्य योजना।',
  'user.payment.verificationFailed': 'सदस्यता प्रमाणित गर्न असफल।',
  'user.payment.unknownPlan': 'अज्ञात योजना।',
  'user.payment.invalidWebhookEvent': 'अमान्य वेबहुक इभेन्ट।',
}
