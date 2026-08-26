import { View, Linking, StyleSheet } from "react-native";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, SectionTitle, Body, Muted } from "../../src/components/ui/Typography";
import { Card } from "../../src/components/ui/Card";
import { theme } from "../../src/theme";

// Verbatim (condensed to plain text, no styled markup) from
// frontend/src/pages/About.jsx — same three trust points, same copy.
const TRUST_POINTS = [
  {
    title: "Every account is verified",
    body: "Shippers and transporters both submit KYC documents — Aadhaar, PAN, a driving licence, or a business certificate — reviewed before they can accept or confirm a booking.",
  },
  {
    title: "Status updates, pickup to drop",
    body: "A booking's status is visible in the app the whole way — confirmed, picked up, delivered — no guessing where things stand.",
  },
  {
    title: "100% free to use",
    body: "The platform never touches your money. No commission, no listing fees — agree a price, get the job done, and settle directly with the other party.",
  },
];

export const AboutScreen = () => (
  <Screen>
    <View style={styles.header}>
      <Muted style={styles.tagline}>Your Load. Their Empty Space.</Muted>
      <PageTitle>About TruckGee</PageTitle>
      <Body style={styles.lede}>
        Every day, thousands of trucks travel across India with some unused space — we believe that
        space shouldn’t go to waste. TruckGee connects shippers who need to move goods with
        transporters who already have available capacity on their existing routes. Instead of booking
        an entire truck for a smaller shipment, find a suitable truck already travelling your way and
        use only the space you actually need.
      </Body>
    </View>

    <View style={styles.section}>
      <SectionTitle>How it works</SectionTitle>
      <Card>
        <SectionTitle style={styles.cardTitle}>For shippers</SectionTitle>
        <Body style={styles.bold}>Why pay for an entire truck when you only need part of it?</Body>
        <Body>
          Search a route and date, compare available capacity and price, and book. Once accepted,
          coordinate pickup directly and follow the booking’s status the entire way — you settle
          payment with the transporter however works for you.
        </Body>
      </Card>
      <Card>
        <SectionTitle style={styles.cardTitle}>For transporters</SectionTitle>
        <Body style={styles.bold}>Don’t let empty space travel empty.</Body>
        <Body>
          List a trip with the capacity you have spare, and accept booking requests as they come in.
          Deliver and get paid directly by the shipper — earning from space you were already paying to
          move, with zero commission taken by the platform.
        </Body>
      </Card>
    </View>

    <Card style={styles.visionCard}>
      <SectionTitle>Our vision</SectionTitle>
      <Body style={styles.bold}>A road freight network where empty truck capacity doesn’t go unused.</Body>
      <Body>
        We want to make road transportation more connected, transparent and efficient by turning
        fragmented, unused capacity into an accessible marketplace for businesses of all sizes.
      </Body>
    </Card>

    <View style={styles.section}>
      <SectionTitle>Built to be safe to use</SectionTitle>
      <Body>
        Handing a shipment — or your truck’s spare capacity — to a stranger only works if both sides
        can trust the platform in between. Every part of a booking is built around that:
      </Body>
      {TRUST_POINTS.map((point) => (
        <Card key={point.title}>
          <Body style={styles.bold}>{point.title}</Body>
          <Body>{point.body}</Body>
        </Card>
      ))}
    </View>

    <View style={styles.section}>
      <SectionTitle>Questions?</SectionTitle>
      <Body>
        Read our Help center for how bookings, pricing, and cancellations work, or reach our team
        directly at{" "}
        <Body style={styles.link} onPress={() => Linking.openURL("mailto:support@truckgee.com")}>
          support@truckgee.com
        </Body>
        .
      </Body>
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  header: { gap: theme.space(2) },
  tagline: { color: theme.color.accentStrong, fontWeight: theme.font.weight.bold },
  lede: { fontSize: theme.font.size.lg },
  section: { gap: theme.space(3) },
  cardTitle: { fontSize: theme.font.size.md },
  visionCard: { backgroundColor: theme.color.accentSoft, borderColor: "transparent" },
  bold: { fontWeight: theme.font.weight.bold },
  link: { color: theme.color.accent, fontWeight: theme.font.weight.semibold },
});

export default AboutScreen;
