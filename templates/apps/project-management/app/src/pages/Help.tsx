import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface HelpTopic {
  questionKey: string
  answerKey: string
  question: string
  answer: string
}

const HELP_TOPICS: HelpTopic[] = [
  {
    questionKey: 'help.topics.createProject.q',
    answerKey: 'help.topics.createProject.a',
    question: 'How do I create a new project?',
    answer:
      'From the Dashboard, click "New Project". Give it a name and (optionally) a description, then click Create. You can edit it later from its Board view.',
  },
  {
    questionKey: 'help.topics.invite.q',
    answerKey: 'help.topics.invite.a',
    question: 'How do I invite teammates to a project?',
    answer:
      'Open the project Board, click "Members" in the side nav, then add their email. They will receive an invitation when they next sign in with that address.',
  },
  {
    questionKey: 'help.topics.task.q',
    answerKey: 'help.topics.task.a',
    question: 'How do I move a task between columns?',
    answer:
      'Open the project Board, then click a task and update its status. The task immediately appears in the new column, persisted to your account.',
  },
  {
    questionKey: 'help.topics.timeline.q',
    answerKey: 'help.topics.timeline.a',
    question: 'What is the Timeline view?',
    answer:
      'The Timeline page shows milestones and tasks across days, weeks, or months so you can see deadlines at a glance and add new milestones with the "Add Event" button.',
  },
  {
    questionKey: 'help.topics.notifications.q',
    answerKey: 'help.topics.notifications.a',
    question: 'Where do I change my notification preferences?',
    answer:
      'Open Settings → Notifications. You can independently toggle email and push notifications for task assignments and project updates, then save.',
  },
  {
    questionKey: 'help.topics.delete.q',
    answerKey: 'help.topics.delete.a',
    question: 'How do I delete my account?',
    answer:
      'Open Settings → Account → Delete account. You will be asked to confirm by typing DELETE. This is irreversible — all of your projects, tasks, and milestones will be removed.',
  },
]

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <main data-mol-id="page-help" className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 12))}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
        {t('help.title', {}, { defaultValue: 'Help & FAQs' })}
      </h1>
      <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant', cm.sp('mb', 8))}>
        {t(
          'help.intro',
          {},
          {
            defaultValue:
              'Common questions about projects, tasks, and account settings. If you need more, contact support from the Settings → Account page.',
          },
        )}
      </p>

      <div className={cm.stack(6)}>
        {HELP_TOPICS.map((topic) => (
          <details
            key={topic.questionKey}
            data-testid={`help-topic-${topic.questionKey.replace(/\./g, '-')}`}
            className={cm.cn(
              'rounded-xl bg-surface-container-low border border-surface-container-highest',
              cm.sp('p', 4),
            )}
          >
            <summary
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('lg'),
                'cursor-pointer text-on-surface',
              )}
            >
              {t(topic.questionKey, {}, { defaultValue: topic.question })}
            </summary>
            <p className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant')}>
              {t(topic.answerKey, {}, { defaultValue: topic.answer })}
            </p>
          </details>
        ))}
      </div>

      <div className={cm.cn(cm.sp('mt', 10), cm.flex({ gap: 'sm' }))}>
        <Link
          data-testid="help-go-dashboard"
          to="/dashboard"
          className={cm.cn(
            'inline-flex items-center justify-center rounded-full px-4 py-2 bg-primary text-on-primary text-sm font-medium',
          )}
        >
          {t('help.backToDashboard', {}, { defaultValue: 'Back to Dashboard' })}
        </Link>
        <Link
          data-testid="help-go-settings"
          to="/settings"
          className={cm.cn(
            'inline-flex items-center justify-center rounded-full px-4 py-2 bg-surface-container text-on-surface text-sm font-medium',
          )}
        >
          {t('help.goToSettings', {}, { defaultValue: 'Go to Settings' })}
        </Link>
      </div>
    </main>
  )
}

export default Help
export { Help as HelpPage }
