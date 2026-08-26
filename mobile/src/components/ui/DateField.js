import { useState } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../../theme";

const formatDate = (date) => date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const formatTime = (date) => date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

// mode: "date" | "time". value/onChange are plain JS Date objects — the
// screen owning this field converts to/from ISO strings at the API-call
// boundary, same as every other field here only cares about its own shape.
export const DateField = ({ label, mode = "date", value, onChange, minimumDate, help }) => {
  const [open, setOpen] = useState(false);
  const display = value ? (mode === "date" ? formatDate(value) : formatTime(value)) : "Select";

  const handleChange = (event, selected) => {
    // Android's picker is a modal dialog that closes itself on pick/cancel;
    // iOS's (display="default") is a compact popover that stays mounted —
    // only Android needs an explicit setOpen(false) here.
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "dismissed") return;
    if (selected) onChange(selected);
  };

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={styles.value}>{display}</Text>
      </Pressable>
      {help && <Text style={styles.help}>{help}</Text>}
      {open && (
        <DateTimePicker value={value || new Date()} mode={mode} display="default" onChange={handleChange} minimumDate={minimumDate} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: theme.font.size.sm, fontWeight: theme.font.weight.medium, color: theme.color.text },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.color.surface,
  },
  value: { fontSize: theme.font.size.md, color: theme.color.text },
  help: { fontSize: theme.font.size.xs, color: theme.color.textFaint },
});

export default DateField;
