import { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ImagePlus } from "lucide-react";
import {
  getAdminSettings,
  updateAdminSettings,
  updateBranding,
  getIntegrations,
  updateSmsIntegration,
  testSmsIntegration,
  updateEmailIntegration,
  testEmailIntegration,
  updateKycIntegration,
} from "../../api/admin";
import { uploadFile } from "../../api/files";
import { useBranding, brandingAssetUrl } from "../../context/BrandingContext";
import { PageContainer, SectionTitle, Stack, Row, Muted } from "../../components/ui/Layout";
import { Card, CardRow } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { SOCIAL_PLATFORMS } from "../../components/ui/SocialIcons";

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

const SubsectionTitle = styled.h3`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textFaint};
  margin: 0;
`;

const Divider = styled.div`
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

// Full settings-page shell: a persistent left nav (GitHub/Stripe-style
// settings pattern) next to a content column. The content column stays a
// comfortable reading width even on a wide screen — the extra room a full
// admin viewport has goes to the nav and margin, not to stretching form
// fields edge to edge, which reads worse, not better.
const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(8)};
  align-items: start;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: 200px minmax(0, 720px);
  }
`;

const SettingsNav = styled.nav`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 2px;
  margin: 0 -${({ theme }) => theme.space(4)};
  padding: 0 ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(3)};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    flex-direction: column;
    margin: 0;
    padding: 0;
    border-bottom: none;
    position: sticky;
    top: ${({ theme }) => theme.space(5)};
  }
`;

const SettingsNavLink = styled.a`
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const SettingsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(9)};
  min-width: 0;
`;

const SettingsSection = styled.section`
  scroll-margin-top: ${({ theme }) => theme.space(5)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

const UploadRow = styled(Row)`
  align-items: flex-start;
`;

const UploadTile = styled.label`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1.5px dashed ${({ theme, $hasImage }) => ($hasImage ? "transparent" : theme.color.border)};
  background: ${({ theme, $hasImage }) => ($hasImage ? theme.color.surface : theme.color.surfaceRaised)};
  color: ${({ theme }) => theme.color.textFaint};
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
    background: ${({ theme, $hasImage }) => ($hasImage ? theme.color.surface : theme.color.accentSoft)};
  }

  input {
    display: none;
  }
`;

const UploadTileImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
`;

const UploadOverlay = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 21, 15, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.15s ease;

  ${UploadTile}:hover & {
    opacity: 1;
  }
`;

const UploadHint = styled(Muted)`
  font-size: 12px;
  max-width: 150px;
`;

// A tiny mock browser tab so the admin sees exactly how the favicon reads
// at real size, next to the platform name — not just a bare square image.
const TabMock = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 148px;
  padding: 7px 10px;
  border-radius: 8px 8px 0 0;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-bottom: none;
`;

const TabMockIcon = styled.span`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 3px;
  overflow: hidden;
  display: inline-flex;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const TabMockLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PreviewStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const PreviewMark = styled.span`
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $hasImage }) => ($hasImage ? theme.color.surface : theme.color.accent)};
  box-shadow: ${({ theme, $hasImage }) => ($hasImage ? "none" : theme.shadow.accentGlow)};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 3px;
  }
`;

const PreviewName = styled.span`
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

// An upload target for the logo/favicon — click to pick a file, uploads
// immediately (isPublic:true, same as truck photos), shows an instant local
// preview via createObjectURL before the network round-trip even resolves.
const UploadField = ({ label, hint, imageSrc, uploading, onPick, renderPreview }) => (
  <Stack $gap={2} style={{ width: "auto" }}>
    {renderPreview ? (
      renderPreview(imageSrc)
    ) : (
      <UploadTile $hasImage={Boolean(imageSrc)}>
        {imageSrc ? <UploadTileImg src={imageSrc} alt={label} /> : <ImagePlus size={22} strokeWidth={1.8} />}
        <UploadOverlay>{uploading ? "Uploading…" : imageSrc ? "Replace" : "Upload"}</UploadOverlay>
        <input type="file" accept="image/jpeg,image/png" onChange={onPick} disabled={uploading} />
      </UploadTile>
    )}
    <UploadHint>
      <strong style={{ color: "inherit", display: "block", marginBottom: 2 }}>{label}</strong>
      {hint}
    </UploadHint>
  </Stack>
);

