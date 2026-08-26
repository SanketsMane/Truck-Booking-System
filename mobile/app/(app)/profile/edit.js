import { useState } from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../../src/components/ui/Typography";
import { TextField } from "../../../src/components/ui/TextField";
import { Button } from "../../../src/components/ui/Button";
import { theme } from "../../../src/theme";
import { updateProfile } from "../../../src/api/auth";
import { uploadFile } from "../../../src/api/files";
import { useAuth } from "../../../src/context/AuthContext";

export const EditProfileScreen = () => {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [city, setCity] = useState(user?.city || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [photoUrl, setPhotoUrl] = useState(user?.profilePhoto || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const { file } = await uploadFile({ uri: asset.uri, name: asset.fileName || "photo.jpg", type: asset.mimeType || "image/jpeg" }, { isPublic: true });
      setPhotoUrl(file.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await updateProfile({ name: name.trim(), city: city.trim(), mobile: mobile.trim(), profilePhoto: photoUrl });
      setUser(res.user);
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageTitle>Personal info</PageTitle>

      <Button title={uploadingPhoto ? "Uploading…" : "Change photo"} variant="secondary" onPress={handlePickPhoto} disabled={uploadingPhoto} />

      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="City" value={city} onChangeText={setCity} />
      <TextField label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <Button title="Save" onPress={handleSave} loading={saving} fullWidth />
    </Screen>
  );
};

const styles = StyleSheet.create({
  error: { color: theme.color.danger },
});

export default EditProfileScreen;
