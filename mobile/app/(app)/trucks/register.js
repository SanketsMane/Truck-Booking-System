import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../../src/components/ui/Typography";
import { TextField } from "../../../src/components/ui/TextField";
import { Button } from "../../../src/components/ui/Button";
import { DocumentUploadField } from "../../../src/components/DocumentUploadField";
import { theme } from "../../../src/theme";
import { registerTruck } from "../../../src/api/trucks";

export const RegisterTruckScreen = () => {
  const router = useRouter();
  const [regNumber, setRegNumber] = useState("");
  const [truckType, setTruckType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [totalCapacity, setTotalCapacity] = useState("");
  const [rc, setRc] = useState(null);
  const [insurance, setInsurance] = useState(null);
  const [permit, setPermit] = useState(null);
  const [authorizedToList, setAuthorizedToList] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!regNumber.trim() || !truckType.trim() || !totalCapacity || !rc?.fileId) {
      setError("Fill in registration number, type, capacity, and upload the RC");
      return;
    }
    if (!authorizedToList) {
      setError("Confirm you're authorized to use and list this vehicle");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const documents = [{ docType: "rc", fileId: rc.fileId }];
      if (insurance?.fileId) documents.push({ docType: "insurance", fileId: insurance.fileId });
      if (permit?.fileId) documents.push({ docType: "permit", fileId: permit.fileId });

      await registerTruck({
        regNumber: regNumber.trim().toUpperCase().replace(/[\s-]/g, ""),
        truckType: truckType.trim(),
        bodyType: bodyType.trim(),
        totalCapacity: Number(totalCapacity),
        documents,
        authorizedToList: true,
      });
      router.replace("/(app)/trucks");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <PageTitle>Register a truck</PageTitle>

      <TextField label="Registration number" value={regNumber} onChangeText={setRegNumber} autoCapitalize="characters" placeholder="e.g. MH12AB1234" />
      <TextField label="Truck type" value={truckType} onChangeText={setTruckType} placeholder="e.g. 20ft" />
      <TextField label="Body type (optional)" value={bodyType} onChangeText={setBodyType} placeholder="e.g. Open" />
      <TextField label="Total capacity (tons)" value={totalCapacity} onChangeText={setTotalCapacity} keyboardType="numeric" placeholder="e.g. 9" />

      <DocumentUploadField label="RC (Registration Certificate)" doc={rc} onUploaded={setRc} required />
      <DocumentUploadField label="Insurance" doc={insurance} onUploaded={setInsurance} />
      <DocumentUploadField label="Permit" doc={permit} onUploaded={setPermit} />

      <Pressable style={styles.consentRow} onPress={() => setAuthorizedToList((v) => !v)}>
        <View style={[styles.checkbox, authorizedToList && styles.checkboxOn]} />
        <Text style={styles.consentText}>
          I confirm that I am authorized to use and list this vehicle on TruckGee — the RC owner doesn’t have to be
          me, but I have permission to operate and post trips for it.
        </Text>
      </Pressable>

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <Button title="Register truck" onPress={handleSubmit} loading={submitting} fullWidth />
    </Screen>
  );
};

const styles = StyleSheet.create({
  consentRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: theme.color.border, marginTop: 2 },
  checkboxOn: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  consentText: { flex: 1, fontSize: theme.font.size.sm, color: theme.color.textMuted },
  error: { color: theme.color.danger },
});

export default RegisterTruckScreen;
