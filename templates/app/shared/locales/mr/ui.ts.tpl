/**
 * Marathi translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'लोड होत आहे...',
  'common.saving': 'जतन होत आहे...',
  'common.close': 'बंद करा',
  'common.goBack': 'मागे जा',
  'common.submit': 'सबमिट करा',
  'common.continue': 'पुढे चालू ठेवा',

  // Auth - Login
  'auth.login.email': 'ईमेल',
  'auth.login.password': 'पासवर्ड',
  'auth.login.twoFactor': 'द्वि-घटक टोकन (सक्षम असल्यास)',
  'auth.login.signUp': 'साइन अप करा',
  'auth.login.loggingIn': 'लॉग इन होत आहे...',
  'auth.login.logIn': 'लॉग इन करा',
  'auth.login.forgotPassword': 'पासवर्ड विसरलात?',

  // Auth - Signup
  'auth.signup.email': 'ईमेल (आवश्यक)',
  'auth.signup.password': 'पासवर्ड (आवश्यक)',
  'auth.signup.name': 'तुमचे नाव',
  'auth.signup.signingUp': 'साइन अप होत आहे...',
  'auth.signup.signUp': 'साइन अप करा',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'त्या ईमेलवर खाते असल्यास, पासवर्ड रीसेट लिंक पाठवली गेली आहे.',
  'auth.forgotPassword.email': 'ईमेल',
  'auth.forgotPassword.submitting': 'सबमिट होत आहे...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ईमेल',
  'auth.resetPassword.token': 'पासवर्ड रीसेट टोकन',
  'auth.resetPassword.newPassword': 'नवीन पासवर्ड प्रविष्ट करा',
  'auth.resetPassword.twoFactor': 'द्वि-घटक टोकन (सक्षम असल्यास)',
  'auth.resetPassword.loggingIn': 'लॉग इन होत आहे...',
  'auth.resetPassword.submit': 'पासवर्ड सेट करा आणि लॉग इन करा',

  // Home
  'home.greeting': 'नमस्कार, ',
  'home.world': 'जग',

  // Settings
  'settings.account': 'खाते',
  'settings.email': 'ईमेल',
  'settings.authentication': 'प्रमाणीकरण',
  'settings.changePassword': 'पासवर्ड बदला',
  'settings.twoFactor': 'द्वि-घटक प्रमाणीकरण',
  'settings.notifications': 'सूचना',
  'settings.pushNotifications': 'पुश सूचना',
  'settings.billing': 'बिलिंग',
  'settings.plan': 'योजना: ',
  'settings.upgrade': 'अपग्रेड करा',
  'settings.devices': 'डिव्हाइसेस',
  'settings.noDevices': 'डिव्हाइसेस सापडले नाहीत',
  'settings.thisDevice': 'हे डिव्हाइस',
  'settings.platform': 'प्लॅटफॉर्म',
  'settings.browser': 'ब्राउझर',
  'settings.network': 'नेटवर्क',
  'settings.online': 'ऑनलाइन',
  'settings.offline': 'ऑफलाइन',
  'settings.unknown': 'अज्ञात',
  'settings.logOut': 'लॉग आउट',
  'settings.deleteAccount': 'खाते हटवा',
  'settings.changePasswordModal.title': 'पासवर्ड बदला',
  'settings.changePasswordModal.error': 'पासवर्ड बदलण्यात अयशस्वी.',
  'settings.changePasswordModal.currentPassword': 'सध्याचा पासवर्ड',
  'settings.changePasswordModal.newPassword': 'नवीन पासवर्ड',
  'settings.changePasswordModal.changing': 'बदलत आहे...',
  'settings.deleteAccountModal.title': 'खाते हटवा',
  'settings.deleteAccountModal.warning':
    'ही क्रिया पूर्ववत करता येणार नाही. पुष्टी करण्यासाठी तुमचा पासवर्ड प्रविष्ट करा.',
  'settings.deleteAccountModal.password': 'पासवर्ड',
  'settings.deleteAccountModal.deleting': 'हटवत आहे...',
  'settings.changePasswordModal.submit': 'पासवर्ड बदला',
  'settings.deleteAccountModal.submit': 'खाते हटवा',
  'settings.failedToUpdateEmail': 'ईमेल अपडेट करण्यात अयशस्वी.',
  'settings.failedToDeleteAccount': 'खाते हटवण्यात अयशस्वी.',
  'settings.toggleTwoFactor': 'द्वि-घटक प्रमाणीकरण टॉगल करा',
  'settings.togglePushNotifications': 'पुश सूचना टॉगल करा',

  // Footer
  'footer.about': '{{appName}} बद्दल',
  'footer.privacyPolicy': 'गोपनीयता धोरण',
  'footer.termsOfService': 'सेवा अटी',
  'footer.language': 'भाषा',

  // OAuth
  'oauth.orContinueWith': 'किंवा यासह पुढे चालू ठेवा',
  'oauth.continueWith': '{{provider}} सह पुढे चालू ठेवा',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'थीम बदला',

  // User Menu
  'userMenu.open': 'वापरकर्ता मेनू उघडा',

  // Plan Updated
  'planUpdated.message': 'तुमची योजना अपडेट केली गेली आहे.',
  'planUpdated.thankYou': 'धन्यवाद!',
  'planUpdated.returnHome': 'मुख्यपृष्ठावर परत जा',

  // PWA
  'pwa.updateAvailable': 'नवीन आवृत्ती उपलब्ध आहे!',
  'pwa.update': 'अपडेट करा',
  'pwa.updating': 'अपडेट होत आहे...',

  // User API errors
  'user.error.badRequest': 'चुकीची विनंती.',
  'user.error.notFound': 'सापडले नाही.',
  'user.error.failedToCreateSession': 'सत्र तयार करण्यात अयशस्वी.',
  'user.error.usernameRequired': 'वापरकर्तानाव आवश्यक आहे.',
  'user.error.passwordRequired': 'पासवर्ड आवश्यक आहे.',
  'user.error.emailInvalid': 'ईमेल अवैध आहे.',
  'user.error.usernameUnavailable': 'वापरकर्तानाव अनुपलब्ध आहे.',
  'user.error.emailAlreadyRegistered': 'ईमेल आधीपासून नोंदणीकृत आहे.',
  'user.error.failedToHashPassword': 'पासवर्ड हॅश करण्यात अयशस्वी.',
  'user.error.invalidCredentials': 'अवैध क्रेडेन्शियल्स.',
  'user.error.invalidTwoFactorToken': 'अवैध द्वि-घटक टोकन.',
  'user.error.twoFactorVerificationUnavailable': 'द्वि-घटक सत्यापन अनुपलब्ध.',
  'user.error.loginFailed': 'लॉगिन अयशस्वी.',
  'user.error.usernameCannotBeEmpty': 'वापरकर्तानाव रिक्त असू शकत नाही.',
  'user.error.failedToUpdateUser': 'वापरकर्ता अपडेट करण्यात अयशस्वी.',
  'user.error.failedToDeleteUser': 'वापरकर्ता हटवण्यात अयशस्वी.',
  'user.error.failedToReadUser': 'वापरकर्ता वाचण्यात अयशस्वी.',
  'user.error.emailRequired': 'ईमेल आवश्यक आहे.',
  'user.error.failedToProcessPasswordReset': 'पासवर्ड रीसेट प्रक्रिया करण्यात अयशस्वी.',
  'user.error.newPasswordRequired': 'नवीन पासवर्ड आवश्यक आहे.',
  'user.error.currentPasswordRequired': 'सध्याचा पासवर्ड आवश्यक आहे.',
  'user.error.currentPasswordIncorrect': 'सध्याचा पासवर्ड चुकीचा आहे.',
  'user.error.failedToUpdatePassword': 'पासवर्ड अपडेट करण्यात अयशस्वी.',
  'user.error.planKeyRequired': 'planKey आवश्यक आहे.',
  'user.error.invalidPlan': 'अवैध प्लॅन.',
  'user.error.failedToUpdateSubscription': 'सबस्क्रिप्शन अपडेट करण्यात अयशस्वी.',
  'user.error.failedToUpdatePlan': 'प्लॅन अपडेट करण्यात अयशस्वी.',
  'user.error.twoFactorNotAvailable': 'द्वि-घटक प्रमाणीकरण उपलब्ध नाही.',
  'user.error.tokenRequired': 'टोकन आवश्यक आहे.',
  'user.error.noPendingTwoFactorSetup':
    'प्रलंबित द्वि-घटक सेटअप नाही. प्रथम "setup" क्रियेसह कॉल करा.',
  'user.error.invalidToken': 'अवैध टोकन.',
  'user.error.twoFactorNotEnabled': 'द्वि-घटक सक्रिय नाही.',
  'user.error.invalidAction': 'अवैध क्रिया. "setup", "enable", किंवा "disable" वापरा.',
  'user.error.twoFactorOperationFailed': 'द्वि-घटक ऑपरेशन अयशस्वी.',
  'user.error.oauthServerNotConfigured': 'OAuth सर्व्हर "{{server}}" कॉन्फिगर केलेले नाही.',
  'user.error.oauthVerificationFailed': 'OAuth सत्यापन अयशस्वी.',
  'user.error.failedToCreateUser': 'वापरकर्ता तयार करण्यात अयशस्वी.',
  'user.error.oauthLoginFailed': 'OAuth लॉगिन अयशस्वी.',

  // Auth client errors
  'auth.error.requestFailed': 'विनंती अयशस्वी',
  'auth.error.loginFailed': 'लॉगिन अयशस्वी',
  'auth.error.registrationFailed': 'नोंदणी अयशस्वी',
  'auth.error.noRefreshToken': 'कोणताही रिफ्रेश टोकन उपलब्ध नाही',

  // Form validation
  'forms.required': 'हे फील्ड आवश्यक आहे',
  'forms.min': 'मूल्य किमान {{min}} असणे आवश्यक आहे',
  'forms.max': 'मूल्य कमाल {{max}} असणे आवश्यक आहे',
  'forms.minLength': 'किमान {{minLength}} वर्ण असणे आवश्यक आहे',
  'forms.maxLength': 'कमाल {{maxLength}} वर्ण असणे आवश्यक आहे',
  'forms.invalidFormat': 'अवैध स्वरूप',
  'forms.invalidEmail': 'अवैध ईमेल पत्ता',
  'forms.invalidUrl': 'अवैध URL',
  'forms.invalidValue': 'अवैध मूल्य',

  // HTTP client errors
  'http.error.requestFailed': 'स्टेटस {{status}} सह विनंती अयशस्वी.',
  'http.error.networkError': 'नेटवर्क त्रुटी.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" मार्गासाठी "{{name}}" पॅरामीटर गहाळ आहे',
  'routing.error.routeNotFound': '"{{name}}" मार्ग सापडला नाही',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter हे MoleculeRouterProvider मध्ये वापरले जाणे आवश्यक आहे',

  // Push notification errors
  'push.error.notSupported': 'पुश सूचना समर्थित नाहीत',
  'push.error.permissionNotGranted': 'सूचना परवानगी दिली नाही',

  // Utility errors
  'error.networkError': 'नेटवर्क त्रुटी. तुमचे कनेक्शन तपासा.',
  'error.timeout': 'विनंतीचा कालावधी संपला. पुन्हा प्रयत्न करा.',
  'error.unauthorized': 'तुम्हाला ही क्रिया करण्याचा अधिकार नाही.',
  'error.forbidden': 'प्रवेश नाकारला.',
  'error.notFound': 'संसाधन सापडले नाही.',
  'error.validationError': 'तुमचे इनपुट तपासा आणि पुन्हा प्रयत्न करा.',
  'error.serverError': 'सर्व्हर त्रुटी. नंतर पुन्हा प्रयत्न करा.',
  'error.unknown': 'एक अनपेक्षित त्रुटी आली.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message आवश्यक आहे',
  'conversation.error.aiNotConfigured': 'AI प्रोव्हायडर कॉन्फिगर केलेले नाही',
  'conversation.error.unknownAiError': 'अज्ञात AI त्रुटी',
  'conversation.error.notFound': 'कोणताही संवाद सापडला नाही',
  'conversation.error.streamError': 'AI स्ट्रीमिंग त्रुटी',

  // Resource errors
  'resource.error.unknownError': 'अज्ञात त्रुटी.',
  'resource.error.unableToCreate': '{{name}} तयार करण्यात अक्षम.',
  'resource.error.unableToUpdate': '{{name}} अपडेट करण्यात अक्षम.',
  'resource.error.unableToDelete': '{{name}} हटवण्यात अक्षम.',
  'resource.error.notFound': 'सापडले नाही.',
  'resource.error.badRequest': 'चुकीची विनंती.',
  'resource.error.unauthorized': 'अनधिकृत.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name आणि projectType आवश्यक आहेत',
  'project.error.notFound': 'सापडले नाही',

  // Device errors
  'device.error.unauthorized': 'अनधिकृत.',
  'device.error.badRequest': 'चुकीची विनंती.',
  'device.error.notFound': 'सापडले नाही.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} वाचण्यात अयशस्वी: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} लिहिण्यात अयशस्वी: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} हटविण्यात अयशस्वी: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'पेमेंट प्रदाता आवश्यक आहे.',
  'user.payment.subscriptionIdRequired': 'subscriptionId आवश्यक आहे.',
  'user.payment.receiptAndPlanRequired': 'receipt आणि planKey आवश्यक आहेत.',
  'user.payment.verificationNotConfigured':
    '{{provider}} साठी पेमेंट सत्यापन कॉन्फिगर केलेले नाही.',
  'user.payment.invalidPlan': 'अवैध प्लॅन.',
  'user.payment.verificationFailed': 'सबस्क्रिप्शन सत्यापित करण्यात अयशस्वी.',
  'user.payment.unknownPlan': 'अज्ञात प्लॅन.',
  'user.payment.invalidWebhookEvent': 'अवैध वेबहुक इव्हेंट.',
}
