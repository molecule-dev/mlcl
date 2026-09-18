/**
 * Chinese (Simplified) translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': '加载中...',
  'common.saving': '保存中...',
  'common.close': '关闭',
  'common.goBack': '返回',
  'common.submit': '提交',
  'common.continue': '继续',

  // Auth - Login
  'auth.login.email': '电子邮箱',
  'auth.login.password': '密码',
  'auth.login.twoFactor': '双因素验证令牌（如已启用）',
  'auth.login.signUp': '注册',
  'auth.login.loggingIn': '登录中...',
  'auth.login.logIn': '登录',
  'auth.login.forgotPassword': '忘记密码？',

  // Auth - Signup
  'auth.signup.email': '电子邮箱（必填）',
  'auth.signup.password': '密码（必填）',
  'auth.signup.name': '您的姓名',
  'auth.signup.signingUp': '注册中...',
  'auth.signup.signUp': '注册',

  // Auth - Forgot Password
  'auth.forgotPassword.success': '如果该邮箱对应的账户存在，密码重置链接已发送。',
  'auth.forgotPassword.email': '电子邮箱',
  'auth.forgotPassword.submitting': '提交中...',

  // Auth - Reset Password
  'auth.resetPassword.email': '电子邮箱',
  'auth.resetPassword.token': '密码重置令牌',
  'auth.resetPassword.newPassword': '新密码',
  'auth.resetPassword.twoFactor': '双因素验证令牌（如已启用）',
  'auth.resetPassword.loggingIn': '登录中...',
  'auth.resetPassword.submit': '设置密码并登录',

  // Home
  'home.greeting': '你好，',
  'home.world': '世界',

  // Settings
  'settings.account': '账户',
  'settings.email': '电子邮箱',
  'settings.authentication': '身份验证',
  'settings.changePassword': '修改密码',
  'settings.twoFactor': '双因素身份验证',
  'settings.notifications': '通知',
  'settings.pushNotifications': '推送通知',
  'settings.billing': '账单',
  'settings.plan': '方案：',
  'settings.upgrade': '升级',
  'settings.devices': '设备',
  'settings.noDevices': '未找到设备',
  'settings.thisDevice': '此设备',
  'settings.platform': '平台',
  'settings.browser': '浏览器',
  'settings.network': '网络',
  'settings.online': '在线',
  'settings.offline': '离线',
  'settings.unknown': '未知',
  'settings.logOut': '退出登录',
  'settings.deleteAccount': '删除账户',
  'settings.changePasswordModal.title': '修改密码',
  'settings.changePasswordModal.error': '密码修改失败。',
  'settings.changePasswordModal.currentPassword': '当前密码',
  'settings.changePasswordModal.newPassword': '新密码',
  'settings.changePasswordModal.changing': '修改中...',
  'settings.deleteAccountModal.title': '删除账户',
  'settings.deleteAccountModal.warning': '此操作无法撤消。请输入密码以确认。',
  'settings.deleteAccountModal.password': '密码',
  'settings.deleteAccountModal.deleting': '删除中...',
  'settings.changePasswordModal.submit': '修改密码',
  'settings.deleteAccountModal.submit': '删除账户',
  'settings.failedToUpdateEmail': '更新邮箱失败。',
  'settings.failedToDeleteAccount': '删除账户失败。',
  'settings.toggleTwoFactor': '切换双因素认证',
  'settings.togglePushNotifications': '切换推送通知',

  // Footer
  'footer.about': '关于 {{appName}}',
  'footer.privacyPolicy': '隐私政策',
  'footer.termsOfService': '服务条款',
  'footer.language': '语言',

  // OAuth
  'oauth.orContinueWith': '或通过以下方式继续',
  'oauth.continueWith': '通过 {{provider}} 继续',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': '切换主题',

  // User Menu
  'userMenu.open': '打开用户菜单',

  // Plan Updated
  'planUpdated.message': '您的方案已更新。',
  'planUpdated.thankYou': '谢谢！',
  'planUpdated.returnHome': '返回首页',

  // PWA
  'pwa.updateAvailable': '新版本可用！',
  'pwa.update': '更新',
  'pwa.updating': '正在更新...',

  // User API errors
  'user.error.badRequest': '错误的请求。',
  'user.error.notFound': '未找到。',
  'user.error.failedToCreateSession': '创建会话失败。',
  'user.error.usernameRequired': '用户名为必填项。',
  'user.error.passwordRequired': '密码为必填项。',
  'user.error.emailInvalid': '邮箱地址无效。',
  'user.error.usernameUnavailable': '用户名不可用。',
  'user.error.emailAlreadyRegistered': '该邮箱已注册。',
  'user.error.failedToHashPassword': '密码哈希处理失败。',
  'user.error.invalidCredentials': '凭据无效。',
  'user.error.invalidTwoFactorToken': '双重验证令牌无效。',
  'user.error.twoFactorVerificationUnavailable': '双重验证不可用。',
  'user.error.loginFailed': '登录失败。',
  'user.error.usernameCannotBeEmpty': '用户名不能为空。',
  'user.error.failedToUpdateUser': '更新用户失败。',
  'user.error.failedToDeleteUser': '删除用户失败。',
  'user.error.failedToReadUser': '读取用户失败。',
  'user.error.emailRequired': '邮箱为必填项。',
  'user.error.failedToProcessPasswordReset': '密码重置处理失败。',
  'user.error.newPasswordRequired': '新密码为必填项。',
  'user.error.currentPasswordRequired': '当前密码为必填项。',
  'user.error.currentPasswordIncorrect': '当前密码不正确。',
  'user.error.failedToUpdatePassword': '更新密码失败。',
  'user.error.planKeyRequired': 'planKey 为必填项。',
  'user.error.invalidPlan': '无效的方案。',
  'user.error.failedToUpdateSubscription': '更新订阅失败。',
  'user.error.failedToUpdatePlan': '更新方案失败。',
  'user.error.twoFactorNotAvailable': '双重验证不可用。',
  'user.error.tokenRequired': '令牌为必填项。',
  'user.error.noPendingTwoFactorSetup': '没有待处理的双重验证设置。请先调用 "setup" 操作。',
  'user.error.invalidToken': '无效的令牌。',
  'user.error.twoFactorNotEnabled': '双重验证未启用。',
  'user.error.invalidAction': '无效的操作。请使用 "setup"、"enable" 或 "disable"。',
  'user.error.twoFactorOperationFailed': '双重验证操作失败。',
  'user.error.oauthServerNotConfigured': 'OAuth 服务器 "{{server}}" 未配置。',
  'user.error.oauthVerificationFailed': 'OAuth 验证失败。',
  'user.error.failedToCreateUser': '创建用户失败。',
  'user.error.oauthLoginFailed': 'OAuth 登录失败。',

  // Auth client errors
  'auth.error.requestFailed': '请求失败',
  'auth.error.loginFailed': '登录失败',
  'auth.error.registrationFailed': '注册失败',
  'auth.error.noRefreshToken': '无可用的刷新令牌',

  // Form validation
  'forms.required': '此字段为必填项',
  'forms.min': '值必须至少为 {{min}}',
  'forms.max': '值必须最多为 {{max}}',
  'forms.minLength': '至少需要 {{minLength}} 个字符',
  'forms.maxLength': '最多允许 {{maxLength}} 个字符',
  'forms.invalidFormat': '格式无效',
  'forms.invalidEmail': '电子邮件地址无效',
  'forms.invalidUrl': 'URL 无效',
  'forms.invalidValue': '值无效',

  // HTTP client errors
  'http.error.requestFailed': '请求失败，状态码 {{status}}。',
  'http.error.networkError': '网络错误。',

  // Routing errors
  'routing.error.missingParam': '路径 "{{pattern}}" 缺少参数 "{{name}}"',
  'routing.error.routeNotFound': '未找到路由 "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter 必须在 MoleculeRouterProvider 内部使用',

  // Push notification errors
  'push.error.notSupported': '不支持推送通知',
  'push.error.permissionNotGranted': '未授予通知权限',

  // Utility errors
  'error.networkError': '网络错误。请检查您的连接。',
  'error.timeout': '请求超时。请重试。',
  'error.unauthorized': '您无权执行此操作。',
  'error.forbidden': '访问被拒绝。',
  'error.notFound': '资源未找到。',
  'error.validationError': '请检查您的输入并重试。',
  'error.serverError': '服务器错误。请稍后重试。',
  'error.unknown': '发生意外错误。',

  // AI conversation errors
  'conversation.error.messageRequired': '需要 message',
  'conversation.error.aiNotConfigured': 'AI 提供程序未配置',
  'conversation.error.unknownAiError': '未知的 AI 错误',
  'conversation.error.notFound': '未找到对话',
  'conversation.error.streamError': 'AI 流式传输错误',

  // Resource errors
  'resource.error.unknownError': '未知错误。',
  'resource.error.unableToCreate': '无法创建 {{name}}。',
  'resource.error.unableToUpdate': '无法更新 {{name}}。',
  'resource.error.unableToDelete': '无法删除 {{name}}。',
  'resource.error.notFound': '未找到。',
  'resource.error.badRequest': '错误的请求。',
  'resource.error.unauthorized': '未授权。',

  // Project errors
  'project.error.nameAndTypeRequired': '需要 name 和 projectType',
  'project.error.notFound': '未找到',

  // Device errors
  'device.error.unauthorized': '未授权。',
  'device.error.badRequest': '错误的请求。',
  'device.error.notFound': '未找到。',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '读取 {{path}} 失败: {{error}}',
  'codeSandbox.docker.error.writeFailed': '写入 {{path}} 失败: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '删除 {{path}} 失败: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}：{{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': '需要支付提供商。',
  'user.payment.subscriptionIdRequired': '需要 subscriptionId。',
  'user.payment.receiptAndPlanRequired': '需要 receipt 和 planKey。',
  'user.payment.verificationNotConfigured': '{{provider}} 的支付验证未配置。',
  'user.payment.invalidPlan': '无效的方案。',
  'user.payment.verificationFailed': '订阅验证失败。',
  'user.payment.unknownPlan': '未知的方案。',
  'user.payment.invalidWebhookEvent': '无效的 Webhook 事件。',
}
