/**
 * Lithuanian translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Kraunama...',
  'common.saving': 'Saugoma...',
  'common.close': 'Uždaryti',
  'common.goBack': 'Grįžti atgal',
  'common.submit': 'Pateikti',
  'common.continue': 'Tęsti',

  // Auth - Login
  'auth.login.email': 'El. paštas',
  'auth.login.password': 'Slaptažodis',
  'auth.login.twoFactor': 'Dviejų veiksnių kodas (jei įjungta)',
  'auth.login.signUp': 'Registruotis',
  'auth.login.loggingIn': 'Prisijungiama...',
  'auth.login.logIn': 'Prisijungti',
  'auth.login.forgotPassword': 'Pamiršote slaptažodį?',

  // Auth - Signup
  'auth.signup.email': 'El. paštas (privaloma)',
  'auth.signup.password': 'Slaptažodis (privaloma)',
  'auth.signup.name': 'Jūsų vardas',
  'auth.signup.signingUp': 'Registruojama...',
  'auth.signup.signUp': 'Registruotis',

  // Auth - Forgot Password
  'auth.forgotPassword.success': 'Jei paskyra su šiuo el. pašto adresu egzistuoja, slaptažodžio atkūrimo nuoroda buvo išsiųsta.',
  'auth.forgotPassword.email': 'El. paštas',
  'auth.forgotPassword.submitting': 'Pateikiama...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'El. paštas',
  'auth.resetPassword.token': 'Slaptažodžio atkūrimo kodas',
  'auth.resetPassword.newPassword': 'Įveskite naują slaptažodį',
  'auth.resetPassword.twoFactor': 'Dviejų veiksnių kodas (jei įjungta)',
  'auth.resetPassword.loggingIn': 'Prisijungiama...',
  'auth.resetPassword.submit': 'Nustatyti slaptažodį ir prisijungti',

  // Home
  'home.greeting': 'Sveiki, ',
  'home.world': 'Pasauli',

  // Settings
  'settings.account': 'Paskyra',
  'settings.email': 'El. paštas',
  'settings.authentication': 'Autentifikacija',
  'settings.changePassword': 'Keisti slaptažodį',
  'settings.twoFactor': 'Dviejų veiksnių autentifikacija',
  'settings.notifications': 'Pranešimai',
  'settings.pushNotifications': 'Tiesioginiai pranešimai',
  'settings.billing': 'Atsiskaitymas',
  'settings.plan': 'Planas: ',
  'settings.upgrade': 'Atnaujinti',
  'settings.devices': 'Įrenginiai',
  'settings.noDevices': 'Įrenginių nerasta',
  'settings.thisDevice': 'Šis įrenginys',
  'settings.platform': 'Platforma',
  'settings.browser': 'Naršyklė',
  'settings.network': 'Tinklas',
  'settings.online': 'Prisijungęs',
  'settings.offline': 'Atsijungęs',
  'settings.unknown': 'Nežinoma',
  'settings.logOut': 'Atsijungti',
  'settings.deleteAccount': 'Ištrinti paskyrą',
  'settings.changePasswordModal.title': 'Keisti slaptažodį',
  'settings.changePasswordModal.error': 'Nepavyko pakeisti slaptažodžio.',
  'settings.changePasswordModal.currentPassword': 'Dabartinis slaptažodis',
  'settings.changePasswordModal.newPassword': 'Naujas slaptažodis',
  'settings.changePasswordModal.changing': 'Keičiama...',
  'settings.deleteAccountModal.title': 'Ištrinti paskyrą',
  'settings.deleteAccountModal.warning': 'Šio veiksmo negalima atšaukti. Norėdami patvirtinti, įveskite savo slaptažodį.',
  'settings.deleteAccountModal.password': 'Slaptažodis',
  'settings.deleteAccountModal.deleting': 'Trinama...',
  'settings.changePasswordModal.submit': 'Keisti slaptažodį',
  'settings.deleteAccountModal.submit': 'Ištrinti paskyrą',
  'settings.failedToUpdateEmail': 'Nepavyko atnaujinti el. pašto.',
  'settings.failedToDeleteAccount': 'Nepavyko ištrinti paskyros.',
  'settings.toggleTwoFactor': 'Perjungti dviejų veiksnių autentifikavimą',
  'settings.togglePushNotifications': 'Perjungti push pranešimus',

  // Footer
  'footer.about': 'Apie {{appName}}',
  'footer.privacyPolicy': 'Privatumo politika',
  'footer.termsOfService': 'Paslaugų sąlygos',
  'footer.language': 'Kalba',

  // OAuth
  'oauth.orContinueWith': 'Arba tęsti su',
  'oauth.continueWith': 'Tęsti su {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Perjungti temą',

  // User Menu
  'userMenu.open': 'Atidaryti naudotojo meniu',

  // Plan Updated
  'planUpdated.message': 'Jūsų planas buvo atnaujintas.',
  'planUpdated.thankYou': 'Ačiū!',
  'planUpdated.returnHome': 'Grįžti į pradžią',

  // PWA
  'pwa.updateAvailable': 'Nauja versija prieinama!',
  'pwa.update': 'Atnaujinti',
  'pwa.updating': 'Atnaujinama...',

  // User API errors
  'user.error.badRequest': 'Bloga užklausa.',
  'user.error.notFound': 'Nerasta.',
  'user.error.failedToCreateSession': 'Nepavyko sukurti sesijos.',
  'user.error.usernameRequired': 'Būtinas naudotojo vardas.',
  'user.error.passwordRequired': 'Būtinas slaptažodis.',
  'user.error.emailInvalid': 'El. paštas netinkamas.',
  'user.error.usernameUnavailable': 'Naudotojo vardas nepasiekiamas.',
  'user.error.emailAlreadyRegistered': 'El. paštas jau registruotas.',
  'user.error.failedToHashPassword': 'Nepavyko maišyti slaptažodžio.',
  'user.error.invalidCredentials': 'Netinkami kredencialai.',
  'user.error.invalidTwoFactorToken': 'Netinkamas dviejų veiksnių žetonas.',
  'user.error.twoFactorVerificationUnavailable': 'Dviejų veiksnių patvirtinimas nepasiekiamas.',
  'user.error.loginFailed': 'Prisijungimas nepavyko.',
  'user.error.usernameCannotBeEmpty': 'Naudotojo vardas negali būti tuščias.',
  'user.error.failedToUpdateUser': 'Nepavyko atnaujinti naudotojo.',
  'user.error.failedToDeleteUser': 'Nepavyko ištrinti naudotojo.',
  'user.error.failedToReadUser': 'Nepavyko perskaityti naudotojo.',
  'user.error.emailRequired': 'Būtinas el. paštas.',
  'user.error.failedToProcessPasswordReset': 'Nepavyko apdoroti slaptažodžio atkūrimo.',
  'user.error.newPasswordRequired': 'Būtinas naujas slaptažodis.',
  'user.error.currentPasswordRequired': 'Būtinas dabartinis slaptažodis.',
  'user.error.currentPasswordIncorrect': 'Dabartinis slaptažodis neteisingas.',
  'user.error.failedToUpdatePassword': 'Nepavyko atnaujinti slaptažodžio.',
  'user.error.planKeyRequired': 'Būtinas planKey.',
  'user.error.invalidPlan': 'Netinkamas planas.',
  'user.error.failedToUpdateSubscription': 'Nepavyko atnaujinti prenumeratos.',
  'user.error.failedToUpdatePlan': 'Nepavyko atnaujinti plano.',
  'user.error.twoFactorNotAvailable': 'Dviejų veiksnių autentifikacija nepasiekiama.',
  'user.error.tokenRequired': 'Būtinas žetonas.',
  'user.error.noPendingTwoFactorSetup':
    'Nėra laukiančio dviejų veiksnių nustatymo. Iškvieskite su veiksmu "setup".',
  'user.error.invalidToken': 'Netinkamas žetonas.',
  'user.error.twoFactorNotEnabled': 'Dviejų veiksnių autentifikacija neįjungta.',
  'user.error.invalidAction': 'Netinkamas veiksmas. Naudokite "setup", "enable" arba "disable".',
  'user.error.twoFactorOperationFailed': 'Dviejų veiksnių operacija nepavyko.',
  'user.error.oauthServerNotConfigured': 'OAuth serveris "{{server}}" nesukonfigūruotas.',
  'user.error.oauthVerificationFailed': 'OAuth patvirtinimas nepavyko.',
  'user.error.failedToCreateUser': 'Nepavyko sukurti naudotojo.',
  'user.error.oauthLoginFailed': 'OAuth prisijungimas nepavyko.',

  // Auth client errors
  'auth.error.requestFailed': 'Užklausa nepavyko',
  'auth.error.loginFailed': 'Prisijungimas nepavyko',
  'auth.error.registrationFailed': 'Registracija nepavyko',
  'auth.error.noRefreshToken': 'Nėra atnaujinimo žetono',

  // Form validation
  'forms.required': 'Šis laukas yra privalomas',
  'forms.min': 'Reikšmė turi būti bent {{min}}',
  'forms.max': 'Reikšmė turi būti ne daugiau kaip {{max}}',
  'forms.minLength': 'Turi būti bent {{minLength}} simbolių',
  'forms.maxLength': 'Turi būti ne daugiau kaip {{maxLength}} simbolių',
  'forms.invalidFormat': 'Netinkamas formatas',
  'forms.invalidEmail': 'Netinkamas el. pašto adresas',
  'forms.invalidUrl': 'Netinkamas URL',
  'forms.invalidValue': 'Netinkama reikšmė',

  // HTTP client errors
  'http.error.requestFailed': 'Užklausa nepavyko su būsena {{status}}.',
  'http.error.networkError': 'Tinklo klaida.',

  // Routing errors
  'routing.error.missingParam': 'Trūksta parametro "{{name}}" keliui "{{pattern}}"',
  'routing.error.routeNotFound': 'Maršrutas "{{name}}" nerastas',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter turi būti naudojamas MoleculeRouterProvider viduje',

  // Push notification errors
  'push.error.notSupported': 'Push pranešimai nepalaikomi',
  'push.error.permissionNotGranted': 'Pranešimų leidimas nesuteiktas',

  // Utility errors
  'error.networkError': 'Tinklo klaida. Patikrinkite ryšį.',
  'error.timeout': 'Užklausos laikas baigėsi. Bandykite dar kartą.',
  'error.unauthorized': 'Neturite teisės atlikti šį veiksmą.',
  'error.forbidden': 'Prieiga uždrausta.',
  'error.notFound': 'Išteklius nerastas.',
  'error.validationError': 'Patikrinkite įvestį ir bandykite dar kartą.',
  'error.serverError': 'Serverio klaida. Bandykite vėliau.',
  'error.unknown': 'Įvyko netikėta klaida.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Būtina žinutė',
  'conversation.error.aiNotConfigured': 'AI teikėjas nesukonfigūruotas',
  'conversation.error.unknownAiError': 'Nežinoma AI klaida',
  'conversation.error.notFound': 'Pokalbis nerastas',
  'conversation.error.streamError': 'AI srauto klaida',

  // Resource errors
  'resource.error.unknownError': 'Nežinoma klaida.',
  'resource.error.unableToCreate': 'Nepavyko sukurti {{name}}.',
  'resource.error.unableToUpdate': 'Nepavyko atnaujinti {{name}}.',
  'resource.error.unableToDelete': 'Nepavyko ištrinti {{name}}.',
  'resource.error.notFound': 'Nerasta.',
  'resource.error.badRequest': 'Bloga užklausa.',
  'resource.error.unauthorized': 'Neautorizuota.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Būtinas pavadinimas ir projectType',
  'project.error.notFound': 'Nerasta',

  // Device errors
  'device.error.unauthorized': 'Neautorizuota.',
  'device.error.badRequest': 'Bloga užklausa.',
  'device.error.notFound': 'Nerasta.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Nepavyko perskaityti {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Nepavyko įrašyti {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Nepavyko ištrinti {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Būtinas mokėjimo teikėjas.',
  'user.payment.subscriptionIdRequired': 'Būtinas subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Būtinas kvitas ir planKey.',
  'user.payment.verificationNotConfigured':
    'Mokėjimo patvirtinimas nesukonfigūruotas {{provider}}.',
  'user.payment.invalidPlan': 'Netinkamas planas.',
  'user.payment.verificationFailed': 'Prenumeratos patvirtinimas nepavyko.',
  'user.payment.unknownPlan': 'Nežinomas planas.',
  'user.payment.invalidWebhookEvent': 'Netinkamas webhook įvykis.',
}
