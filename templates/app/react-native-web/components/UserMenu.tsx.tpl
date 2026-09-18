import { useState } from 'react'
import { useTranslation } from '@molecule/app-react'
import { Button, Modal } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'
import { SettingsPanel } from './SettingsPanel.js'

export function UserMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t('userMenu.open')}
      >
        <Icon name="user" size={20} />
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        className={cm.drawer}
      >
        <SettingsPanel onClose={() => setOpen(false)} />
      </Modal>
    </>
  )
}
