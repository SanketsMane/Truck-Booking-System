import { useState } from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted, Body, Caption } from "../../src/components/ui/Typography";
import { TextField } from "../../src/components/ui/TextField";
import { Button } from "../../src/components/ui/Button";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { theme } from "../../src/theme";
import { requestOtp, loginPassword } from "../../src/api/auth";
import { getDevice } from "../../src/utils/deviceInfo";
import { useAuth } from "../../src/context/AuthContext";
import brandMark from "../../assets/brand-mark.png";

// The first screen a logged-out person sees, and it was carrying no brand at
// all — a bare "Log in" heading on a grey page with two thirds of the screen
// empty below the button. An account screen is a trust moment in a
// marketplace, so this leads with the mark and with what the product is for.
//
// The OTP/password choice was a ghost button reading "Log in with password
// instead", which hides one of two equal options behind a mode you have to
// discover. A segmented control shows both, takes one tap, and announces
// which one is selected.
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

  const isOtp = mode === "otp";

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <Image source={brandMark} style={styles.mark} resizeMode="contain" />
        <PageTitle>Welcome back</PageTitle>
        <Muted>Log in to book capacity or post your routes.</Muted>
      </View>

      <View style={styles.card}>
        <SegmentedControl
          value={mode}
          onChange={(m) => {
            setError("");
            setMode(m);
          }}
          segments={[
            { value: "otp", label: "Email code" },
            { value: "password", label: "Password" },
          ]}
        />

        <TextField
          label="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError("");
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        {!isOtp && (
          <TextField
            label="Password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError("");
            }}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••"
          />
        )}

        {error ? <Caption style={styles.error}>{error}</Caption> : null}

        <Button
          title={isOtp ? "Send code" : "Log in"}
          size="lg"
          onPress={isOtp ? handleOtpLogin : handlePasswordLogin}
          loading={submitting}
          fullWidth
        />

        {/* Says what will actually happen next, so a first-timer isn't left
            guessing whether "Send code" texts or emails them. */}
        {isOtp && <Caption style={styles.hint}>We&apos;ll email you a 6-digit code. No password needed.</Caption>}

        {!isOtp && (
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable accessibilityRole="link" style={styles.forgot} hitSlop={8}>
              <Caption style={styles.linkText}>Forgot password?</Caption>
            </Pressable>
          </Link>
        )}
      </View>

      <View style={styles.footer}>
        <Body>Don&apos;t have an account?</Body>
        <Link href="/(auth)/signup" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Body style={styles.linkStrong}>Sign up</Body>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingTop: theme.spacing.xxl },

  brand: { alignItems: "center", gap: theme.spacing.xs },
  mark: { width: 64, height: 64, marginBottom: theme.spacing.xs },

  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.smd,
    ...theme.elevation[2],
  },

  error: { color: theme.color.danger },
  hint: { textAlign: "center" },
  forgot: { alignSelf: "center", paddingVertical: theme.spacing.xs },
  linkText: { color: theme.color.accent },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: theme.spacing.xs },
  linkStrong: { color: theme.color.accent, fontWeight: theme.font.weight.semibold },
});

export default LoginScreen;
