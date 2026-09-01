import { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted, Body } from "../../src/components/ui/Typography";
import { TextField } from "../../src/components/ui/TextField";
import { Button } from "../../src/components/ui/Button";
import { theme } from "../../src/theme";
import { requestOtp, verifyOtp } from "../../src/api/auth";
import { getDevice } from "../../src/utils/deviceInfo";
import { useAuth } from "../../src/context/AuthContext";

const ROLE_OPTIONS = [
  { value: "shipper", label: "I want to ship goods" },
  { value: "transporter", label: "I have a truck to offer" },
];

// One screen for both "log in with the code just emailed" and "complete
// signup" — a brand-new email only needs name/mobile/roles the moment
// verifyOtp says so (authController.js's isNewSignup branch), so this
// starts minimal and reveals those fields inline rather than asking for
// them up front for every login.
export const OtpVerifyScreen = () => {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  const { setUser } = useAuth();

  const [otp, setOtp] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [needsMobile, setNeedsMobile] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const toggleRole = (role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleVerify = async () => {
    if (!otp.trim()) {
      setError("Enter the code we emailed you");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const device = await getDevice();
      const res = await verifyOtp({
        email,
        otp: otp.trim(),
        name: needsName ? name.trim() : undefined,
        mobile: needsMobile ? mobile.trim() : undefined,
        roles: roles.length ? roles : undefined,
        device,
      });
      setUser(res.user);
    } catch (err) {
      if (/name is required/i.test(err.message)) {
        setNeedsName(true);
        setError("Tell us your name to finish creating your account");
      } else if (/mobile number is required/i.test(err.message)) {
        setNeedsMobile(true);
        setError("Add your mobile number to finish creating your account");
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await requestOtp(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen title="">
      <View style={styles.header}>
        <PageTitle>Enter the code</PageTitle>
        <Muted>We sent a 6-digit code to {email}.</Muted>
      </View>

      <TextField
        label="Verification code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
      />

      {needsName && <TextField label="Full name" value={name} onChangeText={setName} placeholder="Your name" />}
      {needsMobile && (
        <TextField label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="9876543210" />
      )}
      {(needsName || needsMobile) && (
        <View style={styles.roles}>
          <Body>I am a...</Body>
          {ROLE_OPTIONS.map((opt) => (
            <Pressable key={opt.value} style={styles.roleRow} onPress={() => toggleRole(opt.value)}>
              <View style={[styles.checkbox, roles.includes(opt.value) && styles.checkboxOn]} />
              <Body>{opt.label}</Body>
            </Pressable>
          ))}
        </View>
      )}

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <Button title="Verify" onPress={handleVerify} loading={submitting} fullWidth />
      <Button title="Resend code" variant="ghost" onPress={handleResend} loading={resending} fullWidth />
      <Button title="Back" variant="ghost" onPress={() => router.back()} fullWidth />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: theme.space(2) },
  error: { color: theme.color.danger },
  roles: { gap: theme.space(2) },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.color.border,
  },
  checkboxOn: {
    backgroundColor: theme.color.accent,
    borderColor: theme.color.accent,
  },
});

export default OtpVerifyScreen;
