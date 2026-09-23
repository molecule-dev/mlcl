import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BottomNavBar from '../components/BottomNavBar.js'
import CategoriesSideNavBar from '../components/CategoriesSideNavBar.js'
import CategoriesTopNavBar from '../components/CategoriesTopNavBar.js'

function CategoriesChrome({
  children,
  search,
  onSearchChange,
}: {
  children: ReactNode
  search?: string
  onSearchChange?: (value: string) => void
}) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <CategoriesSideNavBar />
      <div className="md:ml-64">
        <CategoriesTopNavBar search={search} onSearchChange={onSearchChange} />
        {children}
        {/* Mobile Navigation (Fixed Bottom) */}
        <BottomNavBar />
      </div>
    </div>
  )
}

type CategoryIconName =
  | 'shopping-cart'
  | 'utensils'
  | 'car'
  | 'film'
  | 'home'
  | 'heart'
  | 'wallet'
  | 'receipt'
  | 'credit-card'
  | 'plane'
  | 'dumbbell'
  | 'repeat'
  | 'shopping-bag'
  | 'medical-services'
  | 'school'
  | 'flash-on'
  | 'payments'
  | 'trending-up'
  | 'work'

const iconPaths: Record<string, ReactNode> = {
  'shopping-cart': (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ),
  utensils: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  car: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  film: (
    <>
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </>
  ),
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  heart: (
    <>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </>
  ),
  receipt: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8H8" />
      <path d="M16 12H8" />
      <path d="M10 16H8" />
    </>
  ),
  'credit-card': (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </>
  ),
  plane: (
    <>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1.5 4.5c-.2.6.1 1.2.7 1.5l4.5 1.5 1.5 4.5c.2.6.9.9 1.5.7l4.5-1.5c.5-.2.8-.6.7-1.1Z" />
    </>
  ),
  dumbbell: (
    <>
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1" />
      <path d="m3 3 1 1" />
      <path d="m18 22 4-4" />
      <path d="m2 6 4-4" />
      <path d="m3 10 7-7" />
      <path d="m14 21 7-7" />
    </>
  ),
  repeat: (
    <>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </>
  ),
  'shopping-bag': (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  'medical-services': (
    <>
      <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M14 11h-4" />
      <path d="M12 9v4" />
      <path d="M22 12v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8" />
      <path d="M20 6H4a2 2 0 0 0-2 2v4" />
      <path d="M22 12h-4" />
      <path d="M6 12H2" />
    </>
  ),
  school: (
    <>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  'flash-on': (
    <>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </>
  ),
  payments: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h2" />
    </>
  ),
  'trending-up': (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  work: (
    <>
      <path d="M12 12h.01" />
      <path d="M8 20l4-8 4 8M6 4l4 8 4-8" />
      <path d="M16 4h6v6" />
      <path d="M22 4 12 14" />
    </>
  ),
  plus: (
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>
  ),
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  loader: (
    <>
      <line x1="12" x2="12" y1="2" y2="6" />
      <line x1="12" x2="12" y1="18" y2="22" />
      <line x1="4.93" x2="7.76" y1="4.93" y2="7.76" />
      <line x1="16.24" x2="19.07" y1="16.24" y2="19.07" />
      <line x1="2" x2="6" y1="12" y2="12" />
      <line x1="18" x2="22" y1="12" y2="12" />
      <line x1="4.93" x2="7.76" y1="19.07" y2="16.24" />
      <line x1="16.24" x2="19.07" y1="7.76" y2="4.93" />
    </>
  ),
  folder: (
    <>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </>
  ),
  'alert-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </>
  ),
}

function CategoryIcon({
  name,
  className,
  style,
}: {
  name: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {iconPaths[name] || iconPaths['shopping-cart']}
    </svg>
  )
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  created_at: string
  type?: 'expense' | 'income'
  transactionCount?: number
  amount?: number
  progress?: number
}

