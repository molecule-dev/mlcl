import { useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Note {
  id: string
  content: string
  author_name: string | null
  created_at: string
}
interface ContactNotesCardProps {
  notes: Note[]
}
function ContactNotesCard({ notes }: ContactNotesCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [localNotes, setLocalNotes] = useState<Note[]>(notes)
  const [showForm, setShowForm] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAddNote() {
    if (!noteContent.trim()) return
    setLoading(true)
    try {
      const res = await http.post<Note>('/notes', { content: noteContent })
      setLocalNotes((xs) => [...xs, res.data])
      setNoteContent('')
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-3xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-[0.15em] text-on-surface-variant',
          )}
        >
          {t('contactNotesCard.title', {}, { defaultValue: 'Internal Notes' })}
        </h2>
        <button
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.flex({ align: 'center' }),
          )}
          onClick={() => setShowForm((v) => !v)}
        >
          <span className={cm.cn(cm.textSize('sm'), cm.sp('mr', 1), 'material-symbols-outlined')}>
            sticky_note_2
          </span>

          {t('contactNotesCard.quickNote', {}, { defaultValue: 'Quick Note' })}
        </button>
      </div>
      {showForm && (
        <div className={cm.cn(cm.sp('mb', 4), cm.sp('p', 4), 'bg-surface-container-low rounded')}>
          <textarea
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              cm.sp('p', 2),
              'text-on-surface bg-transparent border border-outline/30 rounded resize-none focus:outline-none focus:border-primary',
            )}
            rows={3}
            placeholder={t('contactNotesCard.notePlaceholder', {}, { defaultValue: 'Add a note…' })}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('mt', 2))}>
            <button
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              onClick={() => {
                setShowForm(false)
                setNoteContent('')
              }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary)}
              onClick={handleAddNote}
              disabled={loading || !noteContent.trim()}
            >
              {loading
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('contactNotesCard.saveNote', {}, { defaultValue: 'Save Note' })}
            </button>
          </div>
        </div>
      )}
      <div className={cm.stack(4)}>
        {localNotes.map((note, i) => {
          const initials = (note.author_name ?? '??')
            .split(' ')
            .map((w: string) => w[0] ?? '')
            .join('')
            .slice(0, 2)
            .toUpperCase()
          const avatarCls = i % 2 === 0 ? 'bg-primary/20' : 'bg-secondary/20'
          const textCls = i % 2 === 0 ? 'text-primary' : 'text-secondary'
          return (
            <div key={note.id} className={cm.cn(cm.sp('p', 4), 'bg-surface-container-low rounded')}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}>
                <div
                  className={cm.cn(
                    cm.w(5),
                    cm.h(5),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    avatarCls,
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-[8px]', textCls)}>
                    {initials}
                  </span>
                </div>
                <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface')}>
                  {note.author_name ?? t('settings.unknown', {}, { defaultValue: 'Unknown' })}
                </span>
                <span className={cm.fvfc6bb990}>{new Date(note.created_at).toLocaleString()}</span>
              </div>
              <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
                {note.content}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ContactNotesCard
export { ContactNotesCard }
