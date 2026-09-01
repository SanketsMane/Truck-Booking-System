import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

import openBody from "../../assets/truck-open.png";
import container from "../../assets/truck-container.png";
import flatbed from "../../assets/truck-flatbed.png";
import tanker from "../../assets/truck-tanker.png";
import reefer from "../../assets/truck-reefer.png";

// A picture of the actual kind of vehicle, instead of the same generic box
// icon on every row. In a freight marketplace the body type IS the product —
// a shipper with steel coils needs a flatbed and a shipper with produce needs
// a reefer, and telling them apart at a glance is most of what a results list
// is for.
//
// bodyType is free text (the register form offers presets through a datalist
// but accepts anything typed), so this matches on substrings rather than on
// exact equality — "Closed Container", "container", "20ft Container" and
// "CONTAINER BODY" all have to land on the same picture.
const MATCHERS = [
  { test: /reefer|refrig|cold|chill/i, source: reefer },
  { test: /container|closed|box/i, source: container },
  { test: /flat ?bed|flat/i, source: flatbed },
  { test: /tank/i, source: tanker },
  { test: /open/i, source: openBody },
];

// The open-body truck is the default rather than a question mark: it's by far
// the most common vehicle on Indian highways, so it's the best guess when a
// transporter left the optional body-type field blank, and it still reads as
// "a truck" rather than as an error.
export const truckImageFor = (bodyType) => {
  const value = String(bodyType || "");
  return MATCHERS.find((m) => m.test.test(value))?.source ?? openBody;
};

export const TruckImage = ({ bodyType, size = 56, style, showFallbackIcon = false }) => {
  const source = truckImageFor(bodyType);

  if (showFallbackIcon && !bodyType) {
    return (
      <View style={[styles.wrap, { width: size, height: size * 0.62 }, style]}>
        <Ionicons name="bus-outline" size={size * 0.5} color={theme.color.textFaint} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size * 0.62 }, style]}>
      <Image
        source={source}
        // The artwork is a side profile with its own internal margins, so
        // "contain" keeps every body type at the same apparent scale down a
        // list. "cover" would crop the tanker and the flatbed differently and
        // break the alignment the shared cab gives us.
        style={styles.image}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel={bodyType ? `${bodyType} truck` : "Truck"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
});

export default TruckImage;
