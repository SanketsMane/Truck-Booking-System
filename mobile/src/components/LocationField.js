import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { theme } from "../theme";

const LOCATIONIQ_TOKEN = process.env.EXPO_PUBLIC_LOCATIONIQ_TOKEN || "";
const GEOCODING_UNAVAILABLE = !LOCATIONIQ_TOKEN;
const MIN_QUERY_LENGTH = 3;

// Native counterpart to frontend/src/components/ui/LocationAutocomplete.jsx
// — same LocationIQ Autocomplete/Reverse endpoints (India-restricted, free
// tier), same graceful degrade to a plain free-text field with no token or
// on a failed/empty search. "Use my current location" uses expo-location
// instead of the browser Geolocation API.
//
// value/onChange shape stays { address, lat, lng } — exactly what the
// backend's Trip.pickupPoint/dropPoint Joi schema expects, same as the web
// version's own comment insists on.
const extractCity = (result) => {
  const a = result.address || {};
  return a.city || a.town || a.village || a.county || a.state_district || result.display_name.split(",")[0].trim();
};

const formatReverseAddress = (result) => {
  const a = result.address || {};
  const road = [a.house_number, a.road].filter(Boolean).join(" ");
  const area = a.suburb || a.neighbourhood || a.quarter || a.city_district;
  const city = a.city || a.town || a.village || a.county;
  const stateZip = [a.state, a.postcode].filter(Boolean).join(" ");
  const parts = [road, area, city, stateZip].filter(Boolean);
  const deduped = parts.filter((part, i) => part !== parts[i - 1]);
  return deduped.length ? deduped.join(", ") : result.display_name;
};

export const LocationField = ({ label, value, onChange, onResolve, placeholder }) => {
  const address = value?.address || "";
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (GEOCODING_UNAVAILABLE) return undefined;
    const query = address.trim();
    clearTimeout(debounceRef.current);

    if (query.length < MIN_QUERY_LENGTH) {
      debounceRef.current = setTimeout(() => {
        setSuggestions([]);
        setOpen(false);
      }, 0);
      return () => clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const url =
          `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(query)}` +
          `&countrycodes=in&normalizecity=1&limit=6&format=json`;
        const res = await fetch(url);
        if (requestId !== requestIdRef.current) return;
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [address]);

  const selectSuggestion = (result) => {
    onChange({ address: result.display_name, lat: Number(result.lat), lng: Number(result.lon) });
    onResolve?.(extractCity(result), result);
    setOpen(false);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = async () => {
    setGeoLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Location access was denied — enable it in your device settings, then try again.");
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = position.coords;

      if (GEOCODING_UNAVAILABLE) {
        onChange({ address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, lat: latitude, lng: longitude });
        setOpen(false);
        return;
      }

      try {
        const url =
          `https://api.locationiq.com/v1/reverse?key=${LOCATIONIQ_TOKEN}&lat=${latitude}&lon=${longitude}` +
          `&format=json&normalizecity=1&addressdetails=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || !data?.display_name) throw new Error("no address");
        onChange({ address: formatReverseAddress(data), lat: latitude, lng: longitude });
        onResolve?.(extractCity(data), data);
      } catch {
        onChange({ address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, lat: latitude, lng: longitude });
      }
      setOpen(false);
    } catch (err) {
      onChange({ ...value, address: value?.address || "" });
      console.warn(err.message);
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={(text) => {
          onChange({ address: text, lat: null, lng: null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textFaint}
      />
      {open && (
        <View style={styles.dropdown}>
          <Pressable style={styles.suggestionRow} onPress={handleUseCurrentLocation} disabled={geoLoading}>
            {geoLoading ? (
              <ActivityIndicator size="small" color={theme.color.accent} />
            ) : (
              <Text style={styles.currentLocation}>📍 Use my current location</Text>
            )}
          </Pressable>
          {loading && <ActivityIndicator size="small" style={{ padding: 8 }} />}
          {suggestions.map((s, i) => (
            <Pressable key={`${s.place_id}-${i}`} style={styles.suggestionRow} onPress={() => selectSuggestion(s)}>
              <Text numberOfLines={2} style={styles.suggestionText}>
                {s.display_name}
              </Text>
            </Pressable>
          ))}
        </View>
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
    fontSize: theme.font.size.md,
    color: theme.color.text,
    backgroundColor: theme.color.surface,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
    maxHeight: 260,
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  suggestionText: { color: theme.color.text, fontSize: theme.font.size.sm },
  currentLocation: { color: theme.color.accent, fontWeight: theme.font.weight.semibold, fontSize: theme.font.size.sm },
});

export default LocationField;
