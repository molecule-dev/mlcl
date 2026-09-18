/**
 * Georgian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'იტვირთება...',
  'common.saving': 'ინახება...',
  'common.close': 'დახურვა',
  'common.goBack': 'უკან დაბრუნება',
  'common.submit': 'გაგზავნა',
  'common.continue': 'გაგრძელება',

  // Auth - Login
  'auth.login.email': 'ელფოსტა',
  'auth.login.password': 'პაროლი',
  'auth.login.twoFactor': 'ორფაქტორიანი კოდი (თუ ჩართულია)',
  'auth.login.signUp': 'რეგისტრაცია',
  'auth.login.loggingIn': 'შესვლა მიმდინარეობს...',
  'auth.login.logIn': 'შესვლა',
  'auth.login.forgotPassword': 'დაგავიწყდათ პაროლი?',

  // Auth - Signup
  'auth.signup.email': 'ელფოსტა (სავალდებულო)',
  'auth.signup.password': 'პაროლი (სავალდებულო)',
  'auth.signup.name': 'თქვენი სახელი',
  'auth.signup.signingUp': 'რეგისტრაცია მიმდინარეობს...',
  'auth.signup.signUp': 'რეგისტრაცია',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'თუ ამ ელფოსტით ანგარიში არსებობს, პაროლის აღდგენის ბმული გაგზავნილია.',
  'auth.forgotPassword.email': 'ელფოსტა',
  'auth.forgotPassword.submitting': 'იგზავნება...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'ელფოსტა',
  'auth.resetPassword.token': 'პაროლის აღდგენის კოდი',
  'auth.resetPassword.newPassword': 'შეიყვანეთ ახალი პაროლი',
  'auth.resetPassword.twoFactor': 'ორფაქტორიანი კოდი (თუ ჩართულია)',
  'auth.resetPassword.loggingIn': 'შესვლა მიმდინარეობს...',
  'auth.resetPassword.submit': 'პაროლის დაყენება და შესვლა',

  // Home
  'home.greeting': 'გამარჯობა, ',
  'home.world': 'სამყარო',

  // Settings
  'settings.account': 'ანგარიში',
  'settings.email': 'ელფოსტა',
  'settings.authentication': 'ავთენტიფიკაცია',
  'settings.changePassword': 'პაროლის შეცვლა',
  'settings.twoFactor': 'ორფაქტორიანი ავთენტიფიკაცია',
  'settings.notifications': 'შეტყობინებები',
  'settings.pushNotifications': 'Push შეტყობინებები',
  'settings.billing': 'გადახდა',
  'settings.plan': 'გეგმა: ',
  'settings.upgrade': 'განახლება',
  'settings.devices': 'მოწყობილობები',
  'settings.noDevices': 'მოწყობილობები ვერ მოიძებნა',
  'settings.thisDevice': 'ეს მოწყობილობა',
  'settings.platform': 'პლატფორმა',
  'settings.browser': 'ბრაუზერი',
  'settings.network': 'ქსელი',
  'settings.online': 'ონლაინ',
  'settings.offline': 'ოფლაინ',
  'settings.unknown': 'უცნობი',
  'settings.logOut': 'გასვლა',
  'settings.deleteAccount': 'ანგარიშის წაშლა',
  'settings.changePasswordModal.title': 'პაროლის შეცვლა',
  'settings.changePasswordModal.error': 'პაროლის შეცვლა ვერ მოხერხდა.',
  'settings.changePasswordModal.currentPassword': 'მიმდინარე პაროლი',
  'settings.changePasswordModal.newPassword': 'ახალი პაროლი',
  'settings.changePasswordModal.changing': 'იცვლება...',
  'settings.deleteAccountModal.title': 'ანგარიშის წაშლა',
  'settings.deleteAccountModal.warning':
    'ეს მოქმედება შეუქცევადია. დასადასტურებლად შეიყვანეთ თქვენი პაროლი.',
  'settings.deleteAccountModal.password': 'პაროლი',
  'settings.deleteAccountModal.deleting': 'იშლება...',
  'settings.changePasswordModal.submit': 'პაროლის შეცვლა',
  'settings.deleteAccountModal.submit': 'ანგარიშის წაშლა',
  'settings.failedToUpdateEmail': 'ელ. ფოსტის განახლება ვერ მოხერხდა.',
  'settings.failedToDeleteAccount': 'ანგარიშის წაშლა ვერ მოხერხდა.',
  'settings.toggleTwoFactor': 'ორფაქტორიანი ავთენტიფიკაციის გადართვა',
  'settings.togglePushNotifications': 'Push შეტყობინებების გადართვა',

  // Footer
  'footer.about': '{{appName}}-ის შესახებ',
  'footer.privacyPolicy': 'კონფიდენციალურობის პოლიტიკა',
  'footer.termsOfService': 'მომსახურების პირობები',
  'footer.language': 'ენა',

  // OAuth
  'oauth.orContinueWith': 'ან გააგრძელეთ შემდეგით',
  'oauth.continueWith': 'გაგრძელება {{provider}}-ით',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'თემის გადართვა',

  // User Menu
  'userMenu.open': 'მომხმარებლის მენიუს გახსნა',

  // Plan Updated
  'planUpdated.message': 'თქვენი გეგმა განახლდა.',
  'planUpdated.thankYou': 'გმადლობთ!',
  'planUpdated.returnHome': 'მთავარ გვერდზე დაბრუნება',

  // PWA
  'pwa.updateAvailable': 'ახალი ვერსია ხელმისაწვდომია!',
  'pwa.update': 'განახლება',
  'pwa.updating': 'განახლდება...',

  // User API errors
  'user.error.badRequest': 'Tsudi motkhovna.',
  'user.error.notFound': 'Ver moidzebna.',
  'user.error.failedToCreateSession': 'Sesiis shektsra ver mokherkhda.',
  'user.error.usernameRequired': 'Momkhmareblis sakheli sachiroa.',
  'user.error.passwordRequired': 'Paroli sachiroa.',
  'user.error.emailInvalid': 'Email aratsvalidia.',
  'user.error.usernameUnavailable': 'Momkhmareblis sakheli ar aris khelmisamisvdomia.',
  'user.error.emailAlreadyRegistered': 'Email ukve registrirebulia.',
  'user.error.failedToHashPassword': 'Parolis heshireba ver mokherkhda.',
  'user.error.invalidCredentials': 'Aratsvalidi rtsmunebadobebi.',
  'user.error.invalidTwoFactorToken': 'Aratsvalidi orpaqtoriani tokeni.',
  'user.error.twoFactorVerificationUnavailable':
    'Orpaqtoriani veripikacia ar aris khelmisamisvdomia.',
  'user.error.loginFailed': 'Shesvla ver mokherkhda.',
  'user.error.usernameCannotBeEmpty': 'Momkhmareblis sakheli ar sheidzleba ikhos tsarieli.',
  'user.error.failedToUpdateUser': 'Momkhmareblis ganakhlieba ver mokherkhda.',
  'user.error.failedToDeleteUser': 'Momkhmareblis tsashla ver mokherkhda.',
  'user.error.failedToReadUser': 'Momkhmareblis tsaakitkhva ver mokherkhda.',
  'user.error.emailRequired': 'Email sachiroa.',
  'user.error.failedToProcessPasswordReset': 'Parolis ghhdgadgenies damamushaveba ver mokherkhda.',
  'user.error.newPasswordRequired': 'Akhali paroli sachiroa.',
  'user.error.currentPasswordRequired': 'Mimdinare paroli sachiroa.',
  'user.error.currentPasswordIncorrect': 'Mimdinare paroli arastoria.',
  'user.error.failedToUpdatePassword': 'Parolis ganakhlieba ver mokherkhda.',
  'user.error.planKeyRequired': 'planKey sachiroa.',
  'user.error.invalidPlan': 'Aratsvalidi gegma.',
  'user.error.failedToUpdateSubscription': 'Gamotseris ganakhlieba ver mokherkhda.',
  'user.error.failedToUpdatePlan': 'Gegmis ganakhlieba ver mokherkhda.',
  'user.error.twoFactorNotAvailable': 'Orpaqtoriani autentipikacia ar aris khelmisamisvdomia.',
  'user.error.tokenRequired': 'Tokeni sachiroa.',
  'user.error.noPendingTwoFactorSetup':
    'Molodinis orpaqtoriani daqeneba ar arsebobs. Gamoizeniet "setup" moqmedobit.',
  'user.error.invalidToken': 'Aratsvalidi tokeni.',
  'user.error.twoFactorNotEnabled': 'Orpaqtoriani ar aris chartuli.',
  'user.error.invalidAction': 'Aratsvalidi moqmedeba. Gamoiqenet "setup", "enable" an "disable".',
  'user.error.twoFactorOperationFailed': 'Orpaqtoriani operatsia ver mokherkhda.',
  'user.error.oauthServerNotConfigured': 'OAuth serveri "{{server}}" ar aris konphiguratsirebulia.',
  'user.error.oauthVerificationFailed': 'OAuth veripikacia ver mokherkhda.',
  'user.error.failedToCreateUser': 'Momkhmareblis shektsra ver mokherkhda.',
  'user.error.oauthLoginFailed': 'OAuth shesvla ver mokherkhda.',

  // Auth client errors
  'auth.error.requestFailed': 'Motkhovna ver mokherkhda',
  'auth.error.loginFailed': 'Shesvla ver mokherkhda',
  'auth.error.registrationFailed': 'Registratsia ver mokherkhda',
  'auth.error.noRefreshToken': 'Ganakhlebis tokeni ar arsebobs',

  // Form validation
  'forms.required':
    '\u10d4\u10e1 \u10d5\u10d4\u10da\u10d8 \u10e1\u10d0\u10d5\u10d0\u10da\u10d3\u10d4\u10d1\u10e3\u10da\u10dd\u10d0',
  'forms.min':
    '\u10db\u10dc\u10d8\u10e8\u10d5\u10dc\u10d4\u10da\u10dd\u10d1\u10d0 \u10e3\u10dc\u10d3\u10d0 \u10d8\u10e7\u10dd\u10e1 \u10db\u10d8\u10dc\u10d8\u10db\u10e3\u10db {{min}}',
  'forms.max':
    '\u10db\u10dc\u10d8\u10e8\u10d5\u10dc\u10d4\u10da\u10dd\u10d1\u10d0 \u10e3\u10dc\u10d3\u10d0 \u10d8\u10e7\u10dd\u10e1 \u10db\u10d0\u10e5\u10e1\u10d8\u10db\u10e3\u10db {{max}}',
  'forms.minLength':
    '\u10e3\u10dc\u10d3\u10d0 \u10d8\u10e7\u10dd\u10e1 \u10db\u10d8\u10dc\u10d8\u10db\u10e3\u10db {{minLength}} \u10e1\u10d8\u10db\u10d1\u10dd\u10da\u10dd',
  'forms.maxLength':
    '\u10e3\u10dc\u10d3\u10d0 \u10d8\u10e7\u10dd\u10e1 \u10db\u10d0\u10e5\u10e1\u10d8\u10db\u10e3\u10db {{maxLength}} \u10e1\u10d8\u10db\u10d1\u10dd\u10da\u10dd',
  'forms.invalidFormat':
    '\u10d0\u10e0\u10d0\u10e1\u10ec\u10dd\u10e0\u10d8 \u10e4\u10dd\u10e0\u10db\u10d0\u10e2\u10d8',
  'forms.invalidEmail':
    '\u10d0\u10e0\u10d0\u10e1\u10ec\u10dd\u10e0\u10d8 \u10d4\u10da\u10d4\u10e5\u10e2\u10e0\u10dd\u10dc\u10e3\u10da\u10d8 \u10e4\u10dd\u10e1\u10e2\u10d8\u10e1 \u10db\u10d8\u10e1\u10d0\u10db\u10d0\u10e0\u10d7\u10d8',
  'forms.invalidUrl': '\u10d0\u10e0\u10d0\u10e1\u10ec\u10dd\u10e0\u10d8 URL',
  'forms.invalidValue':
    '\u10d0\u10e0\u10d0\u10e1\u10ec\u10dd\u10e0\u10d8 \u10db\u10dc\u10d8\u10e8\u10d5\u10dc\u10d4\u10da\u10dd\u10d1\u10d0',

  // HTTP client errors
  'http.error.requestFailed': 'Motkhovna ver mokherkhda statusit {{status}}.',
  'http.error.networkError': 'Kseluri shetsdoma.',

  // Routing errors
  'routing.error.missingParam': 'პარამეტრი "{{name}}" არ არის ბილიკისთვის "{{pattern}}"',
  'routing.error.routeNotFound': 'მარშრუტი "{{name}}" ვერ მოიძებნა',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter უნდა გამოიყენოთ MoleculeRouterProvider-ის შიგნით',

  // Push notification errors
  'push.error.notSupported': 'Push shetkdobinebi ar aris mkhardalchebuli',
  'push.error.permissionNotGranted': 'Shetkdobinebis nebartva ar aris mitsemuli',

  // Utility errors
  'error.networkError': 'Kseluri shetsdoma. Sheamovsmit kavshiri.',
  'error.timeout': 'Motkhovnis vadasvla. Gtatkhov isev stset.',
  'error.unauthorized': 'Tqven ar gaqvt upleba am moqmedoba.',
  'error.forbidden': 'Khelmisavdomoba akrdzalulia.',
  'error.notFound': 'Resursi ver moidzebna.',
  'error.validationError': 'Gtatkhov shemovsmit Tqveni shetanili da isev stset.',
  'error.serverError': 'Serveris shetsdoma. Gtatkhov isev stset moghvianebith.',
  'error.unknown': 'Moulodneli shetsdoma mookherkhda.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Shektyoba sachiroa',
  'conversation.error.aiNotConfigured': 'AI provaideri ar aris konphiguratsirebulia',
  'conversation.error.unknownAiError': 'Uchnobi AI shetsdoma',
  'conversation.error.notFound': 'Saubare ver moidzebna',
  'conversation.error.streamError': 'AI nakadis shetsdoma',

  // Resource errors
  'resource.error.unknownError': 'Uchnobi shetsdoma.',
  'resource.error.unableToCreate': '{{name}} shektsra ver mokherkhda.',
  'resource.error.unableToUpdate': '{{name}} ganakhlieba ver mokherkhda.',
  'resource.error.unableToDelete': '{{name}} tsashla ver mokherkhda.',
  'resource.error.notFound': 'Ver moidzebna.',
  'resource.error.badRequest': 'Tsudi motkhovna.',
  'resource.error.unauthorized': 'Araautorisebuli.',

  // Project errors
  'project.error.nameAndTypeRequired': 'sakheli da projectType sachiroa',
  'project.error.notFound': 'Ver moidzebna',

  // Device errors
  'device.error.unauthorized': 'არაავტორიზებული.',
  'device.error.badRequest': 'არასწორი მოთხოვნა.',
  'device.error.notFound': 'ვერ მოიძებნა.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}}-ის წაკითხვა ვერ მოხერხდა: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}}-ის ჩაწერა ვერ მოხერხდა: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}}-ის წაშლა ვერ მოხერხდა: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Gadakhdis provaideri sachiroa.',
  'user.payment.subscriptionIdRequired': 'subscriptionId sachiron.',
  'user.payment.receiptAndPlanRequired': 'qvitari da planKey sachiroa.',
  'user.payment.verificationNotConfigured':
    'Gadakhdis veripikacia ar aris konphiguratsirebulia {{provider}}-istvis.',
  'user.payment.invalidPlan': 'Aratsvalidi gegma.',
  'user.payment.verificationFailed': 'Gamotseris veripikacia ver mokherkhda.',
  'user.payment.unknownPlan': 'Uchnobi gegma.',
  'user.payment.invalidWebhookEvent': 'Aratsvalidi webhook movlena.',
}
