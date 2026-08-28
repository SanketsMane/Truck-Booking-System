import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocationField } from "./LocationField";
import { Button } from "./ui/Button";
import { Muted } from "./ui/Typography";
import { theme } from "../theme";

// The stops a driver passes through between pickup and drop — the mobile
// twin of the web's components/ui/TripStopsField.jsx, kept deliberately in
// step with it so a driver who posts from the app and edits on the web sees
// the same route the same way.
//
// Order is the route, not decoration: the backend reads this list as the
// sequence the truck drives (tripController's tripLegPosition), which is
// what lets a shipper find a leg of a long run — and what stops the same
// truck matching that leg travelled backwards. So reordering is a real
// action here, not something a driver has to fake by deleting and re-adding.
export const MAX_TRIP_STOPS = 10;

export const TripStopsField = ({ stops = [], onChange, max = MAX_TRIP_STOPS }) => {
  const replaceAt = (index, next) => onChange(stops.map((stop, i) => (i === index ? next : stop)));

  const removeAt = (index) => onChange(stops.filter((_, i) => i !== index));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      {stops.map((stop, index) => (
        // Position is the only stable handle a stop has — it carries no id
        // of its own (tripModel stores stops with _id: false) and a
        // just-added one has an empty address. Reordering swaps the values
        // rather than the rows, so keying by index is right here.
        <View key={index} style={styles.stopRow}>
          <View style={styles.stopHead}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <View style={styles.controls}>
              <Pressable
                onPress={() => move(index, -1)}
                disabled={index === 0}
                hitSlop={8}
                accessibilityLabel={`Move stop ${index + 1} earlier`}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={index === 0 ? theme.color.borderStrong : theme.color.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => move(index, 1)}
                disabled={index === stops.length - 1}
                hitSlop={8}
                accessibilityLabel={`Move stop ${index + 1} later`}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={index === stops.length - 1 ? theme.color.borderStrong : theme.color.textMuted}
                />
              </Pressable>
              <Pressable onPress={() => removeAt(index)} hitSlop={8} accessibilityLabel={`Remove stop ${index + 1}`}>
                <Ionicons name="close" size={18} color={theme.color.textMuted} />
              </Pressable>
            </View>
          </View>
          <LocationField
            value={stop}
            onChange={(next) => replaceAt(index, next)}
            placeholder="e.g. Pune — Hadapsar bypass"
          />
        </View>
      ))}

      <Button
        title={stops.length === 0 ? "Add a stop" : "Add another stop"}
        variant="secondary"
        onPress={() => onChange([...stops, { address: "", lat: null, lng: null }])}
        disabled={stops.length >= max}
      />
      <Muted>
        {stops.length >= max
          ? `That's the maximum of ${max} stops.`
          : "Optional — towns you pass through and can load or unload at. Shippers searching any leg of your route will find you."}
      </Muted>
    </View>
  );
};

// Drops the blank rows a driver added but never filled in. An empty stop is
// an abandoned intention, not something to persist or to fail validation on.
export const cleanStops = (stops = []) =>
  stops.filter((stop) => stop?.address?.trim()).map((stop) => ({ ...stop, address: stop.address.trim() }));

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  stopRow: { gap: 6 },
  stopHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.accentSoft,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: theme.color.accent },
  controls: { flexDirection: "row", gap: 14, alignItems: "center" },
});

export default TripStopsField;
