import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { theme } from "../../theme";

// A text field that responds to being touched. It had no focus state at all —
// you tapped it, the keyboard appeared, and the field looked exactly as it had
// before, which on a form of four identical boxes leaves you hunting for which
// one you're actually typing into.
//
// `prefix` renders a fixed, non-editable leading element inside the field —
// the "+91" on a mobile number — so the user doesn't have to wonder whether to
// type it, and the stored value stays the bare ten digits the API expects.
export const TextField = ({ label, error, help, style, prefix, onFocus, onBlur, ...inputProps }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.field, focused && styles.fieldFocused, error && styles.fieldError]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={theme.color.textFaint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
      </View>

      {/* Error replaces help rather than stacking below it — two lines of
          small text under one field is noise, and while an error is showing
          it's the line that matters. */}
      {error ? <Text style={styles.error}>{error}</Text> : help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs },
  label: { ...theme.text.label, color: theme.color.text },

  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    minHeight: theme.layout.input,
    paddingHorizontal: theme.spacing.smd,
    borderWidth: theme.layout.hairline,
    borderColor: theme.color.border,
    borderRadius: theme.radius.control,
    backgroundColor: theme.color.surface,
  },
  // A thicker ring rather than only a colour change, so focus is obvious on
  // its own and not just to someone comparing two borders side by side. The
  // horizontal padding drops by the extra border width so the text doesn't
  // shift sideways when the field gains focus.
  fieldFocused: {
    borderColor: theme.color.accent,
    borderWidth: 2,
    paddingHorizontal: theme.spacing.smd - 1,
  },
  fieldError: { borderColor: theme.color.danger },

  prefix: { ...theme.text.body, color: theme.color.textMuted },
  input: { flex: 1, ...theme.text.body, color: theme.color.text, paddingVertical: theme.spacing.smd },

  error: { ...theme.text.caption, color: theme.color.danger },
  help: { ...theme.text.caption, color: theme.color.textFaint },
});

export default TextField;
