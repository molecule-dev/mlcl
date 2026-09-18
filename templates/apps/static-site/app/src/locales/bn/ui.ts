/**
 * Bengali translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'লোড হচ্ছে...',
  'common.saving': 'সংরক্ষণ হচ্ছে...',
  'common.close': 'বন্ধ করুন',
  'common.goBack': 'ফিরে যান',
  'common.submit': 'জমা দিন',
  'common.continue': 'চালিয়ে যান',

  // Auth - Login
  'auth.login.email': 'ইমেইল',
  'auth.login.password': 'পাসওয়ার্ড',
  'auth.login.twoFactor': 'দ্বি-ধাপ টোকেন (সক্রিয় থাকলে)',
  'auth.login.signUp': 'সাইন আপ করুন',
  'auth.login.loggingIn': 'লগ ইন হচ্ছে...',
  'auth.login.logIn': 'লগ ইন করুন',
  'auth.login.forgotPassword': 'পাসওয়ার্ড ভুলে গেছেন?',

  // Auth - Signup
  'auth.signup.email': 'ইমেইল (আবশ্যক)',
  'auth.signup.password': 'পাসওয়ার্ড (আবশ্যক)',
  'auth.signup.name': 'আপনার নাম',
  'auth.signup.signingUp': 'সাইন আপ হচ্ছে...',
  'auth.signup.signUp': 'সাইন আপ করুন',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'যদি সেই ইমেইলে কোনো অ্যাকাউন্ট থাকে, তাহলে একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে।',
  'auth.forgotPassword.email': 'ইমেইল',
  'auth.forgotPassword.submitting': 'জমা দেওয়া হচ্ছে...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ইমেইল',
  'auth.resetPassword.token': 'পাসওয়ার্ড রিসেট টোকেন',
  'auth.resetPassword.newPassword': 'নতুন পাসওয়ার্ড দিন',
  'auth.resetPassword.twoFactor': 'দ্বি-ধাপ টোকেন (সক্রিয় থাকলে)',
  'auth.resetPassword.loggingIn': 'লগ ইন হচ্ছে...',
  'auth.resetPassword.submit': 'পাসওয়ার্ড সেট করুন ও লগ ইন করুন',

  // Home
  'home.greeting': 'হ্যালো, ',
  'home.world': 'বিশ্ব',

  // Settings
  'settings.account': 'অ্যাকাউন্ট',
  'settings.email': 'ইমেইল',
  'settings.authentication': 'প্রমাণীকরণ',
  'settings.changePassword': 'পাসওয়ার্ড পরিবর্তন করুন',
  'settings.twoFactor': 'দ্বি-ধাপ প্রমাণীকরণ',
  'settings.notifications': 'বিজ্ঞপ্তি',
  'settings.pushNotifications': 'পুশ বিজ্ঞপ্তি',
  'settings.billing': 'বিলিং',
  'settings.plan': 'পরিকল্পনা: ',
  'settings.upgrade': 'আপগ্রেড করুন',
  'settings.devices': 'ডিভাইস',
  'settings.noDevices': 'কোনো ডিভাইস পাওয়া যায়নি',
  'settings.thisDevice': 'এই ডিভাইস',
  'settings.platform': 'প্ল্যাটফর্ম',
  'settings.browser': 'ব্রাউজার',
  'settings.network': 'নেটওয়ার্ক',
  'settings.online': 'অনলাইন',
  'settings.offline': 'অফলাইন',
  'settings.unknown': 'অজানা',
  'settings.logOut': 'লগ আউট',
  'settings.deleteAccount': 'অ্যাকাউন্ট মুছুন',
  'settings.changePasswordModal.title': 'পাসওয়ার্ড পরিবর্তন করুন',
  'settings.changePasswordModal.error': 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।',
  'settings.changePasswordModal.currentPassword': 'বর্তমান পাসওয়ার্ড',
  'settings.changePasswordModal.newPassword': 'নতুন পাসওয়ার্ড',
  'settings.changePasswordModal.changing': 'পরিবর্তন হচ্ছে...',
  'settings.deleteAccountModal.title': 'অ্যাকাউন্ট মুছুন',
  'settings.deleteAccountModal.warning':
    'এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। নিশ্চিত করতে আপনার পাসওয়ার্ড দিন।',
  'settings.deleteAccountModal.password': 'পাসওয়ার্ড',
  'settings.deleteAccountModal.deleting': 'মুছে ফেলা হচ্ছে...',
  'settings.changePasswordModal.submit': 'পাসওয়ার্ড পরিবর্তন করুন',
  'settings.deleteAccountModal.submit': 'অ্যাকাউন্ট মুছুন',
  'settings.failedToUpdateEmail': 'ইমেল আপডেট করতে ব্যর্থ।',
  'settings.failedToDeleteAccount': 'অ্যাকাউন্ট মুছতে ব্যর্থ।',
  'settings.toggleTwoFactor': 'দ্বি-ফ্যাক্টর প্রমাণীকরণ টগল করুন',
  'settings.togglePushNotifications': 'পুশ বিজ্ঞপ্তি টগল করুন',

  // Footer
  'footer.about': '{{appName}} সম্পর্কে',
  'footer.privacyPolicy': 'গোপনীয়তা নীতি',
  'footer.termsOfService': 'সেবার শর্তাবলী',
  'footer.language': 'ভাষা',

  // OAuth
  'oauth.orContinueWith': 'অথবা এর সাথে চালিয়ে যান',
  'oauth.continueWith': '{{provider}} দিয়ে চালিয়ে যান',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'থিম পরিবর্তন করুন',

  // User Menu
  'userMenu.open': 'ব্যবহারকারী মেনু খুলুন',

  // Plan Updated
  'planUpdated.message': 'আপনার পরিকল্পনা আপডেট করা হয়েছে।',
  'planUpdated.thankYou': 'ধন্যবাদ!',
  'planUpdated.returnHome': 'হোমে ফিরে যান',

  // PWA
  'pwa.updateAvailable': 'নতুন সংস্করণ উপলব্ধ!',
  'pwa.update': 'আপডেট',
  'pwa.updating': 'আপডেট হচ্ছে...',

  // User API errors
  'user.error.badRequest': 'অবৈধ অনুরোধ।',
  'user.error.notFound': 'পাওয়া যায়নি।',
  'user.error.failedToCreateSession': 'সেশন তৈরি করতে ব্যর্থ।',
  'user.error.usernameRequired': 'ব্যবহারকারীর নাম প্রয়োজন।',
  'user.error.passwordRequired': 'পাসওয়ার্ড প্রয়োজন।',
  'user.error.emailInvalid': 'ইমেইল অবৈধ।',
  'user.error.usernameUnavailable': 'ব্যবহারকারীর নাম অনুপলব্ধ।',
  'user.error.emailAlreadyRegistered': 'ইমেইল ইতিমধ্যে নিবন্ধিত।',
  'user.error.failedToHashPassword': 'পাসওয়ার্ড হ্যাশ করতে ব্যর্থ।',
  'user.error.invalidCredentials': 'অবৈধ শংসাপত্র।',
  'user.error.invalidTwoFactorToken': 'অবৈধ দ্বি-ফ্যাক্টর টোকেন।',
  'user.error.twoFactorVerificationUnavailable': 'দ্বি-ফ্যাক্টর যাচাইকরণ অনুপলব্ধ।',
  'user.error.loginFailed': 'লগইন ব্যর্থ।',
  'user.error.usernameCannotBeEmpty': 'ব্যবহারকারীর নাম খালি রাখা যাবে না।',
  'user.error.failedToUpdateUser': 'ব্যবহারকারী আপডেট করতে ব্যর্থ।',
  'user.error.failedToDeleteUser': 'ব্যবহারকারী মুছতে ব্যর্থ।',
  'user.error.failedToReadUser': 'ব্যবহারকারী পড়তে ব্যর্থ।',
  'user.error.emailRequired': 'ইমেইল প্রয়োজন।',
  'user.error.failedToProcessPasswordReset': 'পাসওয়ার্ড রিসেট প্রক্রিয়া করতে ব্যর্থ।',
  'user.error.newPasswordRequired': 'নতুন পাসওয়ার্ড প্রয়োজন।',
  'user.error.currentPasswordRequired': 'বর্তমান পাসওয়ার্ড প্রয়োজন।',
  'user.error.currentPasswordIncorrect': 'বর্তমান পাসওয়ার্ড ভুল।',
  'user.error.failedToUpdatePassword': 'পাসওয়ার্ড আপডেট করতে ব্যর্থ।',
  'user.error.planKeyRequired': 'planKey প্রয়োজন।',
  'user.error.invalidPlan': 'অবৈধ প্ল্যান।',
  'user.error.failedToUpdateSubscription': 'সাবস্ক্রিপশন আপডেট করতে ব্যর্থ।',
  'user.error.failedToUpdatePlan': 'প্ল্যান আপডেট করতে ব্যর্থ।',
  'user.error.twoFactorNotAvailable': 'দ্বি-ফ্যাক্টর প্রমাণীকরণ উপলব্ধ নয়।',
  'user.error.tokenRequired': 'টোকেন প্রয়োজন।',
  'user.error.noPendingTwoFactorSetup':
    'কোনো মুলতুবি দ্বি-ফ্যাক্টর সেটআপ নেই। প্রথমে "setup" অ্যাকশন দিয়ে কল করুন।',
  'user.error.invalidToken': 'অবৈধ টোকেন।',
  'user.error.twoFactorNotEnabled': 'দ্বি-ফ্যাক্টর সক্রিয় নয়।',
  'user.error.invalidAction': 'অবৈধ অ্যাকশন। "setup", "enable", বা "disable" ব্যবহার করুন।',
  'user.error.twoFactorOperationFailed': 'দ্বি-ফ্যাক্টর অপারেশন ব্যর্থ।',
  'user.error.oauthServerNotConfigured': 'OAuth সার্ভার "{{server}}" কনফিগার করা হয়নি।',
  'user.error.oauthVerificationFailed': 'OAuth যাচাইকরণ ব্যর্থ।',
  'user.error.failedToCreateUser': 'ব্যবহারকারী তৈরি করতে ব্যর্থ।',
  'user.error.oauthLoginFailed': 'OAuth লগইন ব্যর্থ।',

  // Auth client errors
  'auth.error.requestFailed': 'অনুরোধ ব্যর্থ',
  'auth.error.loginFailed': 'লগইন ব্যর্থ',
  'auth.error.registrationFailed': 'নিবন্ধন ব্যর্থ',
  'auth.error.noRefreshToken': 'কোনো রিফ্রেশ টোকেন উপলব্ধ নেই',

  // Form validation
  'forms.required': 'এই ক্ষেত্রটি আবশ্যক',
  'forms.min': 'মান কমপক্ষে {{min}} হতে হবে',
  'forms.max': 'মান সর্বাধিক {{max}} হতে হবে',
  'forms.minLength': 'কমপক্ষে {{minLength}} অক্ষর হতে হবে',
  'forms.maxLength': 'সর্বাধিক {{maxLength}} অক্ষর হতে হবে',
  'forms.invalidFormat': 'অবৈধ ফর্ম্যাট',
  'forms.invalidEmail': 'অবৈধ ইমেল ঠিকানা',
  'forms.invalidUrl': 'অবৈধ URL',
  'forms.invalidValue': 'অবৈধ মান',

  // HTTP client errors
  'http.error.requestFailed': 'স্ট্যাটাস {{status}} সহ অনুরোধ ব্যর্থ।',
  'http.error.networkError': 'নেটওয়ার্ক ত্রুটি।',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" পাথের জন্য "{{name}}" প্যারামিটার অনুপস্থিত',
  'routing.error.routeNotFound': '"{{name}}" রুট পাওয়া যায়নি',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter অবশ্যই একটি MoleculeRouterProvider-এর মধ্যে ব্যবহার করতে হবে',

  // Push notification errors
  'push.error.notSupported': 'পুশ বিজ্ঞপ্তি সমর্থিত নয়',
  'push.error.permissionNotGranted': 'বিজ্ঞপ্তির অনুমতি দেওয়া হয়নি',

  // Utility errors
  'error.networkError': 'নেটওয়ার্ক ত্রুটি। আপনার সংযোগ পরীক্ষা করুন।',
  'error.timeout': 'অনুরোধের সময়সীমা শেষ। আবার চেষ্টা করুন।',
  'error.unauthorized': 'এই কাজটি করার জন্য আপনি অনুমোদিত নন।',
  'error.forbidden': 'প্রবেশ নিষিদ্ধ।',
  'error.notFound': 'রিসোর্স পাওয়া যায়নি।',
  'error.validationError': 'আপনার ইনপুট পরীক্ষা করে আবার চেষ্টা করুন।',
  'error.serverError': 'সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন।',
  'error.unknown': 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।',

  // AI conversation errors
  'conversation.error.messageRequired': 'message প্রয়োজন',
  'conversation.error.aiNotConfigured': 'AI প্রোভাইডার কনফিগার করা হয়নি',
  'conversation.error.unknownAiError': 'অজানা AI ত্রুটি',
  'conversation.error.notFound': 'কোনো কথোপকথন পাওয়া যায়নি',
  'conversation.error.streamError': 'AI স্ট্রিমিং ত্রুটি',

  // Resource errors
  'resource.error.unknownError': 'অজানা ত্রুটি।',
  'resource.error.unableToCreate': '{{name}} তৈরি করতে অক্ষম।',
  'resource.error.unableToUpdate': '{{name}} আপডেট করতে অক্ষম।',
  'resource.error.unableToDelete': '{{name}} মুছতে অক্ষম।',
  'resource.error.notFound': 'পাওয়া যায়নি।',
  'resource.error.badRequest': 'অবৈধ অনুরোধ।',
  'resource.error.unauthorized': 'অননুমোদিত।',

  // Project errors
  'project.error.nameAndTypeRequired': 'name এবং projectType প্রয়োজন',
  'project.error.notFound': 'পাওয়া যায়নি',

  // Device errors
  'device.error.unauthorized': 'অননুমোদিত।',
  'device.error.badRequest': 'ভুল অনুরোধ।',
  'device.error.notFound': 'পাওয়া যায়নি।',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} পড়তে ব্যর্থ: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} লিখতে ব্যর্থ: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} মুছতে ব্যর্থ: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'পেমেন্ট প্রদানকারী প্রয়োজন।',
  'user.payment.subscriptionIdRequired': 'subscriptionId প্রয়োজন।',
  'user.payment.receiptAndPlanRequired': 'receipt এবং planKey প্রয়োজন।',
  'user.payment.verificationNotConfigured':
    '{{provider}}-এর জন্য পেমেন্ট যাচাইকরণ কনফিগার করা হয়নি।',
  'user.payment.invalidPlan': 'অবৈধ প্ল্যান।',
  'user.payment.verificationFailed': 'সাবস্ক্রিপশন যাচাই করতে ব্যর্থ।',
  'user.payment.unknownPlan': 'অজানা প্ল্যান।',
  'user.payment.invalidWebhookEvent': 'অবৈধ ওয়েবহুক ইভেন্ট।',
}
