/**
 * Khmer translations.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Common
  'common.loading': 'កំពុងផ្ទុក...',
  'common.saving': 'កំពុងរក្សាទុក...',
  'common.close': 'បិទ',
  'common.goBack': 'ត្រឡប់ក្រោយ',
  'common.submit': 'ដាក់ស្នើ',
  'common.continue': 'បន្ត',

  // Auth - Login
  'auth.login.email': 'អ៊ីមែល',
  'auth.login.password': 'ពាក្យសម្ងាត់',
  'auth.login.twoFactor': 'កូដផ្ទៀងផ្ទាត់ពីរជាន់ (បើបានបើក)',
  'auth.login.signUp': 'ចុះឈ្មោះ',
  'auth.login.loggingIn': 'កំពុងចូល...',
  'auth.login.logIn': 'ចូល',
  'auth.login.forgotPassword': 'ភ្លេចពាក្យសម្ងាត់?',

  // Auth - Signup
  'auth.signup.email': 'អ៊ីមែល (ចាំបាច់)',
  'auth.signup.password': 'ពាក្យសម្ងាត់ (ចាំបាច់)',
  'auth.signup.name': 'ឈ្មោះរបស់អ្នក',
  'auth.signup.signingUp': 'កំពុងចុះឈ្មោះ...',
  'auth.signup.signUp': 'ចុះឈ្មោះ',

  // Auth - Forgot Password
  'auth.forgotPassword.success':
    'បើគណនីដែលមានអ៊ីមែលនោះមាន តំណភ្ជាប់កំណត់ពាក្យសម្ងាត់ឡើងវិញត្រូវបានផ្ញើរួចហើយ។',
  'auth.forgotPassword.email': 'អ៊ីមែល',
  'auth.forgotPassword.submitting': 'កំពុងដាក់ស្នើ...',

  // Auth - Reset Password
  'auth.resetPassword.email': 'អ៊ីមែល',
  'auth.resetPassword.token': 'កូដកំណត់ពាក្យសម្ងាត់ឡើងវិញ',
  'auth.resetPassword.newPassword': 'បញ្ចូលពាក្យសម្ងាត់ថ្មី',
  'auth.resetPassword.twoFactor': 'កូដផ្ទៀងផ្ទាត់ពីរជាន់ (បើបានបើក)',
  'auth.resetPassword.loggingIn': 'កំពុងចូល...',
  'auth.resetPassword.submit': 'កំណត់ពាក្យសម្ងាត់ និងចូល',

  // Home
  'home.greeting': 'សួស្តី, ',
  'home.world': 'ពិភពលោក',

  // Settings
  'settings.account': 'គណនី',
  'settings.email': 'អ៊ីមែល',
  'settings.authentication': 'ការផ្ទៀងផ្ទាត់',
  'settings.changePassword': 'ប្តូរពាក្យសម្ងាត់',
  'settings.twoFactor': 'ការផ្ទៀងផ្ទាត់ពីរជាន់',
  'settings.notifications': 'ការជូនដំណឹង',
  'settings.pushNotifications': 'ការជូនដំណឹងភ្លាមៗ',
  'settings.billing': 'វិក្កយបត្រ',
  'settings.plan': 'គម្រោង: ',
  'settings.upgrade': 'ដំឡើង',
  'settings.devices': 'ឧបករណ៍',
  'settings.noDevices': 'រកមិនឃើញឧបករណ៍',
  'settings.thisDevice': 'ឧបករណ៍នេះ',
  'settings.platform': 'វេទិកា',
  'settings.browser': 'កម្មវិធីរុករក',
  'settings.network': 'បណ្តាញ',
  'settings.online': 'អនឡាញ',
  'settings.offline': 'ក្រៅបណ្តាញ',
  'settings.unknown': 'មិនស្គាល់',
  'settings.logOut': 'ចាកចេញ',
  'settings.deleteAccount': 'លុបគណនី',
  'settings.changePasswordModal.title': 'ប្តូរពាក្យសម្ងាត់',
  'settings.changePasswordModal.error': 'ប្តូរពាក្យសម្ងាត់មិនជោគជ័យ។',
  'settings.changePasswordModal.currentPassword': 'ពាក្យសម្ងាត់បច្ចុប្បន្ន',
  'settings.changePasswordModal.newPassword': 'ពាក្យសម្ងាត់ថ្មី',
  'settings.changePasswordModal.changing': 'កំពុងប្តូរ...',
  'settings.deleteAccountModal.title': 'លុបគណនី',
  'settings.deleteAccountModal.warning':
    'សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។ សូមបញ្ចូលពាក្យសម្ងាត់របស់អ្នកដើម្បីបញ្ជាក់។',
  'settings.deleteAccountModal.password': 'ពាក្យសម្ងាត់',
  'settings.deleteAccountModal.deleting': 'កំពុងលុប...',
  'settings.changePasswordModal.submit': 'ប្តូរពាក្យសម្ងាត់',
  'settings.deleteAccountModal.submit': 'លុបគណនី',
  'settings.failedToUpdateEmail': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពអ៊ីមែល។',
  'settings.failedToDeleteAccount': 'បរាជ័យក្នុងការលុបគណនី។',
  'settings.toggleTwoFactor': 'បិទ/បើកការផ្ទៀងផ្ទាត់ពីរជំហាន',
  'settings.togglePushNotifications': 'បិទ/បើកការជូនដំណឹងផុស',

  // Footer
  'footer.about': 'អំពី {{appName}}',
  'footer.privacyPolicy': 'គោលនយោបាយឯកជនភាព',
  'footer.termsOfService': 'លក្ខខណ្ឌនៃសេវាកម្ម',
  'footer.language': 'ភាសា',

  // OAuth
  'oauth.orContinueWith': 'ឬបន្តជាមួយ',
  'oauth.continueWith': 'បន្តជាមួយ {{provider}}',
  'oauth.github': 'GitHub',
  'oauth.google': 'Google',
  'oauth.gitlab': 'GitLab',
  'oauth.twitter': 'Twitter',

  // Theme
  'theme.toggle': 'ប្តូររូបរាង',

  // User Menu
  'userMenu.open': 'បើកម៉ឺនុយអ្នកប្រើ',

  // Plan Updated
  'planUpdated.message': 'គម្រោងរបស់អ្នកត្រូវបានធ្វើបច្ចុប្បន្នភាព។',
  'planUpdated.thankYou': 'សូមអរគុណ!',
  'planUpdated.returnHome': 'ត្រឡប់ទៅទំព័រដើម',

  // PWA
  'pwa.updateAvailable': 'កំណែថ្មីមាន!',
  'pwa.update': 'ធ្វើបច្ចុប្បន្នភាព',
  'pwa.updating': 'កំពុងធ្វើបច្ចុប្បន្នភាព...',

  // User API errors
  'user.error.badRequest': 'សំណើមិនត្រឹមត្រូវ។',
  'user.error.notFound': 'រកមិនឃើញ។',
  'user.error.failedToCreateSession': 'បរាជ័យក្នុងការបង្កើត session។',
  'user.error.usernameRequired': 'ត្រូវការឈ្មោះអ្នកប្រើ។',
  'user.error.passwordRequired': 'ត្រូវការពាក្យសម្ងាត់។',
  'user.error.emailInvalid': 'អ៊ីមែលមិនត្រឹមត្រូវ។',
  'user.error.usernameUnavailable': 'ឈ្មោះអ្នកប្រើមិនអាចប្រើបាន។',
  'user.error.emailAlreadyRegistered': 'អ៊ីមែលបានចុះឈ្មោះរួចហើយ។',
  'user.error.failedToHashPassword': 'បរាជ័យក្នុងការ hash ពាក្យសម្ងាត់។',
  'user.error.invalidCredentials': 'អត្តសញ្ញាណមិនត្រឹមត្រូវ។',
  'user.error.invalidTwoFactorToken': 'Token two-factor មិនត្រឹមត្រូវ។',
  'user.error.twoFactorVerificationUnavailable': 'ការផ្ទៀងផ្ទាត់ two-factor មិនអាចប្រើបាន។',
  'user.error.loginFailed': 'ការចូលបរាជ័យ។',
  'user.error.usernameCannotBeEmpty': 'ឈ្មោះអ្នកប្រើមិនអាចទទេ។',
  'user.error.failedToUpdateUser': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពអ្នកប្រើ។',
  'user.error.failedToDeleteUser': 'បរាជ័យក្នុងការលុបអ្នកប្រើ។',
  'user.error.failedToReadUser': 'បរាជ័យក្នុងការអានអ្នកប្រើ។',
  'user.error.emailRequired': 'ត្រូវការអ៊ីមែល។',
  'user.error.failedToProcessPasswordReset': 'បរាជ័យក្នុងការដំណើរការកំណត់ពាក្យសម្ងាត់ឡើងវិញ។',
  'user.error.newPasswordRequired': 'ត្រូវការពាក្យសម្ងាត់ថ្មី។',
  'user.error.currentPasswordRequired': 'ត្រូវការពាក្យសម្ងាត់បច្ចុប្បន្ន។',
  'user.error.currentPasswordIncorrect': 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ។',
  'user.error.failedToUpdatePassword': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់។',
  'user.error.planKeyRequired': 'ត្រូវការ planKey។',
  'user.error.invalidPlan': 'គម្រោងមិនត្រឹមត្រូវ។',
  'user.error.failedToUpdateSubscription': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពការជាវ។',
  'user.error.failedToUpdatePlan': 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពគម្រោង។',
  'user.error.twoFactorNotAvailable': 'ការផ្ទៀងផ្ទាត់ two-factor មិនអាចប្រើបាន។',
  'user.error.tokenRequired': 'ត្រូវការ token។',
  'user.error.noPendingTwoFactorSetup':
    'គ្មានការដំឡើង two-factor កំពុងរង់ចាំ។ សូមហៅជាមួយ action "setup" ជាមុនសិន។',
  'user.error.invalidToken': 'Token មិនត្រឹមត្រូវ។',
  'user.error.twoFactorNotEnabled': 'Two-factor មិនត្រូវបានបើក។',
  'user.error.invalidAction': 'Action មិនត្រឹមត្រូវ។ សូមប្រើ "setup", "enable", ឬ "disable"។',
  'user.error.twoFactorOperationFailed': 'ប្រតិបត្តិការ two-factor បរាជ័យ។',
  'user.error.oauthServerNotConfigured': 'OAuth server "{{server}}" មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធ។',
  'user.error.oauthVerificationFailed': 'ការផ្ទៀងផ្ទាត់ OAuth បរាជ័យ។',
  'user.error.failedToCreateUser': 'បរាជ័យក្នុងការបង្កើតអ្នកប្រើ។',
  'user.error.oauthLoginFailed': 'ការចូល OAuth បរាជ័យ។',

  // Auth client errors
  'auth.error.requestFailed': 'សំណើបរាជ័យ',
  'auth.error.loginFailed': 'ការចូលបរាជ័យ',
  'auth.error.registrationFailed': 'ការចុះឈ្មោះបរាជ័យ',
  'auth.error.noRefreshToken': 'គ្មាន refresh token អាចប្រើបាន',

  // Form validation
  'forms.required':
    '\u179c\u17b6\u179b\u1793\u17c1\u17c7\u178f\u17d2\u179a\u17bc\u179c\u1794\u17b6\u1793\u1791\u17b6\u1798\u1791\u17b6\u179a',
  'forms.min':
    '\u178f\u1798\u17d2\u179b\u17c3\u178f\u17d2\u179a\u17bc\u179c\u178f\u17c2\u1799\u17c9\u17b6\u1784\u17a0\u17c4\u1785\u178e\u17b6\u179f\u17cb {{min}}',
  'forms.max':
    '\u178f\u1798\u17d2\u179b\u17c3\u178f\u17d2\u179a\u17bc\u179c\u178f\u17c2\u1785\u17d2\u179a\u17be\u1793\u1794\u17c6\u1795\u17bb\u178f {{max}}',
  'forms.minLength':
    '\u178f\u17d2\u179a\u17bc\u179c\u178f\u17c2\u1799\u17c9\u17b6\u1784\u17a0\u17c4\u1785\u178e\u17b6\u179f\u17cb {{minLength}} \u178f\u17bd\u17a2\u1780\u17d2\u179f\u179a',
  'forms.maxLength':
    '\u178f\u17d2\u179a\u17bc\u179c\u178f\u17c2\u1785\u17d2\u179a\u17be\u1793\u1794\u17c6\u1795\u17bb\u178f {{maxLength}} \u178f\u17bd\u17a2\u1780\u17d2\u179f\u179a',
  'forms.invalidFormat':
    '\u1791\u1798\u17d2\u179a\u1784\u17cb\u1798\u17b7\u1793\u178f\u17d2\u179a\u17b9\u1798\u178f\u17d2\u179a\u17bc\u179c',
  'forms.invalidEmail':
    '\u17a2\u17b6\u179f\u1799\u178a\u17d2\u178b\u17b6\u1793\u17a2\u17ca\u17b8\u1798\u17c2\u179b\u1798\u17b7\u1793\u178f\u17d2\u179a\u17b9\u1798\u178f\u17d2\u179a\u17bc\u179c',
  'forms.invalidUrl':
    'URL \u1798\u17b7\u1793\u178f\u17d2\u179a\u17b9\u1798\u178f\u17d2\u179a\u17bc\u179c',
  'forms.invalidValue':
    '\u178f\u1798\u17d2\u179b\u17c3\u1798\u17b7\u1793\u178f\u17d2\u179a\u17b9\u1798\u178f\u17d2\u179a\u17bc\u179c',

  // HTTP client errors
  'http.error.requestFailed': 'សំណើបរាជ័យជាមួយស្ថានភាព {{status}}។',
  'http.error.networkError': 'កំហុសបណ្តាញ។',

  // Routing errors
  'routing.error.missingParam': 'ប៉ារ៉ាម៉ែត្រ "{{name}}" បាត់សម្រាប់ផ្លូវ "{{pattern}}"',
  'routing.error.routeNotFound': 'រកមិនឃើញផ្លូវ "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ត្រូវតែប្រើនៅក្នុង MoleculeRouterProvider',

  // Push notification errors
  'push.error.notSupported': 'មិនគាំទ្រការជូនដំណឹង push',
  'push.error.permissionNotGranted': 'មិនបានផ្តល់ការអនុញ្ញាតជូនដំណឹង',

  // Utility errors
  'error.networkError': 'កំហុសបណ្តាញ។ សូមពិនិត្យការតភ្ជាប់របស់អ្នក។',
  'error.timeout': 'អស់ពេលសំណើ។ សូមព្យាយាមម្ដងទៀត។',
  'error.unauthorized': 'អ្នកមិនមានសិទ្ធិអនុវត្តសកម្មភាពនេះ។',
  'error.forbidden': 'ការចូលប្រើត្រូវបានបដិសេធ។',
  'error.notFound': 'រកមិនឃើញធនធាន។',
  'error.validationError': 'សូមពិនិត្យការបញ្ចូលរបស់អ្នកហើយព្យាយាមម្ដងទៀត។',
  'error.serverError': 'កំហុសម៉ាស៊ីនមេ។ សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ។',
  'error.unknown': 'កំហុសដែលមិនបានរំពឹងទុកបានកើតឡើង។',

  // AI conversation errors
  'conversation.error.messageRequired': 'ត្រូវការ message',
  'conversation.error.aiNotConfigured': 'AI provider មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធ',
  'conversation.error.unknownAiError': 'កំហុស AI មិនស្គាល់',
  'conversation.error.notFound': 'រកមិនឃើញការសន្ទនា',
  'conversation.error.streamError': 'កំហុសក្នុងការ streaming AI',

  // Resource errors
  'resource.error.unknownError': 'កំហុសមិនស្គាល់។',
  'resource.error.unableToCreate': 'មិនអាចបង្កើត {{name}} បាន។',
  'resource.error.unableToUpdate': 'មិនអាចធ្វើបច្ចុប្បន្នភាព {{name}} បាន។',
  'resource.error.unableToDelete': 'មិនអាចលុប {{name}} បាន។',
  'resource.error.notFound': 'រកមិនឃើញ។',
  'resource.error.badRequest': 'សំណើមិនត្រឹមត្រូវ។',
  'resource.error.unauthorized': 'គ្មានការអនុញ្ញាត។',

  // Project errors
  'project.error.nameAndTypeRequired': 'ត្រូវការ name និង projectType',
  'project.error.notFound': 'រកមិនឃើញ',

  // Device errors
  'device.error.unauthorized': 'គ្មានការអនុញ្ញាត។',
  'device.error.badRequest': 'សំណើមិនត្រឹមត្រូវ។',
  'device.error.notFound': 'រកមិនឃើញ។',

  // Code sandbox errors
  'codeSandbox.docker.error.readFailed': 'បរាជ័យក្នុងការអាន {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'បរាជ័យក្នុងការសរសេរ {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'បរាជ័យក្នុងការលុប {{path}}: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',

  // Payment errors
  'user.payment.providerRequired': 'ត្រូវការអ្នកផ្តល់សេវាបង់ប្រាក់។',
  'user.payment.subscriptionIdRequired': 'ត្រូវការ subscriptionId។',
  'user.payment.receiptAndPlanRequired': 'ត្រូវការ receipt និង planKey។',
  'user.payment.verificationNotConfigured':
    'ការផ្ទៀងផ្ទាត់ការបង់ប្រាក់មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធសម្រាប់ {{provider}}។',
  'user.payment.invalidPlan': 'គម្រោងមិនត្រឹមត្រូវ។',
  'user.payment.verificationFailed': 'បរាជ័យក្នុងការផ្ទៀងផ្ទាត់ការជាវ។',
  'user.payment.unknownPlan': 'គម្រោងមិនស្គាល់។',
  'user.payment.invalidWebhookEvent': 'ព្រឹត្តិការណ៍ webhook មិនត្រឹមត្រូវ។',
}
