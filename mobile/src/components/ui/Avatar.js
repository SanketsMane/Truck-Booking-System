import { useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { BASE_URL } from "../../api/client";

// Initials from a display name: "Sanket Patil" -> "SP", "Sanket" -> "S".
// Deliberately not a generic person glyph — a name the user recognises as
// their own does more for an account screen than another grey silhouette.
const initialsOf = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Profile photos are uploaded with isPublic:true (see profile/edit.js), so a
// plain URL renders without the authenticated blob fetch the web app needs
// for private KYC documents.
export const Avatar = ({ name, photo, size = 56, style }) => {
  // A broken or deleted file shouldn't leave a grey box where a face was —
  // falling back to initials keeps the screen looking deliberate.
  const [failed, setFailed] = useState(false);
  const showPhoto = photo && !failed;

  return (
    <View
      style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, style]}
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s photo` : "Profile photo"}
    >
      {showPhoto ? (
        <Image
          source={{ uri: photo.startsWith("http") ? photo : `${BASE_URL}${photo}` }}
          style={styles.image}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: theme.color.accentSoft,
  },
  image: { width: "100%", height: "100%" },
  initials: { color: theme.color.accentStrong, fontWeight: theme.font.weight.bold },
});

export default Avatar;
