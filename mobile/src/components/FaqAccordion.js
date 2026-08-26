import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { SectionTitle, Body } from "./ui/Typography";
import { Card } from "./ui/Card";

const FaqItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <Card style={styles.item}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.question}>
        <Body style={styles.questionText}>{item.question}</Body>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={theme.color.textFaint} />
      </Pressable>
      {open && <Body style={styles.answer}>{item.answer}</Body>}
    </Card>
  );
};

// Shared by the Help and FAQ screens — same FAQ_CATEGORIES data rendered
// two places, matching the web app's Help.jsx/Faq.jsx, which are also two
// thin pages over one shared dataset.
export const FaqAccordion = ({ categories }) => (
  <View style={styles.wrap}>
    {categories.map((cat) => (
      <View key={cat.category} style={styles.category}>
        <SectionTitle>{cat.category}</SectionTitle>
        <View style={styles.items}>
          {cat.items.map((item) => (
            <FaqItem key={item.id} item={item} />
          ))}
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: theme.space(6) },
  category: { gap: theme.space(3) },
  items: { gap: theme.space(2) },
  item: { padding: theme.space(3), gap: theme.space(2) },
  question: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.space(2) },
  questionText: { flex: 1, fontWeight: theme.font.weight.semibold },
  answer: { color: theme.color.textMuted },
});

export default FaqAccordion;
