import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { Muted } from "../../../../src/components/ui/Typography";
import { StatusBadge } from "../../../../src/components/ui/Badge";
import { Button } from "../../../../src/components/ui/Button";
import { DocumentUploadField } from "../../../../src/components/DocumentUploadField";
import { theme } from "../../../../src/theme";
import { getMyVerifications, submitVerification } from "../../../../src/api/verification";
import { useAuth } from "../../../../src/context/AuthContext";

const ROLE_LABEL = { shipper: "Shipper", transporter: "Driver" };

// Driver ("transporter") verification requires an ID proof AND a driving
// licence AND an already-uploaded profile photo — the same requirement
// verificationController.submitVerification enforces server-side, and the
// exact gap the web app's RoleUpload was fixed for earlier (only showing
// one of the two required document slots by default). Pre-seeding both
// slots here from the start avoids repeating that mistake on mobile.
export const VerificationScreen = () => {
  const { role } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idDoc, setIdDoc] = useState(null);
  const [licenseDoc, setLicenseDoc] = useState(null);
  const [otherDoc, setOtherDoc] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyVerifications()
      .then((res) => setRecord((res.verifications || []).find((v) => v.type === role) || null))
      .finally(() => setLoading(false));
  }, [role]);

  const handleSubmit = async () => {
    setError("");
    if (role === "transporter") {
      if (!idDoc?.fileId) {
        setError("Attach an ID proof (Aadhaar or PAN)");
        return;
      }
      if (!licenseDoc?.fileId) {
        setError("Attach a driving licence");
        return;
      }
      if (!user?.profilePhoto) {
        setError("Upload a profile photo in Personal info before submitting driver verification");
        return;
      }
    } else if (!idDoc?.fileId && !otherDoc?.fileId) {
      setError("Attach at least one document");
      return;
    }

    setSubmitting(true);
    try {
      const documents = [];
      if (idDoc?.fileId) documents.push({ docType: "aadhaar", fileId: idDoc.fileId });
      if (licenseDoc?.fileId) documents.push({ docType: "driving_license", fileId: licenseDoc.fileId });
      if (otherDoc?.fileId) documents.push({ docType: "other", fileId: otherDoc.fileId });
      await submitVerification({ type: role, documents });
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <Screen title={`${ROLE_LABEL[role] || role} verification`}>
      <View style={styles.header}>
        <StatusBadge status={record?.status}>{record?.status || "Not submitted"}</StatusBadge>
      </View>

      {record?.status === "rejected" && record?.rejectReason && <Muted>Reason: {record.rejectReason}</Muted>}
      {record?.status === "verified" && <Muted>You’re verified — no action needed.</Muted>}

      {record?.status !== "verified" && (
        <>
          {role === "transporter" ? (
            <>
              <Muted>Driver verification needs an ID proof, a driving licence, and a profile photo (upload it in Personal info).</Muted>
              <DocumentUploadField label="ID proof (Aadhaar or PAN)" doc={idDoc} onUploaded={setIdDoc} required />
              <DocumentUploadField label="Driving licence" doc={licenseDoc} onUploaded={setLicenseDoc} required />
            </>
          ) : (
            <>
              <DocumentUploadField label="ID document" doc={idDoc} onUploaded={setIdDoc} />
              <DocumentUploadField label="Other document" doc={otherDoc} onUploaded={setOtherDoc} />
            </>
          )}

          {error ? <Muted style={styles.error}>{error}</Muted> : null}

          <Button title={record ? "Resubmit for review" : "Submit for review"} onPress={handleSubmit} loading={submitting} fullWidth />
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 8 },
  error: { color: theme.color.danger },
});

export default VerificationScreen;
