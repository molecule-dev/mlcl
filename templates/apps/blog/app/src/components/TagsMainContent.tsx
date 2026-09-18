import { useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import TagsFilterBar from '../components/TagsFilterBar.js'
import TagsStatsRow from '../components/TagsStatsRow.js'
import TagsTableSection from '../components/TagsTableSection.js'
import TagsTipSection from '../components/TagsTipSection.js'
import TagsTopNavBar from '../components/TagsTopNavBar.js'

interface TagsMainContentProps {
  onNewTag?: () => void
}

type TagRow = {
  id: string | number
  name: string
  slug?: string
  post_count?: number
  created_at?: string
  status?: string
}

function TagsMainContent({ onNewTag }: TagsMainContentProps) {
  const cm = getClassMap()
  const http = useHttpClient()
  const [tags, setTags] = useState<TagRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    fetchTags()
    // fetchTags is defined inline below; adding it to deps would require
    // useCallback wrapping and change the intended run-once behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const res = await http.get('/api/tags')
      const raw = Array.isArray(res) ? res : (res as { data?: unknown })?.data
      setTags(
        Array.isArray(raw)
          ? raw.map((item) => {
              const o = item as Record<string, unknown>
              return {
                ...o,
                id: o.id as string | number,
                name: String(o.name ?? ''),
              } as TagRow
            })
          : [],
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (id: string | number) => {
    await http.delete(`/api/tags/${id}`)
    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  const filteredTags = tags.filter((tag) => {
    const matchesSearch = tag.name?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = activeFilter === 'all' || tag.status === activeFilter
    return matchesSearch && matchesFilter
  })

  return (
    <>
      {/* Main Canvas */}
      <main
        className={cm.cn(
          cm.flex1,
          cm.h('screen'),
          cm.flex({ direction: 'col' }),
          cm.surface,
          'ml-[240px] overflow-y-auto',
        )}
      >
        {/* TopNavBar Component */}
        <TagsTopNavBar onNewTag={onNewTag} />
        {/* Content Area */}
        <div className={cm.cn(cm.sp('p', 8), 'max-w-7xl', cm.w('full'), cm.mxAuto, cm.stack(10))}>
          {/* Stats Row */}
          <TagsStatsRow tags={tags} />
          {/* Search & Filter Bar */}
          <TagsFilterBar
            search={search}
            onSearchChange={setSearch}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          {/* Tags Table (Asymmetric Layout / Modern List) */}
          <TagsTableSection tags={filteredTags} onDeleteTag={handleDeleteTag} loading={loading} />
          {/* Asymmetric Tip Section */}
          <TagsTipSection />
        </div>
        <div className={cm.h(10)}></div>
      </main>
    </>
  )
}
export default TagsMainContent
export { TagsMainContent }
