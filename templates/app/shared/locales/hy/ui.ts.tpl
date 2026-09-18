/**
 * Armenian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': '\u0532\u0565\u057C\u0576\u057E\u0578\u0582\u0574 \u0567...',
  'common.saving': '\u054A\u0561\u0570\u057A\u0561\u0576\u057E\u0578\u0582\u0574 \u0567...',
  'common.close': '\u0553\u0561\u056F\u0565\u056C',
  'common.goBack': '\u054E\u0565\u0580\u0561\u0564\u0561\u057C\u0576\u0561\u056C',
  'common.submit': '\u0548\u0582\u0572\u0561\u0580\u056F\u0565\u056C',
  'common.continue': '\u0547\u0561\u0580\u0578\u0582\u0576\u0561\u056F\u0565\u056C',

  // Auth - Login
  'auth.login.email': '\u0537\u056C. \u0583\u0578\u057D\u057F',
  'auth.login.password': '\u0533\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C',
  'auth.login.twoFactor':
    '\u0535\u0580\u056F\u0563\u0578\u0580\u056E\u0578\u0576 \u0570\u0561\u057D\u057F\u0561\u057F\u0574\u0561\u0576 \u056F\u0578\u0564 (\u0565\u0569\u0565 \u0574\u056B\u0561\u0581\u057E\u0561\u056E \u0567)',
  'auth.login.signUp': '\u0533\u0580\u0561\u0576\u0581\u057E\u0565\u056C',
  'auth.login.loggingIn':
    '\u0544\u0578\u0582\u057F\u0584 \u0567 \u0563\u0578\u0580\u056E\u057E\u0578\u0582\u0574...',
  'auth.login.logIn': '\u0544\u0578\u0582\u057F\u0584 \u0563\u0578\u0580\u056E\u0565\u056C',
  'auth.login.forgotPassword':
    '\u0544\u0578\u057C\u0561\u0581\u0565\u056C \u0565\u0584 \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u0568\u055E',

  // Auth - Signup
  'auth.signup.email':
    '\u0537\u056C. \u0583\u0578\u057D\u057F (\u054A\u0561\u0580\u057F\u0561\u0564\u056B\u0580)',
  'auth.signup.password':
    '\u0533\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C (\u054A\u0561\u0580\u057F\u0561\u0564\u056B\u0580)',
  'auth.signup.name': '\u0541\u0565\u0580 \u0561\u0576\u0578\u0582\u0576\u0568',
  'auth.signup.signingUp': '\u0533\u0580\u0561\u0576\u0581\u057E\u0578\u0582\u0574 \u0567...',
  'auth.signup.signUp': '\u0533\u0580\u0561\u0576\u0581\u057E\u0565\u056C',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    '\u0535\u0569\u0565 \u0561\u0575\u0564 \u0567\u056C. \u0583\u0578\u057D\u057F\u0578\u057E \u0570\u0561\u0577\u056B\u057E \u0563\u0578\u0575\u0578\u0582\u0569\u0575\u0578\u0582\u0576 \u0578\u0582\u0576\u056B, \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u056B \u057E\u0565\u0580\u0561\u056F\u0561\u0576\u0563\u0576\u0574\u0561\u0576 \u0570\u0572\u0578\u0582\u0574\u0568 \u0578\u0582\u0572\u0561\u0580\u056F\u057E\u0565\u056C \u0567\u0589',
  'auth.forgotPassword.email': '\u0537\u056C. \u0583\u0578\u057D\u057F',
  'auth.forgotPassword.submitting':
    '\u0548\u0582\u0572\u0561\u0580\u056F\u057E\u0578\u0582\u0574 \u0567...',

  // Auth - Reset Password
  'auth.resetPassword.email': '\u0537\u056C. \u0583\u0578\u057D\u057F',
  'auth.resetPassword.token':
    '\u0533\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u056B \u057E\u0565\u0580\u0561\u056F\u0561\u0576\u0563\u0576\u0574\u0561\u0576 \u056F\u0578\u0564',
  'auth.resetPassword.newPassword':
    '\u0544\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0565\u0584 \u0576\u0578\u0580 \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C',
  'auth.resetPassword.twoFactor':
    '\u0535\u0580\u056F\u0563\u0578\u0580\u056E\u0578\u0576 \u0570\u0561\u057D\u057F\u0561\u057F\u0574\u0561\u0576 \u056F\u0578\u0564 (\u0565\u0569\u0565 \u0574\u056B\u0561\u0581\u057E\u0561\u056E \u0567)',
  'auth.resetPassword.loggingIn':
    '\u0544\u0578\u0582\u057F\u0584 \u0567 \u0563\u0578\u0580\u056E\u057E\u0578\u0582\u0574...',
  'auth.resetPassword.submit':
    '\u054D\u0561\u0570\u0574\u0561\u0576\u0565\u056C \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u0568 \u0587 \u0574\u0578\u0582\u057F\u0584 \u0563\u0578\u0580\u056E\u0565\u056C',

  // Home
  'home.greeting': '\u0532\u0561\u0580\u0587, ',
  'home.world': '\u0531\u0577\u056D\u0561\u0580\u0570',

  // Settings
  'settings.account': '\u0540\u0561\u0577\u056B\u057E',
  'settings.email': '\u0537\u056C. \u0583\u0578\u057D\u057F',
  'settings.authentication':
    '\u0546\u0578\u0582\u0575\u0576\u0561\u056F\u0561\u0576\u0561\u0581\u0578\u0582\u0574',
  'settings.changePassword':
    '\u0553\u0578\u056D\u0565\u056C \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u0568',
  'settings.twoFactor':
    '\u0535\u0580\u056F\u0563\u0578\u0580\u056E\u0578\u0576 \u0576\u0578\u0582\u0575\u0576\u0561\u056F\u0561\u0576\u0561\u0581\u0578\u0582\u0574',
  'settings.notifications':
    '\u053E\u0561\u0576\u0578\u0582\u0581\u0578\u0582\u0574\u0576\u0565\u0580',
  'settings.pushNotifications':
    'Push \u056E\u0561\u0576\u0578\u0582\u0581\u0578\u0582\u0574\u0576\u0565\u0580',
  'settings.billing': '\u054E\u0573\u0561\u0580\u0578\u0582\u0574',
  'settings.plan': '\u054A\u056C\u0561\u0576\u055D ',
  'settings.upgrade': '\u0539\u0561\u0580\u0574\u0561\u0581\u0576\u0565\u056C',
  'settings.devices': '\u054D\u0561\u0580\u0584\u0565\u0580',
  'settings.noDevices':
    '\u054D\u0561\u0580\u0584\u0565\u0580 \u0579\u0565\u0576 \u0563\u057F\u0576\u057E\u0565\u056C',
  'settings.thisDevice': '\u0531\u0575\u057D \u057D\u0561\u0580\u0584\u0568',
  'settings.platform': '\u054A\u056C\u0561\u057F\u0586\u0578\u0580\u0574',
  'settings.browser': '\u0532\u0580\u0561\u0578\u0582\u0566\u0565\u0580',
  'settings.network': '\u0551\u0561\u0576\u0581',
  'settings.online': '\u0531\u057C\u0581\u0561\u0576\u0581',
  'settings.offline': '\u0531\u0576\u0581\u0561\u0576\u0581',
  'settings.unknown': '\u0531\u0576\u0570\u0561\u0575\u057F',
  'settings.logOut': '\u0534\u0578\u0582\u0580\u057D \u0563\u0561\u056C',
  'settings.deleteAccount': '\u054B\u0576\u057B\u0565\u056C \u0570\u0561\u0577\u056B\u057E\u0568',
  'settings.changePasswordModal.title':
    '\u0553\u0578\u056D\u0565\u056C \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u0568',
  'settings.changePasswordModal.error':
    '\u0533\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u056B \u0583\u0578\u0583\u0578\u056D\u0578\u0582\u0574\u0568 \u0571\u0561\u056D\u0578\u0572\u057E\u0565\u0581\u0589',
  'settings.changePasswordModal.currentPassword':
    '\u0538\u0576\u0569\u0561\u0581\u056B\u056F \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C',
  'settings.changePasswordModal.newPassword':
    '\u0546\u0578\u0580 \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C',
  'settings.changePasswordModal.changing': '\u0553\u0578\u056D\u057E\u0578\u0582\u0574 \u0567...',
  'settings.deleteAccountModal.title':
    '\u054B\u0576\u057B\u0565\u056C \u0570\u0561\u0577\u056B\u057E\u0568',
  'settings.deleteAccountModal.warning':
    '\u0531\u0575\u057D \u0563\u0578\u0580\u056E\u0578\u0572\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0568 \u0570\u0565\u057F \u057E\u0565\u0580\u0561\u0564\u0561\u0580\u0571\u0576\u0565\u056C\u056B \u0579\u0567\u0589 \u0540\u0561\u057D\u057F\u0561\u057F\u0565\u056C\u0578\u0582 \u0570\u0561\u0574\u0561\u0580 \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0565\u0584 \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u0568\u0589',
  'settings.deleteAccountModal.password': '\u0533\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C',
  'settings.deleteAccountModal.deleting': '\u054B\u0576\u057B\u057E\u0578\u0582\u0574 \u0567...',
  'settings.changePasswordModal.submit':
    '\u0553\u0578\u056D\u0565\u056C \u0563\u0561\u0572\u057F\u0576\u0561\u0562\u0561\u057C\u0568',
  'settings.deleteAccountModal.submit':
    '\u054B\u0576\u057B\u0565\u056C \u0570\u0561\u0577\u056B\u057E\u0568',
  'settings.failedToUpdateEmail': 'Էլ. փոստի թարմացումը ձախողվեց։',
  'settings.failedToDeleteAccount': 'Հաշվի ջնջումը ձախողվեց։',
  'settings.toggleTwoFactor': 'Փոխել երկգործոն նույնականացումը',
  'settings.togglePushNotifications': 'Փոխել push ծանուցումները',

  // Footer
  'footer.about': '{{appName}}-\u056B \u0574\u0561\u057D\u056B\u0576',
  'footer.privacyPolicy':
    '\u0533\u0561\u0572\u057F\u0576\u056B\u0578\u0582\u0569\u0575\u0561\u0576 \u0584\u0561\u0572\u0561\u0584\u0561\u056F\u0561\u0576\u0578\u0582\u0569\u0575\u0578\u0582\u0576',
  'footer.termsOfService':
    '\u053E\u0561\u057C\u0561\u0575\u0578\u0582\u0569\u0575\u0561\u0576 \u057A\u0561\u0575\u0574\u0561\u0576\u0576\u0565\u0580',
  'footer.language': 'Լեզու',

  // OAuth
  'oauth.orContinueWith':
    '\u053F\u0561\u0574 \u0577\u0561\u0580\u0578\u0582\u0576\u0561\u056F\u0565\u0584 \u0570\u0565\u057F\u0587\u0575\u0561\u056C\u0578\u057E',
  'oauth.continueWith':
    '\u0547\u0561\u0580\u0578\u0582\u0576\u0561\u056F\u0565\u056C {{provider}}-\u0578\u057E',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': '\u0553\u0578\u056D\u0565\u056C \u0569\u0565\u0574\u0561\u0576',

  // User Menu
  'userMenu.open':
    '\u0532\u0561\u0581\u0565\u056C \u0585\u0563\u057F\u0561\u0563\u0578\u0580\u056E\u056B \u0574\u0565\u0576\u0575\u0578\u0582\u0576',

  // Plan Updated
  'planUpdated.message':
    '\u0541\u0565\u0580 \u057A\u056C\u0561\u0576\u0568 \u0569\u0561\u0580\u0574\u0561\u0581\u057E\u0565\u056C \u0567\u0589',
  'planUpdated.thankYou':
    '\u0547\u0576\u0578\u0580\u0570\u0561\u056F\u0561\u056C\u0578\u0582\u0569\u0575\u0578\u0582\u0576!',
  'planUpdated.returnHome':
    '\u054E\u0565\u0580\u0561\u0564\u0561\u057C\u0576\u0561\u056C \u0563\u056C\u056D\u0561\u057E\u0578\u0580 \u0567\u057B',

  // PWA
  'pwa.updateAvailable':
    '\u0546\u0578\u0580 \u057F\u0561\u0580\u0562\u0565\u0580\u0561\u056F\u0568 \u0570\u0561\u057D\u0561\u0576\u0565\u056C\u056B \u0567!',
  'pwa.update': '\u0539\u0561\u0580\u0574\u0561\u0581\u0576\u0565\u056C',
  'pwa.updating': '\u0539\u0561\u0580\u0574\u0561\u0581\u057E\u0578\u0582\u0574 \u0567...',

  // User API errors
  'user.error.badRequest': 'Skhalmunk harc.',
  'user.error.notFound': 'Chi gtnvel.',
  'user.error.failedToCreateSession': 'Nsty steghcelny dzakhogvec.',
  'user.error.usernameRequired': 'Ogtanovoruny pahanjvum e.',
  'user.error.passwordRequired': 'Gaghtnabarry pahanjvum e.',
  'user.error.emailInvalid': 'El. poste anvaverakan e.',
  'user.error.usernameUnavailable': 'Ogtagorcoghi anuny hasa che.',
  'user.error.emailAlreadyRegistered': 'El. poste arten grantsvac e.',
  'user.error.failedToHashPassword': 'Gaghtnabarri hash-y dzakhogvec.',
  'user.error.invalidCredentials': 'Anvaverakan havataramaqrer.',
  'user.error.invalidTwoFactorToken': 'Anvaverakan erkgorcony token.',
  'user.error.twoFactorVerificationUnavailable': 'Erkgorcony stugumn anhasaneli e.',
  'user.error.loginFailed': 'Mutqy dzakhogvec.',
  'user.error.usernameCannotBeEmpty': 'Ogtagorcoghy datark chi kareli linely.',
  'user.error.failedToUpdateUser': 'Ogtagorcoghy tarmacnely dzakhogvec.',
  'user.error.failedToDeleteUser': 'Ogtagorcoghy jnjely dzakhogvec.',
  'user.error.failedToReadUser': 'Ogtagorcoghy kardaly dzakhogvec.',
  'user.error.emailRequired': 'El. poste pahanjvum e.',
  'user.error.failedToProcessPasswordReset': 'Gaghtnabari verakarumi mtacumy dzakhogvec.',
  'user.error.newPasswordRequired': 'Nor gaghtnabarry pahanjvum e.',
  'user.error.currentPasswordRequired': 'Arka gaghtnabarry pahanjvum e.',
  'user.error.currentPasswordIncorrect': 'Arka gaghtnabarry sxal e.',
  'user.error.failedToUpdatePassword': 'Gaghtnabarry tarmacnely dzakhogvec.',
  'user.error.planKeyRequired': 'planKey pahanjvum e.',
  'user.error.invalidPlan': 'Anvaverakan plan.',
  'user.error.failedToUpdateSubscription': 'Bajanarordutyuny tarmacnely dzakhogvec.',
  'user.error.failedToUpdatePlan': 'Plany tarmacnely dzakhogvec.',
  'user.error.twoFactorNotAvailable': 'Erkgorcony identifikatsiay hasa che.',
  'user.error.tokenRequired': 'Token pahanjvum e.',
  'user.error.noPendingTwoFactorSetup':
    'Spasvog erkgorcony karumy chka. Kanchirecq skzbum "setup" gortsunov.',
  'user.error.invalidToken': 'Anvaverakan token.',
  'user.error.twoFactorNotEnabled': 'Erkgorcony identifikatsiay miatsva che.',
  'user.error.invalidAction': 'Anvaverakan gortsunq. Ogtagorcec "setup", "enable" kam "disable".',
  'user.error.twoFactorOperationFailed': 'Erkgorcony gortsoghutyny dzakhogvec.',
  'user.error.oauthServerNotConfigured': 'OAuth servery "{{server}}" kargavorvac che.',
  'user.error.oauthVerificationFailed': 'OAuth stugumny dzakhogvec.',
  'user.error.failedToCreateUser': 'Ogtagorcoghy steghcely dzakhogvec.',
  'user.error.oauthLoginFailed': 'OAuth mutqy dzakhogvec.',

  // Auth client errors
  'auth.error.requestFailed': 'Hartsy dzakhogvec',
  'auth.error.loginFailed': 'Mutqy dzakhogvec',
  'auth.error.registrationFailed': 'Grantsumy dzakhogvec',
  'auth.error.noRefreshToken': 'Tarmatsnovany token hasa che',

  // Form validation
  'forms.required':
    '\u0531\u0575\u057d \u0564\u0561\u0577\u057f\u0568 \u057a\u0561\u0580\u057f\u0561\u0564\u056b\u0580 \u0567',
  'forms.min':
    '\u0531\u0580\u056a\u0565\u0584\u0568 \u057a\u0565\u057f\u0584 \u0567 \u056c\u056b\u0576\u056b \u0561\u057c\u0576\u057e\u0561\u0566\u0576 {{min}}',
  'forms.max':
    '\u0531\u0580\u056a\u0565\u0584\u0568 \u057a\u0565\u057f\u0584 \u0567 \u056c\u056b\u0576\u056b \u0561\u057c\u0561\u057e\u0565\u056c\u0561\u0563\u0578\u0582\u0575\u0576\u0568 {{max}}',
  'forms.minLength':
    '\u054a\u0565\u057f\u0584 \u0567 \u056c\u056b\u0576\u056b \u0561\u057c\u0576\u057e\u0561\u0566\u0576 {{minLength}} \u0576\u056b\u0577',
  'forms.maxLength':
    '\u054a\u0565\u057f\u0584 \u0567 \u056c\u056b\u0576\u056b \u0561\u057c\u0561\u057e\u0565\u056c\u0561\u0563\u0578\u0582\u0575\u0576\u0568 {{maxLength}} \u0576\u056b\u0577',
  'forms.invalidFormat':
    '\u0531\u0576\u057e\u0561\u057e\u0565\u0580 \u0571\u0587\u0561\u0579\u0561\u0583',
  'forms.invalidEmail':
    '\u0531\u0576\u057e\u0561\u057e\u0565\u0580 \u0567\u056c\u0565\u056f\u057f\u0580\u0578\u0576\u0561\u0575\u056b\u0576 \u0583\u0578\u057d\u057f\u056b \u0570\u0561\u057d\u0581\u0565',
  'forms.invalidUrl': '\u0531\u0576\u057e\u0561\u057e\u0565\u0580 URL',
  'forms.invalidValue': '\u0531\u0576\u057e\u0561\u057e\u0565\u0580 \u0561\u0580\u056a\u0565\u0584',

  // HTTP client errors
  'http.error.requestFailed': 'Hartsy dzakhogvec {{status}} statov.',
  'http.error.networkError': 'Cancanyi skhalmunk.',

  // Routing errors
  'routing.error.missingParam': '"{{pattern}}" delays "{{name}}" is missing',
  'routing.error.routeNotFound': '"{{name}}" երթուղին չի գտնվել',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter-ը պետք է օգտագործվի MoleculeRouterProvider-ի ներսում',

  // Push notification errors
  'push.error.notSupported': 'Push tsanucumner chesupportavorvum en',
  'push.error.permissionNotGranted': 'Tsanucman tuyltvutyuny trvac che',

  // Utility errors
  'error.networkError': 'Cancanyi skhalmunk. Stugec Dzer kapumy.',
  'error.timeout': 'Hartsy sparvel e. Krkneq pordzel.',
  'error.unauthorized': 'Duq liazoreq cheq ays gorthoghutyuny katarelu hamar.',
  'error.forbidden': 'Mutqy merjvac e.',
  'error.notFound': 'Resursy chi gtnvel.',
  'error.validationError': 'Stugec Dzer mutqy ev krkneq pordzel.',
  'error.serverError': 'Serverayin skhalmunk. Krkneq hetago pordzel.',
  'error.unknown': 'Anspaseli skhalmunk teghi unetsav.',

  // AI conversation errors
  'conversation.error.messageRequired': 'haxordagirq pahanjvum e',
  'conversation.error.aiNotConfigured': 'AI provaydern kargavorvac che',
  'conversation.error.unknownAiError': 'Anhayt AI skhalmunk',
  'conversation.error.notFound': 'Zruyce chi gtnvel',
  'conversation.error.streamError': 'AI hoshqi skhalmunk',

  // Resource errors
  'resource.error.unknownError': 'Anhayt skhalmunk.',
  'resource.error.unableToCreate': 'Chhajoghvec steghcel {{name}}.',
  'resource.error.unableToUpdate': 'Chhajoghvec tarmacnel {{name}}.',
  'resource.error.unableToDelete': 'Chhajoghvec jnjel {{name}}.',
  'resource.error.notFound': 'Chi gtnvel.',
  'resource.error.badRequest': 'Skhalmunk harc.',
  'resource.error.unauthorized': 'Chliazorvatsvats.',

  // Project errors
  'project.error.nameAndTypeRequired': 'anunn u projectType pahanjvum en',
  'project.error.notFound': 'Chi gtnvel',

  // Device errors
  'device.error.unauthorized': 'Չթույլատրված։',
  'device.error.badRequest': 'Սխալ հարցում։',
  'device.error.notFound': 'Չի գտնվել։',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} ֆայլը կարդալը ձախողվեց: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} ֆայլը գրելը ձախողվեց: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} ֆայլը ջնջելը ձախողվեց: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Vcharvogi matakararny pahanjvum e.',
  'user.payment.subscriptionIdRequired': 'subscriptionId pahanjvum e.',
  'user.payment.receiptAndPlanRequired': 'receipt ev planKey pahanjvum en.',
  'user.payment.verificationNotConfigured':
    'Vcharvogi stugumny kargavorvac che {{provider}}-i hamar.',
  'user.payment.invalidPlan': 'Anvaverakan plan.',
  'user.payment.verificationFailed': 'Bajanarordutyuny stugely dzakhogvec.',
  'user.payment.unknownPlan': 'Anhayt plan.',
  'user.payment.invalidWebhookEvent': 'Anvaverakan webhook iradarcutyun.',
}
