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

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export const Login = () => {
  const [method, setMethod] = useState("mobile"); // "mobile" | "password"
  const [step, setStep] = useState("mobile"); // "mobile" | "otp" — only for the OTP method
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [roles, setRoles] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const toggleRole = (role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!MOBILE_PATTERN.test(mobile)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.requestOtp(mobile);
      toast.success("OTP sent");
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
        mobile,
        otp,
        name: name.trim() || undefined,
        city: city.trim() || undefined,
        roles: roles.length ? roles : undefined,
      });
      setUser(user);
      toast.success("Welcome to ShareTruck");
      navigate(redirectTo, { replace: true });
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
    if (!identifier.trim() || !password) {
      toast.error("Enter your email/mobile number and password");
      return;
    }
    setSubmitting(true);
    try {
      const { user } = await authApi.loginPassword({ identifier: identifier.trim(), password });
      setUser(user);
      toast.success("Welcome back");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {method === "mobile" ? (
        step === "mobile" ? (
          <form onSubmit={handleRequestOtp}>
            <Title>Welcome back</Title>
            <Subtitle>We'll text you a one-time code — no password needed.</Subtitle>
            <MethodSwitch>
              Prefer a password?{" "}
              <button type="button" onClick={() => setMethod("password")}>
                Use email &amp; password
              </button>
            </MethodSwitch>
            <Field label="Mobile number">
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
            <Subtitle>Sent to {mobile}.</Subtitle>
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
                setStep("mobile");
                setOtp("");
              }}
            >
              Use a different number
            </Button>
          </form>
        )
      ) : (
        <form onSubmit={handlePasswordLogin}>
          <Title>Welcome back</Title>
          <Subtitle>Use the password you set for your account.</Subtitle>
          <MethodSwitch>
            Or{" "}
            <button type="button" onClick={() => setMethod("mobile")}>
              sign in with mobile OTP
            </button>
          </MethodSwitch>
          <Field label="Email or mobile number">
            <Input
              type="text"
              placeholder="you@example.com or 98765 43210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
