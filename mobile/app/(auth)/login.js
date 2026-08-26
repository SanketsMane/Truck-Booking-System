import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../src/components/ui/Typography";
import { TextField } from "../../src/components/ui/TextField";
import { Button } from "../../src/components/ui/Button";
import { theme } from "../../src/theme";
import { requestOtp, loginPassword } from "../../src/api/auth";
import { getDevice } from "../../src/utils/deviceInfo";
import { useAuth } from "../../src/context/AuthContext";

// Mirrors frontend/src/pages/Login.jsx's dual-method toggle — OTP-by-email
// (request here, enter the code on the next screen) or email+password,
// same account either way.
export const LoginScreen = () => {
  const router = useRouter();
  const { setUser } = useAuth();
  const [mode, setMode] = useState("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOtpLogin = async () => {
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await requestOtp(email.trim().toLowerCase());
      router.push({ pathname: "/(auth)/otp-verify", params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const device = await getDevice();
      const res = await loginPassword({ email: email.trim().toLowerCase(), password, device });
      setUser(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <PageTitle>Log in</PageTitle>
        <Muted>Welcome back to TruckGee.</Muted>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />

      {mode === "password" && (
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      )}

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <Button
        title={mode === "otp" ? "Send OTP" : "Log in"}
        onPress={mode === "otp" ? handleOtpLogin : handlePasswordLogin}
        loading={submitting}
        fullWidth
      />

      <Button
        title={mode === "otp" ? "Log in with password instead" : "Log in with an email code instead"}
        variant="ghost"
        onPress={() => {
          setError("");
          setMode((m) => (m === "otp" ? "password" : "otp"));
        }}
        fullWidth
      />

      {mode === "password" && (
        <Link href="/(auth)/forgot-password" asChild>
          <Button title="Forgot password?" variant="ghost" fullWidth />
        </Link>
      )}

      <View style={styles.footer}>
        <Muted>Don’t have an account?</Muted>
        <Link href="/(auth)/signup">
          <Muted style={styles.link}>Sign up</Muted>
        </Link>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: theme.space(2),
  },
  error: {
    color: theme.color.danger,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: theme.space(2),
  },
  link: {
    color: theme.color.accent,
    fontWeight: theme.font.weight.semibold,
  },
});

export default LoginScreen;
