/**
 * Korean translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': '로딩 중...',
  'common.saving': '저장 중...',
  'common.close': '닫기',
  'common.goBack': '뒤로 가기',
  'common.submit': '제출',
  'common.continue': '계속',

  // Auth - Login
  'auth.login.email': '이메일',
  'auth.login.password': '비밀번호',
  'auth.login.twoFactor': '2단계 인증 토큰 (활성화된 경우)',
  'auth.login.signUp': '회원가입',
  'auth.login.loggingIn': '로그인 중...',
  'auth.login.logIn': '로그인',
  'auth.login.forgotPassword': '비밀번호를 잊으셨나요?',

  // Auth - Signup
  'auth.signup.email': '이메일 (필수)',
  'auth.signup.password': '비밀번호 (필수)',
  'auth.signup.name': '이름',
  'auth.signup.signingUp': '가입 중...',
  'auth.signup.signUp': '회원가입',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    '해당 이메일의 계정이 존재하면 비밀번호 재설정 링크가 전송되었습니다.',
  'auth.forgotPassword.email': '이메일',
  'auth.forgotPassword.submitting': '제출 중...',

  // Auth - Reset Password
  'auth.resetPassword.email': '이메일',
  'auth.resetPassword.token': '비밀번호 재설정 토큰',
  'auth.resetPassword.newPassword': '새 비밀번호',
  'auth.resetPassword.twoFactor': '2단계 인증 토큰 (활성화된 경우)',
  'auth.resetPassword.loggingIn': '로그인 중...',
  'auth.resetPassword.submit': '비밀번호 설정 후 로그인',

  // Home
  'home.greeting': '안녕하세요, ',
  'home.world': '세계',

  // Settings
  'settings.account': '계정',
  'settings.email': '이메일',
  'settings.authentication': '인증',
  'settings.changePassword': '비밀번호 변경',
  'settings.twoFactor': '2단계 인증',
  'settings.notifications': '알림',
  'settings.pushNotifications': '푸시 알림',
  'settings.billing': '결제',
  'settings.plan': '플랜: ',
  'settings.upgrade': '업그레이드',
  'settings.devices': '기기',
  'settings.noDevices': '기기를 찾을 수 없습니다',
  'settings.thisDevice': '이 기기',
  'settings.platform': '플랫폼',
  'settings.browser': '브라우저',
  'settings.network': '네트워크',
  'settings.online': '온라인',
  'settings.offline': '오프라인',
  'settings.unknown': '알 수 없음',
  'settings.logOut': '로그아웃',
  'settings.deleteAccount': '계정 삭제',
  'settings.changePasswordModal.title': '비밀번호 변경',
  'settings.changePasswordModal.error': '비밀번호 변경에 실패했습니다.',
  'settings.changePasswordModal.currentPassword': '현재 비밀번호',
  'settings.changePasswordModal.newPassword': '새 비밀번호',
  'settings.changePasswordModal.changing': '변경 중...',
  'settings.deleteAccountModal.title': '계정 삭제',
  'settings.deleteAccountModal.warning':
    '이 작업은 되돌릴 수 없습니다. 확인을 위해 비밀번호를 입력해주세요.',
  'settings.deleteAccountModal.password': '비밀번호',
  'settings.deleteAccountModal.deleting': '삭제 중...',
  'settings.changePasswordModal.submit': '비밀번호 변경',
  'settings.deleteAccountModal.submit': '계정 삭제',
  'settings.failedToUpdateEmail': '이메일 업데이트에 실패했습니다.',
  'settings.failedToDeleteAccount': '계정 삭제에 실패했습니다.',
  'settings.toggleTwoFactor': '이중 인증 전환',
  'settings.togglePushNotifications': '푸시 알림 전환',

  // Footer
  'footer.about': '{{appName}} 소개',
  'footer.privacyPolicy': '개인정보 처리방침',
  'footer.termsOfService': '서비스 약관',
  'footer.language': '언어',

  // OAuth
  'oauth.orContinueWith': '또는 다음으로 계속',
  'oauth.continueWith': '{{provider}}(으)로 계속',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': '테마 전환',

  // User Menu
  'userMenu.open': '사용자 메뉴 열기',

  // Plan Updated
  'planUpdated.message': '플랜이 업데이트되었습니다.',
  'planUpdated.thankYou': '감사합니다!',
  'planUpdated.returnHome': '홈으로 돌아가기',

  // PWA
  'pwa.updateAvailable': '새 버전을 사용할 수 있습니다!',
  'pwa.update': '업데이트',
  'pwa.updating': '업데이트 중...',

  // User API errors
  'user.error.badRequest': '잘못된 요청입니다.',
  'user.error.notFound': '찾을 수 없습니다.',
  'user.error.failedToCreateSession': '세션 생성에 실패했습니다.',
  'user.error.usernameRequired': '사용자 이름은 필수입니다.',
  'user.error.passwordRequired': '비밀번호는 필수입니다.',
  'user.error.emailInvalid': '이메일이 유효하지 않습니다.',
  'user.error.usernameUnavailable': '사용할 수 없는 사용자 이름입니다.',
  'user.error.emailAlreadyRegistered': '이미 등록된 이메일입니다.',
  'user.error.failedToHashPassword': '비밀번호 해싱에 실패했습니다.',
  'user.error.invalidCredentials': '유효하지 않은 자격 증명입니다.',
  'user.error.invalidTwoFactorToken': '유효하지 않은 2단계 인증 토큰입니다.',
  'user.error.twoFactorVerificationUnavailable': '2단계 인증을 사용할 수 없습니다.',
  'user.error.loginFailed': '로그인에 실패했습니다.',
  'user.error.usernameCannotBeEmpty': '사용자 이름은 비어 있을 수 없습니다.',
  'user.error.failedToUpdateUser': '사용자 업데이트에 실패했습니다.',
  'user.error.failedToDeleteUser': '사용자 삭제에 실패했습니다.',
  'user.error.failedToReadUser': '사용자 조회에 실패했습니다.',
  'user.error.emailRequired': '이메일은 필수입니다.',
  'user.error.failedToProcessPasswordReset': '비밀번호 재설정 처리에 실패했습니다.',
  'user.error.newPasswordRequired': '새 비밀번호는 필수입니다.',
  'user.error.currentPasswordRequired': '현재 비밀번호는 필수입니다.',
  'user.error.currentPasswordIncorrect': '현재 비밀번호가 올바르지 않습니다.',
  'user.error.failedToUpdatePassword': '비밀번호 업데이트에 실패했습니다.',
  'user.error.planKeyRequired': 'planKey는 필수입니다.',
  'user.error.invalidPlan': '유효하지 않은 요금제입니다.',
  'user.error.failedToUpdateSubscription': '구독 업데이트에 실패했습니다.',
  'user.error.failedToUpdatePlan': '요금제 업데이트에 실패했습니다.',
  'user.error.twoFactorNotAvailable': '2단계 인증을 사용할 수 없습니다.',
  'user.error.tokenRequired': '토큰은 필수입니다.',
  'user.error.noPendingTwoFactorSetup':
    '대기 중인 2단계 인증 설정이 없습니다. 먼저 "setup" 액션을 호출하세요.',
  'user.error.invalidToken': '유효하지 않은 토큰입니다.',
  'user.error.twoFactorNotEnabled': '2단계 인증이 활성화되지 않았습니다.',
  'user.error.invalidAction':
    '유효하지 않은 액션입니다. "setup", "enable" 또는 "disable"을 사용하세요.',
  'user.error.twoFactorOperationFailed': '2단계 인증 작업에 실패했습니다.',
  'user.error.oauthServerNotConfigured': 'OAuth 서버 "{{server}}"가 구성되지 않았습니다.',
  'user.error.oauthVerificationFailed': 'OAuth 인증에 실패했습니다.',
  'user.error.failedToCreateUser': '사용자 생성에 실패했습니다.',
  'user.error.oauthLoginFailed': 'OAuth 로그인에 실패했습니다.',

  // Auth client errors
  'auth.error.requestFailed': '요청에 실패했습니다',
  'auth.error.loginFailed': '로그인에 실패했습니다',
  'auth.error.registrationFailed': '가입에 실패했습니다',
  'auth.error.noRefreshToken': '갱신 토큰이 없습니다',

  // Form validation
  'forms.required': '이 필드는 필수입니다',
  'forms.min': '값은 최소 {{min}}이어야 합니다',
  'forms.max': '값은 최대 {{max}}이어야 합니다',
  'forms.minLength': '최소 {{minLength}}자 이상이어야 합니다',
  'forms.maxLength': '최대 {{maxLength}}자 이하여야 합니다',
  'forms.invalidFormat': '잘못된 형식입니다',
  'forms.invalidEmail': '잘못된 이메일 주소입니다',
  'forms.invalidUrl': '잘못된 URL입니다',
  'forms.invalidValue': '잘못된 값입니다',

  // HTTP client errors
  'http.error.requestFailed': '요청이 상태 {{status}}(으)로 실패했습니다.',
  'http.error.networkError': '네트워크 오류입니다.',

  // Routing errors
  'routing.error.missingParam': '경로 "{{pattern}}"에 대한 매개변수 "{{name}}"이(가) 없습니다',
  'routing.error.routeNotFound': '"{{name}}" 경로를 찾을 수 없습니다',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter는 MoleculeRouterProvider 내에서 사용해야 합니다',

  // Push notification errors
  'push.error.notSupported': '푸시 알림이 지원되지 않습니다',
  'push.error.permissionNotGranted': '알림 권한이 부여되지 않았습니다',

  // Utility errors
  'error.networkError': '네트워크 오류입니다. 연결을 확인해 주세요.',
  'error.timeout': '요청 시간이 초과되었습니다. 다시 시도해 주세요.',
  'error.unauthorized': '이 작업을 수행할 권한이 없습니다.',
  'error.forbidden': '접근이 거부되었습니다.',
  'error.notFound': '리소스를 찾을 수 없습니다.',
  'error.validationError': '입력을 확인하고 다시 시도해 주세요.',
  'error.serverError': '서버 오류입니다. 나중에 다시 시도해 주세요.',
  'error.unknown': '예상치 못한 오류가 발생했습니다.',

  // AI conversation errors
  'conversation.error.messageRequired': 'message는 필수입니다',
  'conversation.error.aiNotConfigured': 'AI 공급자가 구성되지 않았습니다',
  'conversation.error.unknownAiError': '알 수 없는 AI 오류',
  'conversation.error.notFound': '대화를 찾을 수 없습니다',
  'conversation.error.streamError': 'AI 스트리밍 오류',

  // Resource errors
  'resource.error.unknownError': '알 수 없는 오류입니다.',
  'resource.error.unableToCreate': '{{name}}을(를) 생성할 수 없습니다.',
  'resource.error.unableToUpdate': '{{name}}을(를) 업데이트할 수 없습니다.',
  'resource.error.unableToDelete': '{{name}}을(를) 삭제할 수 없습니다.',
  'resource.error.notFound': '찾을 수 없습니다.',
  'resource.error.badRequest': '잘못된 요청입니다.',
  'resource.error.unauthorized': '인증되지 않았습니다.',

  // Project errors
  'project.error.nameAndTypeRequired': 'name과 projectType은 필수입니다',
  'project.error.notFound': '찾을 수 없습니다',

  // Device errors
  'device.error.unauthorized': '인증되지 않음.',
  'device.error.badRequest': '잘못된 요청.',
  'device.error.notFound': '찾을 수 없음.',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': '{{path}} 읽기 실패: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}} 쓰기 실패: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}} 삭제 실패: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': '결제 제공자가 필요합니다.',
  'user.payment.subscriptionIdRequired': 'subscriptionId가 필요합니다.',
  'user.payment.receiptAndPlanRequired': 'receipt와 planKey가 필요합니다.',
  'user.payment.verificationNotConfigured': '{{provider}}에 대한 결제 인증이 구성되지 않았습니다.',
  'user.payment.invalidPlan': '유효하지 않은 요금제입니다.',
  'user.payment.verificationFailed': '구독 확인에 실패했습니다.',
  'user.payment.unknownPlan': '알 수 없는 요금제입니다.',
  'user.payment.invalidWebhookEvent': '유효하지 않은 웹훅 이벤트입니다.',
}
