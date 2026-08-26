import { useState } from "react";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../../src/components/ui/Typography";
import { TextField } from "../../../src/components/ui/TextField";
import { Button } from "../../../src/components/ui/Button";
import { theme } from "../../../src/theme";
import { setPassword } from "../../../src/api/auth";
import { useAuth } from "../../../src/context/AuthContext";

export const PasswordScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await setPassword({ currentPassword, newPassword, confirmPassword });
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageTitle>{user?.hasPassword ? "Change password" : "Set a password"}</PageTitle>
      {user?.hasPassword && (
        <TextField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
      )}
      <TextField label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <TextField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      {error ? <Muted style={{ color: theme.color.danger }}>{error}</Muted> : null}
      <Button title="Save" onPress={handleSave} loading={saving} fullWidth />
    </Screen>
  );
};

export default PasswordScreen;