export function Categories() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  // Manrope (used for headings) is served locally via index.html — no CDN load.

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const categoryIcons: CategoryIconName[] = [
    'shopping-cart',
    'utensils',
    'car',
    'film',
    'home',
    'heart',
    'wallet',
    'receipt',
    'credit-card',
    'plane',
    'dumbbell',
    'repeat',
  ]

  useEffect(() => {
    let cancelled = false
    async function fetchCategories() {
      try {
        const data = await http.get('/api/categories')
        if (cancelled) return
        // Render ONLY the user's real categories. The previous fallback to
        // polished design-mockup rows (Housing $2,450, Salary +$8,500, …)
        // leaked fake numbers onto a fresh user's screen and masked fetch
        // failures behind data that was never theirs.
        setCategories(
          (Array.isArray(data) ? data : []).map((c: Category) => ({
            ...c,
            type: c.type ?? 'expense',
            transactionCount: c.transactionCount ?? 0,
            amount: c.amount ?? 0,
            progress: c.progress ?? 0,
          })),
        )
        setFetchError(null)
      } catch (err) {
        if (cancelled) return
        // Surface the failure with the retry banner — never a silent blank.
        setFetchError(
          err instanceof Error
            ? err.message
            : t('categories.loadError', undefined, {
                defaultValue: 'Failed to load categories.',
              }),
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const matchesSearch = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (c: Category) => !q || c.name.toLowerCase().includes(q)
  }, [search])

  const expenseCategories = useMemo(() => {
    return categories.filter((c) => (c.type === 'expense' || !c.type) && matchesSearch(c))
  }, [categories, matchesSearch])

  const incomeCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'income' && matchesSearch(c))
  }, [categories, matchesSearch])

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({ name: category.name, color: category.color })
    } else {
      setEditingCategory(null)
      setFormData({ name: '', color: '#3B82F6' })
    }
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCategory(null)
    setFormData({ name: '', color: '#3B82F6' })
    setFormError('')
    setDeleteConfirmId(null)
  }

  // Close the add/edit dialog on Escape while it is open. State setters are
  // stable, so the handler resets the dialog state directly.
  useEffect(() => {
    if (!showModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShowModal(false)
      setEditingCategory(null)
      setFormData({ name: '', color: '#3B82F6' })
      setFormError('')
      setDeleteConfirmId(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showModal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError(
        t('categories.nameRequired', undefined, { defaultValue: 'Category name is required' }),
      )
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        name: formData.name.trim(),
        color: formData.color,
        icon:
          editingCategory?.icon || categoryIcons[Math.floor(Math.random() * categoryIcons.length)],
      }
      if (editingCategory) {
        await http.put(`/api/categories/${editingCategory.id}`, payload)
        void track({
          name: 'category.updated',
          properties: { id: editingCategory.id, name: payload.name },
        })
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? { ...c, ...payload } : c)),
        )
      } else {
        const res = await http.post<Category>('/api/categories', payload)
        const newCategory = (res as { data?: Category })?.data ?? (res as unknown as Category)
        void track({ name: 'category.created', properties: { id: newCategory?.id } })
        setCategories((prev) => [
          ...prev,
          { ...newCategory, type: 'expense', transactionCount: 0, amount: 0, progress: 0 },
        ])
      }
      closeModal()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null
      setFormError(
        message || t('errors.saveFailed', undefined, { defaultValue: 'Failed to save category' }),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/api/categories/${id}`)
      void track({ name: 'category.deleted', properties: { id } })
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setDeleteConfirmId(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null
      setFetchError(
        message ||
          t('errors.deleteFailed', undefined, { defaultValue: 'Failed to delete category' }),
      )
    }
  }

  // Helper to get icon background color with opacity
  const getIconBgStyle = (color: string) => ({
    backgroundColor: color + '1A', // 10% opacity
    color: color,
  })

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (isLoading) {
    return (
      <CategoriesChrome>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
            cm.sp('py', 16),
          )}
        >
          <div className={cm.spinner({ size: 'lg' })} />
          <p className={cm.textMuted}>
            {t('common.loading', undefined, { defaultValue: 'Loading categories...' })}
          </p>
        </div>
      </CategoriesChrome>
    )
  }

  if (fetchError) {
    return (
      <CategoriesChrome>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
            cm.sp('py', 16),
          )}
        >
          <div className={cm.emptyStateIcon}>
            <CategoryIcon
              name="alert-circle"
              style={{ width: '48px', height: '48px', opacity: 0.4 }}
            />
          </div>
          <h2 className={cm.emptyStateTitle}>
            {t('errors.somethingWentWrong', undefined, { defaultValue: 'Something went wrong' })}
          </h2>
          <p className={cm.emptyStateDescription}>{fetchError}</p>
          <button
            onClick={() => {
              setIsLoading(true)
              setFetchError(null)
              window.location.reload()
            }}
            className={cm.button()}
          >
            {t('common.retry', undefined, { defaultValue: 'Retry' })}
          </button>
        </div>
      </CategoriesChrome>
    )
  }

  return (
    <CategoriesChrome search={search} onSearchChange={setSearch}>
      <div style={{ padding: '24px', paddingBottom: '112px' }}>
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '64px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 800,
                fontFamily: 'Manrope, sans-serif',
                color: 'var(--mol-color-text)',
                letterSpacing: '-0.025em',
                marginBottom: '8px',
                lineHeight: 1.1,
              }}
            >
              {t('categories.title', undefined, { defaultValue: 'Categories' })}
            </h1>
            <p
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
                color: 'var(--mol-color-text-secondary)',
                fontSize: '16px',
                margin: 0,
              }}
            >
              {t('categories.description', undefined, {
                defaultValue: 'Manage and refine your personal financial taxonomy.',
              })}
            </p>
          </div>
          <button
            onClick={() => openModal()}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)',
              color: 'var(--color-on-error)',
              padding: '12px 24px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.2)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <CategoryIcon name="plus" style={{ width: '20px', height: '20px' }} />
            {t('categories.add', undefined, { defaultValue: 'Add Category' })}
          </button>
        </div>

        {/* Expense Categories Section */}
        <section style={{ marginBottom: '64px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
            }}
          >
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: '"Manrope", sans-serif',
                color: 'var(--mol-color-text)',
                margin: 0,
              }}
            >
              {t('categories.expenseCategories', undefined, { defaultValue: 'Expense Categories' })}
            </h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: '"Inter", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--mol-color-text-tertiary)',
              }}
            >
              {expenseCategories.length} {t('status.active', undefined, { defaultValue: 'Active' })}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {expenseCategories.map((category) => (
              <div
                key={category.id}
                style={{
                  backgroundColor: 'var(--color-on-error)',
                  padding: '24px',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(20, 27, 43, 0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...getIconBgStyle(category.color),
                    }}
                  >
                    <CategoryIcon name={category.icon} style={{ width: '24px', height: '24px' }} />
                  </div>
                  <div
                    style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }}
                    className="category-actions"
                  >
                    <button
                      onClick={() => openModal(category)}
                      aria-label={t(
                        'categories.editCategory',
                        { name: category.name },
                        {
                          defaultValue: 'Edit {{name}}',
                        },
                      )}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--mol-color-text-tertiary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                        e.currentTarget.style.color = 'var(--mol-color-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--mol-color-text-tertiary)'
                      }}
                    >
                      <CategoryIcon name="edit" style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(category.id)}
                      aria-label={t(
                        'categories.deleteCategory',
                        { name: category.name },
                        {
                          defaultValue: 'Delete {{name}}',
                        },
                      )}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--mol-color-text-tertiary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                        e.currentTarget.style.color = 'var(--mol-color-error)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--mol-color-text-tertiary)'
                      }}
                    >
                      <CategoryIcon name="trash" style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>

                <h4
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontWeight: 600,
                    fontSize: '18px',
                    marginBottom: '4px',
                    color: 'var(--mol-color-text)',
                  }}
                >
                  {category.name}
                </h4>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--mol-color-text-tertiary)',
                      fontWeight: 500,
                    }}
                  >
                    {category.transactionCount || 0}{' '}
                    {t('nav.transactions', undefined, { defaultValue: 'Transactions' })}
                  </span>
                  <span
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontWeight: 700,
                      fontSize: '18px',
                      color: 'var(--mol-color-text)',
                    }}
                  >
                    {formatCurrency(category.amount || 0)}
                  </span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: 'var(--mol-color-border)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${category.progress || 0}%`,
                      backgroundColor:
                        category.progress && category.progress > 90
                          ? 'var(--color-tertiary)'
                          : 'var(--color-primary)',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* Delete confirmation */}
                {deleteConfirmId === category.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      borderRadius: '16px',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: 'var(--mol-color-text-secondary)' }}>
                      {t('common.confirm', undefined, { defaultValue: 'Are you sure?' })}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDelete(category.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--color-danger-hover)',
                          color: 'var(--color-on-error)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        {t('common.yes', undefined, { defaultValue: 'Yes' })}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--color-surface-hover)',
                          color: 'var(--mol-color-text)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        {t('common.no', undefined, { defaultValue: 'No' })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Income Categories Section */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
            }}
          >
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: '"Manrope", sans-serif',
                color: 'var(--mol-color-text)',
                margin: 0,
              }}
            >
              {t('categories.incomeCategories', undefined, { defaultValue: 'Income Categories' })}
            </h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: '"Inter", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--mol-color-text-tertiary)',
              }}
            >
              {incomeCategories.length} {t('status.active', undefined, { defaultValue: 'Active' })}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {incomeCategories.map((category) => (
              <div
                key={category.id}
                style={{
                  backgroundColor: 'var(--color-on-error)',
                  padding: '24px',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(20, 27, 43, 0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...getIconBgStyle(category.color),
                    }}
                  >
                    <CategoryIcon name={category.icon} style={{ width: '24px', height: '24px' }} />
                  </div>
                  <div
                    style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }}
                    className="category-actions"
                  >
                    <button
                      onClick={() => openModal(category)}
                      aria-label={t(
                        'categories.editCategory',
                        { name: category.name },
                        {
                          defaultValue: 'Edit {{name}}',
                        },
                      )}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--mol-color-text-tertiary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                        e.currentTarget.style.color = 'var(--mol-color-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--mol-color-text-tertiary)'
                      }}
                    >
                      <CategoryIcon name="edit" style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(category.id)}
                      aria-label={t(
                        'categories.deleteCategory',
                        { name: category.name },
                        {
                          defaultValue: 'Delete {{name}}',
                        },
                      )}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--mol-color-text-tertiary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                        e.currentTarget.style.color = 'var(--mol-color-error)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--mol-color-text-tertiary)'
                      }}
                    >
                      <CategoryIcon name="trash" style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>

                <h4
                  style={{
                    fontFamily:
                      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontWeight: 600,
                    fontSize: '18px',
                    marginBottom: '4px',
                    color: 'var(--mol-color-text)',
                  }}
                >
                  {category.name}
                </h4>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--mol-color-text-tertiary)',
                      fontWeight: 500,
                    }}
                  >
                    {category.transactionCount || 0}{' '}
                    {t('nav.transactions', undefined, { defaultValue: 'Transactions' })}
                  </span>
                  <span
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontWeight: 700,
                      fontSize: '18px',
                      color: 'var(--color-primary)',
                    }}
                  >
                    +{formatCurrency(category.amount || 0)}
                  </span>
                </div>

                {/* Delete confirmation */}
                {deleteConfirmId === category.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      borderRadius: '16px',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: 'var(--mol-color-text-secondary)' }}>
                      {t('common.confirm', undefined, { defaultValue: 'Are you sure?' })}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDelete(category.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--color-danger-hover)',
                          color: 'var(--color-on-error)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        {t('common.yes', undefined, { defaultValue: 'Yes' })}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--color-surface-hover)',
                          color: 'var(--mol-color-text)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        {t('common.no', undefined, { defaultValue: 'No' })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Empty state */}
        {categories.length === 0 && (
          <div className={cm.emptyState}>
            <div className={cm.emptyStateIcon}>
              <CategoryIcon name="folder" style={{ width: '48px', height: '48px', opacity: 0.4 }} />
            </div>
            <h3 className={cm.emptyStateTitle}>
              {t('categories.emptyTitle', undefined, { defaultValue: 'No categories yet' })}
            </h3>
            <p className={cm.emptyStateDescription}>
              {t('categories.emptyDescription', undefined, {
                defaultValue: 'Create your first category to start organizing your transactions.',
              })}
            </p>
            <button onClick={() => openModal()} className={cm.emptyStateAction + ' ' + cm.button()}>
              <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                <CategoryIcon name="plus" style={{ width: '16px', height: '16px' }} />
                {t('categories.addFirst', undefined, { defaultValue: 'Add First Category' })}
              </span>
            </button>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <>
            {/* Overlay background (pointer-events-none dim layer) */}
            <div className={cm.dialogOverlay} aria-hidden="true" />
            {/* Centering wrapper */}
            <div className={cm.dialogWrapper}>
              {/* Pointer-only dismiss layer; keyboard users close via Escape or the close button. */}
              <div
                aria-hidden="true"
                onClick={closeModal}
                className={cm.cn(cm.position('absolute'), cm.inset0)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="categories-dialog-title"
                className={cm.modal()}
              >
                <div className={cm.dialogHeader}>
                  <h2 id="categories-dialog-title" className={cm.dialogTitle}>
                    {editingCategory
                      ? t('categories.editTitle', undefined, { defaultValue: 'Edit Category' })
                      : t('categories.addTitle', undefined, { defaultValue: 'Add Category' })}
                  </h2>
                  <button
                    onClick={closeModal}
                    className={cm.button({ variant: 'ghost', size: 'sm' })}
                    aria-label={t('common.close', undefined, { defaultValue: 'Close' })}
                  >
                    <CategoryIcon name="x" style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className={cm.dialogBody}>
                  {formError && (
                    <div className={cm.alert({ variant: 'error' })}>
                      <div className={cm.alertContent}>
                        <div className={cm.alertDescription}>{formError}</div>
                      </div>
                    </div>
                  )}
                  <div className={cm.formField}>
                    <label className={cm.label()}>
                      {t('form.name', undefined, { defaultValue: 'Name' })}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('categories.namePlaceholder', undefined, {
                        defaultValue: 'e.g. Groceries',
                      })}
                      className={cm.input()}
                      required
                    />
                  </div>
                  <div className={cm.formField}>
                    <label className={cm.label()}>
                      {t('categories.color', undefined, { defaultValue: 'Color' })}
                    </label>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className={cm.input()}
                        style={{ width: '48px', height: '40px', padding: '2px', cursor: 'pointer' }}
                      />
                      <span className={cm.textMuted}>{formData.color}</span>
                    </div>
                  </div>
                  <div className={cm.dialogFooter}>
                    <button
                      type="button"
                      onClick={closeModal}
                      className={cm.button({ variant: 'outline' })}
                      disabled={isSubmitting}
                    >
                      {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
                    </button>
                    <button type="submit" className={cm.button()} disabled={isSubmitting}>
                      {isSubmitting
                        ? t('common.saving', undefined, { defaultValue: 'Saving...' })
                        : editingCategory
                          ? t('common.save', undefined, { defaultValue: 'Save Changes' })
                          : t('common.create', undefined, { defaultValue: 'Create' })}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* CSS for hover effects on action buttons. On touch / narrow
            viewports there is no hover, so the actions stay visible. */}
        <style>{`
        div[class*="category-actions"]:hover {
          opacity: 1 !important;
        }
        @media (hover: none), (max-width: 767px) {
          div[class*="category-actions"] {
            opacity: 1 !important;
          }
        }
      `}</style>
      </div>
    </CategoriesChrome>
  )
}
