/**
 * Albanian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Duke ngarkuar...',
  'common.saving': 'Duke ruajtur...',
  'common.close': 'Mbyll',
  'common.goBack': 'Kthehu',
  'common.submit': 'Dërgo',
  'common.continue': 'Vazhdo',

  // Auth - Login
  'auth.login.email': 'Email',
  'auth.login.password': 'Fjalëkalimi',
  'auth.login.twoFactor': 'Token dyfaktorësh (nëse është aktivizuar)',
  'auth.login.signUp': 'Regjistrohu',
  'auth.login.loggingIn': 'Duke hyrë...',
  'auth.login.logIn': 'Hyr',
  'auth.login.forgotPassword': 'Keni harruar fjalëkalimin?',

  // Auth - Signup
  'auth.signup.email': 'Email (E detyrueshme)',
  'auth.signup.password': 'Fjalëkalimi (E detyrueshme)',
  'auth.signup.name': 'Emri juaj',
  'auth.signup.signingUp': 'Duke u regjistruar...',
  'auth.signup.signUp': 'Regjistrohu',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Nëse ekziston një llogari me atë email, një lidhje për rivendosjen e fjalëkalimit është dërguar.',
  'auth.forgotPassword.email': 'Email',
  'auth.forgotPassword.submitting': 'Duke dërguar...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Email',
  'auth.resetPassword.token': 'Token për rivendosjen e fjalëkalimit',
  'auth.resetPassword.newPassword': 'Vendosni fjalëkalimin e ri',
  'auth.resetPassword.twoFactor': 'Token dyfaktorësh (nëse është aktivizuar)',
  'auth.resetPassword.loggingIn': 'Duke hyrë...',
  'auth.resetPassword.submit': 'Vendos fjalëkalimin dhe hyr',

  // Home
  'home.greeting': 'Përshëndetje, ',
  'home.world': 'Botë',

  // Settings
  'settings.account': 'Llogaria',
  'settings.email': 'Email',
  'settings.authentication': 'Autentifikimi',
  'settings.changePassword': 'Ndrysho fjalëkalimin',
  'settings.twoFactor': 'Autentifikimi dyfaktorësh',
  'settings.notifications': 'Njoftimet',
  'settings.pushNotifications': 'Njoftimet push',
  'settings.billing': 'Faturimi',
  'settings.plan': 'Plani: ',
  'settings.upgrade': 'Përmirëso',
  'settings.devices': 'Pajisjet',
  'settings.noDevices': 'Nuk u gjetën pajisje',
  'settings.thisDevice': 'Kjo pajisje',
  'settings.platform': 'Platforma',
  'settings.browser': 'Shfletuesi',
  'settings.network': 'Rrjeti',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'E panjohur',
  'settings.logOut': 'Dil',
  'settings.deleteAccount': 'Fshi llogarinë',
  'settings.changePasswordModal.title': 'Ndryshimi i fjalëkalimit',
  'settings.changePasswordModal.error': 'Ndryshimi i fjalëkalimit dështoi.',
  'settings.changePasswordModal.currentPassword': 'Fjalëkalimi aktual',
  'settings.changePasswordModal.newPassword': 'Fjalëkalimi i ri',
  'settings.changePasswordModal.changing': 'Duke ndryshuar...',
  'settings.deleteAccountModal.title': 'Fshirja e llogarisë',
  'settings.deleteAccountModal.warning':
    'Ky veprim nuk mund të zhbëhet. Vendosni fjalëkalimin tuaj për konfirmim.',
  'settings.deleteAccountModal.password': 'Fjalëkalimi',
  'settings.deleteAccountModal.deleting': 'Duke fshirë...',
  'settings.changePasswordModal.submit': 'Ndrysho fjalëkalimin',
  'settings.deleteAccountModal.submit': 'Fshi llogarinë',
  'settings.failedToUpdateEmail': 'Dështoi përditësimi i emailit.',
  'settings.failedToDeleteAccount': 'Dështoi fshirja e llogarisë.',
  'settings.toggleTwoFactor': 'Ndrysho vërtetimin me dy faktorë',
  'settings.togglePushNotifications': 'Ndrysho njoftimet push',

  // Footer
  'footer.about': 'Rreth {{appName}}',
  'footer.privacyPolicy': 'Politika e privatësisë',
  'footer.termsOfService': 'Kushtet e shërbimit',
  'footer.language': 'Gjuha',

  // OAuth
  'oauth.orContinueWith': 'Ose vazhdoni me',
  'oauth.continueWith': 'Vazhdo me {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Ndrysho temën',

  // User Menu
  'userMenu.open': 'Hap menynë e përdoruesit',

  // Plan Updated
  'planUpdated.message': 'Plani juaj është përditësuar.',
  'planUpdated.thankYou': 'Faleminderit!',
  'planUpdated.returnHome': 'Kthehu në faqen kryesore',

  // PWA
  'pwa.updateAvailable': 'Version i ri i disponueshëm!',
  'pwa.update': 'Përditëso',
  'pwa.updating': 'Duke përditësuar...',

  // User API errors
  'user.error.badRequest': 'Kerkese e keqe.',
  'user.error.notFound': 'Nuk u gjet.',
  'user.error.failedToCreateSession': 'Deshtoi krijimi i sesionit.',
  'user.error.usernameRequired': 'Kerkohet emri i perdoruesit.',
  'user.error.passwordRequired': 'Kerkohet fjalekalimi.',
  'user.error.emailInvalid': 'Email-i eshte i pavlefshem.',
  'user.error.usernameUnavailable': 'Emri i perdoruesit nuk eshte i disponueshem.',
  'user.error.emailAlreadyRegistered': 'Email-i eshte tashme i regjistruar.',
  'user.error.failedToHashPassword': 'Deshtoi hash-imi i fjalekalimit.',
  'user.error.invalidCredentials': 'Kredenciale te pavlefshme.',
  'user.error.invalidTwoFactorToken': 'Token dyfaktor i pavlefshem.',
  'user.error.twoFactorVerificationUnavailable': 'Verifikimi dyfaktor nuk eshte i disponueshem.',
  'user.error.loginFailed': 'Hyrja deshtoi.',
  'user.error.usernameCannotBeEmpty': 'Emri i perdoruesit nuk mund te jete bosh.',
  'user.error.failedToUpdateUser': 'Deshtoi perditesimi i perdoruesit.',
  'user.error.failedToDeleteUser': 'Deshtoi fshirja e perdoruesit.',
  'user.error.failedToReadUser': 'Deshtoi leximi i perdoruesit.',
  'user.error.emailRequired': 'Kerkohet email-i.',
  'user.error.failedToProcessPasswordReset': 'Deshtoi perpunimi i rivendosjes se fjalekalimit.',
  'user.error.newPasswordRequired': 'Kerkohet fjalekalimi i ri.',
  'user.error.currentPasswordRequired': 'Kerkohet fjalekalimi aktual.',
  'user.error.currentPasswordIncorrect': 'Fjalekalimi aktual eshte i pasakte.',
  'user.error.failedToUpdatePassword': 'Deshtoi perditesimi i fjalekalimit.',
  'user.error.planKeyRequired': 'Kerkohet planKey.',
  'user.error.invalidPlan': 'Plan i pavlefshem.',
  'user.error.failedToUpdateSubscription': 'Deshtoi perditesimi i abonimit.',
  'user.error.failedToUpdatePlan': 'Deshtoi perditesimi i planit.',
  'user.error.twoFactorNotAvailable': 'Autentifikimi dyfaktor nuk eshte i disponueshem.',
  'user.error.tokenRequired': 'Kerkohet tokeni.',
  'user.error.noPendingTwoFactorSetup':
    'Nuk ka vendosje dyfaktor ne pritje. Thirrni me veprimin "setup" fillimisht.',
  'user.error.invalidToken': 'Token i pavlefshem.',
  'user.error.twoFactorNotEnabled': 'Dyfaktori nuk eshte i aktivizuar.',
  'user.error.invalidAction': 'Veprim i pavlefshem. Perdorni "setup", "enable" ose "disable".',
  'user.error.twoFactorOperationFailed': 'Veprimi dyfaktor deshtoi.',
  'user.error.oauthServerNotConfigured': 'Serveri OAuth "{{server}}" nuk eshte konfiguruar.',
  'user.error.oauthVerificationFailed': 'Verifikimi OAuth deshtoi.',
  'user.error.failedToCreateUser': 'Deshtoi krijimi i perdoruesit.',
  'user.error.oauthLoginFailed': 'Hyrja OAuth deshtoi.',

  // Auth client errors
  'auth.error.requestFailed': 'Kerkesa deshtoi',
  'auth.error.loginFailed': 'Hyrja deshtoi',
  'auth.error.registrationFailed': 'Regjistrimi deshtoi',
  'auth.error.noRefreshToken': 'Nuk ka token rifreskimi te disponueshem',

  // Form validation
  'forms.required': 'Kjo fushë është e detyrueshme',
  'forms.min': 'Vlera duhet të jetë të paktën {{min}}',
  'forms.max': 'Vlera duhet të jetë më së shumti {{max}}',
  'forms.minLength': 'Duhet të ketë të paktën {{minLength}} karaktere',
  'forms.maxLength': 'Duhet të ketë më së shumti {{maxLength}} karaktere',
  'forms.invalidFormat': 'Format i pavlefshëm',
  'forms.invalidEmail': 'Adresë emaili e pavlefshme',
  'forms.invalidUrl': 'URL e pavlefshme',
  'forms.invalidValue': 'Vlerë e pavlefshme',

  // HTTP client errors
  'http.error.requestFailed': 'Kerkesa deshtoi me statusin {{status}}.',
  'http.error.networkError': 'Gabim rrjeti.',

  // Routing errors
  'routing.error.missingParam': 'Mungon parametri "{{name}}" për shtegun "{{pattern}}"',
  'routing.error.routeNotFound': 'Rruga "{{name}}" nuk u gjet',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter duhet të përdoret brenda një MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Njoftimet push nuk mbeshteten',
  'push.error.permissionNotGranted': 'Leja e njoftimeve nuk eshte dhene',

  // Utility errors
  'error.networkError': 'Gabim rrjeti. Kontrolloni lidhjen tuaj.',
  'error.timeout': 'Kerkesa ka skaduar. Provoni perseri.',
  'error.unauthorized': 'Nuk jeni i autorizuar per te kryer kete veprim.',
  'error.forbidden': 'Aksesi i refuzuar.',
  'error.notFound': 'Burimi nuk u gjet.',
  'error.validationError': 'Kontrolloni te dhenat tuaja dhe provoni perseri.',
  'error.serverError': 'Gabim serveri. Provoni perseri me vone.',
  'error.unknown': 'Ndodhi nje gabim i papritur.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Kerkohet mesazhi',
  'conversation.error.aiNotConfigured': 'Ofruesi AI nuk eshte konfiguruar',
  'conversation.error.unknownAiError': 'Gabim i panjohur AI',
  'conversation.error.notFound': 'Nuk u gjet bisede',
  'conversation.error.streamError': 'Gabim i transmetimit AI',

  // Resource errors
  'resource.error.unknownError': 'Gabim i panjohur.',
  'resource.error.unableToCreate': 'Nuk mund te krijohet {{name}}.',
  'resource.error.unableToUpdate': 'Nuk mund te perditësohet {{name}}.',
  'resource.error.unableToDelete': 'Nuk mund te fshihet {{name}}.',
  'resource.error.notFound': 'Nuk u gjet.',
  'resource.error.badRequest': 'Kerkese e keqe.',
  'resource.error.unauthorized': 'I paautorizuar.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Kerkohet emri dhe projectType',
  'project.error.notFound': 'Nuk u gjet',

  // Device errors
  'device.error.unauthorized': 'I paautorizuar.',
  'device.error.badRequest': 'Kërkesë e gabuar.',
  'device.error.notFound': 'Nuk u gjet.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Dështoi leximi i {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Dështoi shkrimi i {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Dështoi fshirja e {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Kerkohet ofruesi i pageses.',
  'user.payment.subscriptionIdRequired': 'Kerkohet subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Kerkohet fatue dhe planKey.',
  'user.payment.verificationNotConfigured':
    'Verifikimi i pageses nuk eshte konfiguruar per {{provider}}.',
  'user.payment.invalidPlan': 'Plan i pavlefshem.',
  'user.payment.verificationFailed': 'Verifikimi i abonimit deshtoi.',
  'user.payment.unknownPlan': 'Plan i panjohur.',
  'user.payment.invalidWebhookEvent': 'Ngjarje webhook e pavlefshme.',
}
