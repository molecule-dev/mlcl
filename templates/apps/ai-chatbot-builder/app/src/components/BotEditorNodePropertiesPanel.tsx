/**
 * Thin shim around @molecule/app-node-editor-panel-react. Owns the
 * per-app form state (model engine, system prompt, temperature, max
 * tokens, KB toggle, response format) + PUT-to-server save flow; the
 * shared package owns the aside chrome + section/slider/toggle/radio
 * primitives.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import {
  NodeEditorPanel,
  NodeEditorRadioGroup,
  NodeEditorSection,
  NodeEditorSlider,
  NodeEditorToggle,
} from '@molecule/app-node-editor-panel-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotEditorNodePropertiesPanel() {
  const cm = getClassMap()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful customer support agent for NeuralForge. Maintain a professional yet friendly tone. Address users by name when available...',
  )
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [responseFormat, setResponseFormat] = useState<'conversational' | 'structured' | 'json'>(
    'conversational',
  )
  const [kbEnabled, setKbEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function handleSave(): Promise<void> {
    if (!id || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await http.put(`/api/bots/${id}`, {
        model,
        system_prompt: systemPrompt,
        temperature,
        max_tokens: maxTokens,
      })
      setSavedAt(Date.now())
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : t('botEditorNodePropertiesPanel.saveFailed', {}, { defaultValue: 'Save failed' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <>
      {saveError && (
        <p role="alert" className={cm.cn(cm.textSize('xs'), cm.sp('mb', 3), 'text-error')}>
          {saveError}
        </p>
      )}
      {savedAt && (
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 3), 'text-success')}>
          {t('botEditorNodePropertiesPanel.saved', {}, { defaultValue: 'Saved!' })}
        </p>
      )}
      <button
        className={cm.cn(
          cm.w('full'),
          cm.fontWeight('bold'),
          cm.sp('py', 3),
          'bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all',
        )}
        onClick={handleSave}
        disabled={saving}
      >
        {t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
      </button>
    </>
  )

  return (
    <NodeEditorPanel
      title={t('botEditorNodePropertiesPanel.title', {}, { defaultValue: 'Node Properties' })}
      onClose={() => {
        const panel = document.activeElement as HTMLElement | null
        if (panel) panel.blur()
      }}
      closeAriaLabel={t(
        'botEditorNodePropertiesPanel.closePanel',
        {},
        { defaultValue: 'Close node properties' },
      )}
      footer={footer}
    >
      <NodeEditorSection
        label={t('botEditorNodePropertiesPanel.modelEngine', {}, { defaultValue: 'Model Engine' })}
      >
        <div className={cm.cn('relative')}>
          <select
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              'bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface',
            )}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="claude-sonnet-4-6">
              {t(
                'botEditorNodePropertiesPanel.modelClaudeSonnet4',
                {},
                { defaultValue: 'Claude Sonnet 4' },
              )}
            </option>
            <option value="claude-3-5-sonnet-20241022">
              {t(
                'botEditorNodePropertiesPanel.modelClaude35Sonnet',
                {},
                { defaultValue: 'Claude 3.5 Sonnet' },
              )}
            </option>
            <option value="claude-3-5-haiku-20241022">
              {t(
                'botEditorNodePropertiesPanel.modelClaude35Haiku',
                {},
                { defaultValue: 'Claude 3.5 Haiku' },
              )}
            </option>
          </select>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute right-3 top-3 pointer-events-none text-outline',
            )}
            data-icon="expand_more"
          >
            expand_more
          </span>
        </div>
      </NodeEditorSection>

      <NodeEditorSection
        label={t(
          'botEditorNodePropertiesPanel.systemPromptLabel',
          {},
          { defaultValue: 'System Prompt' },
        )}
      >
        <textarea
          className={cm.cn(
            cm.w('full'),
            cm.textSize('sm'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            'bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary/20 resize-none text-on-surface leading-relaxed',
          )}
          rows={4}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />
      </NodeEditorSection>

      <NodeEditorSlider
        label={t('botEditorNodePropertiesPanel.temperature', {}, { defaultValue: 'Temperature' })}
        value={temperature}
        onChange={setTemperature}
      />

      <NodeEditorSlider
        label={t('botEditorNodePropertiesPanel.maxTokens', {}, { defaultValue: 'Max Tokens' })}
        value={maxTokens}
        onChange={setMaxTokens}
        min={256}
        max={4096}
        step={128}
        valueDisplay={
          <input
            className={cm.cn(
              cm.sp('px', 2),
              cm.textSize('xs'),
              cm.w(16),
              'bg-surface-container-lowest border-none rounded py-0.5 font-mono text-on-surface text-right',
            )}
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
          />
        }
      />

      <NodeEditorToggle
        title={t(
          'botEditorNodePropertiesPanel.knowledgeBase',
          {},
          { defaultValue: 'Knowledge Base' },
        )}
        subtitle={t(
          'botEditorNodePropertiesPanel.documentsLinked',
          { count: 3 },
          { defaultValue: '{{count}} documents linked' },
        )}
        icon="database"
        checked={kbEnabled}
        onChange={setKbEnabled}
      />

      <NodeEditorSection
        label={t(
          'botEditorNodePropertiesPanel.responseFormat',
          {},
          { defaultValue: 'Response Format' },
        )}
      >
        <NodeEditorRadioGroup
          value={responseFormat}
          onChange={setResponseFormat}
          options={[
            {
              value: 'conversational',
              label: t(
                'botEditorNodePropertiesPanel.conversational',
                {},
                { defaultValue: 'Conversational' },
              ),
            },
            {
              value: 'structured',
              label: t(
                'botEditorNodePropertiesPanel.structured',
                {},
                { defaultValue: 'Structured (Bullet points)' },
              ),
            },
            {
              value: 'json',
              label: t('botEditorNodePropertiesPanel.pureJson', {}, { defaultValue: 'Pure JSON' }),
            },
          ]}
        />
      </NodeEditorSection>
    </NodeEditorPanel>
  )
}

export default BotEditorNodePropertiesPanel
export { BotEditorNodePropertiesPanel }
