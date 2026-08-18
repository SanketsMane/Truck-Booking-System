import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Check, Loader2 } from "lucide-react";
import * as authApi from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import AuthShell from "../layouts/AuthShell";
import { Row } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { Field, Input, PasswordInput } from "../components/ui/Form";

// Mirrors backend/config/authConfig.js's OTP_RESEND_COOLDOWN_SECONDS — no
// endpoint exposes this value, and the backend enforces the real cooldown
// regardless of what this timer shows, so a mismatch here would only ever
// make the "Resend" button re-enable a few seconds early/late, not bypass
// anything.
const OTP_RESEND_COOLDOWN_SECONDS = 30;

const Title = styled.h1`
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 13.5px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: ${({ theme }) => theme.breakpoint.phone}) {
    grid-template-columns: 1fr 1fr;
  }
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
  margin: 14px 0 0;
  text-align: center;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};

  a {
    font-weight: 600;
    color: ${({ theme }) => theme.color.accent};
  }
`;

// --- Email verification field ---

const EmailRow = styled(Row)`
  align-items: flex-start;
  gap: 8px;
`;

const EmailInputWrap = styled.div`
  flex: 1;
  min-width: 0;
`;

const VerifyButton = styled(Button).attrs({ type: "button", $variant: "secondary", $size: "md" })`
  flex: none;
  margin-top: 2px;
  white-space: nowrap;
`;

const VerifiedRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.success};
  background: ${({ theme }) => theme.color.successSoft};
  color: ${({ theme }) => theme.color.success};
  font-size: 14px;
  font-weight: 600;
`;

const VerifiedIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.success};
  color: #fff;
`;

const VerifiedEmail = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OtpPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const OtpHint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};

  strong {
    color: ${({ theme }) => theme.color.text};
  }
`;

const OtpRow = styled(Row)`
  gap: 8px;
`;

const OtpInput = styled(Input)`
  flex: 1;
  min-width: 0;
  letter-spacing: 0.3em;
  font-weight: 700;
  text-align: center;
`;

const OtpFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const TextLinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme, disabled }) => (disabled ? theme.color.textFaint : theme.color.accent)};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};

  &:hover:not(:disabled) {
    text-decoration: underline;
  }
`;

const Spinner = styled(Loader2)`
  animation: spin 0.7s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// --- Terms/Privacy checkbox ---

const AgreeRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  cursor: pointer;
`;

const CheckboxBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  margin-top: 1px;
  border-radius: 5px;
  border: 1.5px solid ${({ theme, $checked }) => ($checked ? theme.color.accent : theme.color.borderStrong)};
  background: ${({ theme, $checked }) => ($checked ? theme.color.accent : theme.color.surface)};
  color: ${({ theme }) => theme.color.onAccent};
  transition: background 0.15s ease, border-color 0.15s ease;
`;

const HiddenCheckboxInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const AgreeText = styled.span`
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};
  line-height: 1.45;

  a {
    font-weight: 600;
    color: ${({ theme }) => theme.color.accent};

    &:hover {
      text-decoration: underline;
    }
  }
`;

const SubmitHint = styled.p`
  margin: -6px 0 12px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textMuted};
  text-align: center;
