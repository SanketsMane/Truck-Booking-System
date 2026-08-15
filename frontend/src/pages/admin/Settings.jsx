import { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import {
  getAdminSettings,
  updateAdminSettings,
  updateCommission,
  getIntegrations,
  updateSmsIntegration,
  testSmsIntegration,
  updateEmailIntegration,
  testEmailIntegration,
  updateRazorpayIntegration,
  testRazorpayIntegration,
} from "../../api/admin";
import { PageContainer, PageTitle, SectionTitle, Stack, Row, Muted } from "../../components/ui/Layout";
import { Card, CardRow } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";

const Switch = styled.button`
  position: relative;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $on }) => ($on ? theme.color.accent : theme.color.surfaceRaised)};
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? "22px" : "2px")};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme, $on }) => ($on ? theme.color.onAccent : theme.color.textMuted)};
    transition: left 0.15s ease;
  }
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0 ${({ theme }) => theme.space(4)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const MaskedHint = styled.p`
  margin: -4px 0 16px;
  font-size: 12.5px;
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.textFaint};
`;

const TestRow = styled(Stack)`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding-top: ${({ theme }) => theme.space(4)};
`;

const VerificationGateCard = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { settings } = await getAdminSettings();
        setEnabled(!!settings?.verificationGateEnabled);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggle = async () => {
    const next = !enabled;
    setSaving(true);
    try {
      await updateAdminSettings({ verificationGateEnabled: next });
      setEnabled(next);
      toast.success(`Verification gate ${next ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      {loading ? (
        <Row style={{ justifyContent: "center", padding: "30px 0" }}>
          <Spinner $size={24} />
        </Row>
      ) : (
        <CardRow>
          <Stack $gap={1}>
            <SectionTitle>Verification gate</SectionTitle>
            <Muted>
              When on, unverified shippers and transporters are blocked from accepting bookings or
              publishing trips until their KYC is approved by your team.
            </Muted>
          </Stack>
          <Switch
            type="button"
            $on={enabled}
            onClick={handleToggle}
            disabled={saving}
            aria-pressed={enabled}
            aria-label="Toggle verification gate"
          />
        </CardRow>
      )}
    </Card>
  );
};

const CommissionCard = () => {
  const [percent, setPercent] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { settings } = await getAdminSettings();
        setPercent(String(settings?.commissionPercent ?? 10));
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const value = Number(percent);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast.error("Enter a commission percentage between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      await updateCommission(value);
      toast.success("Commission rate updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      {loading ? (
        <Row style={{ justifyContent: "center", padding: "30px 0" }}>
          <Spinner $size={24} />
        </Row>
      ) : (
        <form onSubmit={handleSave}>
          <Stack $gap={3}>
            <Stack $gap={1}>
              <SectionTitle>Commission rate</SectionTitle>
              <Muted>
                The platform's cut of every completed booking. Taken automatically when a booking is marked
                delivered — the rest goes to the transporter's wallet.
              </Muted>
            </Stack>
            <Row $gap={2} style={{ alignItems: "flex-end" }}>
              <Field label="Commission %" style={{ marginBottom: 0, maxWidth: 140 }}>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </Row>
          </Stack>
        </form>
      )}
    </Card>
  );
};

const SMS_PROVIDERS = [
  { value: "console", label: "None — log to server console (dev only)" },
  { value: "twilio", label: "Twilio" },
  { value: "msg91", label: "MSG91" },
  { value: "custom_http", label: "Custom HTTP API" },
];

