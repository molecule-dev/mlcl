/**
 * French translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Chargement...',
  'common.saving': 'Enregistrement...',
  'common.close': 'Fermer',
  'common.goBack': 'Retour',
  'common.submit': 'Envoyer',
  'common.continue': 'Continuer',

  // Auth - Login
  'auth.login.email': 'E-mail',
  'auth.login.password': 'Mot de passe',
  'auth.login.twoFactor': 'Jeton à deux facteurs (si activé)',
  'auth.login.signUp': "S'inscrire",
  'auth.login.loggingIn': 'Connexion en cours...',
  'auth.login.logIn': 'Se connecter',
  'auth.login.forgotPassword': 'Mot de passe oublié ?',

  // Auth - Signup
  'auth.signup.email': 'E-mail (obligatoire)',
  'auth.signup.password': 'Mot de passe (obligatoire)',
  'auth.signup.name': 'Votre nom',
  'auth.signup.signingUp': 'Inscription en cours...',
  'auth.signup.signUp': "S'inscrire",

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Si un compte avec cette adresse e-mail existe, un lien de réinitialisation a été envoyé.',
  'auth.forgotPassword.email': 'E-mail',
  'auth.forgotPassword.submitting': 'Envoi en cours...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'E-mail',
  'auth.resetPassword.token': 'Jeton de réinitialisation',
  'auth.resetPassword.newPassword': 'Nouveau mot de passe',
  'auth.resetPassword.twoFactor': 'Jeton à deux facteurs (si activé)',
  'auth.resetPassword.loggingIn': 'Connexion en cours...',
  'auth.resetPassword.submit': 'Définir le mot de passe et se connecter',

  // Home
  'home.greeting': 'Bonjour, ',
  'home.world': 'Monde',

  // Settings
  'settings.account': 'Compte',
  'settings.email': 'E-mail',
  'settings.authentication': 'Authentification',
  'settings.changePassword': 'Changer le mot de passe',
  'settings.twoFactor': 'Authentification à deux facteurs',
  'settings.notifications': 'Notifications',
  'settings.pushNotifications': 'Notifications push',
  'settings.billing': 'Facturation',
  'settings.plan': 'Forfait : ',
  'settings.upgrade': 'Mettre à niveau',
  'settings.devices': 'Appareils',
  'settings.noDevices': 'Aucun appareil trouvé',
  'settings.thisDevice': 'Cet appareil',
  'settings.platform': 'Plateforme',
  'settings.browser': 'Navigateur',
  'settings.network': 'Réseau',
  'settings.online': 'En ligne',
  'settings.offline': 'Hors ligne',
  'settings.unknown': 'Inconnu',
  'settings.logOut': 'Se déconnecter',
  'settings.deleteAccount': 'Supprimer le compte',
  'settings.changePasswordModal.title': 'Changer le mot de passe',
  'settings.changePasswordModal.error': 'Échec du changement de mot de passe.',
  'settings.changePasswordModal.currentPassword': 'Mot de passe actuel',
  'settings.changePasswordModal.newPassword': 'Nouveau mot de passe',
  'settings.changePasswordModal.changing': 'Modification en cours...',
  'settings.deleteAccountModal.title': 'Supprimer le compte',
  'settings.deleteAccountModal.warning':
    'Cette action est irréversible. Veuillez entrer votre mot de passe pour confirmer.',
  'settings.deleteAccountModal.password': 'Mot de passe',
  'settings.deleteAccountModal.deleting': 'Suppression en cours...',
  'settings.changePasswordModal.submit': 'Changer le mot de passe',
  'settings.deleteAccountModal.submit': 'Supprimer le compte',
  'settings.failedToUpdateEmail': 'Échec de la mise à jour de l\'e-mail.',
  'settings.failedToDeleteAccount': 'Échec de la suppression du compte.',
  'settings.toggleTwoFactor': 'Activer/désactiver l\'authentification à deux facteurs',
  'settings.togglePushNotifications': 'Activer/désactiver les notifications push',

  // Footer
  'footer.about': 'À propos de {{appName}}',
  'footer.privacyPolicy': 'Politique de confidentialité',
  'footer.termsOfService': "Conditions d'utilisation",
  'footer.language': 'Langue',

  // OAuth
  'oauth.orContinueWith': 'Ou continuer avec',
  'oauth.continueWith': 'Continuer avec {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Changer de thème',

  // User Menu
  'userMenu.open': "Ouvrir le menu utilisateur",

  // Plan Updated
  'planUpdated.message': 'Votre forfait a été mis à jour.',
  'planUpdated.thankYou': 'Merci !',
  'planUpdated.returnHome': "Retour à l'accueil",

  // PWA
  'pwa.updateAvailable': 'Nouvelle version disponible !',
  'pwa.update': 'Mettre à jour',
  'pwa.updating': 'Mise à jour...',

  // User API errors
  'user.error.badRequest': 'Requête incorrecte.',
  'user.error.notFound': 'Non trouvé.',
  'user.error.failedToCreateSession': 'Impossible de créer la session.',
  'user.error.usernameRequired': "Un nom d'utilisateur est requis.",
  'user.error.passwordRequired': 'Un mot de passe est requis.',
  'user.error.emailInvalid': "L'adresse e-mail est invalide.",
  'user.error.usernameUnavailable': "Le nom d'utilisateur n'est pas disponible.",
  'user.error.emailAlreadyRegistered': "L'adresse e-mail est déjà enregistrée.",
  'user.error.failedToHashPassword': 'Impossible de hacher le mot de passe.',
  'user.error.invalidCredentials': 'Identifiants invalides.',
  'user.error.invalidTwoFactorToken': 'Jeton à deux facteurs invalide.',
  'user.error.twoFactorVerificationUnavailable': 'Vérification à deux facteurs indisponible.',
  'user.error.loginFailed': 'La connexion a échoué.',
  'user.error.usernameCannotBeEmpty': "Le nom d'utilisateur ne peut pas être vide.",
  'user.error.failedToUpdateUser': "Impossible de mettre à jour l'utilisateur.",
  'user.error.failedToDeleteUser': "Impossible de supprimer l'utilisateur.",
  'user.error.failedToReadUser': "Impossible de lire l'utilisateur.",
  'user.error.emailRequired': 'Une adresse e-mail est requise.',
  'user.error.failedToProcessPasswordReset':
    'Impossible de traiter la réinitialisation du mot de passe.',
  'user.error.newPasswordRequired': 'Un nouveau mot de passe est requis.',
  'user.error.currentPasswordRequired': 'Le mot de passe actuel est requis.',
  'user.error.currentPasswordIncorrect': 'Le mot de passe actuel est incorrect.',
  'user.error.failedToUpdatePassword': 'Impossible de mettre à jour le mot de passe.',
  'user.error.planKeyRequired': 'planKey est requis.',
  'user.error.invalidPlan': 'Plan invalide.',
  'user.error.failedToUpdateSubscription': "Impossible de mettre à jour l'abonnement.",
  'user.error.failedToUpdatePlan': 'Impossible de mettre à jour le plan.',
  'user.error.twoFactorNotAvailable': "L'authentification à deux facteurs n'est pas disponible.",
  'user.error.tokenRequired': 'Un jeton est requis.',
  'user.error.noPendingTwoFactorSetup':
    'Aucune configuration à deux facteurs en attente. Appelez d\'abord avec l\'action "setup".',
  'user.error.invalidToken': 'Jeton invalide.',
  'user.error.twoFactorNotEnabled': "L'authentification à deux facteurs n'est pas activée.",
  'user.error.invalidAction': 'Action invalide. Utilisez "setup", "enable" ou "disable".',
  'user.error.twoFactorOperationFailed': "L'opération à deux facteurs a échoué.",
  'user.error.oauthServerNotConfigured': 'Le serveur OAuth "{{server}}" n\'est pas configuré.',
  'user.error.oauthVerificationFailed': 'La vérification OAuth a échoué.',
  'user.error.failedToCreateUser': "Impossible de créer l'utilisateur.",
  'user.error.oauthLoginFailed': 'La connexion OAuth a échoué.',

  // Auth client errors
  'auth.error.requestFailed': 'La requête a échoué',
  'auth.error.loginFailed': 'La connexion a échoué',
  'auth.error.registrationFailed': "L'inscription a échoué",
  'auth.error.noRefreshToken': 'Aucun jeton de rafraîchissement disponible',

  // Form validation
  'forms.required': 'Ce champ est obligatoire',
  'forms.min': 'La valeur doit être au moins {{min}}',
  'forms.max': 'La valeur doit être au plus {{max}}',
  'forms.minLength': 'Doit contenir au moins {{minLength}} caractères',
  'forms.maxLength': 'Doit contenir au plus {{maxLength}} caractères',
  'forms.invalidFormat': 'Format invalide',
  'forms.invalidEmail': 'Adresse e-mail invalide',
  'forms.invalidUrl': 'URL invalide',
  'forms.invalidValue': 'Valeur invalide',

  // HTTP client errors
  'http.error.requestFailed': 'La requête a échoué avec le statut {{status}}.',
  'http.error.networkError': 'Erreur réseau.',

  // Routing errors
  'routing.error.missingParam': 'Paramètre "{{name}}" manquant pour le chemin "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" introuvable',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter doit être utilisé à l'intérieur d'un MoleculeRouterProvider",

  // Push notification errors
  'push.error.notSupported': 'Les notifications push ne sont pas prises en charge',
  'push.error.permissionNotGranted': 'Permission de notification non accordée',

  // Utility errors
  'error.networkError': 'Erreur réseau. Veuillez vérifier votre connexion.',
  'error.timeout': 'La requête a expiré. Veuillez réessayer.',
  'error.unauthorized': "Vous n'êtes pas autorisé à effectuer cette action.",
  'error.forbidden': 'Accès refusé.',
  'error.notFound': 'Ressource introuvable.',
  'error.validationError': 'Veuillez vérifier vos données et réessayer.',
  'error.serverError': 'Erreur du serveur. Veuillez réessayer plus tard.',
  'error.unknown': "Une erreur inattendue s'est produite.",

  // AI conversation errors
  'conversation.error.messageRequired': 'Un message est requis',
  'conversation.error.aiNotConfigured': "Fournisseur d'IA non configuré",
  'conversation.error.unknownAiError': "Erreur d'IA inconnue",
  'conversation.error.notFound': 'Aucune conversation trouvée',
  'conversation.error.streamError': 'Erreur de diffusion IA',

  // Resource errors
  'resource.error.unknownError': 'Erreur inconnue.',
  'resource.error.unableToCreate': 'Impossible de créer {{name}}.',
  'resource.error.unableToUpdate': 'Impossible de mettre à jour {{name}}.',
  'resource.error.unableToDelete': 'Impossible de supprimer {{name}}.',
  'resource.error.notFound': 'Non trouvé.',
  'resource.error.badRequest': 'Requête incorrecte.',
  'resource.error.unauthorized': 'Non autorisé.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Le nom et le type de projet sont requis',
  'project.error.notFound': 'Non trouvé',

  // Device errors
  'device.error.unauthorized': 'Non autorisé.',
  'device.error.badRequest': 'Requête incorrecte.',
  'device.error.notFound': 'Non trouvé.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Échec de lecture de {{path}} : {{error}}',
  'codeSandbox.docker.error.writeFailed': "Échec d'écriture de {{path}} : {{error}}",
  'codeSandbox.docker.error.deleteFailed': 'Échec de suppression de {{path}} : {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}} : {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Le fournisseur de paiement est requis.',
  'user.payment.subscriptionIdRequired': 'subscriptionId est requis.',
  'user.payment.receiptAndPlanRequired': 'receipt et planKey sont requis.',
  'user.payment.verificationNotConfigured':
    "La vérification de paiement n'est pas configurée pour {{provider}}.",
  'user.payment.invalidPlan': 'Plan invalide.',
  'user.payment.verificationFailed': "Impossible de vérifier l'abonnement.",
  'user.payment.unknownPlan': 'Plan inconnu.',
  'user.payment.invalidWebhookEvent': 'Événement webhook invalide.',
}