`;

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Signup = () => {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  // "idle" (editable) -> "sent" (OTP emailed, awaiting code) -> "verified"
  // (account created+session issued by verifyOtp — see handleVerifyOtp).
  const [emailStep, setEmailStep] = useState("idle");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roles, setRoles] = useState([]);
  const [agreed, setAgreed] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { setUser } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const toggleRole = (role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleSendOtp = async () => {
    if (!name.trim()) {
      toast.error("Enter your name first");
      return;
    }
    if (!MOBILE_PATTERN.test(mobile)) {
      toast.error("Enter a valid 10-digit Indian mobile number first");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSendingOtp(true);
    try {
      await authApi.requestOtp(email.trim());
      toast.success("OTP sent to your email");
      setEmailStep("sent");
      setOtp("");
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifyingOtp(true);
    try {
      // This is also the call that actually creates the account (with the
      // name/mobile/roles gathered so far) and signs the browser in —
      // there's no separate "create account" step on the backend once the
      // OTP is verified, only setPassword below to attach the password
      // this form additionally asks for.
      const { user } = await authApi.verifyOtp({
        email: email.trim(),
        otp,
        name: name.trim(),
        mobile,
        roles: roles.length ? roles : undefined,
      });
      setUser(user);
      setEmailStep("verified");
      toast.success("Email verified");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    handleSendOtp();
  };

  const handleChangeEmail = () => {
    setEmailStep("idle");
    setOtp("");
  };

  const canSubmit =
    name.trim().length > 0 &&
    MOBILE_PATTERN.test(mobile) &&
    emailStep === "verified" &&
    password.length >= 8 &&
    password === confirmPassword &&
    agreed;

  const blockingHint =
    emailStep !== "verified"
      ? "Verify your email to continue"
      : !agreed
      ? "Agree to the Terms and Privacy Policy to continue"
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      // The account and session already exist (verifyOtp above) — this
      // just attaches the password chosen on this form. No currentPassword:
      // a brand-new account has none yet (backend/controllers/
      // authController.js's setPassword only requires it when one already
      // exists).
      await authApi.setPassword({ newPassword: password, confirmPassword });
      toast.success(`Welcome to ${platformName}`);
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
        <Subtitle>We'll verify your email with a one-time code before creating your account.</Subtitle>

        <FieldRow>
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
              disabled={emailStep === "verified"}
              required
            />
          </Field>
        </FieldRow>

        <Field label="Email">
          {emailStep === "verified" ? (
            <VerifiedRow>
              <VerifiedIcon>
                <Check size={13} strokeWidth={3} />
              </VerifiedIcon>
              <VerifiedEmail>{email}</VerifiedEmail>
              <span>Verified</span>
            </VerifiedRow>
          ) : (
            // A real element, not a Fragment — Field.jsx clones its first
            // child to attach the label's htmlFor id, and React.Fragment
            // doesn't accept arbitrary props (warns "Invalid prop `id`").
            <div>
              <EmailRow>
                <EmailInputWrap>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={emailStep === "sent"}
                  />
                </EmailInputWrap>
                {emailStep === "idle" && (
                  <VerifyButton onClick={handleSendOtp} disabled={sendingOtp}>
                    {sendingOtp ? <Spinner size={15} /> : "Send OTP"}
                  </VerifyButton>
                )}
                {emailStep === "sent" && (
                  <VerifyButton onClick={handleChangeEmail} disabled={sendingOtp}>
                    Change
                  </VerifyButton>
                )}
              </EmailRow>

              {emailStep === "sent" && (
                <OtpPanel>
                  <OtpHint>
                    Enter the 6-digit code sent to <strong>{email}</strong>. It expires in 5 minutes.
                  </OtpHint>
                  <OtpRow>
                    <OtpInput
                      type="tel"
                      inputMode="numeric"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                    />
                    <VerifyButton
                      $variant="primary"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otp.length !== 6}
                    >
                      {verifyingOtp ? <Spinner size={15} /> : "Verify"}
                    </VerifyButton>
                  </OtpRow>
                  <OtpFooterRow>
                    <TextLinkButton type="button" onClick={handleResend} disabled={resendCooldown > 0 || sendingOtp}>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                    </TextLinkButton>
                  </OtpFooterRow>
                </OtpPanel>
              )}
            </div>
          )}
        </Field>

        <FieldRow>
          <Field label="Password" help="At least 8 characters.">
            <PasswordInput
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm password">
            <PasswordInput
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </FieldRow>
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

        <AgreeRow>
          <HiddenCheckboxInput
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-label="I agree to the Terms and Privacy Policy"
          />
          <CheckboxBox $checked={agreed} aria-hidden="true">
            {agreed && <Check size={13} strokeWidth={3} />}
          </CheckboxBox>
          <AgreeText>
            I agree to the <Link to="/terms" onClick={(e) => e.stopPropagation()}>Terms</Link> and{" "}
            <Link to="/privacy" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>.
          </AgreeText>
        </AgreeRow>

        <Button type="submit" $fullWidth $size="lg" disabled={!canSubmit || submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
        {blockingHint && <SubmitHint>{blockingHint}</SubmitHint>}

        <SwitchRow>
          Already have an account? <Link to="/login">Log in</Link>
        </SwitchRow>
      </form>
    </AuthShell>
  );
};

export default Signup;
