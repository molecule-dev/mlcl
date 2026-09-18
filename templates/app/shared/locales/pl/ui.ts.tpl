/**
 * Polish translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Ładowanie...',
  'common.saving': 'Zapisywanie...',
  'common.close': 'Zamknij',
  'common.goBack': 'Wróć',
  'common.submit': 'Wyślij',
  'common.continue': 'Kontynuuj',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Hasło',
  'auth.login.twoFactor': 'Token dwuskładnikowy (jeśli włączony)',
  'auth.login.signUp': 'Zarejestruj się',
  'auth.login.loggingIn': 'Logowanie...',
  'auth.login.logIn': 'Zaloguj się',
  'auth.login.forgotPassword': 'Zapomniałeś hasła?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (wymagany)',
  'auth.signup.password': 'Hasło (wymagane)',
  'auth.signup.name': 'Twoje imię',
  'auth.signup.signingUp': 'Rejestracja...',
  'auth.signup.signUp': 'Zarejestruj się',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Jeśli konto z tym adresem e-mail istnieje, link do resetowania hasła został wysłany.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Wysyłanie...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Token resetowania hasła',
  'auth.resetPassword.newPassword': 'Nowe hasło',
  'auth.resetPassword.twoFactor': 'Token dwuskładnikowy (jeśli włączony)',
  'auth.resetPassword.loggingIn': 'Logowanie...',
  'auth.resetPassword.submit': 'Ustaw hasło i zaloguj się',

  // Home
  'home.greeting': 'Cześć, ',
  'home.world': 'Świat',

  // Settings
  'settings.account': 'Konto',
  'settings.email': 'E-mail',
  'settings.authentication': 'Uwierzytelnianie',
  'settings.changePassword': 'Zmień hasło',
  'settings.twoFactor': 'Uwierzytelnianie dwuskładnikowe',
  'settings.notifications': 'Powiadomienia',
  'settings.pushNotifications': 'Powiadomienia push',
  'settings.billing': 'Rozliczenia',
  'settings.plan': 'Plan: ',
  'settings.upgrade': 'Ulepsz',
  'settings.devices': 'Urządzenia',
  'settings.noDevices': 'Nie znaleziono urządzeń',
  'settings.thisDevice': 'To urządzenie',
  'settings.platform': 'Platforma',
  'settings.browser': 'Przeglądarka',
  'settings.network': 'Sieć',
  'settings.online': 'Online',
  'settings.offline': 'Offline',
  'settings.unknown': 'Nieznane',
  'settings.logOut': 'Wyloguj się',
  'settings.deleteAccount': 'Usuń konto',
  'settings.changePasswordModal.title': 'Zmień hasło',
  'settings.changePasswordModal.error': 'Nie udało się zmienić hasła.',
  'settings.changePasswordModal.currentPassword': 'Obecne hasło',
  'settings.changePasswordModal.newPassword': 'Nowe hasło',
  'settings.changePasswordModal.changing': 'Zmiana...',
  'settings.deleteAccountModal.title': 'Usuń konto',
  'settings.deleteAccountModal.warning':
    'Tej operacji nie można cofnąć. Wprowadź hasło, aby potwierdzić.',
  'settings.deleteAccountModal.password': 'Hasło',
  'settings.deleteAccountModal.deleting': 'Usuwanie...',
  'settings.changePasswordModal.submit': 'Zmień hasło',
  'settings.deleteAccountModal.submit': 'Usuń konto',
  'settings.failedToUpdateEmail': 'Nie udało się zaktualizować adresu e-mail.',
  'settings.failedToDeleteAccount': 'Nie udało się usunąć konta.',
  'settings.toggleTwoFactor': 'Przełącz uwierzytelnianie dwuskładnikowe',
  'settings.togglePushNotifications': 'Przełącz powiadomienia push',

  // Footer
  'footer.about': 'O {{appName}}',
  'footer.privacyPolicy': 'Polityka prywatności',
  'footer.termsOfService': 'Regulamin',
  'footer.language': 'Język',

  // OAuth
  'oauth.orContinueWith': 'Lub kontynuuj przez',
  'oauth.continueWith': 'Kontynuuj przez {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Zmień motyw',

  // User Menu
  'userMenu.open': 'Otwórz menu użytkownika',

  // Plan Updated
  'planUpdated.message': 'Twój plan został zaktualizowany.',
  'planUpdated.thankYou': 'Dziękujemy!',
  'planUpdated.returnHome': 'Wróć na stronę główną',

  // PWA
  'pwa.updateAvailable': 'Nowa wersja dostępna!',
  'pwa.update': 'Aktualizuj',
  'pwa.updating': 'Aktualizowanie...',

  // User API errors
  'user.error.badRequest': 'Nieprawidłowe żądanie.',
  'user.error.notFound': 'Nie znaleziono.',
  'user.error.failedToCreateSession': 'Nie udało się utworzyć sesji.',
  'user.error.usernameRequired': 'Nazwa użytkownika jest wymagana.',
  'user.error.passwordRequired': 'Hasło jest wymagane.',
  'user.error.emailInvalid': 'Adres e-mail jest nieprawidłowy.',
  'user.error.usernameUnavailable': 'Nazwa użytkownika jest niedostępna.',
  'user.error.emailAlreadyRegistered': 'Adres e-mail jest już zarejestrowany.',
  'user.error.failedToHashPassword': 'Nie udało się zahashować hasła.',
  'user.error.invalidCredentials': 'Nieprawidłowe poświadczenia.',
  'user.error.invalidTwoFactorToken': 'Nieprawidłowy token dwuskładnikowy.',
  'user.error.twoFactorVerificationUnavailable': 'Weryfikacja dwuskładnikowa niedostępna.',
  'user.error.loginFailed': 'Logowanie nie powiodło się.',
  'user.error.usernameCannotBeEmpty': 'Nazwa użytkownika nie może być pusta.',
  'user.error.failedToUpdateUser': 'Nie udało się zaktualizować użytkownika.',
  'user.error.failedToDeleteUser': 'Nie udało się usunąć użytkownika.',
  'user.error.failedToReadUser': 'Nie udało się odczytać użytkownika.',
  'user.error.emailRequired': 'Adres e-mail jest wymagany.',
  'user.error.failedToProcessPasswordReset': 'Nie udało się przetworzyć resetowania hasła.',
  'user.error.newPasswordRequired': 'Nowe hasło jest wymagane.',
  'user.error.currentPasswordRequired': 'Obecne hasło jest wymagane.',
  'user.error.currentPasswordIncorrect': 'Obecne hasło jest nieprawidłowe.',
  'user.error.failedToUpdatePassword': 'Nie udało się zaktualizować hasła.',
  'user.error.planKeyRequired': 'planKey jest wymagany.',
  'user.error.invalidPlan': 'Nieprawidłowy plan.',
  'user.error.failedToUpdateSubscription': 'Nie udało się zaktualizować subskrypcji.',
  'user.error.failedToUpdatePlan': 'Nie udało się zaktualizować planu.',
  'user.error.twoFactorNotAvailable': 'Uwierzytelnianie dwuskładnikowe nie jest dostępne.',
  'user.error.tokenRequired': 'Token jest wymagany.',
  'user.error.noPendingTwoFactorSetup':
    'Brak oczekującej konfiguracji dwuskładnikowej. Najpierw wywołaj z akcją "setup".',
  'user.error.invalidToken': 'Nieprawidłowy token.',
  'user.error.twoFactorNotEnabled': 'Uwierzytelnianie dwuskładnikowe nie jest włączone.',
  'user.error.invalidAction': 'Nieprawidłowa akcja. Użyj "setup", "enable" lub "disable".',
  'user.error.twoFactorOperationFailed': 'Operacja dwuskładnikowa nie powiodła się.',
  'user.error.oauthServerNotConfigured': 'Serwer OAuth "{{server}}" nie jest skonfigurowany.',
  'user.error.oauthVerificationFailed': 'Weryfikacja OAuth nie powiodła się.',
  'user.error.failedToCreateUser': 'Nie udało się utworzyć użytkownika.',
  'user.error.oauthLoginFailed': 'Logowanie OAuth nie powiodło się.',

  // Auth client errors
  'auth.error.requestFailed': 'Żądanie nie powiodło się',
  'auth.error.loginFailed': 'Logowanie nie powiodło się',
  'auth.error.registrationFailed': 'Rejestracja nie powiodła się',
  'auth.error.noRefreshToken': 'Brak dostępnego tokenu odświeżania',

  // Form validation
  'forms.required': 'To pole jest wymagane',
  'forms.min': 'Wartość musi wynosić co najmniej {{min}}',
  'forms.max': 'Wartość musi wynosić co najwyżej {{max}}',
  'forms.minLength': 'Musi zawierać co najmniej {{minLength}} znaków',
  'forms.maxLength': 'Musi zawierać co najwyżej {{maxLength}} znaków',
  'forms.invalidFormat': 'Nieprawidłowy format',
  'forms.invalidEmail': 'Nieprawidłowy adres e-mail',
  'forms.invalidUrl': 'Nieprawidłowy URL',
  'forms.invalidValue': 'Nieprawidłowa wartość',

  // HTTP client errors
  'http.error.requestFailed': 'Żądanie nie powiodło się ze statusem {{status}}.',
  'http.error.networkError': 'Błąd sieci.',

  // Routing errors
  'routing.error.missingParam': 'Brakujący parametr "{{name}}" dla ścieżki "{{pattern}}"',
  'routing.error.routeNotFound': 'Trasa "{{name}}" nie została znaleziona',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter musi być używany wewnątrz MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Powiadomienia push nie są obsługiwane',
  'push.error.permissionNotGranted': 'Nie udzielono uprawnień do powiadomień',

  // Utility errors
  'error.networkError': 'Błąd sieci. Sprawdź swoje połączenie.',
  'error.timeout': 'Przekroczono czas żądania. Spróbuj ponownie.',
  'error.unauthorized': 'Nie masz uprawnień do wykonania tej czynności.',
  'error.forbidden': 'Odmowa dostępu.',
  'error.notFound': 'Zasób nie znaleziony.',
  'error.validationError': 'Sprawdź dane wejściowe i spróbuj ponownie.',
  'error.serverError': 'Błąd serwera. Spróbuj ponownie później.',
  'error.unknown': 'Wystąpił nieoczekiwany błąd.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message jest wymagane',
  'conversation.error.aiNotConfigured': 'Dostawca AI nie jest skonfigurowany',
  'conversation.error.unknownAiError': 'Nieznany błąd AI',
  'conversation.error.notFound': 'Nie znaleziono konwersacji',
  'conversation.error.streamError': 'Błąd strumieniowania AI',

  // Resource errors
  'resource.error.unknownError': 'Nieznany błąd.',
  'resource.error.unableToCreate': 'Nie można utworzyć {{name}}.',
  'resource.error.unableToUpdate': 'Nie można zaktualizować {{name}}.',
  'resource.error.unableToDelete': 'Nie można usunąć {{name}}.',
  'resource.error.notFound': 'Nie znaleziono.',
  'resource.error.badRequest': 'Nieprawidłowe żądanie.',
  'resource.error.unauthorized': 'Nieautoryzowany.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name i projectType są wymagane',
  'project.error.notFound': 'Nie znaleziono',

  // Device errors
  'device.error.unauthorized': 'Nieautoryzowany.',
  'device.error.badRequest': 'Nieprawidłowe żądanie.',
  'device.error.notFound': 'Nie znaleziono.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Nie udało się odczytać {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Nie udało się zapisać {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Nie udało się usunąć {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Dostawca płatności jest wymagany.',
  'user.payment.subscriptionIdRequired': 'subscriptionId jest wymagane.',
  'user.payment.receiptAndPlanRequired': 'receipt i planKey są wymagane.',
  'user.payment.verificationNotConfigured':
    'Weryfikacja płatności nie jest skonfigurowana dla {{provider}}.',
  'user.payment.invalidPlan': 'Nieprawidłowy plan.',
  'user.payment.verificationFailed': 'Weryfikacja subskrypcji nie powiodła się.',
  'user.payment.unknownPlan': 'Nieznany plan.',
  'user.payment.invalidWebhookEvent': 'Nieprawidłowe zdarzenie webhooka.',
}
