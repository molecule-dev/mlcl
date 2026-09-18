/**
 * Tamil translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'ஏற்றுகிறது...',
  'common.saving': 'சேமிக்கிறது...',
  'common.close': 'மூடு',
  'common.goBack': 'திரும்பிச் செல்',
  'common.submit': 'சமர்ப்பி',
  'common.continue': 'தொடரவும்',

  // Auth - Login
  'auth.login.email': 'மின்னஞ்சல்',
  'auth.login.password': 'கடவுச்சொல்',
  'auth.login.twoFactor': 'இரு-காரணி டோக்கன் (இயக்கப்பட்டிருந்தால்)',
  'auth.login.signUp': 'பதிவு செய்யவும்',
  'auth.login.loggingIn': 'உள்நுழைகிறது...',
  'auth.login.logIn': 'உள்நுழையவும்',
  'auth.login.forgotPassword': 'கடவுச்சொல் மறந்துவிட்டதா?',

  // Auth - Signup
  'auth.signup.email': 'மின்னஞ்சல் (கட்டாயம்)',
  'auth.signup.password': 'கடவுச்சொல் (கட்டாயம்)',
  'auth.signup.name': 'உங்கள் பெயர்',
  'auth.signup.signingUp': 'பதிவு செய்கிறது...',
  'auth.signup.signUp': 'பதிவு செய்யவும்',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'அந்த மின்னஞ்சலில் ஒரு கணக்கு இருந்தால், கடவுச்சொல் மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டுள்ளது.',
  'auth.forgotPassword.email': 'மின்னஞ்சல்',
  'auth.forgotPassword.submitting': 'சமர்ப்பிக்கிறது...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'மின்னஞ்சல்',
  'auth.resetPassword.token': 'கடவுச்சொல் மீட்டமைப்பு டோக்கன்',
  'auth.resetPassword.newPassword': 'புதிய கடவுச்சொல்லை உள்ளிடவும்',
  'auth.resetPassword.twoFactor': 'இரு-காரணி டோக்கன் (இயக்கப்பட்டிருந்தால்)',
  'auth.resetPassword.loggingIn': 'உள்நுழைகிறது...',
  'auth.resetPassword.submit': 'கடவுச்சொல்லை அமைத்து உள்நுழையவும்',

  // Home
  'home.greeting': 'வணக்கம், ',
  'home.world': 'உலகம்',

  // Settings
  'settings.account': 'கணக்கு',
  'settings.email': 'மின்னஞ்சல்',
  'settings.authentication': 'அங்கீகாரம்',
  'settings.changePassword': 'கடவுச்சொல்லை மாற்று',
  'settings.twoFactor': 'இரு-காரணி அங்கீகாரம்',
  'settings.notifications': 'அறிவிப்புகள்',
  'settings.pushNotifications': 'புஷ் அறிவிப்புகள்',
  'settings.billing': 'பில்லிங்',
  'settings.plan': 'திட்டம்: ',
  'settings.upgrade': 'மேம்படுத்து',
  'settings.devices': 'சாதனங்கள்',
  'settings.noDevices': 'சாதனங்கள் எதுவும் இல்லை',
  'settings.thisDevice': 'இந்தச் சாதனம்',
  'settings.platform': 'தளம்',
  'settings.browser': 'உலாவி',
  'settings.network': 'நெட்வொர்க்',
  'settings.online': 'ஆன்லைன்',
  'settings.offline': 'ஆஃப்லைன்',
  'settings.unknown': 'தெரியாது',
  'settings.logOut': 'வெளியேறு',
  'settings.deleteAccount': 'கணக்கை நீக்கு',
  'settings.changePasswordModal.title': 'கடவுச்சொல்லை மாற்று',
  'settings.changePasswordModal.error': 'கடவுச்சொல்லை மாற்ற இயலவில்லை.',
  'settings.changePasswordModal.currentPassword': 'தற்போதைய கடவுச்சொல்',
  'settings.changePasswordModal.newPassword': 'புதிய கடவுச்சொல்',
  'settings.changePasswordModal.changing': 'மாற்றுகிறது...',
  'settings.deleteAccountModal.title': 'கணக்கை நீக்கு',
  'settings.deleteAccountModal.warning':
    'இந்தச் செயலை மீட்க இயலாது. உறுதிப்படுத்த உங்கள் கடவுச்சொல்லை உள்ளிடவும்.',
  'settings.deleteAccountModal.password': 'கடவுச்சொல்',
  'settings.deleteAccountModal.deleting': 'நீக்குகிறது...',
  'settings.changePasswordModal.submit': 'கடவுச்சொல்லை மாற்று',
  'settings.deleteAccountModal.submit': 'கணக்கை நீக்கு',
  'settings.failedToUpdateEmail': 'மின்னஞ்சலைப் புதுப்பிக்க முடியவில்லை.',
  'settings.failedToDeleteAccount': 'கணக்கை நீக்க முடியவில்லை.',
  'settings.toggleTwoFactor': 'இரு-காரணி அங்கீகாரத்தை நிலைமாற்று',
  'settings.togglePushNotifications': 'புஷ் அறிவிப்புகளை நிலைமாற்று',

  // Footer
  'footer.about': '{{appName}} பற்றி',
  'footer.privacyPolicy': 'தனியுரிமைக் கொள்கை',
  'footer.termsOfService': 'சேவை விதிமுறைகள்',
  'footer.language': 'மொழி',

  // OAuth
  'oauth.orContinueWith': 'அல்லது இதனுடன் தொடரவும்',
  'oauth.continueWith': '{{provider}} மூலம் தொடரவும்',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'தீம் மாற்று',

  // User Menu
  'userMenu.open': 'பயனர் மெனுவைத் திற',

  // Plan Updated
  'planUpdated.message': 'உங்கள் திட்டம் புதுப்பிக்கப்பட்டது.',
  'planUpdated.thankYou': 'நன்றி!',
  'planUpdated.returnHome': 'முகப்புக்குத் திரும்பு',

  // PWA
  'pwa.updateAvailable': 'புதிய பதிப்பு கிடைக்கிறது!',
  'pwa.update': 'புதுப்பிக்கவும்',
  'pwa.updating': 'புதுப்பிக்கிறது...',

  // User API errors
  'user.error.badRequest': 'தவறான கோரிக்கை.',
  'user.error.notFound': 'கிடைக்கவில்லை.',
  'user.error.failedToCreateSession': 'அமர்வை உருவாக்க இயலவில்லை.',
  'user.error.usernameRequired': 'பயனர்பெயர் தேவை.',
  'user.error.passwordRequired': 'கடவுச்சொல் தேவை.',
  'user.error.emailInvalid': 'மின்னஞ்சல் தவறானது.',
  'user.error.usernameUnavailable': 'பயனர்பெயர் கிடைக்கவில்லை.',
  'user.error.emailAlreadyRegistered': 'மின்னஞ்சல் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.',
  'user.error.failedToHashPassword': 'கடவுச்சொல்லை ஹாஷ் செய்ய இயலவில்லை.',
  'user.error.invalidCredentials': 'தவறான சான்றுகள்.',
  'user.error.invalidTwoFactorToken': 'தவறான இரு-காரணி டோக்கன்.',
  'user.error.twoFactorVerificationUnavailable': 'இரு-காரணி சரிபார்ப்பு கிடைக்கவில்லை.',
  'user.error.loginFailed': 'உள்நுழைவு தோல்வி.',
  'user.error.usernameCannotBeEmpty': 'பயனர்பெயர் காலியாக இருக்கக்கூடாது.',
  'user.error.failedToUpdateUser': 'பயனரைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.failedToDeleteUser': 'பயனரை நீக்க இயலவில்லை.',
  'user.error.failedToReadUser': 'பயனரைப் படிக்க இயலவில்லை.',
  'user.error.emailRequired': 'மின்னஞ்சல் தேவை.',
  'user.error.failedToProcessPasswordReset': 'கடவுச்சொல் மீட்டமைப்பு செயலாக்கத்தில் தோல்வி.',
  'user.error.newPasswordRequired': 'புதிய கடவுச்சொல் தேவை.',
  'user.error.currentPasswordRequired': 'தற்போதைய கடவுச்சொல் தேவை.',
  'user.error.currentPasswordIncorrect': 'தற்போதைய கடவுச்சொல் தவறானது.',
  'user.error.failedToUpdatePassword': 'கடவுச்சொல்லைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.planKeyRequired': 'planKey தேவை.',
  'user.error.invalidPlan': 'தவறான திட்டம்.',
  'user.error.failedToUpdateSubscription': 'சந்தாவைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.failedToUpdatePlan': 'திட்டத்தைப் புதுப்பிக்க இயலவில்லை.',
  'user.error.twoFactorNotAvailable': 'இரு-காரணி அங்கீகாரம் கிடைக்கவில்லை.',
  'user.error.tokenRequired': 'டோக்கன் தேவை.',
  'user.error.noPendingTwoFactorSetup':
    'நிலுவையில் இரு-காரணி அமைப்பு இல்லை. முதலில் "setup" செயலுடன் அழைக்கவும்.',
  'user.error.invalidToken': 'தவறான டோக்கன்.',
  'user.error.twoFactorNotEnabled': 'இரு-காரணி இயக்கப்படவில்லை.',
  'user.error.invalidAction': 'தவறான செயல். "setup", "enable", அல்லது "disable" பயன்படுத்தவும்.',
  'user.error.twoFactorOperationFailed': 'இரு-காரணி செயல்பாடு தோல்வி.',
  'user.error.oauthServerNotConfigured': 'OAuth சேவையகம் "{{server}}" கட்டமைக்கப்படவில்லை.',
  'user.error.oauthVerificationFailed': 'OAuth சரிபார்ப்பு தோல்வி.',
  'user.error.failedToCreateUser': 'பயனரை உருவாக்க இயலவில்லை.',
  'user.error.oauthLoginFailed': 'OAuth உள்நுழைவு தோல்வி.',

  // Auth client errors
  'auth.error.requestFailed': 'கோரிக்கை தோல்வி',
  'auth.error.loginFailed': 'உள்நுழைவு தோல்வி',
  'auth.error.registrationFailed': 'பதிவு தோல்வி',
  'auth.error.noRefreshToken': 'புதுப்பிப்பு டோக்கன் கிடைக்கவில்லை',

  // Form validation
  'forms.required': 'இந்தப் புலம் தேவையானது',
  'forms.min': 'மதிப்பு குறைந்தபட்சம் {{min}} ஆக இருக்க வேண்டும்',
  'forms.max': 'மதிப்பு அதிகபட்சம் {{max}} ஆக இருக்க வேண்டும்',
  'forms.minLength': 'குறைந்தபட்சம் {{minLength}} எழுத்துகள் இருக்க வேண்டும்',
  'forms.maxLength': 'அதிகபட்சம் {{maxLength}} எழுத்துகள் இருக்க வேண்டும்',
  'forms.invalidFormat': 'தவறான வடிவம்',
  'forms.invalidEmail': 'தவறான மின்னஞ்சல் முகவரி',
  'forms.invalidUrl': 'தவறான URL',
  'forms.invalidValue': 'தவறான மதிப்பு',

  // HTTP client errors
  'http.error.requestFailed': 'நிலை {{status}} உடன் கோரிக்கை தோல்வி.',
  'http.error.networkError': 'நெட்வொர்க் பிழை.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" பாதைக்கான "{{name}}" அளவுரு காணவில்லை',
  'routing.error.routeNotFound': '"{{name}}" வழி கண்டுபிடிக்கப்படவில்லை',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ஒரு MoleculeRouterProvider க்குள் பயன்படுத்தப்பட வேண்டும்',

  // Push notification errors
  'push.error.notSupported': 'புஷ் அறிவிப்புகள் ஆதரிக்கப்படவில்லை',
  'push.error.permissionNotGranted': 'அறிவிப்பு அனுமதி வழங்கப்படவில்லை',

  // Utility errors
  'error.networkError': 'நெட்வொர்க் பிழை. உங்கள் இணைப்பைச் சரிபார்க்கவும்.',
  'error.timeout': 'கோரிக்கை நேரம் முடிந்தது. மீண்டும் முயற்சிக்கவும்.',
  'error.unauthorized': 'இந்த செயலைச் செய்ய உங்களுக்கு அதிகாரம் இல்லை.',
  'error.forbidden': 'அணுகல் மறுக்கப்பட்டது.',
  'error.notFound': 'வளம் கிடைக்கவில்லை.',
  'error.validationError': 'உங்கள் உள்ளீட்டைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
  'error.serverError': 'சேவையக பிழை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'error.unknown': 'எதிர்பாராத பிழை ஏற்பட்டது.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message தேவை',
  'conversation.error.aiNotConfigured': 'AI வழங்குநர் கட்டமைக்கப்படவில்லை',
  'conversation.error.unknownAiError': 'தெரியாத AI பிழை',
  'conversation.error.notFound': 'உரையாடல் கிடைக்கவில்லை',
  'conversation.error.streamError': 'AI ஸ்ட்ரீமிங் பிழை',

  // Resource errors
  'resource.error.unknownError': 'தெரியாத பிழை.',
  'resource.error.unableToCreate': '{{name}} உருவாக்க இயலவில்லை.',
  'resource.error.unableToUpdate': '{{name}} புதுப்பிக்க இயலவில்லை.',
  'resource.error.unableToDelete': '{{name}} நீக்க இயலவில்லை.',
  'resource.error.notFound': 'கிடைக்கவில்லை.',
  'resource.error.badRequest': 'தவறான கோரிக்கை.',
  'resource.error.unauthorized': 'அங்கீகரிக்கப்படவில்லை.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name மற்றும் projectType தேவை',
  'project.error.notFound': 'கிடைக்கவில்லை',

  // Device errors
  'device.error.unauthorized': 'அங்கீகரிக்கப்படவில்லை.',
  'device.error.badRequest': 'தவறான கோரிக்கை.',
  'device.error.notFound': 'கண்டுபிடிக்கப்படவில்லை.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} படிப்பது தோல்வியடைந்தது: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} எழுதுவது தோல்வியடைந்தது: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} நீக்குவது தோல்வியடைந்தது: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'கட்டண வழங்குநர் தேவை.',
  'user.payment.subscriptionIdRequired': 'subscriptionId தேவை.',
  'user.payment.receiptAndPlanRequired': 'receipt மற்றும் planKey தேவை.',
  'user.payment.verificationNotConfigured':
    '{{provider}} க்கான கட்டண சரிபார்ப்பு கட்டமைக்கப்படவில்லை.',
  'user.payment.invalidPlan': 'தவறான திட்டம்.',
  'user.payment.verificationFailed': 'சந்தாவை சரிபார்க்க இயலவில்லை.',
  'user.payment.unknownPlan': 'தெரியாத திட்டம்.',
  'user.payment.invalidWebhookEvent': 'தவறான வெப்ஹூக் நிகழ்வு.',
}
