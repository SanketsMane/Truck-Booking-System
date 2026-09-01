import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Body, Muted } from "../../../src/components/ui/Typography";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { theme } from "../../../src/theme";
import { addRole } from "../../../src/api/auth";
import { useAuth } from "../../../src/context/AuthContext";

const ALL_ROLES = [
  { value: "shipper", label: "Shipper" },
  { value: "transporter", label: "Transporter" },
];

export const RolesScreen = () => {
  const { user, setUser } = useAuth();
  const [addingRole, setAddingRole] = useState(null);
  const [error, setError] = useState("");

  const missingRoles = ALL_ROLES.filter((r) => !user?.roles?.includes(r.value));

  const handleAddRole = async (role) => {
    setAddingRole(role);
    setError("");
    try {
      const res = await addRole(role);
      setUser(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingRole(null);
    }
  };

  return (
    <Screen title="Roles">

      <Card>
        <Body>Current roles</Body>
        <View style={styles.chips}>
          {user?.roles?.map((r) => (
            <View key={r} style={styles.chip}>
              <Muted>{ALL_ROLES.find((x) => x.value === r)?.label || r}</Muted>
            </View>
          ))}
        </View>
      </Card>

      {error ? <Muted style={{ color: theme.color.danger }}>{error}</Muted> : null}

      {missingRoles.map((r) => (
        <Button
          key={r.value}
          title={`Also become a ${r.label.toLowerCase()}`}
          variant="secondary"
          onPress={() => handleAddRole(r.value)}
          loading={addingRole === r.value}
          fullWidth
        />
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceRaised,
  },
});

export default RolesScreen;
