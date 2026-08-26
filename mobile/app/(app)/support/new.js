import { useState } from "react";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { PageTitle, Muted } from "../../../src/components/ui/Typography";
import { TextField } from "../../../src/components/ui/TextField";
import { Button } from "../../../src/components/ui/Button";
import { theme } from "../../../src/theme";
import { createSupportRequest } from "../../../src/api/support";

export const NewSupportRequestScreen = () => {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError("Fill in a subject and message");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await createSupportRequest({ subject: subject.trim(), message: message.trim() });
      router.replace("/(app)/support");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <PageTitle>New support request</PageTitle>
      <TextField label="Subject" value={subject} onChangeText={setSubject} />
      <TextField label="Message" value={message} onChangeText={setMessage} multiline numberOfLines={4} />
      {error ? <Muted style={{ color: theme.color.danger }}>{error}</Muted> : null}
      <Button title="Submit" onPress={handleSubmit} loading={submitting} fullWidth />
    </Screen>
  );
};

export default NewSupportRequestScreen;
