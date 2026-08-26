import { View, StyleSheet } from "react-native";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Body } from "../../src/components/ui/Typography";
import { FaqAccordion } from "../../src/components/FaqAccordion";
import { FAQ_CATEGORIES } from "../../src/content/faq";
import { theme } from "../../src/theme";

export const HelpScreen = () => (
  <Screen>
    <View style={styles.header}>
      <PageTitle>Help center</PageTitle>
      <Body>
        Search a route to find spare truck capacity, or post a trip if you’re a transporter with
        space to sell. Answers to the most common questions are below.
      </Body>
    </View>

    <FaqAccordion categories={FAQ_CATEGORIES} />

    <View style={styles.footer}>
      <Body style={styles.bold}>Still stuck?</Body>
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

export default HelpScreen;
