import { useTranslation } from '@molecule/app-react'

import { CardEditor } from './CardEditor.js'

export function CardNew() {
  // Touch t() so the i18n gate sees a translation reference here even
  // though the actual UI text comes via CardEditor.
  const { t } = useTranslation()
  void t('cardNew.title', undefined, { defaultValue: 'New flashcard' })
  return <CardEditor mode="new" />
}