// The flagship card — platform name, logo, favicon, and contact details,
// all saved together via PUT /admin/settings/branding (one endpoint per
// settings concern, same split as sms/email). Reads its
// initial values from BrandingContext (already fetched on app load) rather
// than a second round-trip to /admin/settings, and calls refreshBranding()
// after a successful save so this admin's own navbar/footer/favicon update
// immediately, without a page reload.
const BrandingCard = () => {
  const branding = useBranding();
  const [form, setForm] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");

  useEffect(() => {
    if (!branding.loading && !form) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        platformName: branding.platformName,
        logoUrl: branding.logoUrl,
        faviconUrl: branding.faviconUrl,
        contactEmail: branding.contactEmail,
        contactMobile: branding.contactMobile,
        facebookUrl: branding.facebookUrl,
        instagramUrl: branding.instagramUrl,
        linkedinUrl: branding.linkedinUrl,
        youtubeUrl: branding.youtubeUrl,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding.loading]);

  const handlePick = (kind) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    const setUploading = kind === "logo" ? setUploadingLogo : setUploadingFavicon;
    const setPreview = kind === "logo" ? setLogoPreview : setFaviconPreview;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { file: uploaded } = await uploadFile(file, { isPublic: true });
      setForm((f) => ({ ...f, [kind === "logo" ? "logoUrl" : "faviconUrl"]: uploaded.url }));
    } catch (error) {
      toast.error(error.message);
      setPreview("");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.platformName.trim()) {
      toast.error("Enter a platform name");
      return;
    }
    setSaving(true);
    try {
      await updateBranding({
        platformName: form.platformName.trim(),
        logoUrl: form.logoUrl,
        faviconUrl: form.faviconUrl,
        contactEmail: form.contactEmail.trim(),
        contactMobile: form.contactMobile.trim(),
        facebookUrl: form.facebookUrl.trim(),
        instagramUrl: form.instagramUrl.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
      });
      await branding.refreshBranding();
      toast.success("Branding updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <Card>
        <Row style={{ justifyContent: "center", padding: "30px 0" }}>
          <Spinner $size={24} />
        </Row>
      </Card>
    );
  }

  const logoSrc = logoPreview || brandingAssetUrl(form.logoUrl);
  const faviconSrc = faviconPreview || brandingAssetUrl(form.faviconUrl);

  return (
    <Card>
      <form onSubmit={handleSave}>
        <Stack $gap={4}>
          <Stack $gap={1}>
            <SectionTitle>Brand &amp; contact</SectionTitle>
            <Muted>Shown across the site, in emails, and in the browser tab.</Muted>
          </Stack>

          <Stack $gap={3}>
            <SubsectionTitle>Identity</SubsectionTitle>

            <Field label="Platform name">
              <Input
                value={form.platformName}
                onChange={(e) => setForm((f) => ({ ...f, platformName: e.target.value }))}
                placeholder="Truckgee"
                maxLength={60}
              />
            </Field>

            <UploadRow $gap={5} $wrap>
              <UploadField
                label="Logo"
                hint="PNG or JPEG · transparent background works best"
                imageSrc={logoSrc}
                uploading={uploadingLogo}
                onPick={handlePick("logo")}
              />
              <UploadField
                label="Favicon"
                hint="Square PNG · 512×512px or larger"
                imageSrc={faviconSrc}
                uploading={uploadingFavicon}
                onPick={handlePick("favicon")}
                renderPreview={(src) => (
                  <>
                    <TabMock>
                      <TabMockIcon>{src && <img src={src} alt="" />}</TabMockIcon>
                      <TabMockLabel>{form.platformName || "Truckgee"}</TabMockLabel>
                    </TabMock>
                    <UploadTile $hasImage={Boolean(src)} style={{ width: "100%", height: 64, borderRadius: "0 0 10px 10px" }}>
                      {src ? (
                        <UploadTileImg src={src} alt="Favicon" />
                      ) : (
                        <ImagePlus size={18} strokeWidth={1.8} />
                      )}
                      <UploadOverlay>{uploadingFavicon ? "Uploading…" : src ? "Replace" : "Upload"}</UploadOverlay>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handlePick("favicon")}
                        disabled={uploadingFavicon}
                      />
                    </UploadTile>
                  </>
                )}
              />
            </UploadRow>

            <PreviewStrip>
              <PreviewMark $hasImage={Boolean(logoSrc)}>
                {logoSrc ? <img src={logoSrc} alt="" /> : <ImagePlus size={14} strokeWidth={1.8} />}
              </PreviewMark>
              <PreviewName>{form.platformName || "Platform name"}</PreviewName>
              <Muted style={{ marginLeft: "auto" }}>Live preview</Muted>
            </PreviewStrip>
          </Stack>

          <Divider />

          <Stack $gap={3}>
            <SubsectionTitle>Contact</SubsectionTitle>
            <FieldsGrid>
              <Field label="Contact email">
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="hello@yourcompany.com"
                />
              </Field>
              <Field label="Contact mobile">
                <Input
                  value={form.contactMobile}
                  onChange={(e) => setForm((f) => ({ ...f, contactMobile: e.target.value }))}
                  placeholder="10-digit mobile number"
                />
              </Field>
            </FieldsGrid>
            <Muted>Shown in the site footer and About page.</Muted>
          </Stack>

          <Divider />

          <Stack $gap={3}>
            <SubsectionTitle>Social links</SubsectionTitle>
            <FieldsGrid>
              {SOCIAL_PLATFORMS.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <Input
                    type="url"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={`https://${label.toLowerCase()}.com/yourpage`}
                  />
                </Field>
              ))}
            </FieldsGrid>
            <Muted>
              Optional. Leave blank to hide that icon in the site footer — only platforms with a URL
              are shown.
            </Muted>
          </Stack>

          <Row>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Row>
        </Stack>
      </form>
    </Card>
  );
};

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
    { key: "fromName", label: "From name (optional)", placeholder: "Your Company" },
  ],
};

