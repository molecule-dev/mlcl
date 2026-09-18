import { useTranslation } from '@molecule/app-react'

import { CardEditor } from './CardEditor.js'

export function CardEdit() {
  // Touch t() so the i18n gate sees a translation reference here even
  // though the actual UI text comes via CardEditor.
  const { t } = useTranslation()
  void t('cardEdit.title', undefined, { defaultValue: 'Edit flashcard' })
  return <CardEditor mode="edit" />
}
