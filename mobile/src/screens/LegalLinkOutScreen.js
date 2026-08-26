import { View, Linking, StyleSheet } from "react-native";
import { Screen } from "../components/ui/Screen";
import { PageTitle, Body } from "../components/ui/Typography";
import { Button } from "../components/ui/Button";
import { theme } from "../theme";
import { WEB_URL } from "../utils/webUrl";

// Terms and Privacy are long legal documents that must stay a single source
// of truth — duplicating them natively risks the app and the web page
// silently drifting apart on something that matters legally. Both open the
// live web page instead, same as most apps handle T&Cs.
export const LegalLinkOutScreen = ({ title, path }) => (
  <Screen>
    <View style={styles.wrap}>
      <PageTitle style={styles.title}>{title}</PageTitle>
      <Body style={styles.body}>
        This is a legal document that’s kept up to date on our website — open it there to read the
        current version.
      </Body>
      <Button title={`Open ${title}`} onPress={() => Linking.openURL(`${WEB_URL}${path}`)} fullWidth />
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.space(3), padding: theme.space(6) },
  title: { textAlign: "center" },
  body: { textAlign: "center", color: theme.color.textMuted },
});

export default LegalLinkOutScreen;
