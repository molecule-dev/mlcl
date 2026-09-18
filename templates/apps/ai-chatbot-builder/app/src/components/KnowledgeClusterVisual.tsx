import { getClassMap } from '@molecule/app-ui'
export default function KnowledgeClusterVisual({
  imageSrc,
  imageAlt,
  label,
  caption,
}: {
  imageSrc: string
  imageAlt: string
  label: string
  caption: string
}) {
  const cm = getClassMap()
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '2rem',
        overflow: 'hidden',
        aspectRatio: 'video',
        boxShadow: 'var(--tw-shadow-xl, revert)',
      }}
      data-mol-id="knowledge-cluster-visual"
    >
      <img
        alt={imageAlt}
        className={'group-hover:scale-105'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transitionProperty: 'all',
          transitionDuration: '700ms',
        }}
        src={imageSrc}
      />
      <div
        className={cm.flex({ direction: 'col', justify: 'end' })}
        style={{
          position: 'absolute',
          inset: 'calc(0 * 0.25rem)',
          backgroundImage: 'linear-gradient(to right, currentColor, transparent)',
          padding: 'calc(6 * 0.25rem)',
        }}
        data-mol-id="knowledge-cluster-overlay"
      >
        <p
          className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 1))}
          style={{
            fontSize: '10px',
            color: 'var(--md-sys-color-primary-fixed)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}
        >
          {label}
        </p>
        <p
          className={cm.fontWeight('medium')}
          style={{
            color: 'var(--color-on-error)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
          }}
        >
          {caption}
        </p>
      </div>
    </div>
  )
}

export { KnowledgeClusterVisual }
