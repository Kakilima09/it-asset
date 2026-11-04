import { Text, StyleSheet, type TextProps, type TextStyle } from 'react-native'
import { colors, fontSize } from '@/lib/theme'

type Variant = 'title' | 'heading' | 'subtitle' | 'body' | 'caption' | 'label' | 'mono'

const variants: Record<Variant, TextStyle> = {
  title: { fontSize: fontSize.xxl, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: fontSize.xl, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: fontSize.lg, fontWeight: '600' },
  body: { fontSize: fontSize.md, fontWeight: '400' },
  caption: { fontSize: fontSize.sm, fontWeight: '400', color: colors.textMuted },
  label: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textMuted },
  mono: { fontSize: fontSize.sm, fontFamily: 'monospace' },
}

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[styles.base, variants[variant], style]} />
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontSize: fontSize.md,
  },
})
