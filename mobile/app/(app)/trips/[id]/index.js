import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../../src/components/ui/Screen";
import {
  PageTitle,
  Body,
  BodyStrong,
  Muted,
  Caption,
  Label,
  Overline,
  Amount,
} from "../../../../src/components/ui/Typography";
import { Card, Section } from "../../../../src/components/ui/Card";
import { Button } from "../../../../src/components/ui/Button";
import { TextField } from "../../../../src/components/ui/TextField";
import { StatusBadge } from "../../../../src/components/ui/Badge";
import { Skeleton } from "../../../../src/components/ui/Skeleton";
import { ErrorState } from "../../../../src/components/ui/ErrorState";
import { TruckImage } from "../../../../src/components/TruckImage";
import { theme } from "../../../../src/theme";
import { getTrip } from "../../../../src/api/trips";
import { createBooking } from "../../../../src/api/bookings";
import { formatINR, formatTons, formatDateTime, ratingLabel } from "../../../../src/utils/format";
import { useAuth } from "../../../../src/context/AuthContext";

// One stop on the route timeline. The rail (dot + connecting line) is what
// makes a list of addresses read as a journey with a direction, rather than
// as four unrelated label/value rows — which is what this screen had, and why
// the intermediate stops were impossible to distinguish from the endpoints.
const RoutePoint = ({ label, address, time, variant, last }) => (
  <View style={styles.pointRow}>
    <View style={styles.rail}>
      <View
        style={[
          styles.dot,
          variant === "stop" && styles.dotStop,
          variant === "drop" && styles.dotDrop,
        ]}
      />
      {!last && <View style={styles.railLine} />}
    </View>
    <View style={styles.pointBody}>
      <Overline>{label}</Overline>
      <Body>{address || "—"}</Body>
      {time ? <Caption>{time}</Caption> : null}
    </View>
  </View>
);

