import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { theme } from "../theme";
import { uploadFile } from "../api/files";

// Camera-or-gallery counterpart to the web's <input type="file"> KYC
// upload rows (MyTrucks.jsx's DocumentUploadField, Profile.jsx's
// RoleUpload) — uploads immediately on pick, same as the web version, and
// hands the parent just {fileId, fileName} once the backend has a
// reference for it. PDF documents aren't supported in this v1 (image
// capture covers the common case of photographing a physical document);
// expo-document-picker would be the fast-follow for a real PDF file.
export const DocumentUploadField = ({ label, doc, onUploaded, required }) => {
  const [uploading, setUploading] = useState(false);

  const pick = async (fromCamera) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const { file } = await uploadFile(
        { uri: asset.uri, name: asset.fileName || "document.jpg", type: asset.mimeType || "image/jpeg" },
        { isPublic: false }
      );
      onUploaded({ fileId: file.id, fileName: asset.fileName || "document.jpg" });
    } catch (err) {
      console.warn(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? "" : " (optional)"}
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => pick(true)} disabled={uploading}>
          <Text style={styles.buttonText}>Camera</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => pick(false)} disabled={uploading}>
          <Text style={styles.buttonText}>Gallery</Text>
        </Pressable>
        {uploading && <ActivityIndicator size="small" color={theme.color.accent} />}
        {doc?.fileId && !uploading && <Text style={styles.uploaded}>✓ {doc.fileName}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: theme.font.size.sm, fontWeight: theme.font.weight.medium, color: theme.color.text },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  buttonText: { fontSize: theme.font.size.sm, color: theme.color.text },
  uploaded: { fontSize: theme.font.size.xs, color: theme.color.success },
});

export default DocumentUploadField;
