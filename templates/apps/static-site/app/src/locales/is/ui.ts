/**
 * Icelandic translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Hleð...',
  'common.saving': 'Vista...',
  'common.close': 'Loka',
  'common.goBack': 'Til baka',
  'common.submit': 'Senda',
  'common.continue': 'Halda áfram',

  // Auth - Login
  'auth.login.email': 'Netfang',
  'auth.login.password': 'Lykilorð',
  'auth.login.twoFactor': 'Tvennð auðkenning (Ef virk)',
  'auth.login.signUp': 'Nýskráning',
  'auth.login.loggingIn': 'Skrái inn...',
  'auth.login.logIn': 'Skrá inn',
  'auth.login.forgotPassword': 'Gleymt lykilorð?',

  // Auth - Signup
  'auth.signup.email': 'Netfang (Nauðsynlegt)',
  'auth.signup.password': 'Lykilorð (Nauðsynlegt)',
  'auth.signup.name': 'Nafnið þitt',
  'auth.signup.signingUp': 'Nýskráning...',
  'auth.signup.signUp': 'Nýskráning',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ef reikningur með þessu netfangi er til, hefur tengill til að endurstilla lykilorð verið sendur.',
  'auth.forgotPassword.email': 'Netfang',
  'auth.forgotPassword.submitting': 'Sendi...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Netfang',
  'auth.resetPassword.token': 'Endurstillingarkóði lykilorðs',
  'auth.resetPassword.newPassword': 'Sláðu inn nýtt lykilorð',
  'auth.resetPassword.twoFactor': 'Tvennð auðkenning (Ef virk)',
  'auth.resetPassword.loggingIn': 'Skrái inn...',
  'auth.resetPassword.submit': 'Stilla lykilorð og skrá inn',

  // Home
  'home.greeting': 'Halló, ',
  'home.world': 'Heimur',

  // Settings
  'settings.account': 'Reikningur',
  'settings.email': 'Netfang',
  'settings.authentication': 'Auðkenning',
  'settings.changePassword': 'Breyta lykilorði',
  'settings.twoFactor': 'Tvennð auðkenning',
  'settings.notifications': 'Tilkynningar',
  'settings.pushNotifications': 'Push-tilkynningar',
  'settings.billing': 'Reikningar',
  'settings.plan': 'Áskrift: ',
  'settings.upgrade': 'Uppfæra',
  'settings.devices': 'Tæki',
  'settings.noDevices': 'Engin tæki fundust',
  'settings.thisDevice': 'Þetta tæki',
  'settings.platform': 'Vettvangur',
  'settings.browser': 'Vafri',
  'settings.network': 'Net',
  'settings.online': 'Nettengdur',
  'settings.offline': 'Ónettengdur',
  'settings.unknown': 'Óþekktur',
  'settings.logOut': 'Skrá út',
  'settings.deleteAccount': 'Eyða reikningi',
  'settings.changePasswordModal.title': 'Breyta lykilorði',
  'settings.changePasswordModal.error': 'Ekki tókst að breyta lykilorði.',
  'settings.changePasswordModal.currentPassword': 'Núverandi lykilorð',
  'settings.changePasswordModal.newPassword': 'Nýtt lykilorð',
  'settings.changePasswordModal.changing': 'Breyti...',
  'settings.deleteAccountModal.title': 'Eyða reikningi',
  'settings.deleteAccountModal.warning':
    'Þessa aðgerð er óafturkallanleg. Sláðu inn lykilorðið þitt til staðfestingar.',
  'settings.deleteAccountModal.password': 'Lykilorð',
  'settings.deleteAccountModal.deleting': 'Eyði...',
  'settings.changePasswordModal.submit': 'Breyta lykilorði',
  'settings.deleteAccountModal.submit': 'Eyða reikningi',
  'settings.failedToUpdateEmail': 'Ekki tókst að uppfæra netfang.',
  'settings.failedToDeleteAccount': 'Ekki tókst að eyða reikningi.',
  'settings.toggleTwoFactor': 'Víxla tvíþátta auðkenningu',
  'settings.togglePushNotifications': 'Víxla ýtitilkynningum',

  // Footer
  'footer.about': 'Um {{appName}}',
  'footer.privacyPolicy': 'Persónuverndarstefna',
  'footer.termsOfService': 'Þjónustuskilmálar',
  'footer.language': 'Tungumál',

  // OAuth
  'oauth.orContinueWith': 'Eða halda áfram með',
  'oauth.continueWith': 'Halda áfram með {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Skipta um þema',

  // User Menu
  'userMenu.open': 'Opna notandavalmynd',

  // Plan Updated
  'planUpdated.message': 'Áskriftin þín hefur verið uppfærð.',
  'planUpdated.thankYou': 'Þakka þér!',
  'planUpdated.returnHome': 'Fara heim',

  // PWA
  'pwa.updateAvailable': 'Ný útgáfa tiltæk!',
  'pwa.update': 'Uppfæra',
  'pwa.updating': 'Uppfærir...',

  // User API errors
  'user.error.badRequest': 'Ógild beiðni.',
  'user.error.notFound': 'Fannst ekki.',
  'user.error.failedToCreateSession': 'Mistókst að búa til setu.',
  'user.error.usernameRequired': 'Notandanafn er nauðsynlegt.',
  'user.error.passwordRequired': 'Lykilorð er nauðsynlegt.',
  'user.error.emailInvalid': 'Netfang er ógilt.',
  'user.error.usernameUnavailable': 'Notandanafn er ekki tiltækt.',
  'user.error.emailAlreadyRegistered': 'Netfang er þegar skráð.',
  'user.error.failedToHashPassword': 'Mistókst að dulkóða lykilorð.',
  'user.error.invalidCredentials': 'Ógild skilríki.',
  'user.error.invalidTwoFactorToken': 'Ógilt tveggja-þátta merki.',
  'user.error.twoFactorVerificationUnavailable': 'Tveggja-þátta staðfesting ótiltæk.',
  'user.error.loginFailed': 'Innskráning mistókst.',
  'user.error.usernameCannotBeEmpty': 'Notandanafn má ekki vera autt.',
  'user.error.failedToUpdateUser': 'Mistókst að uppfæra notanda.',
  'user.error.failedToDeleteUser': 'Mistókst að eyða notanda.',
  'user.error.failedToReadUser': 'Mistókst að lesa notanda.',
  'user.error.emailRequired': 'Netfang er nauðsynlegt.',
  'user.error.failedToProcessPasswordReset': 'Mistókst að vinna úr endurstillingu lykilorðs.',
  'user.error.newPasswordRequired': 'Nýtt lykilorð er nauðsynlegt.',
  'user.error.currentPasswordRequired': 'Núverandi lykilorð er nauðsynlegt.',
  'user.error.currentPasswordIncorrect': 'Núverandi lykilorð er rangt.',
  'user.error.failedToUpdatePassword': 'Mistókst að uppfæra lykilorð.',
  'user.error.planKeyRequired': 'planKey er nauðsynlegt.',
  'user.error.invalidPlan': 'Ógild áætlun.',
  'user.error.failedToUpdateSubscription': 'Mistókst að uppfæra áskrift.',
  'user.error.failedToUpdatePlan': 'Mistókst að uppfæra áætlun.',
  'user.error.twoFactorNotAvailable': 'Tveggja-þátta auðkenning er ekki tiltæk.',
  'user.error.tokenRequired': 'Merki er nauðsynlegt.',
  'user.error.noPendingTwoFactorSetup':
    'Engin tveggja-þátta uppsetning í bið. Kallaðu fyrst með aðgerðinni "setup".',
  'user.error.invalidToken': 'Ógilt merki.',
  'user.error.twoFactorNotEnabled': 'Tveggja-þátta er ekki virkt.',
  'user.error.invalidAction': 'Ógild aðgerð. Notaðu "setup", "enable" eða "disable".',
  'user.error.twoFactorOperationFailed': 'Tveggja-þátta aðgerð mistókst.',
  'user.error.oauthServerNotConfigured': 'OAuth-þjónn "{{server}}" er ekki stilltur.',
  'user.error.oauthVerificationFailed': 'OAuth-staðfesting mistókst.',
  'user.error.failedToCreateUser': 'Mistókst að búa til notanda.',
  'user.error.oauthLoginFailed': 'OAuth-innskráning mistókst.',

  // Auth client errors
  'auth.error.requestFailed': 'Beiðni mistókst',
  'auth.error.loginFailed': 'Innskráning mistókst',
  'auth.error.registrationFailed': 'Skráning mistókst',
  'auth.error.noRefreshToken': 'Ekkert endurnýjunarmerki tiltækt',

  // Form validation
  'forms.required': 'Þessi reitur er nauðsynlegur',
  'forms.min': 'Gildi verður að vera að minnsta kosti {{min}}',
  'forms.max': 'Gildi verður að vera í mesta lagi {{max}}',
  'forms.minLength': 'Verður að vera að minnsta kosti {{minLength}} stafir',
  'forms.maxLength': 'Verður að vera í mesta lagi {{maxLength}} stafir',
  'forms.invalidFormat': 'Ógilt snið',
  'forms.invalidEmail': 'Ógilt netfang',
  'forms.invalidUrl': 'Ógild URL-slóð',
  'forms.invalidValue': 'Ógilt gildi',

  // HTTP client errors
  'http.error.requestFailed': 'Beiðni mistókst með stöðu {{status}}.',
  'http.error.networkError': 'Netvilla.',

  // Routing errors
  'routing.error.missingParam': 'Vantar breytu "{{name}}" fyrir slóð "{{pattern}}"',
  'routing.error.routeNotFound': 'Leið "{{name}}" fannst ekki',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter verður að nota innan MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Ýtitilkynningar eru ekki studdar',
  'push.error.permissionNotGranted': 'Tilkynningaheimild ekki veitt',

  // Utility errors
  'error.networkError': 'Netvilla. Vinsamlegast athugaðu tenginguna þína.',
  'error.timeout': 'Beiðni rann út á tíma. Vinsamlegast reyndu aftur.',
  'error.unauthorized': 'Þú hefur ekki heimild til að framkvæma þessa aðgerð.',
  'error.forbidden': 'Aðgangur hafnaður.',
  'error.notFound': 'Tilfang fannst ekki.',
  'error.validationError': 'Vinsamlegast athugaðu inntakið þitt og reyndu aftur.',
  'error.serverError': 'Þjónavilla. Vinsamlegast reyndu aftur síðar.',
  'error.unknown': 'Óvænt villa kom upp.',

  // AI conversation errors
  'conversation.error.messageRequired': 'skilaboð eru nauðsynleg',
  'conversation.error.aiNotConfigured': 'AI-þjónustuaðili ekki stilltur',
  'conversation.error.unknownAiError': 'Óþekkt AI-villa',
  'conversation.error.notFound': 'Engin samtal fannst',
  'conversation.error.streamError': 'AI-straumsvilla',

  // Resource errors
  'resource.error.unknownError': 'Óþekkt villa.',
  'resource.error.unableToCreate': 'Ekki tókst að búa til {{name}}.',
  'resource.error.unableToUpdate': 'Ekki tókst að uppfæra {{name}}.',
  'resource.error.unableToDelete': 'Ekki tókst að eyða {{name}}.',
  'resource.error.notFound': 'Fannst ekki.',
  'resource.error.badRequest': 'Ógild beiðni.',
  'resource.error.unauthorized': 'Óheimilt.',

  // Project errors
  'project.error.nameAndTypeRequired': 'nafn og projectType eru nauðsynleg',
  'project.error.notFound': 'Fannst ekki',

  // Device errors
  'device.error.unauthorized': 'Óheimilt.',
  'device.error.badRequest': 'Ógild beiðni.',
  'device.error.notFound': 'Fannst ekki.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Mistókst að lesa {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Mistókst að skrifa {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Mistókst að eyða {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Greiðsluveita er nauðsynleg.',
  'user.payment.subscriptionIdRequired': 'subscriptionId er nauðsynlegt.',
  'user.payment.receiptAndPlanRequired': 'kvittun og planKey eru nauðsynleg.',
  'user.payment.verificationNotConfigured':
    'Greiðslustaðfesting er ekki stillt fyrir {{provider}}.',
  'user.payment.invalidPlan': 'Ógild áætlun.',
  'user.payment.verificationFailed': 'Mistókst að staðfesta áskrift.',
  'user.payment.unknownPlan': 'Óþekkt áætlun.',
  'user.payment.invalidWebhookEvent': 'Ógilt vefkrókaatvik.',
}
