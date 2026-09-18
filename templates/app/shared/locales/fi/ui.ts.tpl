/**
 * Finnish translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Ladataan...',
  'common.saving': 'Tallennetaan...',
  'common.close': 'Sulje',
  'common.goBack': 'Takaisin',
  'common.submit': 'Lähetä',
  'common.continue': 'Jatka',

  // Auth - Login
  'auth.login.email': 'Sähköposti',
  'auth.login.password': 'Salasana',
  'auth.login.twoFactor': 'Kaksivaiheinen tunniste (jos käytössä)',
  'auth.login.signUp': 'Rekisteröidy',
  'auth.login.loggingIn': 'Kirjaudutaan...',
  'auth.login.logIn': 'Kirjaudu sisään',
  'auth.login.forgotPassword': 'Unohditko salasanan?',

  // Auth - Signup
  'auth.signup.email': 'Sähköposti (pakollinen)',
  'auth.signup.password': 'Salasana (pakollinen)',
  'auth.signup.name': 'Nimesi',
  'auth.signup.signingUp': 'Rekisteröidään...',
  'auth.signup.signUp': 'Rekisteröidy',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Jos tili kyseisellä sähköpostiosoitteella on olemassa, salasanan palautuslinkki on lähetetty.',
  'auth.forgotPassword.email': 'Sähköposti',
  'auth.forgotPassword.submitting': 'Lähetetään...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Sähköposti',
  'auth.resetPassword.token': 'Salasanan palautustunniste',
  'auth.resetPassword.newPassword': 'Syötä uusi salasana',
  'auth.resetPassword.twoFactor': 'Kaksivaiheinen tunniste (jos käytössä)',
  'auth.resetPassword.loggingIn': 'Kirjaudutaan...',
  'auth.resetPassword.submit': 'Aseta salasana ja kirjaudu sisään',

  // Home
  'home.greeting': 'Hei, ',
  'home.world': 'Maailma',

  // Settings
  'settings.account': 'Tili',
  'settings.email': 'Sähköposti',
  'settings.authentication': 'Todennus',
  'settings.changePassword': 'Vaihda salasana',
  'settings.twoFactor': 'Kaksivaiheinen todennus',
  'settings.notifications': 'Ilmoitukset',
  'settings.pushNotifications': 'Push-ilmoitukset',
  'settings.billing': 'Laskutus',
  'settings.plan': 'Tilaus: ',
  'settings.upgrade': 'Päivitä',
  'settings.devices': 'Laitteet',
  'settings.noDevices': 'Laitteita ei löytynyt',
  'settings.thisDevice': 'Tämä laite',
  'settings.platform': 'Alusta',
  'settings.browser': 'Selain',
  'settings.network': 'Verkko',
  'settings.online': 'Yhdistetty',
  'settings.offline': 'Ei yhteyttä',
  'settings.unknown': 'Tuntematon',
  'settings.logOut': 'Kirjaudu ulos',
  'settings.deleteAccount': 'Poista tili',
  'settings.changePasswordModal.title': 'Vaihda salasana',
  'settings.changePasswordModal.error': 'Salasanan vaihto epäonnistui.',
  'settings.changePasswordModal.currentPassword': 'Nykyinen salasana',
  'settings.changePasswordModal.newPassword': 'Uusi salasana',
  'settings.changePasswordModal.changing': 'Vaihdetaan...',
  'settings.deleteAccountModal.title': 'Poista tili',
  'settings.deleteAccountModal.warning':
    'Tätä toimintoa ei voi perua. Syötä salasanasi vahvistaaksesi.',
  'settings.deleteAccountModal.password': 'Salasana',
  'settings.deleteAccountModal.deleting': 'Poistetaan...',
  'settings.changePasswordModal.submit': 'Vaihda salasana',
  'settings.deleteAccountModal.submit': 'Poista tili',
  'settings.failedToUpdateEmail': 'Sähköpostin päivitys epäonnistui.',
  'settings.failedToDeleteAccount': 'Tilin poistaminen epäonnistui.',
  'settings.toggleTwoFactor': 'Vaihda kaksivaiheinen todennus',
  'settings.togglePushNotifications': 'Vaihda push-ilmoitukset',

  // Footer
  'footer.about': 'Tietoa {{appName}}sta',
  'footer.privacyPolicy': 'Tietosuojakäytäntö',
  'footer.termsOfService': 'Käyttöehdot',
  'footer.language': 'Kieli',

  // OAuth
  'oauth.orContinueWith': 'Tai jatka palvelulla',
  'oauth.continueWith': 'Jatka palvelulla {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Vaihda teemaa',

  // User Menu
  'userMenu.open': 'Avaa käyttäjävalikko',

  // Plan Updated
  'planUpdated.message': 'Tilauksesi on päivitetty.',
  'planUpdated.thankYou': 'Kiitos!',
  'planUpdated.returnHome': 'Palaa etusivulle',

  // PWA
  'pwa.updateAvailable': 'Uusi versio saatavilla!',
  'pwa.update': 'Päivitä',
  'pwa.updating': 'Päivitetään...',

  // User API errors
  'user.error.badRequest': 'Virheellinen pyyntö.',
  'user.error.notFound': 'Ei löytynyt.',
  'user.error.failedToCreateSession': 'Istunnon luonti epäonnistui.',
  'user.error.usernameRequired': 'Käyttäjänimi vaaditaan.',
  'user.error.passwordRequired': 'Salasana vaaditaan.',
  'user.error.emailInvalid': 'Sähköposti on virheellinen.',
  'user.error.usernameUnavailable': 'Käyttäjänimi ei ole saatavilla.',
  'user.error.emailAlreadyRegistered': 'Sähköposti on jo rekisteröity.',
  'user.error.failedToHashPassword': 'Salasanan tiivistäminen epäonnistui.',
  'user.error.invalidCredentials': 'Virheelliset tunnistetiedot.',
  'user.error.invalidTwoFactorToken': 'Virheellinen kaksivaiheinen tunniste.',
  'user.error.twoFactorVerificationUnavailable': 'Kaksivaiheinen vahvistus ei ole käytettävissä.',
  'user.error.loginFailed': 'Kirjautuminen epäonnistui.',
  'user.error.usernameCannotBeEmpty': 'Käyttäjänimi ei voi olla tyhjä.',
  'user.error.failedToUpdateUser': 'Käyttäjän päivitys epäonnistui.',
  'user.error.failedToDeleteUser': 'Käyttäjän poisto epäonnistui.',
  'user.error.failedToReadUser': 'Käyttäjän lukeminen epäonnistui.',
  'user.error.emailRequired': 'Sähköposti vaaditaan.',
  'user.error.failedToProcessPasswordReset': 'Salasanan nollauksen käsittely epäonnistui.',
  'user.error.newPasswordRequired': 'Uusi salasana vaaditaan.',
  'user.error.currentPasswordRequired': 'Nykyinen salasana vaaditaan.',
  'user.error.currentPasswordIncorrect': 'Nykyinen salasana on väärä.',
  'user.error.failedToUpdatePassword': 'Salasanan päivitys epäonnistui.',
  'user.error.planKeyRequired': 'planKey vaaditaan.',
  'user.error.invalidPlan': 'Virheellinen paketti.',
  'user.error.failedToUpdateSubscription': 'Tilauksen päivitys epäonnistui.',
  'user.error.failedToUpdatePlan': 'Paketin päivitys epäonnistui.',
  'user.error.twoFactorNotAvailable': 'Kaksivaiheinen todennus ei ole käytettävissä.',
  'user.error.tokenRequired': 'Tunniste vaaditaan.',
  'user.error.noPendingTwoFactorSetup':
    'Ei odottavaa kaksivaiheista asetusta. Kutsu ensin toiminnolla "setup".',
  'user.error.invalidToken': 'Virheellinen tunniste.',
  'user.error.twoFactorNotEnabled': 'Kaksivaiheinen todennus ei ole käytössä.',
  'user.error.invalidAction': 'Virheellinen toiminto. Käytä "setup", "enable" tai "disable".',
  'user.error.twoFactorOperationFailed': 'Kaksivaiheisen todennuksen toiminto epäonnistui.',
  'user.error.oauthServerNotConfigured': 'OAuth-palvelin "{{server}}" ei ole määritetty.',
  'user.error.oauthVerificationFailed': 'OAuth-vahvistus epäonnistui.',
  'user.error.failedToCreateUser': 'Käyttäjän luonti epäonnistui.',
  'user.error.oauthLoginFailed': 'OAuth-kirjautuminen epäonnistui.',

  // Auth client errors
  'auth.error.requestFailed': 'Pyyntö epäonnistui',
  'auth.error.loginFailed': 'Kirjautuminen epäonnistui',
  'auth.error.registrationFailed': 'Rekisteröityminen epäonnistui',
  'auth.error.noRefreshToken': 'Uudistustunnistetta ei ole saatavilla',

  // Form validation
  'forms.required': 'Tämä kenttä on pakollinen',
  'forms.min': 'Arvon on oltava vähintään {{min}}',
  'forms.max': 'Arvon on oltava enintään {{max}}',
  'forms.minLength': 'Vähintään {{minLength}} merkkiä vaaditaan',
  'forms.maxLength': 'Enintään {{maxLength}} merkkiä sallittu',
  'forms.invalidFormat': 'Virheellinen muoto',
  'forms.invalidEmail': 'Virheellinen sähköpostiosoite',
  'forms.invalidUrl': 'Virheellinen URL',
  'forms.invalidValue': 'Virheellinen arvo',

  // HTTP client errors
  'http.error.requestFailed': 'Pyyntö epäonnistui tilalla {{status}}.',
  'http.error.networkError': 'Verkkovirhe.',

  // Routing errors
  'routing.error.missingParam': 'Puuttuva parametri "{{name}}" polulle "{{pattern}}"',
  'routing.error.routeNotFound': 'Reittiä "{{name}}" ei löytynyt',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter on käytettävä MoleculeRouterProvider-komponentin sisällä',

  // Push notification errors
  'push.error.notSupported': 'Push-ilmoituksia ei tueta',
  'push.error.permissionNotGranted': 'Ilmoituslupaa ei myönnetty',

  // Utility errors
  'error.networkError': 'Verkkovirhe. Tarkista yhteytesi.',
  'error.timeout': 'Pyyntö aikakatkaistiin. Yritä uudelleen.',
  'error.unauthorized': 'Sinulla ei ole oikeutta suorittaa tätä toimintoa.',
  'error.forbidden': 'Pääsy evätty.',
  'error.notFound': 'Resurssia ei löytynyt.',
  'error.validationError': 'Tarkista syötteesi ja yritä uudelleen.',
  'error.serverError': 'Palvelinvirhe. Yritä myöhemmin uudelleen.',
  'error.unknown': 'Odottamaton virhe tapahtui.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Viesti vaaditaan',
  'conversation.error.aiNotConfigured': 'AI-palveluntarjoajaa ei ole määritetty',
  'conversation.error.unknownAiError': 'Tuntematon AI-virhe',
  'conversation.error.notFound': 'Keskustelua ei löytynyt',
  'conversation.error.streamError': 'AI-suoratoistovirhe',

  // Resource errors
  'resource.error.unknownError': 'Tuntematon virhe.',
  'resource.error.unableToCreate': 'Ei voitu luoda {{name}}.',
  'resource.error.unableToUpdate': 'Ei voitu päivittää {{name}}.',
  'resource.error.unableToDelete': 'Ei voitu poistaa {{name}}.',
  'resource.error.notFound': 'Ei löytynyt.',
  'resource.error.badRequest': 'Virheellinen pyyntö.',
  'resource.error.unauthorized': 'Luvaton.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Nimi ja projectType vaaditaan',
  'project.error.notFound': 'Ei löytynyt',

  // Device errors
  'device.error.unauthorized': 'Luvaton.',
  'device.error.badRequest': 'Virheellinen pyyntö.',
  'device.error.notFound': 'Ei löytynyt.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Tiedoston {{path}} lukeminen epäonnistui: {{error}}',
  'codeSandbox.docker.error.writeFailed':
    'Tiedoston {{path}} kirjoittaminen epäonnistui: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Tiedoston {{path}} poistaminen epäonnistui: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Maksupalveluntarjoaja vaaditaan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId vaaditaan.',
  'user.payment.receiptAndPlanRequired': 'Kuitti ja planKey vaaditaan.',
  'user.payment.verificationNotConfigured':
    'Maksuvahvistusta ei ole määritetty palvelulle {{provider}}.',
  'user.payment.invalidPlan': 'Virheellinen paketti.',
  'user.payment.verificationFailed': 'Tilauksen vahvistus epäonnistui.',
  'user.payment.unknownPlan': 'Tuntematon paketti.',
  'user.payment.invalidWebhookEvent': 'Virheellinen webhook-tapahtuma.',
}
