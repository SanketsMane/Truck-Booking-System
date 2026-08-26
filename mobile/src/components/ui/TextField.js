import { View, Text, TextInput, StyleSheet } from "react-native";
import { theme } from "../../theme";

export const TextField = ({ label, error, help, style, ...inputProps }) => (
  <View style={[styles.wrap, style]}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholderTextColor={theme.color.textFaint}
      {...inputProps}
    />
    {error ? <Text style={styles.error}>{error}</Text> : help ? <Text style={styles.help}>{help}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.medium,
    color: theme.color.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: theme.font.size.md,
    color: theme.color.text,
    backgroundColor: theme.color.surface,
  },
  inputError: {
    borderColor: theme.color.danger,
  },
  error: {
    fontSize: theme.font.size.xs,
    color: theme.color.danger,
  },
  help: {
    fontSize: theme.font.size.xs,
    color: theme.color.textFaint,
  },
});

export default TextField;
