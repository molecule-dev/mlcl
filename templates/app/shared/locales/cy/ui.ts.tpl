/**
 * Welsh translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Yn llwytho...',
  'common.saving': 'Yn cadw...',
  'common.close': 'Cau',
  'common.goBack': 'Mynd yn ôl',
  'common.submit': 'Cyflwyno',
  'common.continue': 'Parhau',

  // Auth - Login
  'auth.login.email': 'E-bost',
  'auth.login.password': 'Cyfrinair',
  'auth.login.twoFactor': 'Tocyn dau ffactor (Os yw wedi\'i alluogi)',
  'auth.login.signUp': 'Cofrestru',
  'auth.login.loggingIn': 'Yn mewngofnodi...',
  'auth.login.logIn': 'Mewngofnodi',
  'auth.login.forgotPassword': 'Wedi anghofio\'r cyfrinair?',

  // Auth - Signup
  'auth.signup.email': 'E-bost (Gofynnol)',
  'auth.signup.password': 'Cyfrinair (Gofynnol)',
  'auth.signup.name': 'Eich enw',
  'auth.signup.signingUp': 'Yn cofrestru...',
  'auth.signup.signUp': 'Cofrestru',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Os oes cyfrif gyda\'r e-bost hwnnw, mae dolen ailosod cyfrinair wedi\'i hanfon.',
  'auth.forgotPassword.email': 'E-bost',
  'auth.forgotPassword.submitting': 'Yn cyflwyno...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-bost',
  'auth.resetPassword.token': 'Tocyn ailosod cyfrinair',
  'auth.resetPassword.newPassword': 'Rhowch gyfrinair newydd',
  'auth.resetPassword.twoFactor': 'Tocyn dau ffactor (Os yw wedi\'i alluogi)',
  'auth.resetPassword.loggingIn': 'Yn mewngofnodi...',
  'auth.resetPassword.submit': 'Gosod cyfrinair a mewngofnodi',

  // Home
  'home.greeting': 'Helo, ',
  'home.world': 'Fyd',

  // Settings
  'settings.account': 'Cyfrif',
  'settings.email': 'E-bost',
  'settings.authentication': 'Dilysiad',
  'settings.changePassword': 'Newid cyfrinair',
  'settings.twoFactor': 'Dilysiad dau ffactor',
  'settings.notifications': 'Hysbysiadau',
  'settings.pushNotifications': 'Hysbysiadau push',
  'settings.billing': 'Bilio',
  'settings.plan': 'Cynllun: ',
  'settings.upgrade': 'Uwchraddio',
  'settings.devices': 'Dyfeisiau',
  'settings.noDevices': 'Dim dyfeisiau wedi\'u canfod',
  'settings.thisDevice': 'Y ddyfais hon',
  'settings.platform': 'Platfform',
  'settings.browser': 'Porwr',
  'settings.network': 'Rhwydwaith',
  'settings.online': 'Ar-lein',
  'settings.offline': 'All-lein',
  'settings.unknown': 'Anhysbys',
  'settings.logOut': 'Allgofnodi',
  'settings.deleteAccount': 'Dileu cyfrif',
  'settings.changePasswordModal.title': 'Newid cyfrinair',
  'settings.changePasswordModal.error': 'Methwyd â newid y cyfrinair.',
  'settings.changePasswordModal.currentPassword': 'Cyfrinair presennol',
  'settings.changePasswordModal.newPassword': 'Cyfrinair newydd',
  'settings.changePasswordModal.changing': 'Yn newid...',
  'settings.deleteAccountModal.title': 'Dileu cyfrif',
  'settings.deleteAccountModal.warning':
    'Ni ellir dadwneud y weithred hon. Rhowch eich cyfrinair i gadarnhau.',
  'settings.deleteAccountModal.password': 'Cyfrinair',
  'settings.deleteAccountModal.deleting': 'Yn dileu...',
  'settings.changePasswordModal.submit': 'Newid cyfrinair',
  'settings.deleteAccountModal.submit': 'Dileu cyfrif',
  'settings.failedToUpdateEmail': 'Methwyd â diweddaru e-bost.',
  'settings.failedToDeleteAccount': 'Methwyd â dileu\'r cyfrif.',
  'settings.toggleTwoFactor': 'Toglo dilysu dau ffactor',
  'settings.togglePushNotifications': 'Toglo hysbysiadau gwthio',

  // Footer
  'footer.about': 'Am {{appName}}',
  'footer.privacyPolicy': 'Polisi preifatrwydd',
  'footer.termsOfService': 'Telerau gwasanaeth',
  'footer.language': 'Iaith',

  // OAuth
  'oauth.orContinueWith': 'Neu parhau gyda',
  'oauth.continueWith': 'Parhau gyda {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Toglo thema',

  // User Menu
  'userMenu.open': 'Agor dewislen defnyddiwr',

  // Plan Updated
  'planUpdated.message': 'Mae eich cynllun wedi\'i ddiweddaru.',
  'planUpdated.thankYou': 'Diolch!',
  'planUpdated.returnHome': 'Dychwelyd adref',

  // PWA
  'pwa.updateAvailable': 'Fersiwn newydd ar gael!',
  'pwa.update': 'Diweddaru',
  'pwa.updating': 'Yn diweddaru...',

  // User API errors
  'user.error.badRequest': 'Cais gwael.',
  'user.error.notFound': 'Heb ei ganfod.',
  'user.error.failedToCreateSession': 'Methwyd creu sesiwn.',
  'user.error.usernameRequired': 'Mae angen enw defnyddiwr.',
  'user.error.passwordRequired': 'Mae angen cyfrinair.',
  'user.error.emailInvalid': 'E-bost annilys.',
  'user.error.usernameUnavailable': 'Enw defnyddiwr ddim ar gael.',
  'user.error.emailAlreadyRegistered': "E-bost eisoes wedi'i gofrestru.",
  'user.error.failedToHashPassword': 'Methwyd hasio cyfrinair.',
  'user.error.invalidCredentials': 'Manylion annilys.',
  'user.error.invalidTwoFactorToken': 'Tocyn dau-ffactor annilys.',
  'user.error.twoFactorVerificationUnavailable': 'Dilysu dau-ffactor ddim ar gael.',
  'user.error.loginFailed': 'Mewngofnodi wedi methu.',
  'user.error.usernameCannotBeEmpty': 'Ni all enw defnyddiwr fod yn wag.',
  'user.error.failedToUpdateUser': 'Methwyd diweddaru defnyddiwr.',
  'user.error.failedToDeleteUser': 'Methwyd dileu defnyddiwr.',
  'user.error.failedToReadUser': 'Methwyd darllen defnyddiwr.',
  'user.error.emailRequired': 'Mae angen e-bost.',
  'user.error.failedToProcessPasswordReset': 'Methwyd prosesu ailosod cyfrinair.',
  'user.error.newPasswordRequired': 'Mae angen cyfrinair newydd.',
  'user.error.currentPasswordRequired': 'Mae angen cyfrinair presennol.',
  'user.error.currentPasswordIncorrect': 'Cyfrinair presennol yn anghywir.',
  'user.error.failedToUpdatePassword': 'Methwyd diweddaru cyfrinair.',
  'user.error.planKeyRequired': 'Mae angen planKey.',
  'user.error.invalidPlan': 'Cynllun annilys.',
  'user.error.failedToUpdateSubscription': 'Methwyd diweddaru tanysgrifiad.',
  'user.error.failedToUpdatePlan': 'Methwyd diweddaru cynllun.',
  'user.error.twoFactorNotAvailable': 'Nid yw dilysu dau-ffactor ar gael.',
  'user.error.tokenRequired': 'Mae angen tocyn.',
  'user.error.noPendingTwoFactorSetup':
    'Dim gosodiad dau-ffactor yn aros. Galwch gyda gweithred "setup" yn gyntaf.',
  'user.error.invalidToken': 'Tocyn annilys.',
  'user.error.twoFactorNotEnabled': "Nid yw dau-ffactor wedi'i alluogi.",
  'user.error.invalidAction': 'Gweithred annilys. Defnyddiwch "setup", "enable", neu "disable".',
  'user.error.twoFactorOperationFailed': 'Gweithrediad dau-ffactor wedi methu.',
  'user.error.oauthServerNotConfigured': 'Gweinydd OAuth "{{server}}" heb ei ffurfweddu.',
  'user.error.oauthVerificationFailed': 'Dilysu OAuth wedi methu.',
  'user.error.failedToCreateUser': 'Methwyd creu defnyddiwr.',
  'user.error.oauthLoginFailed': 'Mewngofnodi OAuth wedi methu.',

  // Auth client errors
  'auth.error.requestFailed': 'Cais wedi methu',
  'auth.error.loginFailed': 'Mewngofnodi wedi methu',
  'auth.error.registrationFailed': 'Cofrestru wedi methu',
  'auth.error.noRefreshToken': 'Dim tocyn adnewyddu ar gael',

  // Form validation
  'forms.required': "Mae'r maes hwn yn ofynnol",
  'forms.min': "Rhaid i'r gwerth fod o leiaf {{min}}",
  'forms.max': "Rhaid i'r gwerth fod ar y mwyaf {{max}}",
  'forms.minLength': 'Rhaid bod o leiaf {{minLength}} nod',
  'forms.maxLength': 'Rhaid bod ar y mwyaf {{maxLength}} nod',
  'forms.invalidFormat': 'Fformat annilys',
  'forms.invalidEmail': 'Cyfeiriad e-bost annilys',
  'forms.invalidUrl': 'URL annilys',
  'forms.invalidValue': 'Gwerth annilys',

  // HTTP client errors
  'http.error.requestFailed': 'Cais wedi methu gyda statws {{status}}.',
  'http.error.networkError': 'Gwall rhwydwaith.',

  // Routing errors
  'routing.error.missingParam': 'Paramedr "{{name}}" ar goll ar gyfer llwybr "{{pattern}}"',
  'routing.error.routeNotFound': 'Ni chanfuwyd y llwybr "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Rhaid defnyddio useMoleculeRouter o fewn MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Nid yw hysbysiadau gwthio yn cael eu cefnogi',
  'push.error.permissionNotGranted': 'Caniatâd hysbysiad heb ei roi',

  // Utility errors
  'error.networkError': 'Gwall rhwydwaith. Gwiriwch eich cysylltiad.',
  'error.timeout': 'Cais wedi dod i ben. Rhowch gynnig arall arni.',
  'error.unauthorized': "Nid ydych wedi'ch awdurdodi i wneud hyn.",
  'error.forbidden': "Mynediad wedi'i wrthod.",
  'error.notFound': 'Adnodd heb ei ganfod.',
  'error.validationError': 'Gwiriwch eich mewnbwn a rhowch gynnig arall.',
  'error.serverError': 'Gwall gweinydd. Rhowch gynnig arall yn nes ymlaen.',
  'error.unknown': 'Digwyddodd gwall annisgwyl.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Mae angen neges',
  'conversation.error.aiNotConfigured': 'Darparwr AI heb ei ffurfweddu',
  'conversation.error.unknownAiError': 'Gwall AI anhysbys',
  'conversation.error.notFound': "Dim sgwrs wedi'i chanfod",
  'conversation.error.streamError': 'Gwall ffrydio AI',

  // Resource errors
  'resource.error.unknownError': 'Gwall anhysbys.',
  'resource.error.unableToCreate': 'Methu creu {{name}}.',
  'resource.error.unableToUpdate': 'Methu diweddaru {{name}}.',
  'resource.error.unableToDelete': 'Methu dileu {{name}}.',
  'resource.error.notFound': 'Heb ei ganfod.',
  'resource.error.badRequest': 'Cais gwael.',
  'resource.error.unauthorized': 'Heb awdurdod.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Mae angen enw a projectType',
  'project.error.notFound': 'Heb ei ganfod',

  // Device errors
  'device.error.unauthorized': 'Heb awdurdod.',
  'device.error.badRequest': 'Cais annilys.',
  'device.error.notFound': 'Heb ei ganfod.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Methodd darllen {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Methodd ysgrifennu {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Methodd dileu {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Mae angen darparwr taliad.',
  'user.payment.subscriptionIdRequired': 'Mae angen subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Mae angen derbynneb a planKey.',
  'user.payment.verificationNotConfigured':
    "Nid yw dilysu taliad wedi'i ffurfweddu ar gyfer {{provider}}.",
  'user.payment.invalidPlan': 'Cynllun annilys.',
  'user.payment.verificationFailed': 'Methwyd dilysu tanysgrifiad.',
  'user.payment.unknownPlan': 'Cynllun anhysbys.',
  'user.payment.invalidWebhookEvent': 'Digwyddiad bachyn gwe annilys.',
}