const SMS_FIELDS = {
  twilio: [
    { key: "accountSid", label: "Account SID" },
    { key: "authToken", label: "Auth token", secret: true },
    { key: "fromNumber", label: "From number", placeholder: "+15551234567" },
  ],
  msg91: [
    { key: "authKey", label: "Auth key", secret: true },
    { key: "senderId", label: "Sender ID" },
    { key: "route", label: "Route (optional)", placeholder: "4" },
  ],
  custom_http: [
    { key: "method", label: "HTTP method", placeholder: "POST" },
    { key: "url", label: "Endpoint URL", placeholder: "https://api.example.com/send" },
    {
      key: "bodyTemplate",
      label: "Body template",
      help: "Use {{mobile}} and {{message}} as placeholders — JSON is sent as-is, anything else as raw text.",
      textarea: true,
    },
  ],
};

const EMAIL_PROVIDERS = [
  { value: "console", label: "None — log to server console (dev only)" },
  { value: "smtp", label: "SMTP (Gmail, SES, SendGrid, Mailgun, or any SMTP relay)" },
];

const EMAIL_FIELDS = {
  smtp: [
    { key: "host", label: "SMTP host", placeholder: "smtp.gmail.com" },
    { key: "port", label: "Port", placeholder: "587" },
    { key: "user", label: "Username" },
    { key: "pass", label: "Password", secret: true },
    { key: "fromAddress", label: "From address", placeholder: "no-reply@yourcompany.com" },
    { key: "fromName", label: "From name (optional)", placeholder: "ShareTruck" },
  ],
};

const RAZORPAY_PROVIDERS = [
  { value: "none", label: "Not configured" },
  { value: "razorpay", label: "Razorpay" },
];

const RAZORPAY_FIELDS = {
  razorpay: [
    { key: "keyId", label: "Key ID", placeholder: "rzp_test_…" },
    { key: "keySecret", label: "Key secret", secret: true },
    {
      key: "webhookSecret",
      label: "Webhook secret",
      secret: true,
      help: "From the webhook you configure in the Razorpay dashboard, pointing at /webhooks/razorpay.",
    },
  ],
};

const emptyValues = (fields) => Object.fromEntries(fields.map((f) => [f.key, ""]));

