import { useCallback, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { Body, Muted } from "../../src/components/ui/Typography";
import { Card } from "../../src/components/ui/Card";
import { StatusBadge } from "../../src/components/ui/Badge";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { theme } from "../../src/theme";
import { listMyDisputes } from "../../src/api/disputes";
import { formatDateTime } from "../../src/utils/format";

// Read-only, mirrors frontend/src/pages/Disputes.jsx — raising a dispute
// happens from Booking Detail on a completed booking, not from here.
export const DisputesScreen = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listMyDisputes()
      .then((res) => setDisputes(res.disputes || []))
      .catch(() => setDisputes([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen scroll={false} title="Disputes">
      <View style={styles.header}>
      </View>

      {loading ? (
        <LoadingView />
      ) : disputes.length === 0 ? (
        <EmptyState>No disputes.</EmptyState>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowBetween}>
                <Body>{item.category}</Body>
                <StatusBadge status={item.status} />
              </View>
              <Muted>{item.description}</Muted>
              <Muted>{formatDateTime(item.createdAt)}</Muted>
            </Card>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { padding: theme.space(4), paddingBottom: 0 },
  list: { padding: theme.space(4), gap: theme.space(3) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});

export default DisputesScreen;
