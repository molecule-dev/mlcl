/**
 * Gujarati translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'લોડ થઈ રહ્યું છે...',
  'common.saving': 'સાચવી રહ્યું છે...',
  'common.close': 'બંધ કરો',
  'common.goBack': 'પાછા જાઓ',
  'common.submit': 'સબમિટ કરો',
  'common.continue': 'ચાલુ રાખો',

  // Auth - Login
  'auth.login.email': 'ઈમેઈલ',
  'auth.login.password': 'પાસવર્ડ',
  'auth.login.twoFactor': 'દ્વિ-પરિબળ ટોકન (સક્ષમ હોય તો)',
  'auth.login.signUp': 'સાઇન અપ કરો',
  'auth.login.loggingIn': 'લૉગ ઇન થઈ રહ્યું છે...',
  'auth.login.logIn': 'લૉગ ઇન કરો',
  'auth.login.forgotPassword': 'પાસવર્ડ ભૂલી ગયા?',

  // Auth - Signup
  'auth.signup.email': 'ઈમેઈલ (જરૂરી)',
  'auth.signup.password': 'પાસવર્ડ (જરૂરી)',
  'auth.signup.name': 'તમારું નામ',
  'auth.signup.signingUp': 'સાઇન અપ થઈ રહ્યું છે...',
  'auth.signup.signUp': 'સાઇન અપ કરો',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'જો તે ઈમેઈલ સાથે કોઈ ખાતું હોય, તો પાસવર્ડ રીસેટ લિંક મોકલવામાં આવી છે.',
  'auth.forgotPassword.email': 'ઈમેઈલ',
  'auth.forgotPassword.submitting': 'સબમિટ થઈ રહ્યું છે...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ઈમેઈલ',
  'auth.resetPassword.token': 'પાસવર્ડ રીસેટ ટોકન',
  'auth.resetPassword.newPassword': 'નવો પાસવર્ડ દાખલ કરો',
  'auth.resetPassword.twoFactor': 'દ્વિ-પરિબળ ટોકન (સક્ષમ હોય તો)',
  'auth.resetPassword.loggingIn': 'લૉગ ઇન થઈ રહ્યું છે...',
  'auth.resetPassword.submit': 'પાસવર્ડ સેટ કરો અને લૉગ ઇન કરો',

  // Home
  'home.greeting': 'નમસ્તે, ',
  'home.world': 'વિશ્વ',

  // Settings
  'settings.account': 'ખાતું',
  'settings.email': 'ઈમેઈલ',
  'settings.authentication': 'પ્રમાણીકરણ',
  'settings.changePassword': 'પાસવર્ડ બદલો',
  'settings.twoFactor': 'દ્વિ-પરિબળ પ્રમાણીકરણ',
  'settings.notifications': 'સૂચનાઓ',
  'settings.pushNotifications': 'પુશ સૂચનાઓ',
  'settings.billing': 'બિલિંગ',
  'settings.plan': 'યોજના: ',
  'settings.upgrade': 'અપગ્રેડ કરો',
  'settings.devices': 'ઉપકરણો',
  'settings.noDevices': 'કોઈ ઉપકરણ મળ્યું નથી',
  'settings.thisDevice': 'આ ઉપકરણ',
  'settings.platform': 'પ્લેટફોર્મ',
  'settings.browser': 'બ્રાઉઝર',
  'settings.network': 'નેટવર્ક',
  'settings.online': 'ઓનલાઈન',
  'settings.offline': 'ઓફલાઈન',
  'settings.unknown': 'અજ્ઞાત',
  'settings.logOut': 'લૉગ આઉટ',
  'settings.deleteAccount': 'ખાતું કાઢી નાખો',
  'settings.changePasswordModal.title': 'પાસવર્ડ બદલો',
  'settings.changePasswordModal.error': 'પાસવર્ડ બદલવામાં નિષ્ફળ.',
  'settings.changePasswordModal.currentPassword': 'વર્તમાન પાસવર્ડ',
  'settings.changePasswordModal.newPassword': 'નવો પાસવર્ડ',
  'settings.changePasswordModal.changing': 'બદલાઈ રહ્યું છે...',
  'settings.deleteAccountModal.title': 'ખાતું કાઢી નાખો',
  'settings.deleteAccountModal.warning':
    'આ ક્રિયા પૂર્વવત કરી શકાતી નથી. પુષ્ટિ કરવા માટે તમારો પાસવર્ડ દાખલ કરો.',
  'settings.deleteAccountModal.password': 'પાસવર્ડ',
  'settings.deleteAccountModal.deleting': 'કાઢી નાખી રહ્યું છે...',
  'settings.changePasswordModal.submit': 'પાસવર્ડ બદલો',
  'settings.deleteAccountModal.submit': 'ખાતું કાઢી નાખો',
  'settings.failedToUpdateEmail': 'ઇમેઇલ અપડેટ કરવામાં નિષ્ફળ.',
  'settings.failedToDeleteAccount': 'એકાઉન્ટ કાઢી નાખવામાં નિષ્ફળ.',
  'settings.toggleTwoFactor': 'દ્વિ-પરિબળ પ્રમાણીકરણ ટૉગલ કરો',
  'settings.togglePushNotifications': 'પુશ સૂચનાઓ ટૉગલ કરો',

  // Footer
  'footer.about': '{{appName}} વિશે',
  'footer.privacyPolicy': 'ગોપનીયતા નીતિ',
  'footer.termsOfService': 'સેવાની શરતો',
  'footer.language': 'ભાષા',

  // OAuth
  'oauth.orContinueWith': 'અથવા આની સાથે ચાલુ રાખો',
  'oauth.continueWith': '{{provider}} સાથે ચાલુ રાખો',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'થીમ બદલો',

  // User Menu
  'userMenu.open': 'વપરાશકર્તા મેનૂ ખોલો',

  // Plan Updated
  'planUpdated.message': 'તમારી યોજના અપડેટ કરવામાં આવી છે.',
  'planUpdated.thankYou': 'આભાર!',
  'planUpdated.returnHome': 'હોમ પર પાછા જાઓ',

  // PWA
  'pwa.updateAvailable': 'નવું સંસ્કરણ ઉપલબ્ધ છે!',
  'pwa.update': 'અપડેટ',
  'pwa.updating': 'અપડેટ થઈ રહ્યું છે...',

  // User API errors
  'user.error.badRequest': 'ખરાબ વિનંતી.',
  'user.error.notFound': 'મળ્યું નથી.',
  'user.error.failedToCreateSession': 'સેશન બનાવવામાં નિષ્ફળ.',
  'user.error.usernameRequired': 'વપરાશકર્તા નામ જરૂરી છે.',
  'user.error.passwordRequired': 'પાસવર્ડ જરૂરી છે.',
  'user.error.emailInvalid': 'ઇમેઇલ અમાન્ય છે.',
  'user.error.usernameUnavailable': 'વપરાશકર્તા નામ ઉપલબ્ધ નથી.',
  'user.error.emailAlreadyRegistered': 'ઇમેઇલ પહેલાથી નોંધાયેલ છે.',
  'user.error.failedToHashPassword': 'પાસવર્ડ હેશ કરવામાં નિષ્ફળ.',
  'user.error.invalidCredentials': 'અમાન્ય ઓળખપત્રો.',
  'user.error.invalidTwoFactorToken': 'અમાન્ય દ્વિ-પરિબળ ટોકન.',
  'user.error.twoFactorVerificationUnavailable': 'દ્વિ-પરિબળ ચકાસણી ઉપલબ્ધ નથી.',
  'user.error.loginFailed': 'લૉગિન નિષ્ફળ.',
  'user.error.usernameCannotBeEmpty': 'વપરાશકર્તા નામ ખાલી ન હોઈ શકે.',
  'user.error.failedToUpdateUser': 'વપરાશકર્તા અપડેટ કરવામાં નિષ્ફળ.',
  'user.error.failedToDeleteUser': 'વપરાશકર્તા કાઢી નાખવામાં નિષ્ફળ.',
  'user.error.failedToReadUser': 'વપરાશકર્તા વાંચવામાં નિષ્ફળ.',
  'user.error.emailRequired': 'ઇમેઇલ જરૂરી છે.',
  'user.error.failedToProcessPasswordReset': 'પાસવર્ડ રિસેટ પ્રક્રિયા કરવામાં નિષ્ફળ.',
  'user.error.newPasswordRequired': 'નવો પાસવર્ડ જરૂરી છે.',
  'user.error.currentPasswordRequired': 'વર્તમાન પાસવર્ડ જરૂરી છે.',
  'user.error.currentPasswordIncorrect': 'વર્તમાન પાસવર્ડ ખોટો છે.',
  'user.error.failedToUpdatePassword': 'પાસવર્ડ અપડેટ કરવામાં નિષ્ફળ.',
  'user.error.planKeyRequired': 'planKey જરૂરી છે.',
  'user.error.invalidPlan': 'અમાન્ય પ્લાન.',
  'user.error.failedToUpdateSubscription': 'સબ્સ્ક્રિપ્શન અપડેટ કરવામાં નિષ્ફળ.',
  'user.error.failedToUpdatePlan': 'પ્લાન અપડેટ કરવામાં નિષ્ફળ.',
  'user.error.twoFactorNotAvailable': 'દ્વિ-પરિબળ ઓથેન્ટિકેશન ઉપલબ્ધ નથી.',
  'user.error.tokenRequired': 'ટોકન જરૂરી છે.',
  'user.error.noPendingTwoFactorSetup':
    'કોઈ બાકી દ્વિ-પરિબળ સેટઅપ નથી. પહેલા "setup" ક્રિયા સાથે કૉલ કરો.',
  'user.error.invalidToken': 'અમાન્ય ટોકન.',
  'user.error.twoFactorNotEnabled': 'દ્વિ-પરિબળ સક્રિય નથી.',
  'user.error.invalidAction': 'અમાન્ય ક્રિયા. "setup", "enable", અથવા "disable" વાપરો.',
  'user.error.twoFactorOperationFailed': 'દ્વિ-પરિબળ ઓપરેશન નિષ્ફળ.',
  'user.error.oauthServerNotConfigured': 'OAuth સર્વર "{{server}}" ગોઠવાયેલ નથી.',
  'user.error.oauthVerificationFailed': 'OAuth ચકાસણી નિષ્ફળ.',
  'user.error.failedToCreateUser': 'વપરાશકર્તા બનાવવામાં નિષ્ફળ.',
  'user.error.oauthLoginFailed': 'OAuth લૉગિન નિષ્ફળ.',

  // Auth client errors
  'auth.error.requestFailed': 'વિનંતી નિષ્ફળ',
  'auth.error.loginFailed': 'લૉગિન નિષ્ફળ',
  'auth.error.registrationFailed': 'નોંધણી નિષ્ફળ',
  'auth.error.noRefreshToken': 'કોઈ રિફ્રેશ ટોકન ઉપલબ્ધ નથી',

  // Form validation
  'forms.required': 'આ ફીલ્ડ જરૂરી છે',
  'forms.min': 'મૂલ્ય ઓછામાં ઓછું {{min}} હોવું જોઈએ',
  'forms.max': 'મૂલ્ય વધુમાં વધુ {{max}} હોવું જોઈએ',
  'forms.minLength': 'ઓછામાં ઓછા {{minLength}} અક્ષરો હોવા જોઈએ',
  'forms.maxLength': 'વધુમાં વધુ {{maxLength}} અક્ષરો હોવા જોઈએ',
  'forms.invalidFormat': 'અમાન્ય ફોર્મેટ',
  'forms.invalidEmail': 'અમાન્ય ઈમેલ સરનામું',
  'forms.invalidUrl': 'અમાન્ય URL',
  'forms.invalidValue': 'અમાન્ય મૂલ્ય',

  // HTTP client errors
  'http.error.requestFailed': 'સ્ટેટસ {{status}} સાથે વિનંતી નિષ્ફળ.',
  'http.error.networkError': 'નેટવર્ક ભૂલ.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" પાથ માટે "{{name}}" પેરામીટર ખૂટે છે',
  'routing.error.routeNotFound': '"{{name}}" રૂટ મળ્યું નથી',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter નો ઉપયોગ MoleculeRouterProvider ની અંદર થવો જોઈએ',

  // Push notification errors
  'push.error.notSupported': 'પુશ સૂચનાઓ સપોર્ટેડ નથી',
  'push.error.permissionNotGranted': 'સૂચનાની પરવાનગી આપવામાં આવી નથી',

  // Utility errors
  'error.networkError': 'નેટવર્ક ભૂલ. તમારું કનેક્શન તપાસો.',
  'error.timeout': 'વિનંતીનો સમય સમાપ્ત. ફરી પ્રયાસ કરો.',
  'error.unauthorized': 'તમને આ ક્રિયા કરવાની મંજૂરી નથી.',
  'error.forbidden': 'ઍક્સેસ નામંજૂર.',
  'error.notFound': 'સંસાધન મળ્યું નથી.',
  'error.validationError': 'તમારું ઇનપુટ તપાસો અને ફરી પ્રયાસ કરો.',
  'error.serverError': 'સર્વર ભૂલ. પછીથી ફરી પ્રયાસ કરો.',
  'error.unknown': 'એક અણધારી ભૂલ આવી.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message જરૂરી છે',
  'conversation.error.aiNotConfigured': 'AI પ્રોવાઇડર ગોઠવાયેલ નથી',
  'conversation.error.unknownAiError': 'અજ્ઞાત AI ભૂલ',
  'conversation.error.notFound': 'કોઈ વાતચીત મળી નથી',
  'conversation.error.streamError': 'AI સ્ટ્રીમિંગ ભૂલ',

  // Resource errors
  'resource.error.unknownError': 'અજ્ઞાત ભૂલ.',
  'resource.error.unableToCreate': '{{name}} બનાવવામાં અસમર્થ.',
  'resource.error.unableToUpdate': '{{name}} અપડેટ કરવામાં અસમર્થ.',
  'resource.error.unableToDelete': '{{name}} કાઢી નાખવામાં અસમર્થ.',
  'resource.error.notFound': 'મળ્યું નથી.',
  'resource.error.badRequest': 'ખરાબ વિનંતી.',
  'resource.error.unauthorized': 'અનધિકૃત.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name અને projectType જરૂરી છે',
  'project.error.notFound': 'મળ્યું નથી',

  // Device errors
  'device.error.unauthorized': 'અનધિકૃત.',
  'device.error.badRequest': 'ખરાબ વિનંતી.',
  'device.error.notFound': 'મળ્યું નથી.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} વાંચવામાં નિષ્ફળ: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} લખવામાં નિષ્ફળ: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} કાઢવામાં નિષ્ફળ: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ચુકવણી પ્રદાતા જરૂરી છે.',
  'user.payment.subscriptionIdRequired': 'subscriptionId જરૂરી છે.',
  'user.payment.receiptAndPlanRequired': 'receipt અને planKey જરૂરી છે.',
  'user.payment.verificationNotConfigured': '{{provider}} માટે ચુકવણી ચકાસણી ગોઠવાયેલ નથી.',
  'user.payment.invalidPlan': 'અમાન્ય પ્લાન.',
  'user.payment.verificationFailed': 'સબ્સ્ક્રિપ્શન ચકાસવામાં નિષ્ફળ.',
  'user.payment.unknownPlan': 'અજ્ઞાત પ્લાન.',
  'user.payment.invalidWebhookEvent': 'અમાન્ય વેબહૂક ઇવેન્ટ.',
}
