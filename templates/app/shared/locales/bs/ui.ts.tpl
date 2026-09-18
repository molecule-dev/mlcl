/**
 * Bosnian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Učitavanje...',
  'common.saving': 'Spašavanje...',
  'common.close': 'Zatvori',
  'common.goBack': 'Nazad',
  'common.submit': 'Pošalji',
  'common.continue': 'Nastavi',

  // Auth - Login
  'auth.login.email': 'E-pošta',
  'auth.login.password': 'Lozinka',
  'auth.login.twoFactor': 'Dvofaktorski token (ako je omogućen)',
  'auth.login.signUp': 'Registracija',
  'auth.login.loggingIn': 'Prijavljivanje...',
  'auth.login.logIn': 'Prijavi se',
  'auth.login.forgotPassword': 'Zaboravljena lozinka?',

  // Auth - Signup
  'auth.signup.email': 'E-pošta (Obavezno)',
  'auth.signup.password': 'Lozinka (Obavezno)',
  'auth.signup.name': 'Vaše ime',
  'auth.signup.signingUp': 'Registracija u toku...',
  'auth.signup.signUp': 'Registracija',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ako postoji račun sa tom e-poštom, link za resetovanje lozinke je poslan.',
  'auth.forgotPassword.email': 'E-pošta',
  'auth.forgotPassword.submitting': 'Slanje...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-pošta',
  'auth.resetPassword.token': 'Token za resetovanje lozinke',
  'auth.resetPassword.newPassword': 'Unesite novu lozinku',
  'auth.resetPassword.twoFactor': 'Dvofaktorski token (ako je omogućen)',
  'auth.resetPassword.loggingIn': 'Prijavljivanje...',
  'auth.resetPassword.submit': 'Postavi lozinku i prijavi se',

  // Home
  'home.greeting': 'Zdravo, ',
  'home.world': 'Svijete',

  // Settings
  'settings.account': 'Račun',
  'settings.email': 'E-pošta',
  'settings.authentication': 'Autentifikacija',
  'settings.changePassword': 'Promijeni lozinku',
  'settings.twoFactor': 'Dvofaktorska autentifikacija',
  'settings.notifications': 'Obavještenja',
  'settings.pushNotifications': 'Push obavještenja',
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
  'settings.offline': 'Van mreže',
  'settings.unknown': 'Nepoznato',
  'settings.logOut': 'Odjavi se',
  'settings.deleteAccount': 'Obriši račun',
  'settings.changePasswordModal.title': 'Promjena lozinke',
  'settings.changePasswordModal.error': 'Promjena lozinke nije uspjela.',
  'settings.changePasswordModal.currentPassword': 'Trenutna lozinka',
  'settings.changePasswordModal.newPassword': 'Nova lozinka',
  'settings.changePasswordModal.changing': 'Mijenjanje...',
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
  'footer.privacyPolicy': 'Politika privatnosti',
  'footer.termsOfService': 'Uslovi korištenja',
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
  'userMenu.open': 'Otvori korisnički meni',

  // Plan Updated
  'planUpdated.message': 'Vaš plan je ažuriran.',
  'planUpdated.thankYou': 'Hvala!',
  'planUpdated.returnHome': 'Povratak na početnu',

  // PWA
  'pwa.updateAvailable': 'Nova verzija je dostupna!',
  'pwa.update': 'Ažuriraj',
  'pwa.updating': 'Ažuriranje...',

  // User API errors
  'user.error.badRequest': 'Nevažeći zahtjev.',
  'user.error.notFound': 'Nije pronađeno.',
  'user.error.failedToCreateSession': 'Neuspješno kreiranje sesije.',
  'user.error.usernameRequired': 'Korisničko ime je obavezno.',
  'user.error.passwordRequired': 'Lozinka je obavezna.',
  'user.error.emailInvalid': 'Email je nevažeći.',
  'user.error.usernameUnavailable': 'Korisničko ime nije dostupno.',
  'user.error.emailAlreadyRegistered': 'Email je već registrovan.',
  'user.error.failedToHashPassword': 'Neuspješno heširanje lozinke.',
  'user.error.invalidCredentials': 'Nevažeći akreditivi.',
  'user.error.invalidTwoFactorToken': 'Nevažeći dvofaktorski token.',
  'user.error.twoFactorVerificationUnavailable': 'Dvofaktorska verifikacija nedostupna.',
  'user.error.loginFailed': 'Prijava neuspješna.',
  'user.error.usernameCannotBeEmpty': 'Korisničko ime ne može biti prazno.',
  'user.error.failedToUpdateUser': 'Neuspješno ažuriranje korisnika.',
  'user.error.failedToDeleteUser': 'Neuspješno brisanje korisnika.',
  'user.error.failedToReadUser': 'Neuspješno čitanje korisnika.',
  'user.error.emailRequired': 'Email je obavezan.',
  'user.error.failedToProcessPasswordReset': 'Neuspješna obrada resetovanja lozinke.',
  'user.error.newPasswordRequired': 'Nova lozinka je obavezna.',
  'user.error.currentPasswordRequired': 'Trenutna lozinka je obavezna.',
  'user.error.currentPasswordIncorrect': 'Trenutna lozinka je netačna.',
  'user.error.failedToUpdatePassword': 'Neuspješno ažuriranje lozinke.',
  'user.error.planKeyRequired': 'planKey je obavezan.',
  'user.error.invalidPlan': 'Nevažeći plan.',
  'user.error.failedToUpdateSubscription': 'Neuspješno ažuriranje pretplate.',
  'user.error.failedToUpdatePlan': 'Neuspješno ažuriranje plana.',
  'user.error.twoFactorNotAvailable': 'Dvofaktorska autentifikacija nije dostupna.',
  'user.error.tokenRequired': 'Token je obavezan.',
  'user.error.noPendingTwoFactorSetup':
    'Nema dvofaktorskog postavljanja na čekanju. Pozovite s akcijom "setup" prvo.',
  'user.error.invalidToken': 'Nevažeći token.',
  'user.error.twoFactorNotEnabled': 'Dvofaktorska autentifikacija nije omogućena.',
  'user.error.invalidAction': 'Nevažeća akcija. Koristite "setup", "enable" ili "disable".',
  'user.error.twoFactorOperationFailed': 'Dvofaktorska operacija neuspješna.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" nije konfigurisan.',
  'user.error.oauthVerificationFailed': 'OAuth verifikacija neuspješna.',
  'user.error.failedToCreateUser': 'Neuspješno kreiranje korisnika.',
  'user.error.oauthLoginFailed': 'OAuth prijava neuspješna.',

  // Auth client errors
  'auth.error.requestFailed': 'Zahtjev neuspješan',
  'auth.error.loginFailed': 'Prijava neuspješna',
  'auth.error.registrationFailed': 'Registracija neuspješna',
  'auth.error.noRefreshToken': 'Nema dostupnog tokena za osvježavanje',

  // Form validation
  'forms.required': 'Ovo polje je obavezno',
  'forms.min': 'Vrijednost mora biti najmanje {{min}}',
  'forms.max': 'Vrijednost mora biti najviše {{max}}',
  'forms.minLength': 'Mora imati najmanje {{minLength}} znakova',
  'forms.maxLength': 'Mora imati najviše {{maxLength}} znakova',
  'forms.invalidFormat': 'Neispravan format',
  'forms.invalidEmail': 'Neispravna email adresa',
  'forms.invalidUrl': 'Neispravan URL',
  'forms.invalidValue': 'Neispravna vrijednost',

  // HTTP client errors
  'http.error.requestFailed': 'Zahtjev neuspješan sa statusom {{status}}.',
  'http.error.networkError': 'Mrežna greška.',

  // Routing errors
  'routing.error.missingParam': 'Nedostaje parametar "{{name}}" za putanju "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nije pronađena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter se mora koristiti unutar MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push obavještenja nisu podržana',
  'push.error.permissionNotGranted': 'Dozvola za obavještenja nije odobrena',

  // Utility errors
  'error.networkError': 'Mrežna greška. Molimo provjerite svoju vezu.',
  'error.timeout': 'Vrijeme zahtjeva isteklo. Molimo pokušajte ponovo.',
  'error.unauthorized': 'Niste ovlašteni za ovu akciju.',
  'error.forbidden': 'Pristup odbijen.',
  'error.notFound': 'Resurs nije pronađen.',
  'error.validationError': 'Molimo provjerite unos i pokušajte ponovo.',
  'error.serverError': 'Greška servera. Molimo pokušajte ponovo kasnije.',
  'error.unknown': 'Došlo je do neočekivane greške.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message je obavezan',
  'conversation.error.aiNotConfigured': 'AI provider nije konfigurisan',
  'conversation.error.unknownAiError': 'Nepoznata AI greška',
  'conversation.error.notFound': 'Razgovor nije pronađen',
  'conversation.error.streamError': 'Greška AI streaminga',

  // Resource errors
  'resource.error.unknownError': 'Nepoznata greška.',
  'resource.error.unableToCreate': 'Nije moguće kreirati {{name}}.',
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
  'user.payment.providerRequired': 'Provajder plaćanja je obavezan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je obavezan.',
  'user.payment.receiptAndPlanRequired': 'receipt i planKey su obavezni.',
  'user.payment.verificationNotConfigured':
    'Verifikacija plaćanja nije konfigurisana za {{provider}}.',
  'user.payment.invalidPlan': 'Nevažeći plan.',
  'user.payment.verificationFailed': 'Neuspješna verifikacija pretplate.',
  'user.payment.unknownPlan': 'Nepoznat plan.',
  'user.payment.invalidWebhookEvent': 'Nevažeći webhook događaj.',
}
