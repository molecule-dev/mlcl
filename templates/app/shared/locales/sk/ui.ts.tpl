/**
 * Slovak translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Načítanie...',
  'common.saving': 'Ukladanie...',
  'common.close': 'Zavrieť',
  'common.goBack': 'Späť',
  'common.submit': 'Odoslať',
  'common.continue': 'Pokračovať',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Heslo',
  'auth.login.twoFactor': 'Dvojfaktorový token (ak je zapnutý)',
  'auth.login.signUp': 'Zaregistrovať sa',
  'auth.login.loggingIn': 'Prihlasovanie...',
  'auth.login.logIn': 'Prihlásiť sa',
  'auth.login.forgotPassword': 'Zabudli ste heslo?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (povinný)',
  'auth.signup.password': 'Heslo (povinné)',
  'auth.signup.name': 'Vaše meno',
  'auth.signup.signingUp': 'Registrácia...',
  'auth.signup.signUp': 'Zaregistrovať sa',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Ak účet s touto e-mailovou adresou existuje, bol odoslaný odkaz na obnovenie hesla.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Odosielanie...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Token na obnovenie hesla',
  'auth.resetPassword.newPassword': 'Zadajte nové heslo',
  'auth.resetPassword.twoFactor': 'Dvojfaktorový token (ak je zapnutý)',
  'auth.resetPassword.loggingIn': 'Prihlasovanie...',
  'auth.resetPassword.submit': 'Nastaviť heslo a prihlásiť sa',

  // Home
  'home.greeting': 'Ahoj, ',
  'home.world': 'Svet',

  // Settings
  'settings.account': 'Účet',
  'settings.email': 'E-mail',
  'settings.authentication': 'Overenie',
  'settings.changePassword': 'Zmeniť heslo',
  'settings.twoFactor': 'Dvojfaktorové overenie',
  'settings.notifications': 'Oznámenia',
  'settings.pushNotifications': 'Push oznámenia',
  'settings.billing': 'Fakturácia',
  'settings.plan': 'Plán: ',
  'settings.upgrade': 'Upgradovať',
  'settings.devices': 'Zariadenia',
  'settings.noDevices': 'Žiadne zariadenia nenájdené',
  'settings.thisDevice': 'Toto zariadenie',
  'settings.platform': 'Platforma',
  'settings.browser': 'Prehliadač',
  'settings.network': 'Sieť',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Neznáme',
  'settings.logOut': 'Odhlásiť sa',
  'settings.deleteAccount': 'Zmazať účet',
  'settings.changePasswordModal.title': 'Zmena hesla',
  'settings.changePasswordModal.error': 'Nepodarilo sa zmeniť heslo.',
  'settings.changePasswordModal.currentPassword': 'Súčasné heslo',
  'settings.changePasswordModal.newPassword': 'Nové heslo',
  'settings.changePasswordModal.changing': 'Mením...',
  'settings.deleteAccountModal.title': 'Zmazať účet',
  'settings.deleteAccountModal.warning':
    'Túto akciu nie je možné vrátiť späť. Zadajte heslo na potvrdenie.',
  'settings.deleteAccountModal.password': 'Heslo',
  'settings.deleteAccountModal.deleting': 'Mazanie...',
  'settings.changePasswordModal.submit': 'Zmeniť heslo',
  'settings.deleteAccountModal.submit': 'Zmazať účet',
  'settings.failedToUpdateEmail': 'Nepodarilo sa aktualizovať e-mail.',
  'settings.failedToDeleteAccount': 'Nepodarilo sa odstrániť účet.',
  'settings.toggleTwoFactor': 'Prepnúť dvojfaktorové overenie',
  'settings.togglePushNotifications': 'Prepnúť push notifikácie',

  // Footer
  'footer.about': 'O {{appName}}',
  'footer.privacyPolicy': 'Zásady ochrany osobných údajov',
  'footer.termsOfService': 'Podmienky služby',
  'footer.language': 'Jazyk',

  // OAuth
  'oauth.orContinueWith': 'Alebo pokračujte cez',
  'oauth.continueWith': 'Pokračovať cez {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Prepnúť motív',

  // User Menu
  'userMenu.open': 'Otvoriť používateľské menu',

  // Plan Updated
  'planUpdated.message': 'Váš plán bol aktualizovaný.',
  'planUpdated.thankYou': 'Ďakujeme!',
  'planUpdated.returnHome': 'Späť na hlavnú stránku',

  // PWA
  'pwa.updateAvailable': 'Je k dispozícii nová verzia!',
  'pwa.update': 'Aktualizovať',
  'pwa.updating': 'Aktualizácia...',

  // User API errors
  'user.error.badRequest': 'Chybná požiadavka.',
  'user.error.notFound': 'Nenájdené.',
  'user.error.failedToCreateSession': 'Nepodarilo sa vytvoriť reláciu.',
  'user.error.usernameRequired': 'Používateľské meno je povinné.',
  'user.error.passwordRequired': 'Heslo je povinné.',
  'user.error.emailInvalid': 'E-mail je neplatný.',
  'user.error.usernameUnavailable': 'Používateľské meno nie je dostupné.',
  'user.error.emailAlreadyRegistered': 'E-mail je už zaregistrovaný.',
  'user.error.failedToHashPassword': 'Nepodarilo sa zahashovať heslo.',
  'user.error.invalidCredentials': 'Neplatné prihlasovacie údaje.',
  'user.error.invalidTwoFactorToken': 'Neplatný dvojfaktorový token.',
  'user.error.twoFactorVerificationUnavailable': 'Dvojfaktorové overenie nedostupné.',
  'user.error.loginFailed': 'Prihlásenie zlyhalo.',
  'user.error.usernameCannotBeEmpty': 'Používateľské meno nemôže byť prázdne.',
  'user.error.failedToUpdateUser': 'Nepodarilo sa aktualizovať používateľa.',
  'user.error.failedToDeleteUser': 'Nepodarilo sa odstrániť používateľa.',
  'user.error.failedToReadUser': 'Nepodarilo sa prečítať používateľa.',
  'user.error.emailRequired': 'E-mail je povinný.',
  'user.error.failedToProcessPasswordReset': 'Nepodarilo sa spracovať obnovenie hesla.',
  'user.error.newPasswordRequired': 'Nové heslo je povinné.',
  'user.error.currentPasswordRequired': 'Aktuálne heslo je povinné.',
  'user.error.currentPasswordIncorrect': 'Aktuálne heslo je nesprávne.',
  'user.error.failedToUpdatePassword': 'Nepodarilo sa aktualizovať heslo.',
  'user.error.planKeyRequired': 'planKey je povinný.',
  'user.error.invalidPlan': 'Neplatný plán.',
  'user.error.failedToUpdateSubscription': 'Nepodarilo sa aktualizovať predplatné.',
  'user.error.failedToUpdatePlan': 'Nepodarilo sa aktualizovať plán.',
  'user.error.twoFactorNotAvailable': 'Dvojfaktorové overenie nie je dostupné.',
  'user.error.tokenRequired': 'Token je povinný.',
  'user.error.noPendingTwoFactorSetup':
    'Žiadne čakajúce dvojfaktorové nastavenie. Najprv zavolajte s akciou "setup".',
  'user.error.invalidToken': 'Neplatný token.',
  'user.error.twoFactorNotEnabled': 'Dvojfaktorové overenie nie je povolené.',
  'user.error.invalidAction': 'Neplatná akcia. Použite "setup", "enable" alebo "disable".',
  'user.error.twoFactorOperationFailed': 'Dvojfaktorová operácia zlyhala.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" nie je nakonfigurovaný.',
  'user.error.oauthVerificationFailed': 'OAuth overenie zlyhalo.',
  'user.error.failedToCreateUser': 'Nepodarilo sa vytvoriť používateľa.',
  'user.error.oauthLoginFailed': 'OAuth prihlásenie zlyhalo.',

  // Auth client errors
  'auth.error.requestFailed': 'Požiadavka zlyhala',
  'auth.error.loginFailed': 'Prihlásenie zlyhalo',
  'auth.error.registrationFailed': 'Registrácia zlyhala',
  'auth.error.noRefreshToken': 'Žiadny obnovovací token nie je k dispozícii',

  // Form validation
  'forms.required': 'Toto pole je povinné',
  'forms.min': 'Hodnota musí byť aspoň {{min}}',
  'forms.max': 'Hodnota musí byť najviac {{max}}',
  'forms.minLength': 'Musí mať aspoň {{minLength}} znakov',
  'forms.maxLength': 'Musí mať najviac {{maxLength}} znakov',
  'forms.invalidFormat': 'Neplatný formát',
  'forms.invalidEmail': 'Neplatná e-mailová adresa',
  'forms.invalidUrl': 'Neplatná URL',
  'forms.invalidValue': 'Neplatná hodnota',

  // HTTP client errors
  'http.error.requestFailed': 'Požiadavka zlyhala so stavom {{status}}.',
  'http.error.networkError': 'Sieťová chyba.',

  // Routing errors
  'routing.error.missingParam': 'Chýbajúci parameter "{{name}}" pre cestu "{{pattern}}"',
  'routing.error.routeNotFound': 'Cesta "{{name}}" nebola nájdená',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter sa musí použiť vo vnútri MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push oznámenia nie sú podporované',
  'push.error.permissionNotGranted': 'Oprávnenie pre oznámenia nebolo udelené',

  // Utility errors
  'error.networkError': 'Sieťová chyba. Skontrolujte prosím svoje pripojenie.',
  'error.timeout': 'Požiadavka vypršala. Skúste to prosím znova.',
  'error.unauthorized': 'Nemáte oprávnenie na vykonanie tejto akcie.',
  'error.forbidden': 'Prístup zamietnutý.',
  'error.notFound': 'Zdroj nenájdený.',
  'error.validationError': 'Skontrolujte prosím svoj vstup a skúste to znova.',
  'error.serverError': 'Chyba servera. Skúste to prosím neskôr.',
  'error.unknown': 'Vyskytla sa neočakávaná chyba.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message je povinný',
  'conversation.error.aiNotConfigured': 'AI poskytovateľ nie je nakonfigurovaný',
  'conversation.error.unknownAiError': 'Neznáma AI chyba',
  'conversation.error.notFound': 'Konverzácia nenájdená',
  'conversation.error.streamError': 'Chyba AI streamovania',

  // Resource errors
  'resource.error.unknownError': 'Neznáma chyba.',
  'resource.error.unableToCreate': 'Nepodarilo sa vytvoriť {{name}}.',
  'resource.error.unableToUpdate': 'Nepodarilo sa aktualizovať {{name}}.',
  'resource.error.unableToDelete': 'Nepodarilo sa odstrániť {{name}}.',
  'resource.error.notFound': 'Nenájdené.',
  'resource.error.badRequest': 'Chybná požiadavka.',
  'resource.error.unauthorized': 'Neautorizované.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name a projectType sú povinné',
  'project.error.notFound': 'Nenájdené',

  // Device errors
  'device.error.unauthorized': 'Neautorizované.',
  'device.error.badRequest': 'Chybná požiadavka.',
  'device.error.notFound': 'Nenájdené.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Nepodarilo sa prečítať {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Nepodarilo sa zapísať {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Nepodarilo sa odstrániť {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Poskytovateľ platby je povinný.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je povinný.',
  'user.payment.receiptAndPlanRequired': 'receipt a planKey sú povinné.',
  'user.payment.verificationNotConfigured':
    'Overenie platby nie je nakonfigurované pre {{provider}}.',
  'user.payment.invalidPlan': 'Neplatný plán.',
  'user.payment.verificationFailed': 'Overenie predplatného zlyhalo.',
  'user.payment.unknownPlan': 'Neznámy plán.',
  'user.payment.invalidWebhookEvent': 'Neplatná udalosť webhooku.',
}