const ProviderCard = ({
  title,
  description,
  providers,
  fieldDefs,
  status,
  loading,
  onSave,
  testLabel,
  testPlaceholder,
  onTest,
  // Some providers (Razorpay) have no natural free-text value to test
  // with — testing just pings the API using the already-saved keys —
  // default true preserves the SMS/email cards' existing behavior.
  testNeedsValue = true,
  testButtonLabel,
}) => {
  const [provider, setProvider] = useState("console");
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [testValue, setTestValue] = useState("");
  const [testing, setTesting] = useState(false);

  // Seeds the form from whatever's already saved once it loads.
  useEffect(() => {
    if (status?.provider) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProvider(status.provider);
      setValues(emptyValues(fieldDefs[status.provider] || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.provider]);

  const handleProviderChange = (next) => {
    setProvider(next);
    setValues(emptyValues(fieldDefs[next] || []));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const config = { ...values };
      if (config.headers !== undefined) {
        try {
          config.headers = config.headers ? JSON.parse(config.headers) : {};
        } catch {
          toast.error("Headers must be valid JSON");
          setSaving(false);
          return;
        }
      }
      await onSave(provider, config);
      toast.success(`${title} provider saved`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (testNeedsValue && !testValue.trim()) {
      toast.error(`Enter a ${testLabel.toLowerCase()} to test with`);
      return;
    }
    setTesting(true);
    try {
      const res = await onTest(testNeedsValue ? testValue.trim() : undefined);
      toast.success(res.msg || "Test sent");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTesting(false);
    }
  };

  const fields = fieldDefs[provider] || [];

  return (
    <Card>
      <Stack $gap={4}>
        <CardRow>
          <Stack $gap={1}>
            <SectionTitle>{title}</SectionTitle>
            <Muted>{description}</Muted>
          </Stack>
          {!loading && (
            <StatusBadge status={status?.configured ? "verified" : "pending"}>
              {status?.configured ? "Configured" : "Not configured"}
            </StatusBadge>
          )}
        </CardRow>

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "20px 0" }}>
            <Spinner $size={22} />
          </Row>
        ) : (
          <>
            <form onSubmit={handleSave}>
              <Field label="Provider">
                <Select value={provider} onChange={(e) => handleProviderChange(e.target.value)}>
                  {providers.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {status?.configured && status.provider === provider && (
                <MaskedHint>
                  Currently saved: {Object.entries(status.config || {})
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ") || "—"}
                  . Saving below replaces the full configuration.
                </MaskedHint>
              )}

              {fields.length > 0 && (
                <FieldsGrid>
                  {fields.map((f) => (
                    <Field key={f.key} label={f.label} help={f.help}>
                      {f.textarea ? (
                        <Textarea
                          value={values[f.key] || ""}
                          placeholder={f.placeholder}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      ) : (
                        <Input
                          type={f.secret ? "password" : "text"}
                          value={values[f.key] || ""}
                          placeholder={f.placeholder}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          autoComplete="off"
                        />
                      )}
                    </Field>
                  ))}
                </FieldsGrid>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save provider"}
              </Button>
            </form>

            {status?.configured && provider !== "console" && provider !== "none" && (
              <TestRow $gap={2}>
                <Row $gap={2} $wrap>
                  {testNeedsValue && (
                    <Input
                      placeholder={testPlaceholder}
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      style={{ maxWidth: 260 }}
                    />
                  )}
                  <Button type="button" $variant="secondary" onClick={handleTest} disabled={testing}>
                    {testing ? "Testing…" : testButtonLabel || `Send test ${testLabel.toLowerCase()}`}
                  </Button>
                </Row>
              </TestRow>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
};

export const Settings = () => {
  const [integrations, setIntegrations] = useState(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  const loadIntegrations = async () => {
    try {
      const { integrations: data } = await getIntegrations();
      setIntegrations(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadIntegrations();
    })();
  }, []);

  return (
    <PageContainer style={{ maxWidth: 720 }}>
      <PageTitle>Settings</PageTitle>

      <Stack $gap={4} style={{ marginTop: 20 }}>
        <VerificationGateCard />
        <CommissionCard />

        <ProviderCard
          title="Razorpay"
          description="Payment gateway used for wallet top-ups and direct booking payments."
          providers={RAZORPAY_PROVIDERS}
          fieldDefs={RAZORPAY_FIELDS}
          status={integrations?.razorpay}
          loading={loadingIntegrations}
          onSave={async (provider, config) => {
            const res = await updateRazorpayIntegration(provider, config);
            await loadIntegrations();
            return res;
          }}
          testLabel="Razorpay"
          testButtonLabel="Test connection"
          testNeedsValue={false}
          onTest={() => testRazorpayIntegration()}
        />

        <ProviderCard
          title="SMS provider"
          description="Used to deliver login OTPs and critical booking notifications by text message."
          providers={SMS_PROVIDERS}
          fieldDefs={SMS_FIELDS}
          status={integrations?.sms}
          loading={loadingIntegrations}
          onSave={async (provider, config) => {
            const res = await updateSmsIntegration(provider, config);
            await loadIntegrations();
            return res;
          }}
          testLabel="SMS"
          testPlaceholder="10-digit mobile number"
          onTest={(mobile) => testSmsIntegration(mobile)}
        />

        <ProviderCard
          title="Email provider"
          description="Used for transactional email — booking receipts and account notifications."
          providers={EMAIL_PROVIDERS}
          fieldDefs={EMAIL_FIELDS}
          status={integrations?.email}
          loading={loadingIntegrations}
          onSave={async (provider, config) => {
            const res = await updateEmailIntegration(provider, config);
            await loadIntegrations();
            return res;
          }}
          testLabel="email"
          testPlaceholder="you@example.com"
          onTest={(to) => testEmailIntegration(to)}
        />
      </Stack>
    </PageContainer>
  );
};

export default Settings;
