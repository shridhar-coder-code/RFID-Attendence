import { TextInput as NativeTextInput, StyleSheet, type TextInputProps } from 'react-native';

const ORBITRON_REGULAR = 'Orbitron_400Regular';

export function AppTextInput({ style, ...props }: TextInputProps) {
  const flattenedStyle = StyleSheet.flatten(style);

  return (
    <NativeTextInput
      {...props}
      style={[{ fontFamily: flattenedStyle?.fontFamily ?? ORBITRON_REGULAR }, style]}
    />
  );
}