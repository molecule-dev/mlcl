/**
 * Czech translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Načítání...',
  'common.saving': 'Ukládání...',
  'common.close': 'Zavřít',
  'common.goBack': 'Zpět',
  'common.submit': 'Odeslat',
  'common.continue': 'Pokračovat',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Heslo',
  'auth.login.twoFactor': 'Dvoufaktorový token (pokud je zapnutý)',
  'auth.login.signUp': 'Zaregistrovat se',
  'auth.login.loggingIn': 'Přihlašování...',
  'auth.login.logIn': 'Přihlásit se',
  'auth.login.forgotPassword': 'Zapomněli jste heslo?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (povinný)',
  'auth.signup.password': 'Heslo (povinné)',
  'auth.signup.name': 'Vaše jméno',
  'auth.signup.signingUp': 'Registrace...',
  'auth.signup.signUp': 'Zaregistrovat se',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Pokud účet s touto e-mailovou adresou existuje, byl odeslán odkaz pro obnovení hesla.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Odesílání...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Token pro obnovení hesla',
  'auth.resetPassword.newPassword': 'Zadejte nové heslo',
  'auth.resetPassword.twoFactor': 'Dvoufaktorový token (pokud je zapnutý)',
  'auth.resetPassword.loggingIn': 'Přihlašování...',
  'auth.resetPassword.submit': 'Nastavit heslo a přihlásit se',

  // Home
  'home.greeting': 'Ahoj, ',
  'home.world': 'Svět',

  // Settings
  'settings.account': 'Účet',
  'settings.email': 'E-mail',
  'settings.authentication': 'Ověření',
  'settings.changePassword': 'Změnit heslo',
  'settings.twoFactor': 'Dvoufaktorové ověření',
  'settings.notifications': 'Oznámení',
  'settings.pushNotifications': 'Push oznámení',
  'settings.billing': 'Fakturace',
  'settings.plan': 'Plán: ',
  'settings.upgrade': 'Upgradovat',
  'settings.devices': 'Zařízení',
  'settings.noDevices': 'Žádná zařízení nenalezena',
  'settings.thisDevice': 'Toto zařízení',
  'settings.platform': 'Platforma',
  'settings.browser': 'Prohlížeč',
  'settings.network': 'Síť',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Neznámé',
  'settings.logOut': 'Odhlásit se',
  'settings.deleteAccount': 'Smazat účet',
  'settings.changePasswordModal.title': 'Změna hesla',
  'settings.changePasswordModal.error': 'Nepodařilo se změnit heslo.',
  'settings.changePasswordModal.currentPassword': 'Současné heslo',
  'settings.changePasswordModal.newPassword': 'Nové heslo',
  'settings.changePasswordModal.changing': 'Měním...',
  'settings.deleteAccountModal.title': 'Smazat účet',
  'settings.deleteAccountModal.warning':
    'Tuto akci nelze vrátit zpět. Zadejte heslo pro potvrzení.',
  'settings.deleteAccountModal.password': 'Heslo',
  'settings.deleteAccountModal.deleting': 'Mazání...',
  'settings.changePasswordModal.submit': 'Změnit heslo',
  'settings.deleteAccountModal.submit': 'Smazat účet',
  'settings.failedToUpdateEmail': 'Nepodařilo se aktualizovat e-mail.',
  'settings.failedToDeleteAccount': 'Nepodařilo se smazat účet.',
  'settings.toggleTwoFactor': 'Přepnout dvoufaktorové ověřování',
  'settings.togglePushNotifications': 'Přepnout push notifikace',

  // Footer
  'footer.about': 'O {{appName}}',
  'footer.privacyPolicy': 'Zásady ochrany osobních údajů',
  'footer.termsOfService': 'Podmínky služby',
  'footer.language': 'Jazyk',

  // OAuth
  'oauth.orContinueWith': 'Nebo pokračujte přes',
  'oauth.continueWith': 'Pokračovat přes {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Přepnout motiv',

  // User Menu
  'userMenu.open': 'Otevřít uživatelské menu',

  // Plan Updated
  'planUpdated.message': 'Váš plán byl aktualizován.',
  'planUpdated.thankYou': 'Děkujeme!',
  'planUpdated.returnHome': 'Zpět na hlavní stránku',

  // PWA
  'pwa.updateAvailable': 'Je k dispozici nová verze!',
  'pwa.update': 'Aktualizovat',
  'pwa.updating': 'Aktualizace...',

  // User API errors
  'user.error.badRequest': 'Chybný požadavek.',
  'user.error.notFound': 'Nenalezeno.',
  'user.error.failedToCreateSession': 'Nepodařilo se vytvořit relaci.',
  'user.error.usernameRequired': 'Uživatelské jméno je povinné.',
  'user.error.passwordRequired': 'Heslo je povinné.',
  'user.error.emailInvalid': 'E-mail je neplatný.',
  'user.error.usernameUnavailable': 'Uživatelské jméno není dostupné.',
  'user.error.emailAlreadyRegistered': 'E-mail je již registrován.',
  'user.error.failedToHashPassword': 'Nepodařilo se zahashovat heslo.',
  'user.error.invalidCredentials': 'Neplatné přihlašovací údaje.',
  'user.error.invalidTwoFactorToken': 'Neplatný dvoufaktorový token.',
  'user.error.twoFactorVerificationUnavailable': 'Dvoufaktorové ověření nedostupné.',
  'user.error.loginFailed': 'Přihlášení selhalo.',
  'user.error.usernameCannotBeEmpty': 'Uživatelské jméno nesmí být prázdné.',
  'user.error.failedToUpdateUser': 'Nepodařilo se aktualizovat uživatele.',
  'user.error.failedToDeleteUser': 'Nepodařilo se smazat uživatele.',
  'user.error.failedToReadUser': 'Nepodařilo se přečíst uživatele.',
  'user.error.emailRequired': 'E-mail je povinný.',
  'user.error.failedToProcessPasswordReset': 'Nepodařilo se zpracovat obnovení hesla.',
  'user.error.newPasswordRequired': 'Nové heslo je povinné.',
  'user.error.currentPasswordRequired': 'Aktuální heslo je povinné.',
  'user.error.currentPasswordIncorrect': 'Aktuální heslo je nesprávné.',
  'user.error.failedToUpdatePassword': 'Nepodařilo se aktualizovat heslo.',
  'user.error.planKeyRequired': 'planKey je povinný.',
  'user.error.invalidPlan': 'Neplatný plán.',
  'user.error.failedToUpdateSubscription': 'Nepodařilo se aktualizovat předplatné.',
  'user.error.failedToUpdatePlan': 'Nepodařilo se aktualizovat plán.',
  'user.error.twoFactorNotAvailable': 'Dvoufaktorové ověření není dostupné.',
  'user.error.tokenRequired': 'Token je povinný.',
  'user.error.noPendingTwoFactorSetup':
    'Žádné čekající dvoufaktorové nastavení. Nejprve zavolejte s akcí "setup".',
  'user.error.invalidToken': 'Neplatný token.',
  'user.error.twoFactorNotEnabled': 'Dvoufaktorové ověření není povoleno.',
  'user.error.invalidAction': 'Neplatná akce. Použijte "setup", "enable" nebo "disable".',
  'user.error.twoFactorOperationFailed': 'Dvoufaktorová operace selhala.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" není nakonfigurován.',
  'user.error.oauthVerificationFailed': 'OAuth ověření selhalo.',
  'user.error.failedToCreateUser': 'Nepodařilo se vytvořit uživatele.',
  'user.error.oauthLoginFailed': 'OAuth přihlášení selhalo.',

  // Auth client errors
  'auth.error.requestFailed': 'Požadavek selhal',
  'auth.error.loginFailed': 'Přihlášení selhalo',
  'auth.error.registrationFailed': 'Registrace selhala',
  'auth.error.noRefreshToken': 'Žádný obnovovací token není k dispozici',

  // Form validation
  'forms.required': 'Toto pole je povinné',
  'forms.min': 'Hodnota musí být alespoň {{min}}',
  'forms.max': 'Hodnota musí být nejvýše {{max}}',
  'forms.minLength': 'Musí mít alespoň {{minLength}} znaků',
  'forms.maxLength': 'Musí mít nejvýše {{maxLength}} znaků',
  'forms.invalidFormat': 'Neplatný formát',
  'forms.invalidEmail': 'Neplatná e-mailová adresa',
  'forms.invalidUrl': 'Neplatná URL',
  'forms.invalidValue': 'Neplatná hodnota',

  // HTTP client errors
  'http.error.requestFailed': 'Požadavek selhal se stavem {{status}}.',
  'http.error.networkError': 'Síťová chyba.',

  // Routing errors
  'routing.error.missingParam': 'Chybějící parametr "{{name}}" pro cestu "{{pattern}}"',
  'routing.error.routeNotFound': 'Cesta "{{name}}" nebyla nalezena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter musí být použit uvnitř MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Push oznámení nejsou podporována',
  'push.error.permissionNotGranted': 'Oprávnění pro oznámení nebylo uděleno',

  // Utility errors
  'error.networkError': 'Síťová chyba. Zkontrolujte prosím své připojení.',
  'error.timeout': 'Požadavek vypršel. Zkuste to prosím znovu.',
  'error.unauthorized': 'Nemáte oprávnění k provedení této akce.',
  'error.forbidden': 'Přístup odepřen.',
  'error.notFound': 'Zdroj nenalezen.',
  'error.validationError': 'Zkontrolujte prosím svůj vstup a zkuste to znovu.',
  'error.serverError': 'Chyba serveru. Zkuste to prosím později.',
  'error.unknown': 'Došlo k neočekávané chybě.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message je povinný',
  'conversation.error.aiNotConfigured': 'AI poskytovatel není nakonfigurován',
  'conversation.error.unknownAiError': 'Neznámá AI chyba',
  'conversation.error.notFound': 'Konverzace nenalezena',
  'conversation.error.streamError': 'Chyba AI streamování',

  // Resource errors
  'resource.error.unknownError': 'Neznámá chyba.',
  'resource.error.unableToCreate': 'Nelze vytvořit {{name}}.',
  'resource.error.unableToUpdate': 'Nelze aktualizovat {{name}}.',
  'resource.error.unableToDelete': 'Nelze smazat {{name}}.',
  'resource.error.notFound': 'Nenalezeno.',
  'resource.error.badRequest': 'Chybný požadavek.',
  'resource.error.unauthorized': 'Neautorizováno.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name a projectType jsou povinné',
  'project.error.notFound': 'Nenalezeno',

  // Device errors
  'device.error.unauthorized': 'Neautorizováno.',
  'device.error.badRequest': 'Chybný požadavek.',
  'device.error.notFound': 'Nenalezeno.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Nepodařilo se přečíst {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Nepodařilo se zapsat {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Nepodařilo se smazat {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Poskytovatel platby je povinný.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je povinný.',
  'user.payment.receiptAndPlanRequired': 'receipt a planKey jsou povinné.',
  'user.payment.verificationNotConfigured': 'Ověření platby není nakonfigurováno pro {{provider}}.',
  'user.payment.invalidPlan': 'Neplatný plán.',
  'user.payment.verificationFailed': 'Ověření předplatného selhalo.',
  'user.payment.unknownPlan': 'Neznámý plán.',
  'user.payment.invalidWebhookEvent': 'Neplatná událost webhooku.',
}
