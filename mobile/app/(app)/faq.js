import { View, StyleSheet } from "react-native";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Body } from "../../src/components/ui/Typography";
import { FaqAccordion } from "../../src/components/FaqAccordion";
import { FAQ_CATEGORIES } from "../../src/content/faq";
import { theme } from "../../src/theme";

// Same FAQ_CATEGORIES data as help.js, on its own route — mirrors the web
// app, where Help.jsx and Faq.jsx are two thin pages over one dataset.
export const FaqScreen = () => (
  <Screen>
    <View style={styles.header}>
      <PageTitle>Frequently Asked Questions</PageTitle>
      <Body>Answers to the most common questions from shippers and transporters using TruckGee.</Body>
    </View>

    <FaqAccordion categories={FAQ_CATEGORIES} />

    <View style={styles.footer}>
      <Body style={styles.bold}>Still have questions?</Body>
      <Body>
        Have an issue with a specific booking? Raise it from that booking’s detail page. For anything
        else, reach our team directly through Support.
      </Body>
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  header: { gap: theme.space(2) },
  footer: { gap: theme.space(1) },
  bold: { fontWeight: theme.font.weight.semibold },
});

export default FaqScreen;
