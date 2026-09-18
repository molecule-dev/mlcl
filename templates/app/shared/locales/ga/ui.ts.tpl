/**
 * Irish translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Ag lódáil...',
  'common.saving': 'Ag sábháil...',
  'common.close': 'Dún',
  'common.goBack': 'Ar ais',
  'common.submit': 'Seol',
  'common.continue': 'Lean ar aghaidh',

  // Auth - Login
  'auth.login.email': 'Ríomhphost',
  'auth.login.password': 'Pasfhocal',
  'auth.login.twoFactor': 'Cód dhá chéim (Má tá sé cumasaithe)',
  'auth.login.signUp': 'Cláraigh',
  'auth.login.loggingIn': 'Ag logáil isteach...',
  'auth.login.logIn': 'Logáil isteach',
  'auth.login.forgotPassword': 'Dearmad déanta ar an bpasfhocal?',

  // Auth - Signup
  'auth.signup.email': 'Ríomhphost (Riachtanach)',
  'auth.signup.password': 'Pasfhocal (Riachtanach)',
  'auth.signup.name': 'D\'ainm',
  'auth.signup.signingUp': 'Ag clárú...',
  'auth.signup.signUp': 'Cláraigh',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Má tá cuntas leis an ríomhphost sin ann, seolaíodh nasc athshocrú pasfhocail.',
  'auth.forgotPassword.email': 'Ríomhphost',
  'auth.forgotPassword.submitting': 'Ag seoladh...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Ríomhphost',
  'auth.resetPassword.token': 'Cód athshocrú pasfhocail',
  'auth.resetPassword.newPassword': 'Cuir isteach pasfhocal nua',
  'auth.resetPassword.twoFactor': 'Cód dhá chéim (Má tá sé cumasaithe)',
  'auth.resetPassword.loggingIn': 'Ag logáil isteach...',
  'auth.resetPassword.submit': 'Socraigh pasfhocal agus logáil isteach',

  // Home
  'home.greeting': 'Dia duit, ',
  'home.world': 'A Dhomhain',

  // Settings
  'settings.account': 'Cuntas',
  'settings.email': 'Ríomhphost',
  'settings.authentication': 'Fíordheimhniú',
  'settings.changePassword': 'Athraigh pasfhocal',
  'settings.twoFactor': 'Fíordheimhniú dhá chéim',
  'settings.notifications': 'Fógraí',
  'settings.pushNotifications': 'Fógraí push',
  'settings.billing': 'Billáil',
  'settings.plan': 'Plean: ',
  'settings.upgrade': 'Uasghrádu',
  'settings.devices': 'Gléasanna',
  'settings.noDevices': 'Ní bhfuarthas aon ghléas',
  'settings.thisDevice': 'An gléas seo',
  'settings.platform': 'Ardán',
  'settings.browser': 'Brabhsálaí',
  'settings.network': 'Líonra',
  'settings.online': 'Ar líne',
  'settings.offline': 'As líne',
  'settings.unknown': 'Anaithnid',
  'settings.logOut': 'Logáil amach',
  'settings.deleteAccount': 'Scrios cuntas',
  'settings.changePasswordModal.title': 'Athraigh pasfhocal',
  'settings.changePasswordModal.error': 'Theip ar athrú an phasfhocail.',
  'settings.changePasswordModal.currentPassword': 'Pasfhocal reatha',
  'settings.changePasswordModal.newPassword': 'Pasfhocal nua',
  'settings.changePasswordModal.changing': 'Ag athrú...',
  'settings.deleteAccountModal.title': 'Scrios cuntas',
  'settings.deleteAccountModal.warning':
    'Ní féidir an gníomh seo a chealú. Cuir isteach do phasfhocal le deimhniú.',
  'settings.deleteAccountModal.password': 'Pasfhocal',
  'settings.deleteAccountModal.deleting': 'Ag scriosadh...',
  'settings.changePasswordModal.submit': 'Athraigh pasfhocal',
  'settings.deleteAccountModal.submit': 'Scrios cuntas',
  'settings.failedToUpdateEmail': 'Theip ar nuashonrú ríomhphoist.',
  'settings.failedToDeleteAccount': 'Theip ar scriosadh an chuntais.',
  'settings.toggleTwoFactor': 'Scoránaigh fíordheimhniú dhá fhachtóir',
  'settings.togglePushNotifications': 'Scoránaigh fógraí brú',

  // Footer
  'footer.about': 'Faoi {{appName}}',
  'footer.privacyPolicy': 'Polasaí príobháideachais',
  'footer.termsOfService': 'Téarmaí seirbhíse',
  'footer.language': 'Teanga',

  // OAuth
  'oauth.orContinueWith': 'Nó lean ar aghaidh le',
  'oauth.continueWith': 'Lean ar aghaidh le {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Scoránaigh téama',

  // User Menu
  'userMenu.open': 'Oscail roghchlár úsáideora',

  // Plan Updated
  'planUpdated.message': 'Tá do phlean nuashonraithe.',
  'planUpdated.thankYou': 'Go raibh maith agat!',
  'planUpdated.returnHome': 'Fill ar an mbaile',

  // PWA
  'pwa.updateAvailable': 'Leagan nua ar fáil!',
  'pwa.update': 'Nuashonraigh',
  'pwa.updating': 'Ag nuashonrú...',

  // User API errors
  'user.error.badRequest': 'Droch-iarratas.',
  'user.error.notFound': 'Gan aimsiú.',
  'user.error.failedToCreateSession': 'Theip ar chruthú seisiúin.',
  'user.error.usernameRequired': 'Tá ainm úsáideora ag teastáil.',
  'user.error.passwordRequired': 'Tá pasfhocal ag teastáil.',
  'user.error.emailInvalid': 'Ríomhphost neamhbhailí.',
  'user.error.usernameUnavailable': 'Ainm úsáideora nach bhfuil ar fáil.',
  'user.error.emailAlreadyRegistered': 'Ríomhphost cláraithe cheana féin.',
  'user.error.failedToHashPassword': 'Theip ar haiseáil pasfhocail.',
  'user.error.invalidCredentials': 'Dintiúir neamhbhailí.',
  'user.error.invalidTwoFactorToken': 'Comhartha dhá-fhachtóir neamhbhailí.',
  'user.error.twoFactorVerificationUnavailable': 'Fíorú dhá-fhachtóir nach bhfuil ar fáil.',
  'user.error.loginFailed': 'Theip ar logáil isteach.',
  'user.error.usernameCannotBeEmpty': 'Ní féidir le hainm úsáideora a bheith folamh.',
  'user.error.failedToUpdateUser': 'Theip ar nuashonrú úsáideora.',
  'user.error.failedToDeleteUser': 'Theip ar scriosadh úsáideora.',
  'user.error.failedToReadUser': 'Theip ar léamh úsáideora.',
  'user.error.emailRequired': 'Tá ríomhphost ag teastáil.',
  'user.error.failedToProcessPasswordReset': 'Theip ar phróiseáil athshocrú pasfhocail.',
  'user.error.newPasswordRequired': 'Tá pasfhocal nua ag teastáil.',
  'user.error.currentPasswordRequired': 'Tá pasfhocal reatha ag teastáil.',
  'user.error.currentPasswordIncorrect': 'Pasfhocal reatha mícheart.',
  'user.error.failedToUpdatePassword': 'Theip ar nuashonrú pasfhocail.',
  'user.error.planKeyRequired': 'Tá planKey ag teastáil.',
  'user.error.invalidPlan': 'Plean neamhbhailí.',
  'user.error.failedToUpdateSubscription': 'Theip ar nuashonrú síntiúis.',
  'user.error.failedToUpdatePlan': 'Theip ar nuashonrú pleain.',
  'user.error.twoFactorNotAvailable': 'Fíordheimhniú dhá-fhachtóir nach bhfuil ar fáil.',
  'user.error.tokenRequired': 'Tá comhartha ag teastáil.',
  'user.error.noPendingTwoFactorSetup':
    'Gan socrú dhá-fhachtóir ar feitheamh. Glaoigh le gníomh "setup" ar dtús.',
  'user.error.invalidToken': 'Comhartha neamhbhailí.',
  'user.error.twoFactorNotEnabled': 'Dhá-fhachtóir gan chumasú.',
  'user.error.invalidAction': 'Gníomh neamhbhailí. Úsáid "setup", "enable", nó "disable".',
  'user.error.twoFactorOperationFailed': 'Theip ar oibríocht dhá-fhachtóir.',
  'user.error.oauthServerNotConfigured': 'Freastalaí OAuth "{{server}}" gan chumrú.',
  'user.error.oauthVerificationFailed': 'Theip ar fhíorú OAuth.',
  'user.error.failedToCreateUser': 'Theip ar chruthú úsáideora.',
  'user.error.oauthLoginFailed': 'Theip ar logáil isteach OAuth.',

  // Auth client errors
  'auth.error.requestFailed': 'Theip ar an iarratas',
  'auth.error.loginFailed': 'Theip ar logáil isteach',
  'auth.error.registrationFailed': 'Theip ar chlárú',
  'auth.error.noRefreshToken': 'Gan comhartha athnuachana ar fáil',

  // Form validation
  'forms.required': 'Tá an réimse seo riachtanach',
  'forms.min': 'Caithfidh an luach a bheith {{min}} ar a laghad',
  'forms.max': 'Caithfidh an luach a bheith {{max}} ar a mhéad',
  'forms.minLength': 'Caithfidh {{minLength}} carachtar ar a laghad a bheith ann',
  'forms.maxLength': 'Caithfidh {{maxLength}} carachtar ar a mhéad a bheith ann',
  'forms.invalidFormat': 'Formáid neamhbhailí',
  'forms.invalidEmail': 'Seoladh ríomhphoist neamhbhailí',
  'forms.invalidUrl': 'URL neamhbhailí',
  'forms.invalidValue': 'Luach neamhbhailí',

  // HTTP client errors
  'http.error.requestFailed': 'Theip ar an iarratas le stádas {{status}}.',
  'http.error.networkError': 'Earráid líonra.',

  // Routing errors
  'routing.error.missingParam': 'Paraiméadar "{{name}}" ar iarraidh don chosán "{{pattern}}"',
  'routing.error.routeNotFound': 'Níor aimsíodh an bealach "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Ní mór useMoleculeRouter a úsáid laistigh de MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Níl fógraí brúigh tacaithe',
  'push.error.permissionNotGranted': 'Níor deonaíodh cead fógra',

  // Utility errors
  'error.networkError': 'Earráid líonra. Seiceáil do cheangal.',
  'error.timeout': 'Iarratas imithe thar am. Bain triail eile as.',
  'error.unauthorized': 'Níl tú údaraithe chun an gníomh seo a dhéanamh.',
  'error.forbidden': 'Rochtain diúltaithe.',
  'error.notFound': 'Acmhainn gan aimsiú.',
  'error.validationError': "Seiceáil d'ionchur agus bain triail eile as.",
  'error.serverError': 'Earráid fhreastalaí. Bain triail eile as níos déanaí.',
  'error.unknown': 'Tharla earráid gan choinne.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Tá teachtaireacht ag teastáil',
  'conversation.error.aiNotConfigured': 'Soláthraí AI gan chumrú',
  'conversation.error.unknownAiError': 'Earráid AI anaithnid',
  'conversation.error.notFound': 'Níor aimsíodh comhrá',
  'conversation.error.streamError': 'Earráid sruthaithe AI',

  // Resource errors
  'resource.error.unknownError': 'Earráid anaithnid.',
  'resource.error.unableToCreate': 'Ní féidir {{name}} a chruthú.',
  'resource.error.unableToUpdate': 'Ní féidir {{name}} a nuashonrú.',
  'resource.error.unableToDelete': 'Ní féidir {{name}} a scriosadh.',
  'resource.error.notFound': 'Gan aimsiú.',
  'resource.error.badRequest': 'Droch-iarratas.',
  'resource.error.unauthorized': 'Neamhúdaraithe.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Tá ainm agus projectType ag teastáil',
  'project.error.notFound': 'Gan aimsiú',

  // Device errors
  'device.error.unauthorized': 'Neamhúdaraithe.',
  'device.error.badRequest': 'Droch-iarratas.',
  'device.error.notFound': 'Gan aimsiú.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Theip ar léamh {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Theip ar scríobh {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Theip ar scriosadh {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Tá soláthraí íocaíochta ag teastáil.',
  'user.payment.subscriptionIdRequired': 'Tá subscriptionId ag teastáil.',
  'user.payment.receiptAndPlanRequired': 'Tá admháil agus planKey ag teastáil.',
  'user.payment.verificationNotConfigured': 'Níl fíorú íocaíochta cumraithe do {{provider}}.',
  'user.payment.invalidPlan': 'Plean neamhbhailí.',
  'user.payment.verificationFailed': 'Theip ar fhíorú síntiúis.',
  'user.payment.unknownPlan': 'Plean anaithnid.',
  'user.payment.invalidWebhookEvent': 'Imeacht webhook neamhbhailí.',
}
