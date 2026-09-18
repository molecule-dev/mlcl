/**
 * Slovenian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Nalaganje...',
  'common.saving': 'Shranjevanje...',
  'common.close': 'Zapri',
  'common.goBack': 'Nazaj',
  'common.submit': 'Pošlji',
  'common.continue': 'Nadaljuj',

  // Auth - Login
  'auth.login.email': 'E-pošta',
  'auth.login.password': 'Geslo',
  'auth.login.twoFactor': 'Dvofaktorski žeton (če je omogočen)',
  'auth.login.signUp': 'Registracija',
  'auth.login.loggingIn': 'Prijavljanje...',
  'auth.login.logIn': 'Prijava',
  'auth.login.forgotPassword': 'Pozabljeno geslo?',

  // Auth - Signup
  'auth.signup.email': 'E-pošta (Obvezno)',
  'auth.signup.password': 'Geslo (Obvezno)',
  'auth.signup.name': 'Vaše ime',
  'auth.signup.signingUp': 'Registracija poteka...',
  'auth.signup.signUp': 'Registracija',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Če obstaja račun s tem e-poštnim naslovom, je bila povezava za ponastavitev gesla poslana.',
  'auth.forgotPassword.email': 'E-pošta',
  'auth.forgotPassword.submitting': 'Pošiljanje...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-pošta',
  'auth.resetPassword.token': 'Žeton za ponastavitev gesla',
  'auth.resetPassword.newPassword': 'Vnesite novo geslo',
  'auth.resetPassword.twoFactor': 'Dvofaktorski žeton (če je omogočen)',
  'auth.resetPassword.loggingIn': 'Prijavljanje...',
  'auth.resetPassword.submit': 'Nastavi geslo in se prijavi',

  // Home
  'home.greeting': 'Živjo, ',
  'home.world': 'Svet',

  // Settings
  'settings.account': 'Račun',
  'settings.email': 'E-pošta',
  'settings.authentication': 'Preverjanje pristnosti',
  'settings.changePassword': 'Spremeni geslo',
  'settings.twoFactor': 'Dvofaktorsko preverjanje pristnosti',
  'settings.notifications': 'Obvestila',
  'settings.pushNotifications': 'Potisna obvestila',
  'settings.billing': 'Obračun',
  'settings.plan': 'Paket: ',
  'settings.upgrade': 'Nadgradi',
  'settings.devices': 'Naprave',
  'settings.noDevices': 'Ni najdenih naprav',
  'settings.thisDevice': 'Ta naprava',
  'settings.platform': 'Platforma',
  'settings.browser': 'Brskalnik',
  'settings.network': 'Omrežje',
  'settings.online': 'Povezan',
  'settings.offline': 'Nepovezan',
  'settings.unknown': 'Neznano',
  'settings.logOut': 'Odjava',
  'settings.deleteAccount': 'Izbriši račun',
  'settings.changePasswordModal.title': 'Sprememba gesla',
  'settings.changePasswordModal.error': 'Sprememba gesla ni uspela.',
  'settings.changePasswordModal.currentPassword': 'Trenutno geslo',
  'settings.changePasswordModal.newPassword': 'Novo geslo',
  'settings.changePasswordModal.changing': 'Spreminjanje...',
  'settings.deleteAccountModal.title': 'Izbris računa',
  'settings.deleteAccountModal.warning':
    'Tega dejanja ni mogoče razveljaviti. Za potrditev vnesite geslo.',
  'settings.deleteAccountModal.password': 'Geslo',
  'settings.deleteAccountModal.deleting': 'Brisanje...',
  'settings.changePasswordModal.submit': 'Spremeni geslo',
  'settings.deleteAccountModal.submit': 'Izbriši račun',
  'settings.failedToUpdateEmail': 'Posodobitev e-pošte ni uspela.',
  'settings.failedToDeleteAccount': 'Brisanje računa ni uspelo.',
  'settings.toggleTwoFactor': 'Preklopi dvostopenjsko preverjanje',
  'settings.togglePushNotifications': 'Preklopi push obvestila',

  // Footer
  'footer.about': 'O {{appName}}u',
  'footer.privacyPolicy': 'Pravilnik o zasebnosti',
  'footer.termsOfService': 'Pogoji uporabe',
  'footer.language': 'Jezik',

  // OAuth
  'oauth.orContinueWith': 'Ali nadaljujte z',
  'oauth.continueWith': 'Nadaljuj z {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Preklopi temo',

  // User Menu
  'userMenu.open': 'Odpri uporabniški meni',

  // Plan Updated
  'planUpdated.message': 'Vaš paket je bil posodobljen.',
  'planUpdated.thankYou': 'Hvala!',
  'planUpdated.returnHome': 'Nazaj na domačo stran',

  // PWA
  'pwa.updateAvailable': 'Na voljo je nova različica!',
  'pwa.update': 'Posodobi',
  'pwa.updating': 'Posodabljanje...',

  // User API errors
  'user.error.badRequest': 'Napačna zahteva.',
  'user.error.notFound': 'Ni najdeno.',
  'user.error.failedToCreateSession': 'Ustvarjanje seje ni uspelo.',
  'user.error.usernameRequired': 'Uporabniško ime je obvezno.',
  'user.error.passwordRequired': 'Geslo je obvezno.',
  'user.error.emailInvalid': 'E-pošta je neveljavna.',
  'user.error.usernameUnavailable': 'Uporabniško ime ni na voljo.',
  'user.error.emailAlreadyRegistered': 'E-pošta je že registrirana.',
  'user.error.failedToHashPassword': 'Zgoščevanje gesla ni uspelo.',
  'user.error.invalidCredentials': 'Neveljavne poverilnice.',
  'user.error.invalidTwoFactorToken': 'Neveljaven dvofaktorski žeton.',
  'user.error.twoFactorVerificationUnavailable': 'Dvofaktorsko preverjanje ni na voljo.',
  'user.error.loginFailed': 'Prijava ni uspela.',
  'user.error.usernameCannotBeEmpty': 'Uporabniško ime ne more biti prazno.',
  'user.error.failedToUpdateUser': 'Posodobitev uporabnika ni uspela.',
  'user.error.failedToDeleteUser': 'Izbris uporabnika ni uspel.',
  'user.error.failedToReadUser': 'Branje uporabnika ni uspelo.',
  'user.error.emailRequired': 'E-pošta je obvezna.',
  'user.error.failedToProcessPasswordReset': 'Obdelava ponastavitve gesla ni uspela.',
  'user.error.newPasswordRequired': 'Novo geslo je obvezno.',
  'user.error.currentPasswordRequired': 'Trenutno geslo je obvezno.',
  'user.error.currentPasswordIncorrect': 'Trenutno geslo je napačno.',
  'user.error.failedToUpdatePassword': 'Posodobitev gesla ni uspela.',
  'user.error.planKeyRequired': 'planKey je obvezen.',
  'user.error.invalidPlan': 'Neveljaven paket.',
  'user.error.failedToUpdateSubscription': 'Posodobitev naročnine ni uspela.',
  'user.error.failedToUpdatePlan': 'Posodobitev paketa ni uspela.',
  'user.error.twoFactorNotAvailable': 'Dvofaktorsko preverjanje ni na voljo.',
  'user.error.tokenRequired': 'Žeton je obvezen.',
  'user.error.noPendingTwoFactorSetup':
    'Ni čakajočega dvofaktorskega nastavitve. Najprej pokličite z dejanjem "setup".',
  'user.error.invalidToken': 'Neveljaven žeton.',
  'user.error.twoFactorNotEnabled': 'Dvofaktorsko preverjanje ni omogočeno.',
  'user.error.invalidAction': 'Neveljavno dejanje. Uporabite "setup", "enable" ali "disable".',
  'user.error.twoFactorOperationFailed': 'Dvofaktorska operacija ni uspela.',
  'user.error.oauthServerNotConfigured': 'OAuth strežnik "{{server}}" ni konfiguriran.',
  'user.error.oauthVerificationFailed': 'OAuth preverjanje ni uspelo.',
  'user.error.failedToCreateUser': 'Ustvarjanje uporabnika ni uspelo.',
  'user.error.oauthLoginFailed': 'OAuth prijava ni uspela.',

  // Auth client errors
  'auth.error.requestFailed': 'Zahteva ni uspela',
  'auth.error.loginFailed': 'Prijava ni uspela',
  'auth.error.registrationFailed': 'Registracija ni uspela',
  'auth.error.noRefreshToken': 'Ni na voljo žetona za osvežitev',

  // Form validation
  'forms.required': 'To polje je obvezno',
  'forms.min': 'Vrednost mora biti vsaj {{min}}',
  'forms.max': 'Vrednost mora biti največ {{max}}',
  'forms.minLength': 'Imeti mora vsaj {{minLength}} znakov',
  'forms.maxLength': 'Imeti mora največ {{maxLength}} znakov',
  'forms.invalidFormat': 'Neveljavna oblika',
  'forms.invalidEmail': 'Neveljaven e-poštni naslov',
  'forms.invalidUrl': 'Neveljaven URL',
  'forms.invalidValue': 'Neveljavna vrednost',

  // HTTP client errors
  'http.error.requestFailed': 'Zahteva ni uspela s statusom {{status}}.',
  'http.error.networkError': 'Omrežna napaka.',

  // Routing errors
  'routing.error.missingParam': 'Manjkajoč parameter "{{name}}" za pot "{{pattern}}"',
  'routing.error.routeNotFound': 'Pot "{{name}}" ni bila najdena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter je treba uporabiti znotraj MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Potisna obvestila niso podprta',
  'push.error.permissionNotGranted': 'Dovoljenje za obvestila ni odobreno',

  // Utility errors
  'error.networkError': 'Omrežna napaka. Preverite svojo povezavo.',
  'error.timeout': 'Zahteva je potekla. Prosimo, poskusite znova.',
  'error.unauthorized': 'Nimate dovoljenja za izvajanje te dejavnosti.',
  'error.forbidden': 'Dostop zavrnjen.',
  'error.notFound': 'Vir ni najden.',
  'error.validationError': 'Preverite vnos in poskusite znova.',
  'error.serverError': 'Napaka strežnika. Prosimo, poskusite znova pozneje.',
  'error.unknown': 'Prišlo je do nepričakovane napake.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message je obvezen',
  'conversation.error.aiNotConfigured': 'AI ponudnik ni konfiguriran',
  'conversation.error.unknownAiError': 'Neznana AI napaka',
  'conversation.error.notFound': 'Pogovor ni najden',
  'conversation.error.streamError': 'Napaka pretakanja AI',

  // Resource errors
  'resource.error.unknownError': 'Neznana napaka.',
  'resource.error.unableToCreate': 'Ni mogoče ustvariti {{name}}.',
  'resource.error.unableToUpdate': 'Ni mogoče posodobiti {{name}}.',
  'resource.error.unableToDelete': 'Ni mogoče izbrisati {{name}}.',
  'resource.error.notFound': 'Ni najdeno.',
  'resource.error.badRequest': 'Napačna zahteva.',
  'resource.error.unauthorized': 'Nepooblaščeno.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name in projectType sta obvezna',
  'project.error.notFound': 'Ni najdeno',

  // Device errors
  'device.error.unauthorized': 'Nepooblaščeno.',
  'device.error.badRequest': 'Neveljavna zahteva.',
  'device.error.notFound': 'Ni najdeno.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Branje {{path}} ni uspelo: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Pisanje {{path}} ni uspelo: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Brisanje {{path}} ni uspelo: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Ponudnik plačil je obvezen.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je obvezen.',
  'user.payment.receiptAndPlanRequired': 'receipt in planKey sta obvezna.',
  'user.payment.verificationNotConfigured': 'Preverjanje plačila ni konfigurirano za {{provider}}.',
  'user.payment.invalidPlan': 'Neveljaven paket.',
  'user.payment.verificationFailed': 'Preverjanje naročnine ni uspelo.',
  'user.payment.unknownPlan': 'Neznan paket.',
  'user.payment.invalidWebhookEvent': 'Neveljaven webhook dogodek.',
}
