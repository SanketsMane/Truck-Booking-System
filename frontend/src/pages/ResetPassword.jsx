import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as authApi from "../api/auth";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../layouts/AuthShell";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";

const Title = styled.h1`
  font-size: 1.7rem;
  letter-spacing: -0.01em;
  margin: 0 0 6px;
`;

const Subtitle = styled.p`
  margin: 0 0 28px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 14.5px;
`;

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { user } = await authApi.resetPassword({ token, password, confirmPassword });
      setUser(user);
      toast.success("Password reset — you're logged in");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <Title>Invalid reset link</Title>
        <Subtitle>This link is missing its reset token. Request a new one below.</Subtitle>
        <Button as={Link} to="/forgot-password" $fullWidth $size="lg">
          Request a new link
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit}>
        <Title>Set a new password</Title>
        <Subtitle>Choose a new password for your account.</Subtitle>
        <Field label="New password" help="At least 8 characters.">
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" $fullWidth $size="lg" disabled={submitting}>
          {submitting ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
