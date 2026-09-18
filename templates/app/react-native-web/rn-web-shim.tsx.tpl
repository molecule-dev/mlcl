/**
 * DOM shim for react-native primitives.
 *
 * Maps React Native components to HTML elements with full `className`
 * passthrough so that `@molecule/app-ui-react-native` components render
 * in the browser using Tailwind CSS — the same class strings they use
 * with NativeWind on native.
 *
 * This shim is aliased as `react-native` via Vite's `resolve.alias`
 * config. Any `import { View, Text, ... } from 'react-native'` resolves
 * here at build time.
 */

import React, { forwardRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

// ---- Style types (stubs) ----

export interface ViewStyle {
  [key: string]: unknown
}

export type AccessibilityRole = string

// ---- Shared prop helpers ----

interface BaseProps {
  children?: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[] | object
  testID?: string
  accessibilityRole?: string
  accessibilityState?: Record<string, unknown>
  accessibilityLabel?: string
  accessibilityValue?: Record<string, unknown>
  onTouchEnd?: () => void
}

/** Convert RN ViewStyle / style arrays to a CSSProperties object for the DOM. */
function resolveStyle(
  style?: ViewStyle | ViewStyle[] | object,
): React.CSSProperties | undefined {
  if (!style) return undefined
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(resolveStyle)) as React.CSSProperties
  }
  // Resolve any Animated.Value instances to their raw number
  const resolved: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(style as Record<string, unknown>)) {
    resolved[k] = v && typeof v === 'object' && '_value' in v ? (v as { _value: unknown })._value : v
  }
  return resolved as React.CSSProperties
}

// ---- View ----

export const View: React.FC<BaseProps> = ({
  children, className, style, testID, ...rest
}) => (
  <div
    className={className}
    style={resolveStyle(style)}
    data-testid={testID}
    role={rest.accessibilityRole || undefined}
    aria-label={rest.accessibilityLabel}
  >
    {children}
  </div>
)

// ---- Text ----

export const Text: React.FC<BaseProps> = ({
  children, className, style, testID, ...rest
}) => (
  <span
    className={className}
    style={resolveStyle(style)}
    data-testid={testID}
    role={rest.accessibilityRole || undefined}
    aria-label={rest.accessibilityLabel}
  >
    {children}
  </span>
)

// ---- Pressable ----

