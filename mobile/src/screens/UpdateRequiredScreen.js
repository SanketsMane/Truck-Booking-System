import { View, StyleSheet, Linking, Platform } from "react-native";
import { theme } from "../theme";
import { PageTitle, Body } from "../components/ui/Typography";
import { Button } from "../components/ui/Button";

const STORE_URLS = {
  ios: "https://apps.apple.com/app/truckgee",
  android: "https://play.google.com/store/apps/details?id=com.truckgee.app",
};

// Rendered directly by RootLayout (not a routed screen) whenever
// useMobileConfigGate finds forceUpdate+below-minimum-version or
// maintenanceMode — blocking here, before the auth check even runs, means
// an unsupported app never gets as far as a confusing unrelated failure.
export const UpdateRequiredScreen = ({ reason }) => {
  const isMaintenance = reason === "maintenance";

  return (
    <View style={styles.wrap}>
      <PageTitle style={styles.title}>{isMaintenance ? "Down for maintenance" : "Update required"}</PageTitle>
      <Body style={styles.body}>
        {isMaintenance
          ? "TruckGee is briefly offline for scheduled maintenance. Please check back shortly."
          : "This version of TruckGee is no longer supported. Update to the latest version to continue."}
      </Body>
      {!isMaintenance && (
        <Button title="Update now" onPress={() => Linking.openURL(STORE_URLS[Platform.OS] || STORE_URLS.android)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space(6),
    gap: theme.space(3),
    backgroundColor: theme.color.bg,
  },
  title: {
    textAlign: "center",
  },
  body: {
    textAlign: "center",
    color: theme.color.textMuted,
  },
});

export default UpdateRequiredScreen;
