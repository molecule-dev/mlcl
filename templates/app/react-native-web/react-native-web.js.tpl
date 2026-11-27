import { createElement } from 'react'
import {
  ActivityIndicator as WebActivityIndicator,
  Animated as WebAnimated,
  FlatList as WebFlatList,
  Image as WebImage,
  Pressable as WebPressable,
  ScrollView as WebScrollView,
  StyleSheet,
  Switch as WebSwitch,
  Text as WebText,
  TextInput as WebTextInput,
  View as WebView,
} from 'react-native-web'

export * from 'react-native-web'

// RNW props omit className. Pass ClassMap classes as precompiled StyleSheet entries,
// the same mechanism NativeWind uses on the web. RNW still owns the host elements,
// events, refs, styles and accessibility. The browser applies the web ClassMap CSS.
function withClassName(component, defaultStyle, defaultProps) {
  return function WithClassName({ className, style, ...props }) {
    const compiled = className ? { $$css: true, className } : undefined
    const styles =
      typeof style === 'function'
        ? (state) => [defaultStyle, compiled, style(state)]
        : [defaultStyle, compiled, style]

    return createElement(component, { ...defaultProps, ...props, style: styles })
  }
}

// Let the web ClassMap set typography on a container and have its text inherit it.
const defaults = StyleSheet.create({
  text: {
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
  },
})

export const ActivityIndicator = withClassName(WebActivityIndicator, undefined, {
  color: 'currentColor',
})
export const FlatList = withClassName(WebFlatList)
export const Image = withClassName(WebImage)
export const Pressable = withClassName(WebPressable)
export const ScrollView = withClassName(WebScrollView)
export const Switch = withClassName(WebSwitch)
export const Text = withClassName(WebText, defaults.text)
export const TextInput = withClassName(WebTextInput, defaults.text)
export const View = withClassName(WebView)

// Apply classes after Animated has resolved its style values.
export const Animated = { ...WebAnimated, View: WebAnimated.createAnimatedComponent(View) }
