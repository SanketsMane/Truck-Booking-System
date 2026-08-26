import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../src/components/ui/Typography";
import { TextField } from "../../src/components/ui/TextField";
import { Button } from "../../src/components/ui/Button";
import { theme } from "../../src/theme";
import { forgotPassword } from "../../src/api/auth";

// Reset itself happens via the emailed link, which opens the web
// /reset-password page in the device browser — deliberately not an
// in-app deep-link flow for v1 (see the plan's own note on this).
export const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>Reset your password</PageTitle>
        <Muted>
          {sent
            ? "If that email has an account, we've sent a password reset link — open it on your phone or computer to finish."
            : "Enter your account email and we'll send a reset link."}
        </Muted>
      </View>

      {!sent && (
        <>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          {error ? <Muted style={styles.error}>{error}</Muted> : null}
          <Button title="Send reset link" onPress={handleSubmit} loading={submitting} fullWidth />
        </>
      )}

      <Button title="Back to log in" variant="ghost" onPress={() => router.replace("/(auth)/login")} fullWidth />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: theme.space(2) },
  error: { color: theme.color.danger },
});

export default ForgotPasswordScreen;
