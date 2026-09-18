/**
 * Croatian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Učitavanje...',
  'common.saving': 'Spremanje...',
  'common.close': 'Zatvori',
  'common.goBack': 'Natrag',
  'common.submit': 'Pošalji',
  'common.continue': 'Nastavi',

  // Auth - Login
  'auth.login.email': 'E-pošta',
  'auth.login.password': 'Lozinka',
  'auth.login.twoFactor': 'Dvofaktorski token (ako je omogućen)',
  'auth.login.signUp': 'Registracija',
  'auth.login.loggingIn': 'Prijava u tijeku...',
  'auth.login.logIn': 'Prijava',
  'auth.login.forgotPassword': 'Zaboravljena lozinka?',

  // Auth - Signup
  'auth.signup.email': 'E-pošta (Obavezno)',
  'auth.signup.password': 'Lozinka (Obavezno)',
  'auth.signup.name': 'Vaše ime',
  'auth.signup.signingUp': 'Registracija u tijeku...',
  'auth.signup.signUp': 'Registracija',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ako postoji račun s tom e-poštom, poveznica za poništavanje lozinke je poslana.',
  'auth.forgotPassword.email': 'E-pošta',
  'auth.forgotPassword.submitting': 'Slanje...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-pošta',
  'auth.resetPassword.token': 'Token za poništavanje lozinke',
  'auth.resetPassword.newPassword': 'Unesite novu lozinku',
  'auth.resetPassword.twoFactor': 'Dvofaktorski token (ako je omogućen)',
  'auth.resetPassword.loggingIn': 'Prijava u tijeku...',
  'auth.resetPassword.submit': 'Postavi lozinku i prijavi se',

  // Home
  'home.greeting': 'Bok, ',
  'home.world': 'Svijete',

  // Settings
  'settings.account': 'Račun',
  'settings.email': 'E-pošta',
  'settings.authentication': 'Autentifikacija',
  'settings.changePassword': 'Promijeni lozinku',
  'settings.twoFactor': 'Dvofaktorska autentifikacija',
  'settings.notifications': 'Obavijesti',
  'settings.pushNotifications': 'Push obavijesti',
  'settings.billing': 'Naplata',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Nadogradi',
  'settings.devices': 'Uređaji',
  'settings.noDevices': 'Nema pronađenih uređaja',
  'settings.thisDevice': 'Ovaj uređaj',
  'settings.platform': 'Platforma',
  'settings.browser': 'Preglednik',
  'settings.network': 'Mreža',
  'settings.online': 'Na mreži',
  'settings.offline': 'Izvan mreže',
  'settings.unknown': 'Nepoznato',
  'settings.logOut': 'Odjava',
  'settings.deleteAccount': 'Obriši račun',
  'settings.changePasswordModal.title': 'Promjena lozinke',
  'settings.changePasswordModal.error': 'Promjena lozinke nije uspjela.',
  'settings.changePasswordModal.currentPassword': 'Trenutna lozinka',
  'settings.changePasswordModal.newPassword': 'Nova lozinka',
  'settings.changePasswordModal.changing': 'Promjena...',
  'settings.deleteAccountModal.title': 'Brisanje računa',
  'settings.deleteAccountModal.warning':
    'Ova radnja se ne može poništiti. Unesite lozinku za potvrdu.',
  'settings.deleteAccountModal.password': 'Lozinka',
  'settings.deleteAccountModal.deleting': 'Brisanje...',
  'settings.changePasswordModal.submit': 'Promijeni lozinku',
  'settings.deleteAccountModal.submit': 'Obriši račun',
  'settings.failedToUpdateEmail': 'Ažuriranje e-pošte nije uspjelo.',
  'settings.failedToDeleteAccount': 'Brisanje računa nije uspjelo.',
  'settings.toggleTwoFactor': 'Uključi/isključi dvofaktorsku autentifikaciju',
  'settings.togglePushNotifications': 'Uključi/isključi push obavijesti',

  // Footer
  'footer.about': 'O {{appName}}u',
  'footer.privacyPolicy': 'Pravila privatnosti',
  'footer.termsOfService': 'Uvjeti korištenja',
  'footer.language': 'Jezik',

  // OAuth
  'oauth.orContinueWith': 'Ili nastavite putem',
  'oauth.continueWith': 'Nastavi putem {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Promijeni temu',

  // User Menu
  'userMenu.open': 'Otvori korisnički izbornik',

  // Plan Updated
  'planUpdated.message': 'Vaš plan je ažuriran.',
  'planUpdated.thankYou': 'Hvala!',
  'planUpdated.returnHome': 'Povratak na početnu',

  // PWA
  'pwa.updateAvailable': 'Nova verzija dostupna!',
  'pwa.update': 'Ažuriraj',
  'pwa.updating': 'Ažuriranje...',

  // User API errors
  'user.error.badRequest': 'Nevažeći zahtjev.',
  'user.error.notFound': 'Nije pronađeno.',
  'user.error.failedToCreateSession': 'Stvaranje sesije nije uspjelo.',
  'user.error.usernameRequired': 'Korisničko ime je obavezno.',
  'user.error.passwordRequired': 'Lozinka je obavezna.',
  'user.error.emailInvalid': 'E-pošta je nevažeća.',
  'user.error.usernameUnavailable': 'Korisničko ime nije dostupno.',
  'user.error.emailAlreadyRegistered': 'E-pošta je već registrirana.',
  'user.error.failedToHashPassword': 'Heširanje lozinke nije uspjelo.',
  'user.error.invalidCredentials': 'Nevažeće vjerodajnice.',
  'user.error.invalidTwoFactorToken': 'Nevažeći dvofaktorski token.',
  'user.error.twoFactorVerificationUnavailable': 'Dvofaktorska verifikacija nedostupna.',
  'user.error.loginFailed': 'Prijava nije uspjela.',
  'user.error.usernameCannotBeEmpty': 'Korisničko ime ne može biti prazno.',
  'user.error.failedToUpdateUser': 'Ažuriranje korisnika nije uspjelo.',
  'user.error.failedToDeleteUser': 'Brisanje korisnika nije uspjelo.',
  'user.error.failedToReadUser': 'Čitanje korisnika nije uspjelo.',
  'user.error.emailRequired': 'E-pošta je obavezna.',
  'user.error.failedToProcessPasswordReset': 'Obrada ponovnog postavljanja lozinke nije uspjela.',
  'user.error.newPasswordRequired': 'Nova lozinka je obavezna.',
  'user.error.currentPasswordRequired': 'Trenutna lozinka je obavezna.',
  'user.error.currentPasswordIncorrect': 'Trenutna lozinka je netočna.',
  'user.error.failedToUpdatePassword': 'Ažuriranje lozinke nije uspjelo.',
  'user.error.planKeyRequired': 'planKey je obavezan.',
  'user.error.invalidPlan': 'Nevažeći plan.',
  'user.error.failedToUpdateSubscription': 'Ažuriranje pretplate nije uspjelo.',
  'user.error.failedToUpdatePlan': 'Ažuriranje plana nije uspjelo.',
  'user.error.twoFactorNotAvailable': 'Dvofaktorska autentifikacija nije dostupna.',
  'user.error.tokenRequired': 'Token je obavezan.',
  'user.error.noPendingTwoFactorSetup':
    'Nema dvofaktorskog postavljanja na čekanju. Pozovite s radnjom "setup" prvo.',
  'user.error.invalidToken': 'Nevažeći token.',
  'user.error.twoFactorNotEnabled': 'Dvofaktorska autentifikacija nije omogućena.',
  'user.error.invalidAction': 'Nevažeća radnja. Koristite "setup", "enable" ili "disable".',
  'user.error.twoFactorOperationFailed': 'Dvofaktorska operacija nije uspjela.',
  'user.error.oauthServerNotConfigured': 'OAuth poslužitelj "{{server}}" nije konfiguriran.',
  'user.error.oauthVerificationFailed': 'OAuth verifikacija nije uspjela.',
  'user.error.failedToCreateUser': 'Stvaranje korisnika nije uspjelo.',
  'user.error.oauthLoginFailed': 'OAuth prijava nije uspjela.',

  // Auth client errors
  'auth.error.requestFailed': 'Zahtjev nije uspio',
  'auth.error.loginFailed': 'Prijava nije uspjela',
  'auth.error.registrationFailed': 'Registracija nije uspjela',
  'auth.error.noRefreshToken': 'Nema dostupnog tokena za osvježavanje',

  // Form validation
  'forms.required': 'Ovo polje je obavezno',
  'forms.min': 'Vrijednost mora biti najmanje {{min}}',
  'forms.max': 'Vrijednost mora biti najviše {{max}}',
  'forms.minLength': 'Mora sadržavati najmanje {{minLength}} znakova',
  'forms.maxLength': 'Mora sadržavati najviše {{maxLength}} znakova',
  'forms.invalidFormat': 'Nevažeći format',
  'forms.invalidEmail': 'Nevažeća adresa e-pošte',
  'forms.invalidUrl': 'Nevažeći URL',
  'forms.invalidValue': 'Nevažeća vrijednost',

  // HTTP client errors
  'http.error.requestFailed': 'Zahtjev nije uspio sa statusom {{status}}.',
  'http.error.networkError': 'Mrežna pogreška.',

  // Routing errors
  'routing.error.missingParam': 'Nedostaje parametar "{{name}}" za putanju "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nije pronađena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter se mora koristiti unutar MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push obavijesti nisu podržane',
  'push.error.permissionNotGranted': 'Dozvola za obavijesti nije odobrena',

  // Utility errors
  'error.networkError': 'Mrežna pogreška. Molimo provjerite svoju vezu.',
  'error.timeout': 'Zahtjev je istekao. Molimo pokušajte ponovo.',
  'error.unauthorized': 'Niste ovlašteni za izvršavanje ove radnje.',
  'error.forbidden': 'Pristup odbijen.',
  'error.notFound': 'Resurs nije pronađen.',
  'error.validationError': 'Molimo provjerite unos i pokušajte ponovo.',
  'error.serverError': 'Pogreška poslužitelja. Molimo pokušajte ponovo kasnije.',
  'error.unknown': 'Došlo je do neočekivane pogreške.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message je obavezan',
  'conversation.error.aiNotConfigured': 'AI pružatelj nije konfiguriran',
  'conversation.error.unknownAiError': 'Nepoznata AI pogreška',
  'conversation.error.notFound': 'Razgovor nije pronađen',
  'conversation.error.streamError': 'Pogreška AI strujanja',

  // Resource errors
  'resource.error.unknownError': 'Nepoznata pogreška.',
  'resource.error.unableToCreate': 'Nije moguće stvoriti {{name}}.',
  'resource.error.unableToUpdate': 'Nije moguće ažurirati {{name}}.',
  'resource.error.unableToDelete': 'Nije moguće obrisati {{name}}.',
  'resource.error.notFound': 'Nije pronađeno.',
  'resource.error.badRequest': 'Nevažeći zahtjev.',
  'resource.error.unauthorized': 'Neovlašteno.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name i projectType su obavezni',
  'project.error.notFound': 'Nije pronađeno',

  // Device errors
  'device.error.unauthorized': 'Neovlašteno.',
  'device.error.badRequest': 'Neispravan zahtjev.',
  'device.error.notFound': 'Nije pronađeno.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Neuspjelo čitanje {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Neuspjelo pisanje {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Neuspjelo brisanje {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Pružatelj plaćanja je obavezan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je obavezan.',
  'user.payment.receiptAndPlanRequired': 'receipt i planKey su obavezni.',
  'user.payment.verificationNotConfigured':
    'Verifikacija plaćanja nije konfigurirana za {{provider}}.',
  'user.payment.invalidPlan': 'Nevažeći plan.',
  'user.payment.verificationFailed': 'Verifikacija pretplate nije uspjela.',
  'user.payment.unknownPlan': 'Nepoznat plan.',
  'user.payment.invalidWebhookEvent': 'Nevažeći webhook događaj.',
}
