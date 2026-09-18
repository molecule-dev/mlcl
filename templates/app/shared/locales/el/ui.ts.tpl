/**
 * Greek translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Φόρτωση...',
  'common.saving': 'Αποθήκευση...',
  'common.close': 'Κλείσιμο',
  'common.goBack': 'Επιστροφή',
  'common.submit': 'Υποβολή',
  'common.continue': 'Συνέχεια',

  // Auth - Login
  'auth.login.email': 'Email',
  'auth.login.password': 'Κωδικός πρόσβασης',
  'auth.login.twoFactor': 'Κωδικός δύο παραγόντων (Αν είναι ενεργοποιημένος)',
  'auth.login.signUp': 'Εγγραφή',
  'auth.login.loggingIn': 'Σύνδεση...',
  'auth.login.logIn': 'Σύνδεση',
  'auth.login.forgotPassword': 'Ξεχάσατε τον κωδικό;',

  // Auth - Signup
  'auth.signup.email': 'Email (Απαιτείται)',
  'auth.signup.password': 'Κωδικός πρόσβασης (Απαιτείται)',
  'auth.signup.name': 'Το όνομά σας',
  'auth.signup.signingUp': 'Εγγραφή...',
  'auth.signup.signUp': 'Εγγραφή',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Αν υπάρχει λογαριασμός με αυτό το email, έχει σταλεί σύνδεσμος επαναφοράς κωδικού.',
  'auth.forgotPassword.email': 'Email',
  'auth.forgotPassword.submitting': 'Υποβολή...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Email',
  'auth.resetPassword.token': 'Κωδικός επαναφοράς',
  'auth.resetPassword.newPassword': 'Εισάγετε νέο κωδικό πρόσβασης',
  'auth.resetPassword.twoFactor': 'Κωδικός δύο παραγόντων (Αν είναι ενεργοποιημένος)',
  'auth.resetPassword.loggingIn': 'Σύνδεση...',
  'auth.resetPassword.submit': 'Ορισμός κωδικού & σύνδεση',

  // Home
  'home.greeting': 'Γεια σου, ',
  'home.world': 'Κόσμε',

  // Settings
  'settings.account': 'Λογαριασμός',
  'settings.email': 'Email',
  'settings.authentication': 'Ταυτοποίηση',
  'settings.changePassword': 'Αλλαγή κωδικού',
  'settings.twoFactor': 'Ταυτοποίηση δύο παραγόντων',
  'settings.notifications': 'Ειδοποιήσεις',
  'settings.pushNotifications': 'Ειδοποιήσεις push',
  'settings.billing': 'Χρεώσεις',
  'settings.plan': 'Πλάνο: ',
  'settings.upgrade': 'Αναβάθμιση',
  'settings.devices': 'Συσκευές',
  'settings.noDevices': 'Δεν βρέθηκαν συσκευές',
  'settings.thisDevice': 'Αυτή η συσκευή',
  'settings.platform': 'Πλατφόρμα',
  'settings.browser': 'Πρόγραμμα περιήγησης',
  'settings.network': 'Δίκτυο',
  'settings.online': 'Συνδεδεμένο',
  'settings.offline': 'Αποσυνδεδεμένο',
  'settings.unknown': 'Άγνωστο',
  'settings.logOut': 'Αποσύνδεση',
  'settings.deleteAccount': 'Διαγραφή λογαριασμού',
  'settings.changePasswordModal.title': 'Αλλαγή κωδικού',
  'settings.changePasswordModal.error': 'Αποτυχία αλλαγής κωδικού.',
  'settings.changePasswordModal.currentPassword': 'Τρέχων κωδικός',
  'settings.changePasswordModal.newPassword': 'Νέος κωδικός',
  'settings.changePasswordModal.changing': 'Αλλαγή...',
  'settings.deleteAccountModal.title': 'Διαγραφή λογαριασμού',
  'settings.deleteAccountModal.warning':
    'Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Εισάγετε τον κωδικό σας για επιβεβαίωση.',
  'settings.deleteAccountModal.password': 'Κωδικός πρόσβασης',
  'settings.deleteAccountModal.deleting': 'Διαγραφή...',
  'settings.changePasswordModal.submit': 'Αλλαγή κωδικού',
  'settings.deleteAccountModal.submit': 'Διαγραφή λογαριασμού',
  'settings.failedToUpdateEmail': 'Αποτυχία ενημέρωσης email.',
  'settings.failedToDeleteAccount': 'Αποτυχία διαγραφής λογαριασμού.',
  'settings.toggleTwoFactor': 'Εναλλαγή ελέγχου ταυτότητας δύο παραγόντων',
  'settings.togglePushNotifications': 'Εναλλαγή ειδοποιήσεων push',

  // Footer
  'footer.about': 'Σχετικά με το {{appName}}',
  'footer.privacyPolicy': 'Πολιτική απορρήτου',
  'footer.termsOfService': 'Όροι χρήσης',
  'footer.language': 'Γλώσσα',

  // OAuth
  'oauth.orContinueWith': 'Ή συνεχίστε με',
  'oauth.continueWith': 'Συνέχεια με {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Εναλλαγή θέματος',

  // User Menu
  'userMenu.open': 'Άνοιγμα μενού χρήστη',

  // Plan Updated
  'planUpdated.message': 'Το πλάνο σας ενημερώθηκε.',
  'planUpdated.thankYou': 'Ευχαριστούμε!',
  'planUpdated.returnHome': 'Επιστροφή στην αρχική',

  // PWA
  'pwa.updateAvailable': 'Νέα έκδοση διαθέσιμη!',
  'pwa.update': 'Ενημέρωση',
  'pwa.updating': 'Ενημέρωση...',

  // User API errors
  'user.error.badRequest': 'Κακό αίτημα.',
  'user.error.notFound': 'Δεν βρέθηκε.',
  'user.error.failedToCreateSession': 'Αποτυχία δημιουργίας συνεδρίας.',
  'user.error.usernameRequired': 'Απαιτείται όνομα χρήστη.',
  'user.error.passwordRequired': 'Απαιτείται κωδικός πρόσβασης.',
  'user.error.emailInvalid': 'Μη έγκυρο email.',
  'user.error.usernameUnavailable': 'Το όνομα χρήστη δεν είναι διαθέσιμο.',
  'user.error.emailAlreadyRegistered': 'Το email έχει ήδη εγγραφεί.',
  'user.error.failedToHashPassword': 'Αποτυχία κατακερματισμού κωδικού.',
  'user.error.invalidCredentials': 'Μη έγκυρα διαπιστευτήρια.',
  'user.error.invalidTwoFactorToken': 'Μη έγκυρο token δύο παραγόντων.',
  'user.error.twoFactorVerificationUnavailable': 'Η επαλήθευση δύο παραγόντων δεν είναι διαθέσιμη.',
  'user.error.loginFailed': 'Η σύνδεση απέτυχε.',
  'user.error.usernameCannotBeEmpty': 'Το όνομα χρήστη δεν μπορεί να είναι κενό.',
  'user.error.failedToUpdateUser': 'Αποτυχία ενημέρωσης χρήστη.',
  'user.error.failedToDeleteUser': 'Αποτυχία διαγραφής χρήστη.',
  'user.error.failedToReadUser': 'Αποτυχία ανάγνωσης χρήστη.',
  'user.error.emailRequired': 'Απαιτείται email.',
  'user.error.failedToProcessPasswordReset': 'Αποτυχία επεξεργασίας επαναφοράς κωδικού.',
  'user.error.newPasswordRequired': 'Απαιτείται νέος κωδικός.',
  'user.error.currentPasswordRequired': 'Απαιτείται τρέχων κωδικός.',
  'user.error.currentPasswordIncorrect': 'Ο τρέχων κωδικός είναι λανθασμένος.',
  'user.error.failedToUpdatePassword': 'Αποτυχία ενημέρωσης κωδικού.',
  'user.error.planKeyRequired': 'Απαιτείται planKey.',
  'user.error.invalidPlan': 'Μη έγκυρο πλάνο.',
  'user.error.failedToUpdateSubscription': 'Αποτυχία ενημέρωσης συνδρομής.',
  'user.error.failedToUpdatePlan': 'Αποτυχία ενημέρωσης πλάνου.',
  'user.error.twoFactorNotAvailable': 'Η πιστοποίηση δύο παραγόντων δεν είναι διαθέσιμη.',
  'user.error.tokenRequired': 'Απαιτείται token.',
  'user.error.noPendingTwoFactorSetup':
    'Δεν υπάρχει εκκρεμής ρύθμιση δύο παραγόντων. Καλέστε πρώτα με ενέργεια "setup".',
  'user.error.invalidToken': 'Μη έγκυρο token.',
  'user.error.twoFactorNotEnabled': 'Οι δύο παράγοντες δεν είναι ενεργοποιημένοι.',
  'user.error.invalidAction': 'Μη έγκυρη ενέργεια. Χρησιμοποιήστε "setup", "enable" ή "disable".',
  'user.error.twoFactorOperationFailed': 'Η λειτουργία δύο παραγόντων απέτυχε.',
  'user.error.oauthServerNotConfigured': 'Ο διακομιστής OAuth "{{server}}" δεν έχει ρυθμιστεί.',
  'user.error.oauthVerificationFailed': 'Η επαλήθευση OAuth απέτυχε.',
  'user.error.failedToCreateUser': 'Αποτυχία δημιουργίας χρήστη.',
  'user.error.oauthLoginFailed': 'Η σύνδεση OAuth απέτυχε.',

  // Auth client errors
  'auth.error.requestFailed': 'Το αίτημα απέτυχε',
  'auth.error.loginFailed': 'Η σύνδεση απέτυχε',
  'auth.error.registrationFailed': 'Η εγγραφή απέτυχε',
  'auth.error.noRefreshToken': 'Δεν υπάρχει διαθέσιμο token ανανέωσης',

  // Form validation
  'forms.required': 'Αυτό το πεδίο είναι υποχρεωτικό',
  'forms.min': 'Η τιμή πρέπει να είναι τουλάχιστον {{min}}',
  'forms.max': 'Η τιμή πρέπει να είναι το πολύ {{max}}',
  'forms.minLength': 'Πρέπει να είναι τουλάχιστον {{minLength}} χαρακτήρες',
  'forms.maxLength': 'Πρέπει να είναι το πολύ {{maxLength}} χαρακτήρες',
  'forms.invalidFormat': 'Μη έγκυρη μορφή',
  'forms.invalidEmail': 'Μη έγκυρη διεύθυνση email',
  'forms.invalidUrl': 'Μη έγκυρο URL',
  'forms.invalidValue': 'Μη έγκυρη τιμή',

  // HTTP client errors
  'http.error.requestFailed': 'Το αίτημα απέτυχε με κατάσταση {{status}}.',
  'http.error.networkError': 'Σφάλμα δικτύου.',

  // Routing errors
  'routing.error.missingParam': 'Λείπει η παράμετρος "{{name}}" για τη διαδρομή "{{pattern}}"',
  'routing.error.routeNotFound': 'Η διαδρομή "{{name}}" δεν βρέθηκε',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Το useMoleculeRouter πρέπει να χρησιμοποιείται εντός ενός MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Οι ειδοποιήσεις push δεν υποστηρίζονται',
  'push.error.permissionNotGranted': 'Η άδεια ειδοποιήσεων δεν χορηγήθηκε',

  // Utility errors
  'error.networkError': 'Σφάλμα δικτύου. Ελέγξτε τη σύνδεσή σας.',
  'error.timeout': 'Λήξη χρόνου αιτήματος. Δοκιμάστε ξανά.',
  'error.unauthorized': 'Δεν έχετε εξουσιοδότηση για αυτή την ενέργεια.',
  'error.forbidden': 'Δεν επιτρέπεται η πρόσβαση.',
  'error.notFound': 'Ο πόρος δεν βρέθηκε.',
  'error.validationError': 'Ελέγξτε τα δεδομένα σας και δοκιμάστε ξανά.',
  'error.serverError': 'Σφάλμα διακομιστή. Δοκιμάστε ξανά αργότερα.',
  'error.unknown': 'Παρουσιάστηκε μη αναμενόμενο σφάλμα.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Απαιτείται μήνυμα',
  'conversation.error.aiNotConfigured': 'Ο πάροχος AI δεν έχει ρυθμιστεί',
  'conversation.error.unknownAiError': 'Άγνωστο σφάλμα AI',
  'conversation.error.notFound': 'Δεν βρέθηκε συνομιλία',
  'conversation.error.streamError': 'Σφάλμα ροής AI',

  // Resource errors
  'resource.error.unknownError': 'Άγνωστο σφάλμα.',
  'resource.error.unableToCreate': 'Αδυναμία δημιουργίας {{name}}.',
  'resource.error.unableToUpdate': 'Αδυναμία ενημέρωσης {{name}}.',
  'resource.error.unableToDelete': 'Αδυναμία διαγραφής {{name}}.',
  'resource.error.notFound': 'Δεν βρέθηκε.',
  'resource.error.badRequest': 'Κακό αίτημα.',
  'resource.error.unauthorized': 'Μη εξουσιοδοτημένο.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Απαιτούνται όνομα και projectType',
  'project.error.notFound': 'Δεν βρέθηκε',

  // Device errors
  'device.error.unauthorized': 'Μη εξουσιοδοτημένο.',
  'device.error.badRequest': 'Κακό αίτημα.',
  'device.error.notFound': 'Δεν βρέθηκε.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Αποτυχία ανάγνωσης {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Αποτυχία εγγραφής {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Αποτυχία διαγραφής {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Απαιτείται πάροχος πληρωμών.',
  'user.payment.subscriptionIdRequired': 'Απαιτείται subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Απαιτούνται απόδειξη και planKey.',
  'user.payment.verificationNotConfigured':
    'Η επαλήθευση πληρωμής δεν έχει ρυθμιστεί για {{provider}}.',
  'user.payment.invalidPlan': 'Μη έγκυρο πλάνο.',
  'user.payment.verificationFailed': 'Αποτυχία επαλήθευσης συνδρομής.',
  'user.payment.unknownPlan': 'Άγνωστο πλάνο.',
  'user.payment.invalidWebhookEvent': 'Μη έγκυρο συμβάν webhook.',
}
