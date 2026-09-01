import { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { PageTitle, Muted, Body } from "../../src/components/ui/Typography";
import { TextField } from "../../src/components/ui/TextField";
import { Button } from "../../src/components/ui/Button";
import { theme } from "../../src/theme";
import { signup } from "../../src/api/auth";
import { getDevice } from "../../src/utils/deviceInfo";
import { useAuth } from "../../src/context/AuthContext";

const ROLE_OPTIONS = [
  { value: "shipper", label: "I want to ship goods" },
  { value: "transporter", label: "I have a truck to offer" },
];

export const SignupScreen = () => {
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const device = await getDevice();
      const res = await signup({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        roles,
        device,
      });
      setUser(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="">
      <View style={styles.header}>
        <PageTitle>Create your account</PageTitle>
        <Muted>Search truck capacity, or list your own — free to use.</Muted>
      </View>

      <TextField label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
      <TextField label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="9876543210" />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
      <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Re-enter your password" />

      <View style={styles.roles}>
        <Body>I am a...</Body>
        {ROLE_OPTIONS.map((opt) => (
          <Pressable key={opt.value} style={styles.roleRow} onPress={() => toggleRole(opt.value)}>
            <View style={[styles.checkbox, roles.includes(opt.value) && styles.checkboxOn]} />
            <Body>{opt.label}</Body>
          </Pressable>
        ))}
      </View>

      {error ? <Muted style={styles.error}>{error}</Muted> : null}

      <Button title="Create account" onPress={handleSubmit} loading={submitting} fullWidth />

      <View style={styles.footer}>
        <Muted>Already have an account?</Muted>
        <Link href="/(auth)/login">
          <Muted style={styles.link}>Log in</Muted>
        </Link>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: theme.space(2) },
  error: { color: theme.color.danger },
  roles: { gap: theme.space(2) },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: theme.color.border },
  checkboxOn: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: theme.space(2) },
  link: { color: theme.color.accent, fontWeight: theme.font.weight.semibold },
});

export default SignupScreen;
