import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as authApi from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import AuthShell from "../layouts/AuthShell";
import { Muted } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { Field, Input, PasswordInput } from "../components/ui/Form";

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

const MethodSwitch = styled.p`
  margin: 0 0 26px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};

  button {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: ${({ theme }) => theme.color.accent};
    cursor: pointer;
  }

  button:hover {
    text-decoration: underline;
  }
`;

const ForgotLink = styled(Link)`
  display: block;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};
  margin: -12px 0 20px;
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

export const Login = () => {
  const [method, setMethod] = useState("otp"); // "otp" | "password"
  const [step, setStep] = useState("email"); // "email" | "otp" — only for the OTP method
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [roles, setRoles] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { setUser } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const toggleRole = (role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(otpEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.requestOtp(otpEmail.trim());
      toast.success("OTP sent to your email");
      setStep("otp");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isNewUser && !name.trim()) {
      toast.error("Enter your name to finish signing up");
      return;
    }
    setSubmitting(true);
    try {
      const { user } = await authApi.verifyOtp({
        email: otpEmail.trim(),
        otp,
        name: name.trim() || undefined,
        city: city.trim() || undefined,
        roles: roles.length ? roles : undefined,
      });
      setUser(user);
      toast.success(`Welcome to ${platformName}`);
      navigate(user.isAdmin ? "/admin" : redirectTo, { replace: true });
    } catch (error) {
      if (/name is required/i.test(error.message)) {
        setIsNewUser(true);
        toast.error("Looks like you're new here — tell us your name to continue");
      } else {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setSubmitting(true);
    try {
      const { user } = await authApi.loginPassword({ email: email.trim(), password });
      setUser(user);
      toast.success("Welcome back");
      navigate(user.isAdmin ? "/admin" : redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {method === "otp" ? (
        step === "email" ? (
          <form onSubmit={handleRequestOtp}>
            <Title>Welcome back</Title>
            <Subtitle>We'll email you a one-time code — no password needed.</Subtitle>
            <MethodSwitch>
              Prefer a password?{" "}
              <button type="button" onClick={() => setMethod("password")}>
                Use email &amp; password
              </button>
            </MethodSwitch>
            <Field label="Email">
              <Input
                type="email"
                placeholder="you@example.com"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                autoFocus
              />
            </Field>
            <Button type="submit" $fullWidth $size="lg" disabled={submitting}>
              {submitting ? "Sending…" : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <Title>Enter the code</Title>
            <Subtitle>Sent to {otpEmail}.</Subtitle>
            <Field label="OTP">
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </Field>

            {isNewUser && (
              <>
                <Field label="Your name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="City (optional)">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </Field>
                <Field label="I want to" help="You can add the other role later from your profile.">
                  <RoleOptions>
                    <RoleOption
                      type="button"
                      $active={roles.includes("shipper")}
                      onClick={() => toggleRole("shipper")}
                    >
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
              </>
            )}

            {isNewUser && (
              <Muted style={{ marginBottom: 12 }}>
                By continuing you agree to our <Link to="/terms">Terms</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>.
              </Muted>
            )}

            <Button type="submit" $fullWidth $size="lg" disabled={submitting}>
              {submitting ? "Verifying…" : "Continue"}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              $fullWidth
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
            >
              Use a different email
            </Button>
          </form>
        )
      ) : (
        <form onSubmit={handlePasswordLogin}>
          <Title>Welcome back</Title>
          <Subtitle>Use the password you set for your account.</Subtitle>
          <MethodSwitch>
            Or{" "}
            <button type="button" onClick={() => setMethod("otp")}>
              sign in with email OTP
            </button>
          </MethodSwitch>
          <Field label="Email">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Password">
            <PasswordInput
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <ForgotLink to="/forgot-password">Forgot password?</ForgotLink>
          <Button type="submit" $fullWidth $size="lg" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
          <SwitchRow>
            New here? <Link to="/signup">Create an account</Link>
          </SwitchRow>
        </form>
      )}
    </AuthShell>
  );
};

export default Login;
