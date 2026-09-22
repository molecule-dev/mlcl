// Pattern source: bespoke — Neuron evaluation dataset library, bound to the datasets resource.
import { useCallback, useEffect, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeader } from '../components/PageHeader.js'

interface DatasetRow {
  id: string
  name: string
  description?: string
  format?: string
  row_count?: number
  updated_at?: string
}

function countLinesInJsonl(text: string): number {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length
}

export function Datasets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [rows, setRows] = useState<DatasetRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<DatasetRow[]>('/datasets')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function chooseFile(): void {
    fileInputRef.current?.click()
  }

  async function onFileChosen(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    try {
      const text = await file.text()
      const res = await http.post<DatasetRow>('/datasets', {
        name: file.name.replace(/\.[^.]+$/, '') || `dataset-${Date.now().toString(36)}`,
        description: t(
          'datasets.uploadedDescription',
          { name: file.name },
          { defaultValue: 'Uploaded from {{name}}' },
        ),
        format: file.name.endsWith('.csv') ? 'csv' : 'jsonl',
        row_count: countLinesInJsonl(text),
      })
      track({
        name: 'dataset.uploaded',
        properties: {
          datasetId: res.data?.id,
          format: file.name.endsWith('.csv') ? 'csv' : 'jsonl',
        },
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div data-mol-id="page-datasets">
      <PageHeader
        actions={
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.flex({ align: 'center', gap: 2 }),
              'btn-primary-gradient rounded text-on-primary-fixed font-mono uppercase tracking-wider',
            )}
            data-mol-id="datasets-upload"
            onClick={chooseFile}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            {t('datasets.uploadDataset', {}, { defaultValue: 'Upload Dataset' })}
          </button>
        }
        subtitle={t(
          'datasets.subtitle',
          {},
          {
            defaultValue:
              'Curated evaluation fixtures. Re-run the regression suite before promoting an agent.',
          },
        )}
        title={t('datasets.title', {}, { defaultValue: 'Datasets' })}
      />

      <input
        accept=".jsonl,.json,.csv,.txt"
        className="hidden"
        data-mol-id="datasets-file-input"
        onChange={onFileChosen}
        ref={fileInputRef}
        type="file"
      />

      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="datasets-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={'font-mono text-sm text-tertiary'} data-mol-id="datasets-loading">
          {t('datasets.loading', {}, { defaultValue: 'Loading datasets…' })}
        </p>
      ) : rows.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            'rounded border border-dashed border-outline-variant/30 font-mono text-sm text-tertiary',
          )}
          data-mol-id="datasets-empty"
        >
          {t(
            'datasets.empty',
            {},
            { defaultValue: 'No evaluation datasets uploaded — try Upload Dataset.' },
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 3, gap: 4 }))}>
          {rows.map((dataset) => (
            <div
              key={dataset.id}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-low rounded border border-outline-variant/15 hover:border-outline-variant/30 transition-colors',
              )}
              data-mol-id="datasets-card"
            >
              <div
                className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 3))}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.flex({ align: 'center', justify: 'center' }),
                      'rounded bg-surface-container-highest text-secondary',
                    )}
                  >
                    <span className="material-symbols-outlined">dataset</span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'font-mono text-on-surface',
                    )}
                  >
                    {dataset.name}
                  </h3>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider rounded border border-outline-variant/30 text-tertiary bg-surface-container',
                  )}
                >
                  {dataset.format ?? 'jsonl'}
                </span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mb', 4),
                  'text-tertiary leading-relaxed line-clamp-2',
                )}
              >
                {dataset.description ?? ''}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 4 }),
                  cm.sp('pt', 3),
                  'border-t border-surface/5 font-mono text-[10px] text-tertiary uppercase tracking-widest',
                )}
              >
                <span>
                  {t(
                    'datasets.rows',
                    { count: dataset.row_count ?? 0 },
                    { defaultValue: '{{count}} rows' },
                  )}
                </span>
                <span className="ml-auto">{dataset.updated_at?.slice(0, 10) ?? ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Datasets