export const TripDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [capacity, setCapacity] = useState("");
  const [goodsDescription, setGoodsDescription] = useState("");
  const [handlingNotes, setHandlingNotes] = useState("");
  // Per-field, not one blob at the bottom of the form — an error attached to
  // the field it's about is the difference between "fix this" and "something
  // is wrong somewhere above".
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTrip(id)
      .then((res) => {
        if (cancelled) return;
        setTrip(res.trip);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const retry = () => {
    setLoadError("");
    setStatus("loading");
    setReloadToken((t) => t + 1);
  };

  if (status === "loading") {
    return (
      <Screen title="">
        <Skeleton height={theme.spacing.xxl} radius={theme.radius.sm} width="70%" />
        <Skeleton height={140} radius={theme.radius.card} />
        <Skeleton height={180} radius={theme.radius.card} />
      </Screen>
    );
  }

  if (status === "error" || !trip) {
    return (
      <Screen title="">
        <ErrorState title="Couldn't load this trip" message={loadError} onRetry={retry} />
      </Screen>
    );
  }

  // visibleAvailableCapacity subtracts tonnage already held by other
  // shippers' pending requests. availableCapacity does not, so showing it
  // would advertise capacity that may already be spoken for.
  const available = trip.visibleAvailableCapacity ?? trip.availableCapacity;
  const isBookable = trip.status === "published";
  const canBook = isBookable && user?.roles?.includes("shipper");
  // Viewing a trip is public (matches the web app) — only requesting to book
  // needs an account, so a logged-out visitor gets a prompt rather than the
  // trip being gated entirely.
  const needsLoginToBook = isBookable && !user;

  const requestedTons = Number(capacity);
  const validTons = Number.isFinite(requestedTons) && requestedTons > 0;
  // The number the shipper actually cares about, which they previously had to
  // work out themselves from "₹1,200/ton" and the tonnage they typed.
  const estimatedTotal = validTons ? requestedTons * trip.pricePerTon : null;

  const validate = () => {
    const next = {};
    if (!validTons) next.capacity = "Enter how many tons you need";
    else if (requestedTons > available) next.capacity = `Only ${formatTons(available)} available on this trip`;
    if (!goodsDescription.trim()) next.goods = "Describe what you're shipping";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleBook = async () => {
    if (!validate()) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await createBooking({
        tripId: id,
        capacityRequested: requestedTons,
        goodsDescription: goodsDescription.trim(),
        handlingNotes: handlingNotes.trim() || undefined,
        pickupPoint: trip.pickupPoint,
      });
      router.replace(`/(app)/bookings/${res.booking._id}`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // The CTA lives in a sticky footer so it's reachable from anywhere on the
  // page. It used to sit at the very bottom, below three cards of detail —
  // the shipper had to scroll past everything to find the one thing they came
  // to do.
  const footer = canBook ? (
    <>
      <View style={styles.footerSummary}>
        <View>
          <Caption>{validTons ? `${formatTons(requestedTons)} × ${formatINR(trip.pricePerTon)}` : "Estimated total"}</Caption>
          <Amount size="md">{estimatedTotal != null ? formatINR(estimatedTotal) : "—"}</Amount>
        </View>
        <Caption style={styles.footerNote}>Transporter confirms before anything is due</Caption>
      </View>
      <Button title="Request to book" size="lg" onPress={handleBook} loading={submitting} fullWidth />
    </>
  ) : needsLoginToBook ? (
    <Button title="Log in to book" size="lg" onPress={() => router.push("/(auth)/login")} fullWidth />
  ) : null;

  return (
    <Screen footer={footer} title="">
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <PageTitle numberOfLines={2} style={styles.headerTitle}>
            {trip.fromCity} → {trip.toCity}
          </PageTitle>
          <StatusBadge status={trip.status} />
        </View>
        <View style={styles.priceRow}>
          <Amount size="lg" tone="default">
            {formatINR(trip.pricePerTon)}
          </Amount>
          <Muted>per ton · {formatTons(available)} free</Muted>
        </View>
      </View>

      <Card>
        <RoutePoint
          label="Pickup"
          address={trip.pickupPoint?.address}
          time={`Departs ${formatDateTime(trip.departureAt)}`}
          variant="pickup"
        />
        {(trip.stops || []).map((stop, i) => (
          <RoutePoint key={`${stop.address}-${i}`} label={`Stop ${i + 1}`} address={stop.address} variant="stop" />
        ))}
        <RoutePoint
          label="Drop"
          address={trip.dropPoint?.address}
          time={trip.estimatedArrivalAt ? `Arrives ~${formatDateTime(trip.estimatedArrivalAt)}` : null}
          variant="drop"
          last
        />
      </Card>

      <Section title="Truck & transporter">
        <Card variant="flat">
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <TruckImage bodyType={trip.truck?.bodyType} size={72} />
              <View style={styles.metaText}>
                <BodyStrong>{trip.truck?.regNumber || "Truck"}</BodyStrong>
                <Caption>
                  {trip.truck?.truckType}
                  {trip.truck?.bodyType ? ` · ${trip.truck.bodyType}` : ""}
                </Caption>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="person-circle-outline" size={theme.layout.icon.lg} color={theme.color.textFaint} />
              <View style={styles.metaText}>
                <BodyStrong numberOfLines={1}>{trip.transporter?.name || "Transporter"}</BodyStrong>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={theme.layout.icon.xs} color={theme.color.warning} />
                  <Caption>{ratingLabel(trip.transporter?.ratingAvg, trip.transporter?.ratingCount)}</Caption>
                </View>
              </View>
            </View>
            {trip.transporterVerified && <StatusBadge status="verified">Verified</StatusBadge>}
          </View>
        </Card>
      </Section>

      {canBook && (
        <Section title="Your shipment" subtitle="The transporter reviews this before confirming.">
          <Card variant="flat">
            <TextField
              label="Capacity needed (tons)"
              value={capacity}
              onChangeText={(v) => {
                setCapacity(v);
                if (errors.capacity) setErrors((e) => ({ ...e, capacity: undefined }));
              }}
              keyboardType="numeric"
              placeholder="e.g. 5"
            />
            {errors.capacity ? <Caption style={styles.error}>{errors.capacity}</Caption> : null}

            <TextField
              label="Goods description"
              value={goodsDescription}
              onChangeText={(v) => {
                setGoodsDescription(v);
                if (errors.goods) setErrors((e) => ({ ...e, goods: undefined }));
              }}
              placeholder="e.g. Textile bales"
            />
            {errors.goods ? <Caption style={styles.error}>{errors.goods}</Caption> : null}

            <TextField
              label="Handling notes (optional)"
              value={handlingNotes}
              onChangeText={setHandlingNotes}
              placeholder="Fragile, needs a tail lift, etc."
            />
            {submitError ? <Caption style={styles.error}>{submitError}</Caption> : null}
          </Card>
        </Section>
      )}

      {needsLoginToBook && (
        <Section title="Want to book this trip?">
          <Muted>Log in or create a free account to send a booking request.</Muted>
        </Section>
      )}

      {!isBookable && (
        <Section>
          <Card variant="flat">
            <Label>This trip is {trip.status} and isn&apos;t accepting bookings.</Label>
          </Card>
        </Section>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: theme.spacing.sm },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.smd },
  headerTitle: { flex: 1 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: theme.spacing.sm },

  pointRow: { flexDirection: "row", gap: theme.spacing.smd },
  rail: { alignItems: "center", width: theme.layout.icon.md },
  dot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
    marginTop: 6,
    backgroundColor: theme.color.accent,
  },
  // A stop is somewhere the truck passes THROUGH, not an end of the run — a
  // hollow dot says that at a glance, where a third solid colour would just
  // read as a third kind of endpoint.
  dotStop: { backgroundColor: theme.color.surface, borderWidth: 2, borderColor: theme.color.accent },
  dotDrop: { backgroundColor: theme.color.text },
  railLine: { flex: 1, width: 2, minHeight: theme.spacing.lg, backgroundColor: theme.color.border, marginVertical: 2 },
  pointBody: { flex: 1, paddingBottom: theme.spacing.smd, gap: theme.spacing.xxs },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: theme.spacing.smd, flex: 1 },
  metaText: { flex: 1, gap: theme.spacing.xxs },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  divider: { height: theme.layout.hairline, backgroundColor: theme.color.border },

  footerSummary: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: theme.spacing.sm },
  footerNote: { flex: 1, textAlign: "right" },

  error: { color: theme.color.danger },
});

export default TripDetailScreen;
