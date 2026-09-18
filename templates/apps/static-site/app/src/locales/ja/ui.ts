/**
 * Japanese translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': '読み込み中...',
  'common.saving': '保存中...',
  'common.close': '閉じる',
  'common.goBack': '戻る',
  'common.submit': '送信',
  'common.continue': '続ける',

  // Auth - Login
  'auth.login.email': 'メールアドレス',
  'auth.login.password': 'パスワード',
  'auth.login.twoFactor': '二要素認証トークン（有効な場合）',
  'auth.login.signUp': '新規登録',
  'auth.login.loggingIn': 'ログイン中...',
  'auth.login.logIn': 'ログイン',
  'auth.login.forgotPassword': 'パスワードをお忘れですか？',

  // Auth - Signup
  'auth.signup.email': 'メールアドレス（必須）',
  'auth.signup.password': 'パスワード（必須）',
  'auth.signup.name': 'お名前',
  'auth.signup.signingUp': '登録中...',
  'auth.signup.signUp': '新規登録',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'そのメールアドレスのアカウントが存在する場合、パスワードリセットリンクが送信されました。',
  'auth.forgotPassword.email': 'メールアドレス',
  'auth.forgotPassword.submitting': '送信中...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'メールアドレス',
  'auth.resetPassword.token': 'パスワードリセットトークン',
  'auth.resetPassword.newPassword': '新しいパスワード',
  'auth.resetPassword.twoFactor': '二要素認証トークン（有効な場合）',
  'auth.resetPassword.loggingIn': 'ログイン中...',
  'auth.resetPassword.submit': 'パスワードを設定してログイン',

  // Home
  'home.greeting': 'こんにちは、',
  'home.world': '世界',

  // Settings
  'settings.account': 'アカウント',
  'settings.email': 'メールアドレス',
  'settings.authentication': '認証',
  'settings.changePassword': 'パスワードを変更',
  'settings.twoFactor': '二要素認証',
  'settings.notifications': '通知',
  'settings.pushNotifications': 'プッシュ通知',
  'settings.billing': '請求',
  'settings.plan': 'プラン：',
  'settings.upgrade': 'アップグレード',
  'settings.devices': 'デバイス',
  'settings.noDevices': 'デバイスが見つかりません',
  'settings.thisDevice': 'このデバイス',
  'settings.platform': 'プラットフォーム',
  'settings.browser': 'ブラウザ',
  'settings.network': 'ネットワーク',
  'settings.online': 'オンライン',
  'settings.offline': 'オフライン',
  'settings.unknown': '不明',
  'settings.logOut': 'ログアウト',
  'settings.deleteAccount': 'アカウントを削除',
  'settings.changePasswordModal.title': 'パスワードを変更',
  'settings.changePasswordModal.error': 'パスワードの変更に失敗しました。',
  'settings.changePasswordModal.currentPassword': '現在のパスワード',
  'settings.changePasswordModal.newPassword': '新しいパスワード',
  'settings.changePasswordModal.changing': '変更中...',
  'settings.deleteAccountModal.title': 'アカウントを削除',
  'settings.deleteAccountModal.warning':
    'この操作は取り消せません。確認のためパスワードを入力してください。',
  'settings.deleteAccountModal.password': 'パスワード',
  'settings.deleteAccountModal.deleting': '削除中...',
  'settings.changePasswordModal.submit': 'パスワードを変更',
  'settings.deleteAccountModal.submit': 'アカウントを削除',
  'settings.failedToUpdateEmail': 'メールの更新に失敗しました。',
  'settings.failedToDeleteAccount': 'アカウントの削除に失敗しました。',
  'settings.toggleTwoFactor': '二要素認証を切り替え',
  'settings.togglePushNotifications': 'プッシュ通知を切り替え',

  // Footer
  'footer.about': '{{appName}}について',
  'footer.privacyPolicy': 'プライバシーポリシー',
  'footer.termsOfService': '利用規約',
  'footer.language': '言語',

  // OAuth
  'oauth.orContinueWith': 'または次で続行',
  'oauth.continueWith': '{{provider}}で続行',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'テーマを切り替え',

  // User Menu
  'userMenu.open': 'ユーザーメニューを開く',

  // Plan Updated
  'planUpdated.message': 'プランが更新されました。',
  'planUpdated.thankYou': 'ありがとうございます！',
  'planUpdated.returnHome': 'ホームに戻る',

  // PWA
  'pwa.updateAvailable': '新しいバージョンが利用可能です！',
  'pwa.update': '更新',
  'pwa.updating': '更新中...',

  // User API errors
  'user.error.badRequest': '不正なリクエストです。',
  'user.error.notFound': '見つかりません。',
  'user.error.failedToCreateSession': 'セッションの作成に失敗しました。',
  'user.error.usernameRequired': 'ユーザー名は必須です。',
  'user.error.passwordRequired': 'パスワードは必須です。',
  'user.error.emailInvalid': 'メールアドレスが無効です。',
  'user.error.usernameUnavailable': 'このユーザー名は使用できません。',
  'user.error.emailAlreadyRegistered': 'このメールアドレスはすでに登録されています。',
  'user.error.failedToHashPassword': 'パスワードのハッシュ化に失敗しました。',
  'user.error.invalidCredentials': '資格情報が無効です。',
  'user.error.invalidTwoFactorToken': '二要素認証トークンが無効です。',
  'user.error.twoFactorVerificationUnavailable': '二要素認証が利用できません。',
  'user.error.loginFailed': 'ログインに失敗しました。',
  'user.error.usernameCannotBeEmpty': 'ユーザー名を空にすることはできません。',
  'user.error.failedToUpdateUser': 'ユーザーの更新に失敗しました。',
  'user.error.failedToDeleteUser': 'ユーザーの削除に失敗しました。',
  'user.error.failedToReadUser': 'ユーザーの読み取りに失敗しました。',
  'user.error.emailRequired': 'メールアドレスは必須です。',
  'user.error.failedToProcessPasswordReset': 'パスワードリセットの処理に失敗しました。',
  'user.error.newPasswordRequired': '新しいパスワードは必須です。',
  'user.error.currentPasswordRequired': '現在のパスワードは必須です。',
  'user.error.currentPasswordIncorrect': '現在のパスワードが正しくありません。',
  'user.error.failedToUpdatePassword': 'パスワードの更新に失敗しました。',
  'user.error.planKeyRequired': 'planKeyは必須です。',
  'user.error.invalidPlan': '無効なプランです。',
  'user.error.failedToUpdateSubscription': 'サブスクリプションの更新に失敗しました。',
  'user.error.failedToUpdatePlan': 'プランの更新に失敗しました。',
  'user.error.twoFactorNotAvailable': '二要素認証は利用できません。',
  'user.error.tokenRequired': 'トークンは必須です。',
  'user.error.noPendingTwoFactorSetup':
    '保留中の二要素認証設定がありません。まず「setup」アクションを呼び出してください。',
  'user.error.invalidToken': '無効なトークンです。',
  'user.error.twoFactorNotEnabled': '二要素認証が有効になっていません。',
  'user.error.invalidAction':
    '無効なアクションです。「setup」、「enable」、または「disable」を使用してください。',
  'user.error.twoFactorOperationFailed': '二要素認証の操作に失敗しました。',
  'user.error.oauthServerNotConfigured': 'OAuthサーバー「{{server}}」が設定されていません。',
  'user.error.oauthVerificationFailed': 'OAuth認証に失敗しました。',
  'user.error.failedToCreateUser': 'ユーザーの作成に失敗しました。',
  'user.error.oauthLoginFailed': 'OAuthログインに失敗しました。',

  // Auth client errors
  'auth.error.requestFailed': 'リクエストに失敗しました',
  'auth.error.loginFailed': 'ログインに失敗しました',
  'auth.error.registrationFailed': '登録に失敗しました',
  'auth.error.noRefreshToken': 'リフレッシュトークンがありません',

  // Form validation
  'forms.required': 'この項目は必須です',
  'forms.min': '値は{{min}}以上である必要があります',
  'forms.max': '値は{{max}}以下である必要があります',
  'forms.minLength': '{{minLength}}文字以上で入力してください',
  'forms.maxLength': '{{maxLength}}文字以下で入力してください',
  'forms.invalidFormat': '無効な形式です',
  'forms.invalidEmail': '無効なメールアドレスです',
  'forms.invalidUrl': '無効なURLです',
  'forms.invalidValue': '無効な値です',

  // HTTP client errors
  'http.error.requestFailed': 'リクエストがステータス{{status}}で失敗しました。',
  'http.error.networkError': 'ネットワークエラーです。',

  // Routing errors
  'routing.error.missingParam': 'パス "{{pattern}}" のパラメータ "{{name}}" がありません',
  'routing.error.routeNotFound': 'ルート "{{name}}" が見つかりません',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter は MoleculeRouterProvider 内で使用する必要があります',

  // Push notification errors
  'push.error.notSupported': 'プッシュ通知はサポートされていません',
  'push.error.permissionNotGranted': '通知の権限が許可されていません',

  // Utility errors
  'error.networkError': 'ネットワークエラーです。接続を確認してください。',
  'error.timeout': 'リクエストがタイムアウトしました。もう一度お試しください。',
  'error.unauthorized': 'この操作を実行する権限がありません。',
  'error.forbidden': 'アクセスが拒否されました。',
  'error.notFound': 'リソースが見つかりません。',
  'error.validationError': '入力内容を確認してもう一度お試しください。',
  'error.serverError': 'サーバーエラーです。後でもう一度お試しください。',
  'error.unknown': '予期しないエラーが発生しました。',

  // AI conversation errors
  'conversation.error.messageRequired': 'messageは必須です',
  'conversation.error.aiNotConfigured': 'AIプロバイダーが設定されていません',
  'conversation.error.unknownAiError': '不明なAIエラー',
  'conversation.error.notFound': '会話が見つかりません',
  'conversation.error.streamError': 'AIストリーミングエラー',

  // Resource errors
  'resource.error.unknownError': '不明なエラーです。',
  'resource.error.unableToCreate': '{{name}}を作成できません。',
  'resource.error.unableToUpdate': '{{name}}を更新できません。',
  'resource.error.unableToDelete': '{{name}}を削除できません。',
  'resource.error.notFound': '見つかりません。',
  'resource.error.badRequest': '不正なリクエストです。',
  'resource.error.unauthorized': '認証されていません。',

  // Project errors
  'project.error.nameAndTypeRequired': 'nameとprojectTypeは必須です',
  'project.error.notFound': '見つかりません',

  // Device errors
  'device.error.unauthorized': '未認証。',
  'device.error.badRequest': '不正なリクエスト。',
  'device.error.notFound': '見つかりません。',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}}の読み取りに失敗しました: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}}の書き込みに失敗しました: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}}の削除に失敗しました: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': '決済プロバイダーは必須です。',
  'user.payment.subscriptionIdRequired': 'subscriptionIdは必須です。',
  'user.payment.receiptAndPlanRequired': 'receiptとplanKeyは必須です。',
  'user.payment.verificationNotConfigured': '{{provider}}の決済認証が設定されていません。',
  'user.payment.invalidPlan': '無効なプランです。',
  'user.payment.verificationFailed': 'サブスクリプションの確認に失敗しました。',
  'user.payment.unknownPlan': '不明なプランです。',
  'user.payment.invalidWebhookEvent': '無効なWebhookイベントです。',
}
