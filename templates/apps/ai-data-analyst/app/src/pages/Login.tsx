import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ClarionAuthShell } from '../components/ClarionAuthShell.js'
import LoginForm from '../components/LoginForm.js'

function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ClarionAuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Sign in to keep asking your data better questions.' },
      )}
      footer={
        <>
          {t(
            'login.newUserPrompt',
            { appName: APP_NAME },
            { defaultValue: 'New to {{appName}}? ' },
          )}
          <Link
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:text-primary-container transition-colors',
            )}
            to="/signup"
          >
            {t('login.trialCta', { days: 14 }, { defaultValue: 'Start your {{days}}-day trial' })}
          </Link>
        </>
      }
    >
      <LoginForm />
    </ClarionAuthShell>
  )
}

export default Login
export { Login, Login as LoginPage }
