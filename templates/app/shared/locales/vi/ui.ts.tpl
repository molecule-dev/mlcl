/**
 * Vietnamese translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'Đang tải...',
  'common.saving': 'Đang lưu...',
  'common.close': 'Đóng',
  'common.goBack': 'Quay lại',
  'common.submit': 'Gửi',
  'common.continue': 'Tiếp tục',

  // Auth - Login
  'auth.login.email': 'Email',
  'auth.login.password': 'Mật khẩu',
  'auth.login.twoFactor': 'Mã xác thực hai yếu tố (Nếu đã bật)',
  'auth.login.signUp': 'Đăng ký',
  'auth.login.loggingIn': 'Đang đăng nhập...',
  'auth.login.logIn': 'Đăng nhập',
  'auth.login.forgotPassword': 'Quên mật khẩu?',

  // Auth - Signup
  'auth.signup.email': 'Email (Bắt buộc)',
  'auth.signup.password': 'Mật khẩu (Bắt buộc)',
  'auth.signup.name': 'Tên của bạn',
  'auth.signup.signingUp': 'Đang đăng ký...',
  'auth.signup.signUp': 'Đăng ký',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'Nếu tài khoản với email đó tồn tại, liên kết đặt lại mật khẩu đã được gửi.',
  'auth.forgotPassword.email': 'Email',
  'auth.forgotPassword.submitting': 'Đang gửi...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'Email',
  'auth.resetPassword.token': 'Mã đặt lại mật khẩu',
  'auth.resetPassword.newPassword': 'Nhập mật khẩu mới',
  'auth.resetPassword.twoFactor': 'Mã xác thực hai yếu tố (Nếu đã bật)',
  'auth.resetPassword.loggingIn': 'Đang đăng nhập...',
  'auth.resetPassword.submit': 'Đặt mật khẩu & đăng nhập',

  // Home
  'home.greeting': 'Xin chào, ',
  'home.world': 'Thế giới',

  // Settings
  'settings.account': 'Tài khoản',
  'settings.email': 'Email',
  'settings.authentication': 'Xác thực',
  'settings.changePassword': 'Đổi mật khẩu',
  'settings.twoFactor': 'Xác thực hai yếu tố',
  'settings.notifications': 'Thông báo',
  'settings.pushNotifications': 'Thông báo đẩy',
  'settings.billing': 'Thanh toán',
  'settings.plan': 'Gói: ',
  'settings.upgrade': 'Nâng cấp',
  'settings.devices': 'Thiết bị',
  'settings.noDevices': 'Không tìm thấy thiết bị',
  'settings.thisDevice': 'Thiết bị này',
  'settings.platform': 'Nền tảng',
  'settings.browser': 'Trình duyệt',
  'settings.network': 'Mạng',
  'settings.online': 'Trực tuyến',
  'settings.offline': 'Ngoại tuyến',
  'settings.unknown': 'Không xác định',
  'settings.logOut': 'Đăng xuất',
  'settings.deleteAccount': 'Xóa tài khoản',
  'settings.changePasswordModal.title': 'Đổi mật khẩu',
  'settings.changePasswordModal.error': 'Đổi mật khẩu thất bại.',
  'settings.changePasswordModal.currentPassword': 'Mật khẩu hiện tại',
  'settings.changePasswordModal.newPassword': 'Mật khẩu mới',
  'settings.changePasswordModal.changing': 'Đang đổi...',
  'settings.deleteAccountModal.title': 'Xóa tài khoản',
  'settings.deleteAccountModal.warning':
    'Hành động này không thể hoàn tác. Vui lòng nhập mật khẩu để xác nhận.',
  'settings.deleteAccountModal.password': 'Mật khẩu',
  'settings.deleteAccountModal.deleting': 'Đang xóa...',
  'settings.changePasswordModal.submit': 'Đổi mật khẩu',
  'settings.deleteAccountModal.submit': 'Xóa tài khoản',
  'settings.failedToUpdateEmail': 'Không thể cập nhật email.',
  'settings.failedToDeleteAccount': 'Không thể xóa tài khoản.',
  'settings.toggleTwoFactor': 'Chuyển đổi xác thực hai yếu tố',
  'settings.togglePushNotifications': 'Chuyển đổi thông báo đẩy',

  // Footer
  'footer.about': 'Về {{appName}}',
  'footer.privacyPolicy': 'Chính sách bảo mật',
  'footer.termsOfService': 'Điều khoản dịch vụ',
  'footer.language': 'Ngôn ngữ',

  // OAuth
  'oauth.orContinueWith': 'Hoặc tiếp tục với',
  'oauth.continueWith': 'Tiếp tục với {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'Chuyển đổi giao diện',

  // User Menu
  'userMenu.open': 'Mở menu người dùng',

  // Plan Updated
  'planUpdated.message': 'Gói của bạn đã được cập nhật.',
  'planUpdated.thankYou': 'Cảm ơn bạn!',
  'planUpdated.returnHome': 'Về trang chủ',

  // PWA
  'pwa.updateAvailable': 'Phiên bản mới có sẵn!',
  'pwa.update': 'Cập nhật',
  'pwa.updating': 'Đang cập nhật...',

  // User API errors
  'user.error.badRequest': 'Yêu cầu không hợp lệ.',
  'user.error.notFound': 'Không tìm thấy.',
  'user.error.failedToCreateSession': 'Tạo phiên thất bại.',
  'user.error.usernameRequired': 'Yêu cầu tên người dùng.',
  'user.error.passwordRequired': 'Yêu cầu mật khẩu.',
  'user.error.emailInvalid': 'Email không hợp lệ.',
  'user.error.usernameUnavailable': 'Tên người dùng không khả dụng.',
  'user.error.emailAlreadyRegistered': 'Email đã được đăng ký.',
  'user.error.failedToHashPassword': 'Hash mật khẩu thất bại.',
  'user.error.invalidCredentials': 'Thông tin đăng nhập không hợp lệ.',
  'user.error.invalidTwoFactorToken': 'Token two-factor không hợp lệ.',
  'user.error.twoFactorVerificationUnavailable': 'Xác minh two-factor không khả dụng.',
  'user.error.loginFailed': 'Đăng nhập thất bại.',
  'user.error.usernameCannotBeEmpty': 'Tên người dùng không được để trống.',
  'user.error.failedToUpdateUser': 'Cập nhật người dùng thất bại.',
  'user.error.failedToDeleteUser': 'Xóa người dùng thất bại.',
  'user.error.failedToReadUser': 'Đọc người dùng thất bại.',
  'user.error.emailRequired': 'Yêu cầu email.',
  'user.error.failedToProcessPasswordReset': 'Xử lý đặt lại mật khẩu thất bại.',
  'user.error.newPasswordRequired': 'Yêu cầu mật khẩu mới.',
  'user.error.currentPasswordRequired': 'Yêu cầu mật khẩu hiện tại.',
  'user.error.currentPasswordIncorrect': 'Mật khẩu hiện tại không đúng.',
  'user.error.failedToUpdatePassword': 'Cập nhật mật khẩu thất bại.',
  'user.error.planKeyRequired': 'Yêu cầu planKey.',
  'user.error.invalidPlan': 'Gói không hợp lệ.',
  'user.error.failedToUpdateSubscription': 'Cập nhật đăng ký thất bại.',
  'user.error.failedToUpdatePlan': 'Cập nhật gói thất bại.',
  'user.error.twoFactorNotAvailable': 'Xác thực two-factor không khả dụng.',
  'user.error.tokenRequired': 'Yêu cầu token.',
  'user.error.noPendingTwoFactorSetup':
    'Không có thiết lập two-factor đang chờ. Gọi với action "setup" trước.',
  'user.error.invalidToken': 'Token không hợp lệ.',
  'user.error.twoFactorNotEnabled': 'Two-factor chưa được bật.',
  'user.error.invalidAction': 'Action không hợp lệ. Sử dụng "setup", "enable" hoặc "disable".',
  'user.error.twoFactorOperationFailed': 'Thao tác two-factor thất bại.',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" chưa được cấu hình.',
  'user.error.oauthVerificationFailed': 'Xác minh OAuth thất bại.',
  'user.error.failedToCreateUser': 'Tạo người dùng thất bại.',
  'user.error.oauthLoginFailed': 'Đăng nhập OAuth thất bại.',

  // Auth client errors
  'auth.error.requestFailed': 'Yêu cầu thất bại',
  'auth.error.loginFailed': 'Đăng nhập thất bại',
  'auth.error.registrationFailed': 'Đăng ký thất bại',
  'auth.error.noRefreshToken': 'Không có refresh token khả dụng',

  // Form validation
  'forms.required': 'Trường này là bắt buộc',
  'forms.min': 'Giá trị phải ít nhất {{min}}',
  'forms.max': 'Giá trị phải nhiều nhất {{max}}',
  'forms.minLength': 'Phải có ít nhất {{minLength}} ký tự',
  'forms.maxLength': 'Phải có nhiều nhất {{maxLength}} ký tự',
  'forms.invalidFormat': 'Định dạng không hợp lệ',
  'forms.invalidEmail': 'Địa chỉ email không hợp lệ',
  'forms.invalidUrl': 'URL không hợp lệ',
  'forms.invalidValue': 'Giá trị không hợp lệ',

  // HTTP client errors
  'http.error.requestFailed': 'Yêu cầu thất bại với trạng thái {{status}}.',
  'http.error.networkError': 'Lỗi mạng.',

  // Routing errors
  'routing.error.missingParam': 'Thiếu tham số "{{name}}" cho đường dẫn "{{pattern}}"',
  'routing.error.routeNotFound': 'Không tìm thấy tuyến đường "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter phải được sử dụng bên trong MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'Không hỗ trợ thông báo đẩy',
  'push.error.permissionNotGranted': 'Chưa cấp quyền thông báo',

  // Utility errors
  'error.networkError': 'Lỗi mạng. Vui lòng kiểm tra kết nối của bạn.',
  'error.timeout': 'Yêu cầu đã hết thời gian. Vui lòng thử lại.',
  'error.unauthorized': 'Bạn không được phép thực hiện hành động này.',
  'error.forbidden': 'Truy cập bị từ chối.',
  'error.notFound': 'Không tìm thấy tài nguyên.',
  'error.validationError': 'Vui lòng kiểm tra dữ liệu nhập và thử lại.',
  'error.serverError': 'Lỗi máy chủ. Vui lòng thử lại sau.',
  'error.unknown': 'Đã xảy ra lỗi không mong muốn.',

  // AI conversation errors
  'conversation.error.messageRequired': 'Yêu cầu message',
  'conversation.error.aiNotConfigured': 'AI provider chưa được cấu hình',
  'conversation.error.unknownAiError': 'Lỗi AI không xác định',
  'conversation.error.notFound': 'Không tìm thấy cuộc hội thoại',
  'conversation.error.streamError': 'Lỗi AI streaming',

  // Resource errors
  'resource.error.unknownError': 'Lỗi không xác định.',
  'resource.error.unableToCreate': 'Không thể tạo {{name}}.',
  'resource.error.unableToUpdate': 'Không thể cập nhật {{name}}.',
  'resource.error.unableToDelete': 'Không thể xóa {{name}}.',
  'resource.error.notFound': 'Không tìm thấy.',
  'resource.error.badRequest': 'Yêu cầu không hợp lệ.',
  'resource.error.unauthorized': 'Không được phép.',

  // Project errors
  'project.error.nameAndTypeRequired': 'Yêu cầu name và projectType',
  'project.error.notFound': 'Không tìm thấy',

  // Device errors
  'device.error.unauthorized': 'Không được phép.',
  'device.error.badRequest': 'Yêu cầu không hợp lệ.',
  'device.error.notFound': 'Không tìm thấy.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'Không thể đọc {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Không thể ghi {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Không thể xóa {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'Yêu cầu nhà cung cấp thanh toán.',
  'user.payment.subscriptionIdRequired': 'Yêu cầu subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Yêu cầu receipt và planKey.',
  'user.payment.verificationNotConfigured':
    'Xác minh thanh toán chưa được cấu hình cho {{provider}}.',
  'user.payment.invalidPlan': 'Gói không hợp lệ.',
  'user.payment.verificationFailed': 'Xác minh đăng ký thất bại.',
  'user.payment.unknownPlan': 'Gói không xác định.',
  'user.payment.invalidWebhookEvent': 'Sự kiện webhook không hợp lệ.',
}
