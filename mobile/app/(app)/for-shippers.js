import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../src/components/ui/Typography";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { theme } from "../../src/theme";

// Verbatim from frontend/src/pages/ForShippers.jsx's REASONS — numbering
// matches that source; only claims the product actually backs are made.
const REASONS = [
  {
    title: "Lower Transport Cost",
    body: "Use available space on trucks already travelling your route. Pay for the capacity you need instead of arranging a full truck when you don't need one.",
  },
  {
    title: "Find Capacity Already on the Road",
    body: "Discover spare truck capacity on existing routes and match your shipment with a vehicle already heading in the right direction.",
  },
  {
    title: "Route-Based Matching",
    body: "Match pickup and drop locations with trucks travelling along the same route, including suitable points in between.",
  },
  {
    title: "Connect Directly with Transporters",
    body: "Connect with verified transporters, discuss shipment details and agree on the price directly. TruckGee does not take a commission.",
  },
  {
    title: "Simple & Transparent",
    body: "See available capacity and booking status clearly, without unnecessary platform charges or hidden commissions.",
  },
];

export const ForShippersScreen = () => {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.header}>
        <Muted style={styles.tagline}>For Shippers</Muted>
        <PageTitle>Why TruckGee?</PageTitle>
        <Body style={styles.lede}>Use the space that’s already going your way.</Body>
      </View>

      <View style={styles.reasons}>
        {REASONS.map((reason, i) => (
          <Card key={reason.title}>
            <Muted>{String(i + 1).padStart(2, "0")}</Muted>
            <SectionTitle style={styles.reasonTitle}>{reason.title}</SectionTitle>
            <Body>{reason.body}</Body>
          </Card>
        ))}
      </View>

      <Card style={styles.cta}>
        <Body style={styles.ctaHeadline}>Why book a whole truck when you only need the space?</Body>
        <Button title="Search trucks on your route" onPress={() => router.push("/(app)")} fullWidth />
      </Card>

      <View style={styles.section}>
        <SectionTitle>Questions?</SectionTitle>
        <Body>See how booking actually works in our FAQ, or reach out via Support.</Body>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: theme.space(2) },
  tagline: { color: theme.color.accentStrong, fontWeight: theme.font.weight.bold },
  lede: { fontSize: theme.font.size.lg },
  reasons: { gap: theme.space(3) },
  reasonTitle: { fontSize: theme.font.size.md },
  cta: { alignItems: "center", gap: theme.space(3), backgroundColor: theme.color.accentSoft, borderColor: "transparent", padding: theme.space(5) },
  ctaHeadline: { textAlign: "center", fontWeight: theme.font.weight.bold, fontSize: theme.font.size.lg },
  section: { gap: theme.space(2) },
});

export default ForShippersScreen;
