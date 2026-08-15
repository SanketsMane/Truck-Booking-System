import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as authApi from "../api/auth";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../layouts/AuthShell";
import { Muted } from "../components/ui/Layout";
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

const RoleOptions = styled.div`
  display: flex;
  gap: 10px;
`;

const RoleOption = styled.button`
  flex: 1;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : theme.color.surfaceRaised)};
  color: ${({ theme, $active }) => ($active ? theme.color.accent : theme.color.text)};
  font-weight: 600;
  font-size: 14px;
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

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Signup = () => {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roles, setRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const toggleRole = (role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter your name");
      return;
    }
    if (!MOBILE_PATTERN.test(mobile)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
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
      const { user } = await authApi.signup({
        name: name.trim(),
        mobile,
        email: email.trim(),
        password,
        confirmPassword,
        roles: roles.length ? roles : undefined,
      });
      setUser(user);
      toast.success("Welcome to ShareTruck");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={handleSubmit}>
        <Title>Create your account</Title>
        <Subtitle>Set a password now, or just use mobile OTP login instead — either works.</Subtitle>

        <Field label="Your name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Mobile number">
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="98765 43210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" help="At least 8 characters.">
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        <Field label="I want to" help="You can add the other role later from your profile.">
          <RoleOptions>
            <RoleOption type="button" $active={roles.includes("shipper")} onClick={() => toggleRole("shipper")}>
              Ship goods
            </RoleOption>
            <RoleOption
              type="button"
              $active={roles.includes("transporter")}
              onClick={() => toggleRole("transporter")}
            >
              Share truck space
            </RoleOption>
          </RoleOptions>
        </Field>

        <Muted style={{ marginBottom: 12 }}>
          By continuing you agree to our <Link to="/terms">Terms</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </Muted>

        <Button type="submit" $fullWidth $size="lg" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <SwitchRow>
          Already have an account? <Link to="/login">Log in</Link>
        </SwitchRow>
      </form>
    </AuthShell>
  );
};

export default Signup;
