/**
 * Burmese translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'ဖွင့်နေသည်...',
  'common.saving': 'သိမ်းဆည်းနေသည်...',
  'common.close': 'ပိတ်ရန်',
  'common.goBack': 'နောက်သို့',
  'common.submit': 'တင်သွင်းရန်',
  'common.continue': 'ဆက်လက်ရန်',

  // Auth - Login
  'auth.login.email': 'အီးမေးလ်',
  'auth.login.password': 'စကားဝှက်',
  'auth.login.twoFactor': 'နှစ်ဆင့်အတည်ပြုခြင်း တိုကင် (ဖွင့်ထားလျှင်)',
  'auth.login.signUp': 'အကောင့်ဖွင့်ရန်',
  'auth.login.loggingIn': 'ဝင်ရောက်နေသည်...',
  'auth.login.logIn': 'ဝင်ရောက်ရန်',
  'auth.login.forgotPassword': 'စကားဝှက်မေ့နေပါသလား?',

  // Auth - Signup
  'auth.signup.email': 'အီးမေးလ် (လိုအပ်သည်)',
  'auth.signup.password': 'စကားဝှက် (လိုအပ်သည်)',
  'auth.signup.name': 'သင့်အမည်',
  'auth.signup.signingUp': 'အကောင့်ဖွင့်နေသည်...',
  'auth.signup.signUp': 'အကောင့်ဖွင့်ရန်',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'ထိုအီးမေးလ်နှင့် အကောင့်ရှိပါက စကားဝှက်ပြန်လည်သတ်မှတ်ရန် လင့်ခ်ပို့ပြီးပါပြီ။',
  'auth.forgotPassword.email': 'အီးမေးလ်',
  'auth.forgotPassword.submitting': 'တင်သွင်းနေသည်...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'အီးမေးလ်',
  'auth.resetPassword.token': 'စကားဝှက်ပြန်လည်သတ်မှတ်ရန် တိုကင်',
  'auth.resetPassword.newPassword': 'စကားဝှက်အသစ်ထည့်ရန်',
  'auth.resetPassword.twoFactor': 'နှစ်ဆင့်အတည်ပြုခြင်း တိုကင် (ဖွင့်ထားလျှင်)',
  'auth.resetPassword.loggingIn': 'ဝင်ရောက်နေသည်...',
  'auth.resetPassword.submit': 'စကားဝှက်သတ်မှတ်ပြီး ဝင်ရောက်ရန်',

  // Home
  'home.greeting': 'မင်္ဂလာပါ, ',
  'home.world': 'ကမ္ဘာ',

  // Settings
  'settings.account': 'အကောင့်',
  'settings.email': 'အီးမေးလ်',
  'settings.authentication': 'အထောက်အထားစိစစ်ခြင်း',
  'settings.changePassword': 'စကားဝှက်ပြောင်းရန်',
  'settings.twoFactor': 'နှစ်ဆင့်အတည်ပြုခြင်း',
  'settings.notifications': 'အကြောင်းကြားချက်များ',
  'settings.pushNotifications': 'Push အကြောင်းကြားချက်များ',
  'settings.billing': 'ငွေတောင်းခံခြင်း',
  'settings.plan': 'အစီအစဉ်: ',
  'settings.upgrade': 'အဆင့်မြှင့်ရန်',
  'settings.devices': 'စက်ပစ္စည်းများ',
  'settings.noDevices': 'စက်ပစ္စည်းမတွေ့ပါ',
  'settings.thisDevice': 'ဤစက်ပစ္စည်း',
  'settings.platform': 'ပလက်ဖောင်း',
  'settings.browser': 'ဘရောက်ဆာ',
  'settings.network': 'ကွန်ရက်',
  'settings.online': 'အွန်လိုင်း',
  'settings.offline': 'အော့ဖ်လိုင်း',
  'settings.unknown': 'မသိ',
  'settings.logOut': 'ထွက်ရန်',
  'settings.deleteAccount': 'အကောင့်ဖျက်ရန်',
  'settings.changePasswordModal.title': 'စကားဝှက်ပြောင်းရန်',
  'settings.changePasswordModal.error': 'စကားဝှက်ပြောင်းလဲခြင်း မအောင်မြင်ပါ။',
  'settings.changePasswordModal.currentPassword': 'လက်ရှိစကားဝှက်',
  'settings.changePasswordModal.newPassword': 'စကားဝှက်အသစ်',
  'settings.changePasswordModal.changing': 'ပြောင်းလဲနေသည်...',
  'settings.deleteAccountModal.title': 'အကောင့်ဖျက်ရန်',
  'settings.deleteAccountModal.warning':
    'ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍မရပါ။ အတည်ပြုရန် သင့်စကားဝှက်ကို ထည့်ပါ။',
  'settings.deleteAccountModal.password': 'စကားဝှက်',
  'settings.deleteAccountModal.deleting': 'ဖျက်နေသည်...',
  'settings.changePasswordModal.submit': 'စကားဝှက်ပြောင်းရန်',
  'settings.deleteAccountModal.submit': 'အကောင့်ဖျက်ရန်',
  'settings.failedToUpdateEmail': 'အီးမေးလ် အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'settings.failedToDeleteAccount': 'အကောင့် ဖျက်ရန် မအောင်မြင်ပါ။',
  'settings.toggleTwoFactor': 'အဆင့်နှစ်ဆင့် အတည်ပြုခြင်း ပြောင်းရန်',
  'settings.togglePushNotifications': 'Push အသိပေးချက်များ ပြောင်းရန်',

  // Footer
  'footer.about': '{{appName}} အကြောင်း',
  'footer.privacyPolicy': 'ကိုယ်ရေးအချက်အလက် မူဝါဒ',
  'footer.termsOfService': 'ဝန်ဆောင်မှု စည်းမျဉ်းများ',
  'footer.language': 'ဘာသာစကား',

  // OAuth
  'oauth.orContinueWith': 'သို့မဟုတ် ဆက်လက်ရန်',
  'oauth.continueWith': '{{provider}} ဖြင့် ဆက်လက်ရန်',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'အပြင်အဆင်ပြောင်းရန်',

  // User Menu
  'userMenu.open': 'အသုံးပြုသူ မီနူးဖွင့်ရန်',

  // Plan Updated
  'planUpdated.message': 'သင့်အစီအစဉ်ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ။',
  'planUpdated.thankYou': 'ကျေးဇူးတင်ပါသည်!',
  'planUpdated.returnHome': 'ပင်မစာမျက်နှာသို့ ပြန်ရန်',

  // PWA
  'pwa.updateAvailable': 'ဗားရှင်းအသစ်ရရှိနိုင်ပါပြီ!',
  'pwa.update': 'အပ်ဒိတ်',
  'pwa.updating': 'အပ်ဒိတ်လုပ်နေသည်...',

  // User API errors
  'user.error.badRequest': 'တောင်းဆိုမှု မမှန်ကန်ပါ။',
  'user.error.notFound': 'ရှာမတွေ့ပါ။',
  'user.error.failedToCreateSession': 'Session ဖန်တီးရန် မအောင်မြင်ပါ။',
  'user.error.usernameRequired': 'အသုံးပြုသူအမည် လိုအပ်ပါသည်။',
  'user.error.passwordRequired': 'စကားဝှက် လိုအပ်ပါသည်။',
  'user.error.emailInvalid': 'အီးမေးလ် မမှန်ကန်ပါ။',
  'user.error.usernameUnavailable': 'အသုံးပြုသူအမည် မရရှိနိုင်ပါ။',
  'user.error.emailAlreadyRegistered': 'အီးမေးလ် မှတ်ပုံတင်ပြီးဖြစ်သည်။',
  'user.error.failedToHashPassword': 'စကားဝှက် hash လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.invalidCredentials': 'အထောက်အထားများ မမှန်ကန်ပါ။',
  'user.error.invalidTwoFactorToken': 'Two-factor token မမှန်ကန်ပါ။',
  'user.error.twoFactorVerificationUnavailable': 'Two-factor အတည်ပြုခြင်း မရရှိနိုင်ပါ။',
  'user.error.loginFailed': 'အကောင့်ဝင်ရန် မအောင်မြင်ပါ။',
  'user.error.usernameCannotBeEmpty': 'အသုံးပြုသူအမည် ဗလာ မဖြစ်ရပါ။',
  'user.error.failedToUpdateUser': 'အသုံးပြုသူ အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.failedToDeleteUser': 'အသုံးပြုသူ ဖျက်ရန် မအောင်မြင်ပါ။',
  'user.error.failedToReadUser': 'အသုံးပြုသူ ဖတ်ရန် မအောင်မြင်ပါ။',
  'user.error.emailRequired': 'အီးမေးလ် လိုအပ်ပါသည်။',
  'user.error.failedToProcessPasswordReset':
    'စကားဝှက် ပြန်လည်သတ်မှတ်ခြင်း လုပ်ဆောင်ရန် မအောင်မြင်ပါ။',
  'user.error.newPasswordRequired': 'စကားဝှက်အသစ် လိုအပ်ပါသည်။',
  'user.error.currentPasswordRequired': 'လက်ရှိ စကားဝှက် လိုအပ်ပါသည်။',
  'user.error.currentPasswordIncorrect': 'လက်ရှိ စကားဝှက် မှားနေသည်။',
  'user.error.failedToUpdatePassword': 'စကားဝှက် အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.planKeyRequired': 'planKey လိုအပ်ပါသည်။',
  'user.error.invalidPlan': 'အစီအစဉ် မမှန်ကန်ပါ။',
  'user.error.failedToUpdateSubscription': 'စာရင်းသွင်းမှု အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.failedToUpdatePlan': 'အစီအစဉ် အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'user.error.twoFactorNotAvailable': 'Two-factor authentication မရရှိနိုင်ပါ။',
  'user.error.tokenRequired': 'Token လိုအပ်ပါသည်။',
  'user.error.noPendingTwoFactorSetup':
    'စောင့်ဆိုင်းနေသော two-factor setup မရှိပါ။ action "setup" ဖြင့် ဦးစွာ ခေါ်ပါ။',
  'user.error.invalidToken': 'Token မမှန်ကန်ပါ။',
  'user.error.twoFactorNotEnabled': 'Two-factor ဖွင့်မထားပါ။',
  'user.error.invalidAction':
    'Action မမှန်ကန်ပါ။ "setup", "enable", သို့မဟုတ် "disable" ကို အသုံးပြုပါ။',
  'user.error.twoFactorOperationFailed': 'Two-factor လုပ်ဆောင်ချက် မအောင်မြင်ပါ။',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" ပြင်ဆင်မထားပါ။',
  'user.error.oauthVerificationFailed': 'OAuth အတည်ပြုခြင်း မအောင်မြင်ပါ။',
  'user.error.failedToCreateUser': 'အသုံးပြုသူ ဖန်တီးရန် မအောင်မြင်ပါ။',
  'user.error.oauthLoginFailed': 'OAuth အကောင့်ဝင်ခြင်း မအောင်မြင်ပါ။',

  // Auth client errors
  'auth.error.requestFailed': 'တောင်းဆိုမှု မအောင်မြင်ပါ',
  'auth.error.loginFailed': 'အကောင့်ဝင်ရန် မအောင်မြင်ပါ',
  'auth.error.registrationFailed': 'မှတ်ပုံတင်ရန် မအောင်မြင်ပါ',
  'auth.error.noRefreshToken': 'Refresh token မရရှိနိုင်ပါ',

  // Form validation
  'forms.required':
    '\u1024\u1014\u101a\u103a\u1000\u1006\u102c\u1016\u100a\u1037\u103a\u101b\u1014\u103a\u101b\u1015\u102b\u1019\u100a\u103a',
  'forms.min':
    '\u1010\u1014\u103a\u1016\u102d\u102f\u1038\u101e\u100a\u103a \u1021\u1014\u100a\u103a\u1038\u1006\u102f\u1036\u1038 {{min}} \u1016\u103c\u1005\u103a\u101b\u1015\u102b\u1019\u100a\u103a',
  'forms.max':
    '\u1010\u1014\u103a\u1016\u102d\u102f\u1038\u101e\u100a\u103a \u1021\u1019\u103b\u102c\u1038\u1006\u102f\u1036\u1038 {{max}} \u1016\u103c\u1005\u103a\u101b\u1015\u102b\u1019\u100a\u103a',
  'forms.minLength':
    '\u1021\u1014\u100a\u103a\u1038\u1006\u102f\u1036\u1038 {{minLength}} \u101c\u102f\u1036\u1038 \u1016\u103c\u1005\u103a\u101b\u1015\u102b\u1019\u100a\u103a',
  'forms.maxLength':
    '\u1021\u1019\u103b\u102c\u1038\u1006\u102f\u1036\u1038 {{maxLength}} \u101c\u102f\u1036\u1038 \u1016\u103c\u1005\u103a\u101b\u1015\u102b\u1019\u100a\u103a',
  'forms.invalidFormat':
    '\u1019\u1019\u103e\u1014\u103a\u1000\u1014\u103a\u101e\u1031\u102c \u1015\u102f\u1036\u1005\u1036',
  'forms.invalidEmail':
    '\u1019\u1019\u103e\u1014\u103a\u1000\u1014\u103a\u101e\u1031\u102c \u1021\u102e\u1038\u1019\u1031\u1038\u101c\u103a\u101c\u102d\u1015\u103a\u1005\u102c',
  'forms.invalidUrl': '\u1019\u1019\u103e\u1014\u103a\u1000\u1014\u103a\u101e\u1031\u102c URL',
  'forms.invalidValue':
    '\u1019\u1019\u103e\u1014\u103a\u1000\u1014\u103a\u101e\u1031\u102c \u1010\u1014\u103a\u1016\u102d\u102f\u1038',

  // HTTP client errors
  'http.error.requestFailed': 'တောင်းဆိုမှု status {{status}} ဖြင့် မအောင်မြင်ပါ။',
  'http.error.networkError': 'ကွန်ရက် အမှား။',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" လမ်းကြောင်းအတွက် "{{name}}" ပါရာမီတာ ပျောက်နေသည်',
  'routing.error.routeNotFound': '"{{name}}" လမ်းကြောင်းကို ရှာမတွေ့ပါ',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ကို MoleculeRouterProvider အတွင်းတွင် အသုံးပြုရပါမည်',

  // Push notification errors
  'push.error.notSupported': 'Push notification များ ပံ့ပိုးမထားပါ',
  'push.error.permissionNotGranted': 'Notification ခွင့်ပြုချက် မပေးထားပါ',

  // Utility errors
  'error.networkError': 'ကွန်ရက် အမှား။ ကျေးဇူးပြု၍ သင့်ချိတ်ဆက်မှုကို စစ်ဆေးပါ။',
  'error.timeout': 'တောင်းဆိုမှု အချိန်ကုန်သွားသည်။ ကျေးဇူးပြု၍ ထပ်ကြိုးစားပါ။',
  'error.unauthorized': 'ဤလုပ်ဆောင်ချက်ကို လုပ်ရန် သင့်တွင် ခွင့်ပြုချက် မရှိပါ။',
  'error.forbidden': 'ဝင်ရောက်ခွင့် ငြင်းပယ်ခံရသည်။',
  'error.notFound': 'အရင်းအမြစ် ရှာမတွေ့ပါ။',
  'error.validationError': 'ကျေးဇူးပြု၍ သင့်ထည့်သွင်းမှုကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။',
  'error.serverError': 'ဆာဗာ အမှား။ ကျေးဇူးပြု၍ နောက်မှ ထပ်ကြိုးစားပါ။',
  'error.unknown': 'မမျှော်လင့်ထားသော အမှား ဖြစ်ပွားသည်။',

  // AI conversation errors
  'conversation.error.messageRequired': 'message လိုအပ်ပါသည်',
  'conversation.error.aiNotConfigured': 'AI provider ပြင်ဆင်မထားပါ',
  'conversation.error.unknownAiError': 'မသိသော AI အမှား',
  'conversation.error.notFound': 'စကားဝိုင်း ရှာမတွေ့ပါ',
  'conversation.error.streamError': 'AI streaming အမှား',

  // Resource errors
  'resource.error.unknownError': 'မသိသော အမှား။',
  'resource.error.unableToCreate': '{{name}} ဖန်တီးရန် မအောင်မြင်ပါ။',
  'resource.error.unableToUpdate': '{{name}} အပ်ဒိတ်လုပ်ရန် မအောင်မြင်ပါ။',
  'resource.error.unableToDelete': '{{name}} ဖျက်ရန် မအောင်မြင်ပါ။',
  'resource.error.notFound': 'ရှာမတွေ့ပါ။',
  'resource.error.badRequest': 'တောင်းဆိုမှု မမှန်ကန်ပါ။',
  'resource.error.unauthorized': 'ခွင့်ပြုချက်မရှိပါ။',

  // Project errors
  'project.error.nameAndTypeRequired': 'name နှင့် projectType လိုအပ်ပါသည်',
  'project.error.notFound': 'ရှာမတွေ့ပါ',

  // Device errors
  'device.error.unauthorized': 'ခွင့်ပြုချက်မရှိပါ။',
  'device.error.badRequest': 'မမှန်ကန်သောတောင်းဆိုမှု။',
  'device.error.notFound': 'ရှာမတွေ့ပါ။',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} ကိုဖတ်ရန် မအောင်မြင်ပါ: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} ကိုရေးရန် မအောင်မြင်ပါ: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} ကိုဖျက်ရန် မအောင်မြင်ပါ: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ငွေပေးချေမှု ပံ့ပိုးသူ လိုအပ်ပါသည်။',
  'user.payment.subscriptionIdRequired': 'subscriptionId လိုအပ်ပါသည်။',
  'user.payment.receiptAndPlanRequired': 'receipt နှင့် planKey လိုအပ်ပါသည်။',
  'user.payment.verificationNotConfigured':
    '{{provider}} အတွက် ငွေပေးချေမှု အတည်ပြုခြင်း ပြင်ဆင်မထားပါ။',
  'user.payment.invalidPlan': 'အစီအစဉ် မမှန်ကန်ပါ။',
  'user.payment.verificationFailed': 'စာရင်းသွင်းမှု အတည်ပြုရန် မအောင်မြင်ပါ။',
  'user.payment.unknownPlan': 'မသိသော အစီအစဉ်။',
  'user.payment.invalidWebhookEvent': 'Webhook event မမှန်ကန်ပါ။',
}
