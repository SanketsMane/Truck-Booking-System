import { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as authApi from "../api/auth";
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

const SwitchRow = styled.p`
  margin: 22px 0 0;
  text-align: center;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};

  a {
    font-weight: 600;
    color: ${({ theme }) => theme.color.accent};
  }
`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {sent ? (
        <>
          <Title>Check your email</Title>
          <Subtitle>
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires
            in 30 minutes.
          </Subtitle>
          <Button as={Link} to="/login" $fullWidth $size="lg" $variant="secondary">
            Back to log in
          </Button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <Title>Forgot your password?</Title>
          <Subtitle>Enter the email on your account and we'll send you a reset link.</Subtitle>
          <Field label="Email">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </Field>
          <Button type="submit" $fullWidth $size="lg" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          <SwitchRow>
            Remembered it? <Link to="/login">Log in</Link>
          </SwitchRow>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
