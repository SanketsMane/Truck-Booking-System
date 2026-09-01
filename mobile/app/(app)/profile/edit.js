import { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/components/ui/Screen";
import { Caption, Muted } from "../../../src/components/ui/Typography";
import { TextField } from "../../../src/components/ui/TextField";
import { Button } from "../../../src/components/ui/Button";
import { Avatar } from "../../../src/components/ui/Avatar";
import { theme } from "../../../src/theme";
import { updateProfile } from "../../../src/api/auth";
import { uploadFile } from "../../../src/api/files";
import { useAuth } from "../../../src/context/AuthContext";

// The backend enforces a 10-digit Indian mobile (MOBILE_PATTERN in
// config/marketplaceConfig.js). Checking it here means the user finds out
// while they're still looking at the field, instead of after a round trip
// that returns a server error with no indication of which field caused it.
const MOBILE_RE = /^[6-9]\d{9}$/;

export const EditProfileScreen = () => {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [city, setCity] = useState(user?.city || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [photoUrl, setPhotoUrl] = useState(user?.profilePhoto || "");

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  // Save stays disabled until something has actually changed. A permanently
  // enabled Save on an untouched form invites a pointless write and gives no
  // signal about whether there's anything to save.
  const dirty =
    name.trim() !== (user?.name || "") ||
    city.trim() !== (user?.city || "") ||
    mobile.trim() !== (user?.mobile || "") ||
    photoUrl !== (user?.profilePhoto || "");

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      // The OS won't ask a second time, so "denied" on its own strands them.
      setSubmitError("Photo access is off. Turn it on for TruckGee in your device settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);
    setSubmitError("");
    try {
      const { file } = await uploadFile(
        { uri: asset.uri, name: asset.fileName || "photo.jpg", type: asset.mimeType || "image/jpeg" },
        { isPublic: true }
      );
      setPhotoUrl(file.url);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Enter your name";
    // Optional field, but if it's filled it has to be valid.
    if (mobile.trim() && !MOBILE_RE.test(mobile.trim())) {
      next.mobile = "Enter a 10-digit Indian mobile number";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitError("");
    setSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        city: city.trim(),
        mobile: mobile.trim(),
        profilePhoto: photoUrl,
      });
      setUser(res.user);
      router.back();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Personal info"
      footer={
        <Button title="Save changes" size="lg" onPress={handleSave} loading={saving} disabled={!dirty} fullWidth />
      }
    >
      {/* The photo itself is the control. Before, the current photo wasn't
          shown at all — just a "Change photo" button — so you couldn't see
          what you had, or tell whether an upload had worked. */}
      <View style={styles.photoBlock}>
        <Pressable
          onPress={handlePickPhoto}
          disabled={uploadingPhoto}
          style={styles.photoPress}
          accessibilityRole="button"
          accessibilityLabel={photoUrl ? "Change profile photo" : "Add a profile photo"}
        >
          <Avatar name={name || user?.name} photo={photoUrl} size={96} />
          <View style={styles.photoBadge}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={theme.color.onAccent} />
            ) : (
              <Ionicons name="camera" size={theme.layout.icon.sm} color={theme.color.onAccent} />
            )}
          </View>
        </Pressable>
        <Caption>{uploadingPhoto ? "Uploading…" : "Tap to change your photo"}</Caption>
      </View>

      <TextField
        label="Name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
        }}
        error={errors.name}
        placeholder="Your full name"
        autoCapitalize="words"
        autoComplete="name"
      />

      <TextField
        label="City"
        value={city}
        onChangeText={setCity}
        placeholder="e.g. Pune"
        autoCapitalize="words"
        help="Shown to the other party on a booking."
      />

      <TextField
        label="Mobile"
        value={mobile}
        onChangeText={(v) => {
          // Digits only: the field is prefixed with +91 and the API stores the
          // bare ten digits, so anything else is a typo waiting to be rejected.
          setMobile(v.replace(/\D/g, "").slice(0, 10));
          if (errors.mobile) setErrors((e) => ({ ...e, mobile: undefined }));
        }}
        error={errors.mobile}
        prefix="+91"
        keyboardType="number-pad"
        placeholder="9876543210"
        autoComplete="tel"
        maxLength={10}
        help="Used for booking updates and OTP."
      />

      {submitError ? <Muted style={styles.error}>{submitError}</Muted> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  photoBlock: { alignItems: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  photoPress: { position: "relative" },
  photoBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.accent,
    borderWidth: 2,
    borderColor: theme.color.bg,
  },
  error: { color: theme.color.danger },
});

export default EditProfileScreen;
