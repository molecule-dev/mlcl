/**
 * Hungarian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Betöltés...',
  'common.saving': 'Mentés...',
  'common.close': 'Bezárás',
  'common.goBack': 'Vissza',
  'common.submit': 'Küldés',
  'common.continue': 'Tovább',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Jelszó',
  'auth.login.twoFactor': 'Kétfaktoros token (ha engedélyezve van)',
  'auth.login.signUp': 'Regisztráció',
  'auth.login.loggingIn': 'Bejelentkezés...',
  'auth.login.logIn': 'Bejelentkezés',
  'auth.login.forgotPassword': 'Elfelejtett jelszó?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (kötelező)',
  'auth.signup.password': 'Jelszó (kötelező)',
  'auth.signup.name': 'Az Ön neve',
  'auth.signup.signingUp': 'Regisztráció...',
  'auth.signup.signUp': 'Regisztráció',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ha létezik fiók ezzel az e-mail címmel, a jelszó-visszaállítási link elküldésre került.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Küldés...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Jelszó-visszaállítási token',
  'auth.resetPassword.newPassword': 'Adja meg az új jelszót',
  'auth.resetPassword.twoFactor': 'Kétfaktoros token (ha engedélyezve van)',
  'auth.resetPassword.loggingIn': 'Bejelentkezés...',
  'auth.resetPassword.submit': 'Jelszó beállítása és bejelentkezés',

  // Home
  'home.greeting': 'Szia, ',
  'home.world': 'Világ',

  // Settings
  'settings.account': 'Fiók',
  'settings.email': 'E-mail',
  'settings.authentication': 'Hitelesítés',
  'settings.changePassword': 'Jelszó módosítása',
  'settings.twoFactor': 'Kétfaktoros hitelesítés',
  'settings.notifications': 'Értesítések',
  'settings.pushNotifications': 'Push értesítések',
  'settings.billing': 'Számlázás',
  'settings.plan': 'Csomag: ',
  'settings.upgrade': 'Frissítés',
  'settings.devices': 'Eszközök',
  'settings.noDevices': 'Nem található eszköz',
  'settings.thisDevice': 'Ez az eszköz',
  'settings.platform': 'Platform',
  'settings.browser': 'Böngésző',
  'settings.network': 'Hálózat',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Ismeretlen',
  'settings.logOut': 'Kijelentkezés',
  'settings.deleteAccount': 'Fiók törlése',
  'settings.changePasswordModal.title': 'Jelszó módosítása',
  'settings.changePasswordModal.error': 'Nem sikerült megváltoztatni a jelszót.',
  'settings.changePasswordModal.currentPassword': 'Jelenlegi jelszó',
  'settings.changePasswordModal.newPassword': 'Új jelszó',
  'settings.changePasswordModal.changing': 'Módosítás...',
  'settings.deleteAccountModal.title': 'Fiók törlése',
  'settings.deleteAccountModal.warning':
    'Ez a művelet nem vonható vissza. Kérjük, adja meg jelszavát a megerősítéshez.',
  'settings.deleteAccountModal.password': 'Jelszó',
  'settings.deleteAccountModal.deleting': 'Törlés...',
  'settings.changePasswordModal.submit': 'Jelszó módosítása',
  'settings.deleteAccountModal.submit': 'Fiók törlése',
  'settings.failedToUpdateEmail': 'Az e-mail frissítése sikertelen.',
  'settings.failedToDeleteAccount': 'A fiók törlése sikertelen.',
  'settings.toggleTwoFactor': 'Kétfaktoros hitelesítés váltása',
  'settings.togglePushNotifications': 'Push értesítések váltása',

  // Footer
  'footer.about': 'A {{appName}}-ról',
  'footer.privacyPolicy': 'Adatvédelmi irányelvek',
  'footer.termsOfService': 'Szolgáltatási feltételek',
  'footer.language': 'Nyelv',

  // OAuth
  'oauth.orContinueWith': 'Vagy folytatás ezzel',
  'oauth.continueWith': 'Folytatás ezzel: {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Téma váltása',

  // User Menu
  'userMenu.open': 'Felhasználói menü megnyitása',

  // Plan Updated
  'planUpdated.message': 'A csomagja frissítve lett.',
  'planUpdated.thankYou': 'Köszönjük!',
  'planUpdated.returnHome': 'Vissza a főoldalra',

  // PWA
  'pwa.updateAvailable': 'Új verzió elérhető!',
  'pwa.update': 'Frissítés',
  'pwa.updating': 'Frissítés...',

  // User API errors
  'user.error.badRequest': 'Hibás kérés.',
  'user.error.notFound': 'Nem található.',
  'user.error.failedToCreateSession': 'A munkamenet létrehozása sikertelen.',
  'user.error.usernameRequired': 'A felhasználónév megadása kötelező.',
  'user.error.passwordRequired': 'A jelszó megadása kötelező.',
  'user.error.emailInvalid': 'Az e-mail cím érvénytelen.',
  'user.error.usernameUnavailable': 'A felhasználónév nem elérhető.',
  'user.error.emailAlreadyRegistered': 'Az e-mail cím már regisztrálva van.',
  'user.error.failedToHashPassword': 'A jelszó hashelése sikertelen.',
  'user.error.invalidCredentials': 'Érvénytelen hitelesítő adatok.',
  'user.error.invalidTwoFactorToken': 'Érvénytelen kétfaktoros token.',
  'user.error.twoFactorVerificationUnavailable': 'A kétfaktoros ellenőrzés nem elérhető.',
  'user.error.loginFailed': 'A bejelentkezés sikertelen.',
  'user.error.usernameCannotBeEmpty': 'A felhasználónév nem lehet üres.',
  'user.error.failedToUpdateUser': 'A felhasználó frissítése sikertelen.',
  'user.error.failedToDeleteUser': 'A felhasználó törlése sikertelen.',
  'user.error.failedToReadUser': 'A felhasználó olvasása sikertelen.',
  'user.error.emailRequired': 'Az e-mail cím megadása kötelező.',
  'user.error.failedToProcessPasswordReset': 'A jelszó visszaállítás feldolgozása sikertelen.',
  'user.error.newPasswordRequired': 'Az új jelszó megadása kötelező.',
  'user.error.currentPasswordRequired': 'A jelenlegi jelszó megadása kötelező.',
  'user.error.currentPasswordIncorrect': 'A jelenlegi jelszó helytelen.',
  'user.error.failedToUpdatePassword': 'A jelszó frissítése sikertelen.',
  'user.error.planKeyRequired': 'A planKey megadása kötelező.',
  'user.error.invalidPlan': 'Érvénytelen csomag.',
  'user.error.failedToUpdateSubscription': 'Az előfizetés frissítése sikertelen.',
  'user.error.failedToUpdatePlan': 'A csomag frissítése sikertelen.',
  'user.error.twoFactorNotAvailable': 'A kétfaktoros hitelesítés nem elérhető.',
  'user.error.tokenRequired': 'Token megadása kötelező.',
  'user.error.noPendingTwoFactorSetup':
    'Nincs függőben lévő kétfaktoros beállítás. Hívja meg először a "setup" művelettel.',
  'user.error.invalidToken': 'Érvénytelen token.',
  'user.error.twoFactorNotEnabled': 'A kétfaktoros hitelesítés nincs engedélyezve.',
  'user.error.invalidAction': 'Érvénytelen művelet. Használja: "setup", "enable" vagy "disable".',
  'user.error.twoFactorOperationFailed': 'A kétfaktoros művelet sikertelen.',
  'user.error.oauthServerNotConfigured': 'Az OAuth szerver "{{server}}" nincs konfigurálva.',
  'user.error.oauthVerificationFailed': 'Az OAuth ellenőrzés sikertelen.',
  'user.error.failedToCreateUser': 'A felhasználó létrehozása sikertelen.',
  'user.error.oauthLoginFailed': 'Az OAuth bejelentkezés sikertelen.',

  // Auth client errors
  'auth.error.requestFailed': 'A kérés sikertelen',
  'auth.error.loginFailed': 'A bejelentkezés sikertelen',
  'auth.error.registrationFailed': 'A regisztráció sikertelen',
  'auth.error.noRefreshToken': 'Nincs elérhető frissítési token',

  // Form validation
  'forms.required': 'Ez a mező kötelező',
  'forms.min': 'Az értéknek legalább {{min}} kell lennie',
  'forms.max': 'Az érték legfeljebb {{max}} lehet',
  'forms.minLength': 'Legalább {{minLength}} karakter szükséges',
  'forms.maxLength': 'Legfeljebb {{maxLength}} karakter engedélyezett',
  'forms.invalidFormat': 'Érvénytelen formátum',
  'forms.invalidEmail': 'Érvénytelen e-mail cím',
  'forms.invalidUrl': 'Érvénytelen URL',
  'forms.invalidValue': 'Érvénytelen érték',

  // HTTP client errors
  'http.error.requestFailed': 'A kérés sikertelen, állapot: {{status}}.',
  'http.error.networkError': 'Hálózati hiba.',

  // Routing errors
  'routing.error.missingParam': 'Hiányzó "{{name}}" paraméter a(z) "{{pattern}}" útvonalhoz',
  'routing.error.routeNotFound': 'A(z) "{{name}}" útvonal nem található',
  'routing.error.useMoleculeRouterOutsideProvider':
    'A useMoleculeRouter-t egy MoleculeRouterProvider-en belül kell használni',

  // Push notification errors
  'push.error.notSupported': 'A push értesítések nem támogatottak',
  'push.error.permissionNotGranted': 'Az értesítési engedély nem került megadásra',

  // Utility errors
  'error.networkError': 'Hálózati hiba. Kérjük, ellenőrizze a kapcsolatot.',
  'error.timeout': 'A kérés időtúllépés. Kérjük, próbálja újra.',
  'error.unauthorized': 'Nincs jogosultsága ehhez a művelethez.',
  'error.forbidden': 'Hozzáférés megtagadva.',
  'error.notFound': 'Az erőforrás nem található.',
  'error.validationError': 'Kérjük, ellenőrizze a beviteli adatokat és próbálja újra.',
  'error.serverError': 'Szerverhiba. Kérjük, próbálja újra később.',
  'error.unknown': 'Váratlan hiba történt.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Üzenet megadása kötelező',
  'conversation.error.aiNotConfigured': 'AI szolgáltató nincs konfigurálva',
  'conversation.error.unknownAiError': 'Ismeretlen AI hiba',
  'conversation.error.notFound': 'Nem található beszélgetés',
  'conversation.error.streamError': 'AI streamelési hiba',

  // Resource errors
  'resource.error.unknownError': 'Ismeretlen hiba.',
  'resource.error.unableToCreate': 'Nem sikerült létrehozni: {{name}}.',
  'resource.error.unableToUpdate': 'Nem sikerült frissíteni: {{name}}.',
  'resource.error.unableToDelete': 'Nem sikerült törölni: {{name}}.',
  'resource.error.notFound': 'Nem található.',
  'resource.error.badRequest': 'Hibás kérés.',
  'resource.error.unauthorized': 'Jogosulatlan.',

  // Project errors
  'project.error.nameAndTypeRequired': 'A név és a projectType megadása kötelező',
  'project.error.notFound': 'Nem található',

  // Device errors
  'device.error.unauthorized': 'Jogosulatlan.',
  'device.error.badRequest': 'Hibás kérés.',
  'device.error.notFound': 'Nem található.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Nem sikerült olvasni: {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Nem sikerült írni: {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Nem sikerült törölni: {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'A fizetési szolgáltató megadása kötelező.',
  'user.payment.subscriptionIdRequired': 'A subscriptionId megadása kötelező.',
  'user.payment.receiptAndPlanRequired': 'A nyugta és a planKey megadása kötelező.',
  'user.payment.verificationNotConfigured':
    'A fizetés ellenőrzés nincs konfigurálva a következőhöz: {{provider}}.',
  'user.payment.invalidPlan': 'Érvénytelen csomag.',
  'user.payment.verificationFailed': 'Az előfizetés ellenőrzése sikertelen.',
  'user.payment.unknownPlan': 'Ismeretlen csomag.',
  'user.payment.invalidWebhookEvent': 'Érvénytelen webhook esemény.',
}
