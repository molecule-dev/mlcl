/**
 * Telugu translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'లోడ్ అవుతోంది...',
  'common.saving': 'సేవ్ చేస్తోంది...',
  'common.close': 'మూసివేయండి',
  'common.goBack': 'వెనుకకు వెళ్ళండి',
  'common.submit': 'సమర్పించండి',
  'common.continue': 'కొనసాగించండి',

  // Auth - Login
  'auth.login.email': 'ఇమెయిల్',
  'auth.login.password': 'పాస్‌వర్డ్',
  'auth.login.twoFactor': 'రెండు-దశల టోకెన్ (ఎనేబుల్ చేసి ఉంటే)',
  'auth.login.signUp': 'సైన్ అప్ చేయండి',
  'auth.login.loggingIn': 'లాగిన్ అవుతోంది...',
  'auth.login.logIn': 'లాగిన్ చేయండి',
  'auth.login.forgotPassword': 'పాస్‌వర్డ్ మర్చిపోయారా?',

  // Auth - Signup
  'auth.signup.email': 'ఇమెయిల్ (తప్పనిసరి)',
  'auth.signup.password': 'పాస్‌వర్డ్ (తప్పనిసరి)',
  'auth.signup.name': 'మీ పేరు',
  'auth.signup.signingUp': 'సైన్ అప్ అవుతోంది...',
  'auth.signup.signUp': 'సైన్ అప్ చేయండి',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'ఆ ఇమెయిల్‌తో ఖాతా ఉంటే, పాస్‌వర్డ్ రీసెట్ లింక్ పంపబడింది.',
  'auth.forgotPassword.email': 'ఇమెయిల్',
  'auth.forgotPassword.submitting': 'సమర్పిస్తోంది...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ఇమెయిల్',
  'auth.resetPassword.token': 'పాస్‌వర్డ్ రీసెట్ టోకెన్',
  'auth.resetPassword.newPassword': 'కొత్త పాస్‌వర్డ్ నమోదు చేయండి',
  'auth.resetPassword.twoFactor': 'రెండు-దశల టోకెన్ (ఎనేబుల్ చేసి ఉంటే)',
  'auth.resetPassword.loggingIn': 'లాగిన్ అవుతోంది...',
  'auth.resetPassword.submit': 'పాస్‌వర్డ్ సెట్ చేసి లాగిన్ చేయండి',

  // Home
  'home.greeting': 'హలో, ',
  'home.world': 'ప్రపంచం',

  // Settings
  'settings.account': 'ఖాతా',
  'settings.email': 'ఇమెయిల్',
  'settings.authentication': 'ధృవీకరణ',
  'settings.changePassword': 'పాస్‌వర్డ్ మార్చండి',
  'settings.twoFactor': 'రెండు-దశల ధృవీకరణ',
  'settings.notifications': 'నోటిఫికేషన్లు',
  'settings.pushNotifications': 'పుష్ నోటిఫికేషన్లు',
  'settings.billing': 'బిల్లింగ్',
  'settings.plan': 'ప్లాన్: ',
  'settings.upgrade': 'అప్‌గ్రేడ్ చేయండి',
  'settings.devices': 'పరికరాలు',
  'settings.noDevices': 'పరికరాలు కనుగొనబడలేదు',
  'settings.thisDevice': 'ఈ పరికరం',
  'settings.platform': 'ప్లాట్‌ఫారమ్',
  'settings.browser': 'బ్రౌజర్',
  'settings.network': 'నెట్‌వర్క్',
  'settings.online': 'ఆన్‌లైన్',
  'settings.offline': 'ఆఫ్‌లైన్',
  'settings.unknown': 'తెలియదు',
  'settings.logOut': 'లాగ్ అవుట్',
  'settings.deleteAccount': 'ఖాతా తొలగించండి',
  'settings.changePasswordModal.title': 'పాస్‌వర్డ్ మార్చండి',
  'settings.changePasswordModal.error': 'పాస్‌వర్డ్ మార్చడం విఫలమైంది.',
  'settings.changePasswordModal.currentPassword': 'ప్రస్తుత పాస్‌వర్డ్',
  'settings.changePasswordModal.newPassword': 'కొత్త పాస్‌వర్డ్',
  'settings.changePasswordModal.changing': 'మారుస్తోంది...',
  'settings.deleteAccountModal.title': 'ఖాతా తొలగించండి',
  'settings.deleteAccountModal.warning':
    'ఈ చర్యను రద్దు చేయలేరు. నిర్ధారించడానికి మీ పాస్‌వర్డ్ నమోదు చేయండి.',
  'settings.deleteAccountModal.password': 'పాస్‌వర్డ్',
  'settings.deleteAccountModal.deleting': 'తొలగిస్తోంది...',
  'settings.changePasswordModal.submit': 'పాస్‌వర్డ్ మార్చండి',
  'settings.deleteAccountModal.submit': 'ఖాతా తొలగించండి',
  'settings.failedToUpdateEmail': 'ఇమెయిల్ నవీకరించడంలో విఫలమైంది.',
  'settings.failedToDeleteAccount': 'ఖాతాను తొలగించడంలో విఫలమైంది.',
  'settings.toggleTwoFactor': 'రెండు-కారకాల ధ్రువీకరణను టోగుల్ చేయండి',
  'settings.togglePushNotifications': 'పుష్ నోటిఫికేషన్‌లను టోగుల్ చేయండి',

  // Footer
  'footer.about': '{{appName}} గురించి',
  'footer.privacyPolicy': 'గోప్యతా విధానం',
  'footer.termsOfService': 'సేవా నిబంధనలు',
  'footer.language': 'భాష',

  // OAuth
  'oauth.orContinueWith': 'లేదా దీని ద్వారా కొనసాగించండి',
  'oauth.continueWith': '{{provider}} ద్వారా కొనసాగించండి',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'థీమ్ మార్చండి',

  // User Menu
  'userMenu.open': 'యూజర్ మెనూ తెరవండి',

  // Plan Updated
  'planUpdated.message': 'మీ ప్లాన్ అప్‌డేట్ చేయబడింది.',
  'planUpdated.thankYou': 'ధన్యవాదాలు!',
  'planUpdated.returnHome': 'హోమ్‌కు తిరిగి వెళ్ళండి',

  // PWA
  'pwa.updateAvailable': 'కొత్త సంస్కరణ అందుబాటులో ఉంది!',
  'pwa.update': 'నవీకరించండి',
  'pwa.updating': 'నవీకరిస్తోంది...',

  // User API errors
  'user.error.badRequest': 'చెడ్డ అభ్యర్థన.',
  'user.error.notFound': 'కనుగొనబడలేదు.',
  'user.error.failedToCreateSession': 'సెషన్ సృష్టించడంలో విఫలమైంది.',
  'user.error.usernameRequired': 'వినియోగదారు పేరు అవసరం.',
  'user.error.passwordRequired': 'పాస్‌వర్డ్ అవసరం.',
  'user.error.emailInvalid': 'ఇమెయిల్ చెల్లదు.',
  'user.error.usernameUnavailable': 'వినియోగదారు పేరు అందుబాటులో లేదు.',
  'user.error.emailAlreadyRegistered': 'ఇమెయిల్ ఇప్పటికే నమోదైంది.',
  'user.error.failedToHashPassword': 'పాస్‌వర్డ్ హ్యాష్ చేయడంలో విఫలమైంది.',
  'user.error.invalidCredentials': 'చెల్లని ఆధారాలు.',
  'user.error.invalidTwoFactorToken': 'చెల్లని రెండు-కారకాల టోకన్.',
  'user.error.twoFactorVerificationUnavailable': 'రెండు-కారకాల ధృవీకరణ అందుబాటులో లేదు.',
  'user.error.loginFailed': 'లాగిన్ విఫలమైంది.',
  'user.error.usernameCannotBeEmpty': 'వినియోగదారు పేరు ఖాళీగా ఉండకూడదు.',
  'user.error.failedToUpdateUser': 'వినియోగదారుని అప్‌డేట్ చేయడంలో విఫలమైంది.',
  'user.error.failedToDeleteUser': 'వినియోగదారుని తొలగించడంలో విఫలమైంది.',
  'user.error.failedToReadUser': 'వినియోగదారుని చదవడంలో విఫలమైంది.',
  'user.error.emailRequired': 'ఇమెయిల్ అవసరం.',
  'user.error.failedToProcessPasswordReset': 'పాస్‌వర్డ్ రీసెట్ ప్రాసెస్ చేయడంలో విఫలమైంది.',
  'user.error.newPasswordRequired': 'కొత్త పాస్‌వర్డ్ అవసరం.',
  'user.error.currentPasswordRequired': 'ప్రస్తుత పాస్‌వర్డ్ అవసరం.',
  'user.error.currentPasswordIncorrect': 'ప్రస్తుత పాస్‌వర్డ్ తప్పు.',
  'user.error.failedToUpdatePassword': 'పాస్‌వర్డ్ అప్‌డేట్ చేయడంలో విఫలమైంది.',
  'user.error.planKeyRequired': 'planKey అవసరం.',
  'user.error.invalidPlan': 'చెల్లని ప్లాన్.',
  'user.error.failedToUpdateSubscription': 'సబ్‌స్క్రిప్షన్ అప్‌డేట్ చేయడంలో విఫలమైంది.',
  'user.error.failedToUpdatePlan': 'ప్లాన్ అప్‌డేట్ చేయడంలో విఫలమైంది.',
  'user.error.twoFactorNotAvailable': 'రెండు-కారకాల ప్రమాణీకరణ అందుబాటులో లేదు.',
  'user.error.tokenRequired': 'టోకన్ అవసరం.',
  'user.error.noPendingTwoFactorSetup':
    'పెండింగ్ రెండు-కారకాల సెటప్ లేదు. మొదట "setup" చర్యతో కాల్ చేయండి.',
  'user.error.invalidToken': 'చెల్లని టోకన్.',
  'user.error.twoFactorNotEnabled': 'రెండు-కారకాలు ఎనేబుల్ కాలేదు.',
  'user.error.invalidAction': 'చెల్లని చర్య. "setup", "enable", లేదా "disable" వాడండి.',
  'user.error.twoFactorOperationFailed': 'రెండు-కారకాల ఆపరేషన్ విఫలమైంది.',
  'user.error.oauthServerNotConfigured': 'OAuth సర్వర్ "{{server}}" కాన్ఫిగర్ చేయబడలేదు.',
  'user.error.oauthVerificationFailed': 'OAuth ధృవీకరణ విఫలమైంది.',
  'user.error.failedToCreateUser': 'వినియోగదారుని సృష్టించడంలో విఫలమైంది.',
  'user.error.oauthLoginFailed': 'OAuth లాగిన్ విఫలమైంది.',

  // Auth client errors
  'auth.error.requestFailed': 'అభ్యర్థన విఫలమైంది',
  'auth.error.loginFailed': 'లాగిన్ విఫలమైంది',
  'auth.error.registrationFailed': 'నమోదు విఫలమైంది',
  'auth.error.noRefreshToken': 'రిఫ్రెష్ టోకన్ అందుబాటులో లేదు',

  // Form validation
  'forms.required': 'ఈ ఫీల్డ్ అవసరం',
  'forms.min': 'విలువ కనీసం {{min}} ఉండాలి',
  'forms.max': 'విలువ గరిష్టంగా {{max}} ఉండాలి',
  'forms.minLength': 'కనీసం {{minLength}} అక్షరాలు ఉండాలి',
  'forms.maxLength': 'గరిష్టంగా {{maxLength}} అక్షరాలు ఉండాలి',
  'forms.invalidFormat': 'చెల్లని ఆకృతి',
  'forms.invalidEmail': 'చెల్లని ఇమెయిల్ చిరునామా',
  'forms.invalidUrl': 'చెల్లని URL',
  'forms.invalidValue': 'చెల్లని విలువ',

  // HTTP client errors
  'http.error.requestFailed': 'స్టేటస్ {{status}} తో అభ్యర్థన విఫలమైంది.',
  'http.error.networkError': 'నెట్‌వర్క్ లోపం.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" మార్గానికి "{{name}}" పారామీటర్ లేదు',
  'routing.error.routeNotFound': '"{{name}}" మార్గం కనుగొనబడలేదు',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ను MoleculeRouterProvider లోపల ఉపయోగించాలి',

  // Push notification errors
  'push.error.notSupported': 'పుష్ నోటిఫికేషన్‌లు మద్దతు లేదు',
  'push.error.permissionNotGranted': 'నోటిఫికేషన్ అనుమతి ఇవ్వబడలేదు',

  // Utility errors
  'error.networkError': 'నెట్‌వర్క్ లోపం. మీ కనెక్షన్ తనిఖీ చేయండి.',
  'error.timeout': 'అభ్యర్థన సమయం ముగిసింది. మళ్ళీ ప్రయత్నించండి.',
  'error.unauthorized': 'ఈ చర్య చేయడానికి మీకు అధికారం లేదు.',
  'error.forbidden': 'ప్రవేశం నిరాకరించబడింది.',
  'error.notFound': 'వనరు కనుగొనబడలేదు.',
  'error.validationError': 'మీ ఇన్‌పుట్ తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.',
  'error.serverError': 'సర్వర్ లోపం. తర్వాత మళ్ళీ ప్రయత్నించండి.',
  'error.unknown': 'ఊహించని లోపం సంభవించింది.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message అవసరం',
  'conversation.error.aiNotConfigured': 'AI ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు',
  'conversation.error.unknownAiError': 'తెలియని AI లోపం',
  'conversation.error.notFound': 'సంభాషణ కనుగొనబడలేదు',
  'conversation.error.streamError': 'AI స్ట్రీమింగ్ లోపం',

  // Resource errors
  'resource.error.unknownError': 'తెలియని లోపం.',
  'resource.error.unableToCreate': '{{name}} సృష్టించలేకపోయింది.',
  'resource.error.unableToUpdate': '{{name}} అప్‌డేట్ చేయలేకపోయింది.',
  'resource.error.unableToDelete': '{{name}} తొలగించలేకపోయింది.',
  'resource.error.notFound': 'కనుగొనబడలేదు.',
  'resource.error.badRequest': 'చెడ్డ అభ్యర్థన.',
  'resource.error.unauthorized': 'అనధికారం.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name మరియు projectType అవసరం',
  'project.error.notFound': 'కనుగొనబడలేదు',

  // Device errors
  'device.error.unauthorized': 'అనధికారం.',
  'device.error.badRequest': 'చెడ్డ అభ్యర్థన.',
  'device.error.notFound': 'కనుగొనబడలేదు.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} చదవడం విఫలమైంది: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} రాయడం విఫలమైంది: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} తొలగించడం విఫలమైంది: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'చెల్లింపు ప్రొవైడర్ అవసరం.',
  'user.payment.subscriptionIdRequired': 'subscriptionId అవసరం.',
  'user.payment.receiptAndPlanRequired': 'receipt మరియు planKey అవసరం.',
  'user.payment.verificationNotConfigured':
    '{{provider}} కోసం చెల్లింపు ధృవీకరణ కాన్ఫిగర్ చేయబడలేదు.',
  'user.payment.invalidPlan': 'చెల్లని ప్లాన్.',
  'user.payment.verificationFailed': 'సబ్‌స్క్రిప్షన్ ధృవీకరించడంలో విఫలమైంది.',
  'user.payment.unknownPlan': 'తెలియని ప్లాన్.',
  'user.payment.invalidWebhookEvent': 'చెల్లని వెబ్‌హుక్ ఈవెంట్.',
}