interface PressableProps extends BaseProps {
  onPress?: (event?: unknown) => void
  onLongPress?: () => void
  onPressOut?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export const Pressable: React.FC<PressableProps> = ({
  children, className, style, testID, onPress, disabled, type, ...rest
}) => {
  const isButton = rest.accessibilityRole === 'button' || !!type
  const Tag = isButton ? 'button' : 'div'
  return (
    <Tag
      className={className}
      style={resolveStyle(style)}
      data-testid={testID}
      onClick={!disabled && onPress ? (e: React.MouseEvent) => { e.stopPropagation(); onPress(e) } : undefined}
      {...(isButton ? { type: type || 'button' } : {})}
      role={!isButton ? (rest.accessibilityRole || undefined) : undefined}
      disabled={isButton ? (disabled || undefined) : undefined}
      aria-disabled={!isButton ? (disabled || undefined) : undefined}
      aria-label={rest.accessibilityLabel}
    >
      {children}
    </Tag>
  )
}

// ---- TextInput ----

interface TextInputProps extends BaseProps {
  editable?: boolean
  placeholder?: string
  value?: string
  onChangeText?: (text: string) => void
  onFocus?: (event?: unknown) => void
  onBlur?: (event?: unknown) => void
  secureTextEntry?: boolean
  keyboardType?: string
  multiline?: boolean
  numberOfLines?: number
  textAlignVertical?: string
  autoComplete?: string
}

export const TextInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextInputProps>(
  ({ className, style, testID, editable, placeholder, value, onChangeText, onFocus, onBlur, secureTextEntry, multiline, numberOfLines, ...rest }, ref) => {
    const sharedProps = {
      className,
      style: resolveStyle(style),
      'data-testid': testID,
      disabled: editable === false,
      placeholder,
      value: value ?? '',
      onChange: onChangeText
        ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeText(e.target.value)
        : undefined,
      onFocus: onFocus as React.FocusEventHandler | undefined,
      onBlur: onBlur as React.FocusEventHandler | undefined,
      'aria-label': rest.accessibilityLabel,
    }

    if (multiline) {
      return <textarea ref={ref as React.Ref<HTMLTextAreaElement>} rows={numberOfLines || 3} {...sharedProps} />
    }
    return <input ref={ref as React.Ref<HTMLInputElement>} type={secureTextEntry ? 'password' : 'text'} {...sharedProps} />
  },
)

// ---- Image ----

interface ImageProps extends BaseProps {
  source: { uri: string } | number
  onError?: () => void
}

export const Image: React.FC<ImageProps> = ({
  className, style, testID, source, onError, ...rest
}) => {
  const src = typeof source === 'object' && 'uri' in source ? source.uri : ''
  return (
    <img
      className={className}
      style={resolveStyle(style)}
      data-testid={testID}
      src={src}
      onError={onError}
      alt={rest.accessibilityLabel || ''}
    />
  )
}

// ---- ScrollView ----

export const ScrollView: React.FC<BaseProps> = ({
  children, className, style, testID,
}) => (
  <div
    className={className}
    style={{ overflow: 'auto', ...resolveStyle(style) }}
    data-testid={testID}
  >
    {children}
  </div>
)

// ---- Modal ----

interface ModalProps extends BaseProps {
  visible?: boolean
  transparent?: boolean
  animationType?: string
  onRequestClose?: () => void
}

export const Modal: React.FC<ModalProps> = ({
  children, visible, onRequestClose, testID,
}) => {
  useEffect(() => {
    if (!visible || !onRequestClose) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onRequestClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible, onRequestClose])

  if (!visible) return null

  // Portal children directly to document.body — no wrapper div.
  // This matches how the React Modal uses createPortal, allowing the
  // header (z-[1001]) to remain above and interactive since the dialog
  // elements have no z-index (z-modal is not defined in the theme).
  // The dialogWrapper/actionSheet classes include pointer-events-auto
  // to break inheritance from the dialogOverlay's pointer-events-none.
  return createPortal(
    <div data-testid={testID} style={{ display: 'contents' }}>
      {children}
    </div>,
    document.body,
  )
}

// ---- Switch ----

interface SwitchComponentProps extends BaseProps {
  value?: boolean
  onValueChange?: (value: boolean) => void
  disabled?: boolean
}

export const Switch: React.FC<SwitchComponentProps> = ({
  value, onValueChange, disabled, className, testID,
}) => (
  <input
    type="checkbox"
    checked={!!value}
    onChange={onValueChange ? (e) => onValueChange(e.target.checked) : undefined}
    disabled={disabled}
    className={className}
    data-testid={testID}
    role="switch"
  />
)

// ---- ActivityIndicator ----

interface ActivityIndicatorProps extends BaseProps {
  size?: 'small' | 'large'
  color?: string
}

export const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  size = 'small', color, className, style, testID,
}) => {
  const dim = size === 'large' ? 36 : 20
  return (
    <div
      className={className}
      style={{
        width: dim,
        height: dim,
        border: `2px solid ${color || 'currentColor'}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        ...resolveStyle(style),
      }}
      data-testid={testID}
      role="progressbar"
    />
  )
}

// ---- FlatList ----

interface FlatListProps<T> extends BaseProps {
  data: readonly T[] | null | undefined
  keyExtractor?: (item: T, index: number) => string
  renderItem: (info: { item: T; index: number }) => React.ReactNode
}

export function FlatList<T>({
  data, keyExtractor, renderItem, className, style, testID,
}: FlatListProps<T>): React.ReactNode {
  return (
    <div className={className} style={resolveStyle(style)} data-testid={testID}>
      {(data || []).map((item, index) => (
        <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
          {renderItem({ item, index })}
        </React.Fragment>
      ))}
    </div>
  )
}

// ---- Animated ----

interface AnimationResult {
  start: (cb?: () => void) => void
  stop: () => void
}

class AnimatedValue {
  _value: number
  constructor(value: number) {
    this._value = value
  }
}

const AnimatedView: React.FC<BaseProps & { style?: unknown }> = ({
  children, className, style, testID, ...rest
}) => (
  <div
    className={className}
    style={resolveStyle(style as ViewStyle | ViewStyle[])}
    data-testid={testID}
    role={rest.accessibilityRole || undefined}
  >
    {children}
  </div>
)

export const Animated = {
  Value: AnimatedValue,
  View: AnimatedView,
  timing(
    _value: AnimatedValue,
    _config: { toValue: number; duration: number; useNativeDriver: boolean },
  ): AnimationResult {
    return { start: (_cb?: () => void) => {}, stop: () => {} }
  },
  loop(animation: { start: () => void; stop: () => void }): AnimationResult {
    return { start: () => animation.start(), stop: () => animation.stop() }
  },
  sequence(_animations: Array<{ start: (cb?: () => void) => void }>): AnimationResult {
    return { start: (_cb?: () => void) => {}, stop: () => {} }
  },
}
