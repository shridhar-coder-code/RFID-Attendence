import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';

const ORBITRON_REGULAR = 'Orbitron_400Regular';
const ORBITRON_BOLD = 'Orbitron_700Bold';

export function AppText({ style, ...props }: TextProps) {
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...styleWithoutFontWeight } = flattenedStyle;
  const isBold =
    fontWeight === 'bold' ||
    fontWeight === '600' ||
    fontWeight === '700' ||
    fontWeight === '800' ||
    fontWeight === '900';

  return (
    <NativeText
      {...props}
      style={[
        styleWithoutFontWeight,
        { fontFamily: fontFamily ?? (isBold ? ORBITRON_BOLD : ORBITRON_REGULAR) },
      ]}
    />
  );
}