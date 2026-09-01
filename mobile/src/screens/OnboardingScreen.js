import { useRef, useState } from "react";
import { View, Text, Image, ScrollView, Dimensions, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Button } from "../components/ui/Button";

import slide1 from "../../assets/onboard-1.png";
import slide2 from "../../assets/onboard-2.png";
import slide3 from "../../assets/onboard-3.png";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    art: slide1,
    title: "Ship for less",
    body: "Search spare truck capacity on routes across India, matched by route — no commission, book directly with the driver.",
  },
  {
    art: slide2,
    title: "Earn from empty space",
    body: "Got a truck with room to spare? Post your route and capacity, and get booking requests from real shippers.",
  },
  {
    art: slide3,
    title: "Verified & secure",
    // "their one active truck" described a rule the app no longer has — a
    // transporter can now run a whole verified fleet.
    body: "Every driver is KYC-verified — ID, driving licence and vehicle papers — before they can post a trip.",
  },
];

// Shown once, ever (see useOnboarding) — rendered directly by RootLayout,
// same non-route pattern as UpdateRequiredScreen, since it's a gate the
// user passes through exactly once rather than a screen they navigate
// back to.
export const OnboardingScreen = ({ onDone }) => {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const isLast = index === SLIDES.length - 1;

  const handleScroll = (e) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const goNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.skip} onPress={onDone}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            {/* Decorative — the title and body say the same thing, so a
                screen reader shouldn't announce it twice. */}
            <Image
              source={slide.art}
              style={styles.art}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button title={isLast ? "Get started" : "Next"} onPress={goNext} fullWidth />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  skip: { alignSelf: "flex-end", padding: theme.space(4) },
  skipText: { color: theme.color.textMuted, fontSize: theme.font.size.sm },
  slide: {
    paddingHorizontal: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.smd,
  },
  art: { width: 260, height: 260, marginBottom: theme.spacing.sm },
  title: { ...theme.text.headline, color: theme.color.text, textAlign: "center" },
  body: { ...theme.text.body, color: theme.color.textMuted, textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.border },
  dotActive: { backgroundColor: theme.color.accent, width: 20 },
  footer: { padding: theme.space(4) },
});

export default OnboardingScreen;
