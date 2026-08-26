import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { TextField } from "../../../src/components/ui/TextField";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { DocumentUploadField } from "../../../src/components/DocumentUploadField";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { listMyTrucks, addTruckDocuments, raiseTruckDeleteRequest } from "../../../src/api/trucks";
import { formatTons } from "../../../src/utils/format";

export const TruckDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resubmitDoc, setResubmitDoc] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    listMyTrucks()
      .then((res) => setTruck((res.trucks || []).find((t) => t._id === id) || null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleResubmit = async () => {
    if (!resubmitDoc?.fileId) {
      setMessage("Choose a document to resubmit");
      return;
    }
    setBusy(true);
    try {
      await addTruckDocuments(id, [{ docType: "rc", fileId: resubmitDoc.fileId }]);
      setMessage("Documents resubmitted for review");
      setResubmitDoc(null);
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRequestDelete = async () => {
    if (!deleteReason.trim()) {
      setMessage("Give a reason for deletion");
      return;
    }
    setBusy(true);
    try {
      await raiseTruckDeleteRequest(id, deleteReason.trim());
      setMessage("Deletion request submitted — an admin will review it");
      setShowDelete(false);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingView />;
  if (!truck) return <Screen><Muted>Truck not found</Muted></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>{truck.regNumber}</PageTitle>
        <StatusBadge status={truck.status} />
      </View>

      <Card>
        <Muted>
          {truck.truckType}
          {truck.bodyType ? ` · ${truck.bodyType}` : ""} · {formatTons(truck.totalCapacity)}
        </Muted>
        <StatusBadge status={truck.lifecycle} />
      </Card>

      {truck.status === "rejected" && (
        <Card>
          <SectionTitle>Rejected</SectionTitle>
          <Muted>{truck.rejectReason || "No reason given"}</Muted>
          <DocumentUploadField label="Resubmit RC" doc={resubmitDoc} onUploaded={setResubmitDoc} required />
          <Button title="Resubmit for review" onPress={handleResubmit} loading={busy} fullWidth />
        </Card>
      )}

      {truck.documents?.length > 0 && (
        <Card>
          <SectionTitle>Documents</SectionTitle>
          {truck.documents.map((doc, i) => (
            <Muted key={i}>{doc.docType.toUpperCase()}</Muted>
          ))}
        </Card>
      )}

      {message ? <Muted style={styles.message}>{message}</Muted> : null}

      {!showDelete ? (
        <Button title="Request deletion" variant="danger" onPress={() => setShowDelete(true)} fullWidth />
      ) : (
        <Card>
          <SectionTitle>Request truck deletion</SectionTitle>
          <Muted>This sends a request to our team — the truck stays registered until approved.</Muted>
          <TextField label="Reason" value={deleteReason} onChangeText={setDeleteReason} placeholder="e.g. Selling the vehicle" />
          <Button title="Submit request" variant="danger" onPress={handleRequestDelete} loading={busy} fullWidth />
          <Button title="Cancel" variant="ghost" onPress={() => setShowDelete(false)} fullWidth />
        </Card>
      )}

      <Button title="Back to My Truck" variant="ghost" onPress={() => router.replace("/(app)/trucks")} fullWidth />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 8 },
  message: { color: theme.color.accent },
});

export default TruckDetailScreen;
