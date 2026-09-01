import { useCallback, useState } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { listSessions, revokeSession } from "../../../src/api/auth";
import { getDevice } from "../../../src/utils/deviceInfo";
import { formatDateTime } from "../../../src/utils/format";

export const ManageDevicesScreen = () => {
  const [sessions, setSessions] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listSessions(), getDevice()])
      .then(([res, device]) => {
        setSessions(res.sessions || []);
        setCurrentDeviceId(device.deviceId);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRevoke = (session) => {
    Alert.alert("Log out this device?", "This device will need to log in again to use TruckGee.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setRevokingId(session._id);
          try {
            await revokeSession(session._id);
            setSessions((prev) => prev.filter((s) => s._id !== session._id));
          } catch (err) {
            Alert.alert("Couldn't log out that device", err.message);
          } finally {
            setRevokingId(null);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingView />;

  return (
    <Screen title="Devices">
      <View style={styles.header}>
        <Muted>Everywhere you’re currently signed in to TruckGee.</Muted>
      </View>

      {sessions.length === 0 ? (
        <EmptyState>No active sessions.</EmptyState>
      ) : (
        <View style={styles.list}>
          {sessions.map((session) => {
            const isCurrent = session.deviceId === currentDeviceId;
            return (
              <Card key={session._id}>
                <View style={styles.rowBetween}>
                  <Body style={styles.bold}>{session.deviceInfo || session.platform || "Device"}</Body>
                  {isCurrent && <StatusBadge status="success">This device</StatusBadge>}
                </View>
                <Muted>Signed in {formatDateTime(session.createdAt)}</Muted>
                {!isCurrent && (
                  <Button
                    title="Log out"
                    variant="danger"
                    onPress={() => handleRevoke(session)}
                    loading={revokingId === session._id}
                  />
                )}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4 },
  list: { gap: theme.space(3) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bold: { fontWeight: theme.font.weight.semibold },
});

export default ManageDevicesScreen;