// KYC's "manual" is a fully-working default (human review), not a gap to
// close — or a webhook a real vendor integration posts to. It has no
// "test" endpoint, so its card renders with onTest omitted (ProviderCard
// hides the test row automatically when onTest isn't passed).
const customHttpFields = () => ({
  custom_http: [
    { key: "url", label: "Webhook URL", placeholder: "https://api.example.com/webhook" },
    { key: "headers", label: "Headers (JSON, optional)", textarea: true, help: 'Sent with every request, e.g. {"Authorization": "Bearer …"}.' },
  ],
});

const KYC_PROVIDERS = [
  { value: "manual", label: "Manual review (default)" },
  { value: "custom_http", label: "Custom webhook" },
];

const KYC_FIELDS = customHttpFields();

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
  // A provider with no natural free-text value to test with — testing
  // just pings the API using the already-saved keys — default true
  // preserves the SMS/email cards' existing behavior.
  testNeedsValue = true,
  testButtonLabel,
  // SMS/email's default ("console") is a real gap — nothing gets delivered
  // until an admin acts, so "Not configured" in warning amber is the right
  // signal. KYC's default ("manual") is a supported, fully-working mode,
  // not a problem — it passes unconfiguredLabel="Manual"/
  // configuredLabel="Automated" so the badge reads as informational
  // (neutral gray) rather than a false alarm.
  configuredLabel = "Configured",
  unconfiguredLabel = "Not configured",
  unconfiguredBadgeStatus = "pending",
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
            <StatusBadge status={status?.configured ? "verified" : unconfiguredBadgeStatus}>
              {status?.configured ? configuredLabel : unconfiguredLabel}
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

            {onTest && status?.configured && provider !== "console" && provider !== "none" && (
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
    <PageContainer style={{ maxWidth: 1200 }}>
      <SettingsLayout style={{ marginTop: 4 }}>
        <SettingsNav>
          <SettingsNavLink href="#branding">Branding</SettingsNavLink>
          <SettingsNavLink href="#general">General</SettingsNavLink>
          <SettingsNavLink href="#integrations">Integrations</SettingsNavLink>
        </SettingsNav>

        <SettingsContent>
          <SettingsSection id="branding">
            <BrandingCard />
          </SettingsSection>

          <SettingsSection id="general">
            <VerificationGateCard />
          </SettingsSection>

          <SettingsSection id="integrations">
            <SubsectionTitle>Integrations</SubsectionTitle>
            <Stack $gap={4}>
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

              <ProviderCard
                title="KYC verification"
                description="Every submission is reviewed by your team, by default. Connect a webhook to auto-approve or auto-reject instead."
                providers={KYC_PROVIDERS}
                fieldDefs={KYC_FIELDS}
                status={integrations?.kyc}
                loading={loadingIntegrations}
                onSave={async (provider, config) => {
                  const res = await updateKycIntegration(provider, config);
                  await loadIntegrations();
                  return res;
                }}
                configuredLabel="Automated"
                unconfiguredLabel="Manual"
                unconfiguredBadgeStatus="manual"
              />
            </Stack>
          </SettingsSection>
        </SettingsContent>
      </SettingsLayout>
    </PageContainer>
  );
};

export default Settings;
