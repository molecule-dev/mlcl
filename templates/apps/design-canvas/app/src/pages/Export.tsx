import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ExportRecord {
  id: string
  format: string
  quality: number
  scale: number
  status: string
  createdAt: string
}

const FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPEG' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' },
]

const SCALES = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
]

export function ExportPage({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()
  const [exports, setExports] = useState<ExportRecord[]>([])
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(90)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    void http.get<{ data: ExportRecord[] }>(`/api/exports?projectId=${projectId}`).then((res) => {
      setExports(res.data?.data ?? [])
    })
  }, [http, projectId])

  const handleExport = async () => {
    const result = await http.post<ExportRecord>('/api/exports', {
      projectId,
      format,
      quality,
      scale,
    })
    if (result.data) setExports([result.data, ...exports])
  }

  return (
    <div data-mol-id="page-export" className={cm.cn(cm.container())}>
      <h2>{t('export.title', {}, { defaultValue: 'Export Design' })}</h2>

      <div className={cm.cn(cm.card())}>
        <div className={cm.cardContent}>
          <div className={cm.cn(cm.stack(2))}>
            <label className={cm.label()}>{t('form.format', {}, { defaultValue: 'Format' })}</label>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              {FORMATS.map((f) => (
                <button
                  data-mol-id="button-action"
                  key={f.value}
                  className={cm.button({ variant: format === f.value ? 'solid' : 'outline' })}
                  onClick={() => setFormat(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {format !== 'svg' && (
            <div className={cm.cn(cm.stack(2))}>
              <label className={cm.label()}>
                {t('export.quality', {}, { defaultValue: 'Quality' })} — {quality}%
              </label>
              <input
                className={cm.input()}
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </div>
          )}

          <div className={cm.cn(cm.stack(2))}>
            <label className={cm.label()}>{t('export.scale', {}, { defaultValue: 'Scale' })}</label>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              {SCALES.map((s) => (
                <button
                  data-mol-id="button-export-button"
                  key={s.value}
                  className={cm.button({ variant: scale === s.value ? 'solid' : 'outline' })}
                  onClick={() => setScale(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            data-mol-id="button-export-submit"
            className={cm.button({ variant: 'solid' })}
            onClick={handleExport}
          >
            {t('common.export', {}, { defaultValue: 'Export' })}
          </button>
        </div>
      </div>

      {exports.length > 0 && (
        <div>
          <h3>{t('export.history', {}, { defaultValue: 'Export History' })}</h3>
          <div className={cm.cn(cm.stack(2))}>
            {exports.map((exp) => (
              <div key={exp.id} className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }))}>
                <span className={cm.badge()}>{exp.format.toUpperCase()}</span>
                <span>{exp.scale}x</span>
                <span>{exp.quality}%</span>
                <span className={cm.badge()}>
                  {exp.status === 'pending'
                    ? t('export.statusPending', {}, { defaultValue: 'Processing...' })
                    : t('common.complete', {}, { defaultValue: 'Complete' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
