/**
 * Romanian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Se încarcă...',
  'common.saving': 'Se salvează...',
  'common.close': 'Închide',
  'common.goBack': 'Înapoi',
  'common.submit': 'Trimite',
  'common.continue': 'Continuă',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Parolă',
  'auth.login.twoFactor': 'Token cu doi factori (dacă este activat)',
  'auth.login.signUp': 'Înregistrare',
  'auth.login.loggingIn': 'Se conectează...',
  'auth.login.logIn': 'Conectare',
  'auth.login.forgotPassword': 'Ați uitat parola?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (obligatoriu)',
  'auth.signup.password': 'Parolă (obligatorie)',
  'auth.signup.name': 'Numele dumneavoastră',
  'auth.signup.signingUp': 'Se înregistrează...',
  'auth.signup.signUp': 'Înregistrare',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Dacă există un cont cu această adresă de e-mail, a fost trimis un link de resetare a parolei.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Se trimite...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Token de resetare a parolei',
  'auth.resetPassword.newPassword': 'Introduceți noua parolă',
  'auth.resetPassword.twoFactor': 'Token cu doi factori (dacă este activat)',
  'auth.resetPassword.loggingIn': 'Se conectează...',
  'auth.resetPassword.submit': 'Setează parola și conectare',

  // Home
  'home.greeting': 'Salut, ',
  'home.world': 'Lume',

  // Settings
  'settings.account': 'Cont',
  'settings.email': 'E-mail',
  'settings.authentication': 'Autentificare',
  'settings.changePassword': 'Schimbă parola',
  'settings.twoFactor': 'Autentificare cu doi factori',
  'settings.notifications': 'Notificări',
  'settings.pushNotifications': 'Notificări push',
  'settings.billing': 'Facturare',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Upgrade',
  'settings.devices': 'Dispozitive',
  'settings.noDevices': 'Nu au fost găsite dispozitive',
  'settings.thisDevice': 'Acest dispozitiv',
  'settings.platform': 'Platformă',
  'settings.browser': 'Browser',
  'settings.network': 'Rețea',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Necunoscut',
  'settings.logOut': 'Deconectare',
  'settings.deleteAccount': 'Șterge contul',
  'settings.changePasswordModal.title': 'Schimbă parola',
  'settings.changePasswordModal.error': 'Nu s-a putut schimba parola.',
  'settings.changePasswordModal.currentPassword': 'Parola actuală',
  'settings.changePasswordModal.newPassword': 'Parola nouă',
  'settings.changePasswordModal.changing': 'Se schimbă...',
  'settings.deleteAccountModal.title': 'Șterge contul',
  'settings.deleteAccountModal.warning':
    'Această acțiune nu poate fi anulată. Vă rugăm să introduceți parola pentru confirmare.',
  'settings.deleteAccountModal.password': 'Parolă',
  'settings.deleteAccountModal.deleting': 'Se șterge...',
  'settings.changePasswordModal.submit': 'Schimbă parola',
  'settings.deleteAccountModal.submit': 'Șterge contul',
  'settings.failedToUpdateEmail': 'Actualizarea e-mailului a eșuat.',
  'settings.failedToDeleteAccount': 'Ștergerea contului a eșuat.',
  'settings.toggleTwoFactor': 'Comută autentificarea cu doi factori',
  'settings.togglePushNotifications': 'Comută notificările push',

  // Footer
  'footer.about': 'Despre {{appName}}',
  'footer.privacyPolicy': 'Politica de confidențialitate',
  'footer.termsOfService': 'Termeni și condiții',
  'footer.language': 'Limbă',

  // OAuth
  'oauth.orContinueWith': 'Sau continuă cu',
  'oauth.continueWith': 'Continuă cu {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Schimbă tema',

  // User Menu
  'userMenu.open': 'Deschide meniul utilizatorului',

  // Plan Updated
  'planUpdated.message': 'Planul dumneavoastră a fost actualizat.',
  'planUpdated.thankYou': 'Vă mulțumim!',
  'planUpdated.returnHome': 'Înapoi la pagina principală',

  // PWA
  'pwa.updateAvailable': 'Versiune nouă disponibilă!',
  'pwa.update': 'Actualizare',
  'pwa.updating': 'Se actualizează...',

  // User API errors
  'user.error.badRequest': 'Cerere invalidă.',
  'user.error.notFound': 'Nu a fost găsit.',
  'user.error.failedToCreateSession': 'Nu s-a putut crea sesiunea.',
  'user.error.usernameRequired': 'Numele de utilizator este obligatoriu.',
  'user.error.passwordRequired': 'Parola este obligatorie.',
  'user.error.emailInvalid': 'Adresa de e-mail este invalidă.',
  'user.error.usernameUnavailable': 'Numele de utilizator nu este disponibil.',
  'user.error.emailAlreadyRegistered': 'Adresa de e-mail este deja înregistrată.',
  'user.error.failedToHashPassword': 'Nu s-a putut cripta parola.',
  'user.error.invalidCredentials': 'Credențiale invalide.',
  'user.error.invalidTwoFactorToken': 'Token cu doi factori invalid.',
  'user.error.twoFactorVerificationUnavailable': 'Verificarea cu doi factori indisponibilă.',
  'user.error.loginFailed': 'Autentificarea a eșuat.',
  'user.error.usernameCannotBeEmpty': 'Numele de utilizator nu poate fi gol.',
  'user.error.failedToUpdateUser': 'Nu s-a putut actualiza utilizatorul.',
  'user.error.failedToDeleteUser': 'Nu s-a putut șterge utilizatorul.',
  'user.error.failedToReadUser': 'Nu s-a putut citi utilizatorul.',
  'user.error.emailRequired': 'Adresa de e-mail este obligatorie.',
  'user.error.failedToProcessPasswordReset': 'Nu s-a putut procesa resetarea parolei.',
  'user.error.newPasswordRequired': 'O parolă nouă este obligatorie.',
  'user.error.currentPasswordRequired': 'Parola curentă este obligatorie.',
  'user.error.currentPasswordIncorrect': 'Parola curentă este incorectă.',
  'user.error.failedToUpdatePassword': 'Nu s-a putut actualiza parola.',
  'user.error.planKeyRequired': 'planKey este obligatoriu.',
  'user.error.invalidPlan': 'Plan invalid.',
  'user.error.failedToUpdateSubscription': 'Nu s-a putut actualiza abonamentul.',
  'user.error.failedToUpdatePlan': 'Nu s-a putut actualiza planul.',
  'user.error.twoFactorNotAvailable': 'Autentificarea cu doi factori nu este disponibilă.',
  'user.error.tokenRequired': 'Token-ul este obligatoriu.',
  'user.error.noPendingTwoFactorSetup':
    'Nicio configurare cu doi factori în așteptare. Apelați mai întâi cu acțiunea "setup".',
  'user.error.invalidToken': 'Token invalid.',
  'user.error.twoFactorNotEnabled': 'Autentificarea cu doi factori nu este activată.',
  'user.error.invalidAction': 'Acțiune invalidă. Utilizați "setup", "enable" sau "disable".',
  'user.error.twoFactorOperationFailed': 'Operațiunea cu doi factori a eșuat.',
  'user.error.oauthServerNotConfigured': 'Serverul OAuth "{{server}}" nu este configurat.',
  'user.error.oauthVerificationFailed': 'Verificarea OAuth a eșuat.',
  'user.error.failedToCreateUser': 'Nu s-a putut crea utilizatorul.',
  'user.error.oauthLoginFailed': 'Autentificarea OAuth a eșuat.',

  // Auth client errors
  'auth.error.requestFailed': 'Cererea a eșuat',
  'auth.error.loginFailed': 'Autentificarea a eșuat',
  'auth.error.registrationFailed': 'Înregistrarea a eșuat',
  'auth.error.noRefreshToken': 'Niciun token de reîmprospătare disponibil',

  // Form validation
  'forms.required': 'Acest câmp este obligatoriu',
  'forms.min': 'Valoarea trebuie să fie cel puțin {{min}}',
  'forms.max': 'Valoarea trebuie să fie cel mult {{max}}',
  'forms.minLength': 'Trebuie să conțină cel puțin {{minLength}} caractere',
  'forms.maxLength': 'Trebuie să conțină cel mult {{maxLength}} caractere',
  'forms.invalidFormat': 'Format invalid',
  'forms.invalidEmail': 'Adresă de e-mail invalidă',
  'forms.invalidUrl': 'URL invalid',
  'forms.invalidValue': 'Valoare invalidă',

  // HTTP client errors
  'http.error.requestFailed': 'Cererea a eșuat cu starea {{status}}.',
  'http.error.networkError': 'Eroare de rețea.',

  // Routing errors
  'routing.error.missingParam': 'Parametrul "{{name}}" lipsește pentru calea "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nu a fost găsită',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter trebuie utilizat în interiorul unui MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Notificările push nu sunt suportate',
  'push.error.permissionNotGranted': 'Permisiunea de notificare nu a fost acordată',

  // Utility errors
  'error.networkError': 'Eroare de rețea. Vă rugăm să verificați conexiunea.',
  'error.timeout': 'Cererea a expirat. Vă rugăm să încercați din nou.',
  'error.unauthorized': 'Nu sunteți autorizat să efectuați această acțiune.',
  'error.forbidden': 'Acces refuzat.',
  'error.notFound': 'Resursa nu a fost găsită.',
  'error.validationError': 'Vă rugăm să verificați datele introduse și să încercați din nou.',
  'error.serverError': 'Eroare de server. Vă rugăm să încercați din nou mai târziu.',
  'error.unknown': 'A apărut o eroare neașteptată.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Mesajul este obligatoriu',
  'conversation.error.aiNotConfigured': 'Furnizorul de IA nu este configurat',
  'conversation.error.unknownAiError': 'Eroare IA necunoscută',
  'conversation.error.notFound': 'Nicio conversație găsită',
  'conversation.error.streamError': 'Eroare de transmisie IA',

  // Resource errors
  'resource.error.unknownError': 'Eroare necunoscută.',
  'resource.error.unableToCreate': 'Nu s-a putut crea {{name}}.',
  'resource.error.unableToUpdate': 'Nu s-a putut actualiza {{name}}.',
  'resource.error.unableToDelete': 'Nu s-a putut șterge {{name}}.',
  'resource.error.notFound': 'Nu a fost găsit.',
  'resource.error.badRequest': 'Cerere invalidă.',
  'resource.error.unauthorized': 'Neautorizat.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Numele și tipul proiectului sunt obligatorii',
  'project.error.notFound': 'Nu a fost găsit',

  // Device errors
  'device.error.unauthorized': 'Neautorizat.',
  'device.error.badRequest': 'Cerere incorectă.',
  'device.error.notFound': 'Nu a fost găsit.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Citirea {{path}} a eșuat: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Scrierea {{path}} a eșuat: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Ștergerea {{path}} a eșuat: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Furnizorul de plată este obligatoriu.',
  'user.payment.subscriptionIdRequired': 'subscriptionId este obligatoriu.',
  'user.payment.receiptAndPlanRequired': 'receipt și planKey sunt obligatorii.',
  'user.payment.verificationNotConfigured':
    'Verificarea plății nu este configurată pentru {{provider}}.',
  'user.payment.invalidPlan': 'Plan invalid.',
  'user.payment.verificationFailed': 'Nu s-a putut verifica abonamentul.',
  'user.payment.unknownPlan': 'Plan necunoscut.',
  'user.payment.invalidWebhookEvent': 'Eveniment webhook invalid.',
}
