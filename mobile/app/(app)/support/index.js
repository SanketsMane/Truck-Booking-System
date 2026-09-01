import { useCallback, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { StatusBadge } from "../../../src/components/ui/Badge";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../src/components/ui/LoadingView";
import { theme } from "../../../src/theme";
import { listMySupportRequests } from "../../../src/api/support";
import { formatDateTime } from "../../../src/utils/format";

export const SupportScreen = () => {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listMySupportRequests()
      .then((res) => setRequests(res.requests || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen scroll={false} title="Support">
      <View style={styles.header}>
        <Button title="New request" onPress={() => router.push("/(app)/support/new")} />
      </View>

      {loading ? (
        <LoadingView />
      ) : requests.length === 0 ? (
        <EmptyState>No support requests yet.</EmptyState>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowBetween}>
                <Body>{item.subject}</Body>
                <StatusBadge status={item.status} />
              </View>
              <Muted>{item.message}</Muted>
              <Muted>{formatDateTime(item.createdAt)}</Muted>
            </Card>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: theme.space(4), paddingBottom: 0 },
  list: { padding: theme.space(4), gap: theme.space(3) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

export default SupportScreen;
