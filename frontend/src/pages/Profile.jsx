import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Clock3, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import * as authApi from "../api/auth";
import * as verificationApi from "../api/verification";
import * as notificationsApi from "../api/notifications";
import { uploadFile, getFileBlobUrl } from "../api/files";
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from "../utils/webPush";
import { PageContainer, SectionTitle, Stack, Row, Muted } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Form";
import { StatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { formatDate, ratingLabel } from "../utils/format";

const ROLE_LABELS = { shipper: "Shipper", transporter: "Transporter" };

const DOC_TYPE_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "driving_license", label: "Driving License" },
  { value: "business_proof", label: "Business / GST Certificate" },
  { value: "other", label: "Other document" },
];

const docLabel = (value) => DOC_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;

const AvatarRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(4)};
`;

const Avatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textMuted};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DocRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  flex-wrap: wrap;
`;

const FileInput = styled.input`
  flex: 1;
  min-width: 180px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const DocList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DocListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: ${({ theme }) => theme.color.accent};
  font-weight: 600;
  font-size: 13.5px;
`;

// Same pill-toggle pattern as admin/Settings.jsx's Switch, kept local here
// since it's only needed on this page.
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

// Must match backend/config/marketplaceConfig.js-style constants elsewhere
// in this app (e.g. BookingDetail.jsx's CANCELLATION_WINDOW_HOURS) — no
// endpoint exposes this value, and nothing server-side is actually gated on
// it (this is a pure UI affordance, not an enforced SLA), so it's just a
// local constant rather than a round trip to fetch one number.
const KYC_ESCALATION_MINUTES = 15;

const EscalationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.color.textFaint};
  }
`;

const CountdownValue = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

const WhatsAppLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  padding: 9px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: #25d366;
  color: #ffffff;
  font-weight: 700;
  font-size: 13.5px;

  &:hover {
    background: #1ebe5b;
  }
`;

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

// Live "time remaining" until `target` (a Date), ticking once a second.
// Callers always pass a real Date — EscalationTimer only ever mounts once
// `submittedAt` is known — so there's no nullable-target case to handle.
const useCountdown = (target) => {
  const [msLeft, setMsLeft] = useState(() => target.getTime() - Date.now());

  useEffect(() => {
    const tick = () => setMsLeft(target.getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return msLeft;
};

// Shown only while a submission is genuinely pending review — once
// KYC_ESCALATION_MINUTES has elapsed since submission, the countdown gives
// way to a WhatsApp link (only if an admin has actually configured one;
// see admin/Settings.jsx's "KYC support WhatsApp number" field) so a
// shipper/transporter stuck waiting has a real way to reach a human instead
// of just staring at "under review" indefinitely.
const EscalationTimer = ({ role, submittedAt }) => {
  const { user } = useAuth();
  const branding = useBranding();
  // Memoized so useCountdown's effect (keyed on this reference) doesn't
  // tear down and restart its interval on every render — submittedAt
  // itself never changes for a given pending record, so this should only
  // ever recompute once.
  const escalationAt = useMemo(
    () => new Date(new Date(submittedAt).getTime() + KYC_ESCALATION_MINUTES * 60 * 1000),
    [submittedAt]
  );
  const msLeft = useCountdown(escalationAt);

  if (msLeft > 0) {
    return (
      <EscalationRow>
        <Clock3 size={15} strokeWidth={2.2} />
        Under review — WhatsApp support unlocks in <CountdownValue>{formatCountdown(msLeft)}</CountdownValue>
      </EscalationRow>
    );
  }

  if (!branding.kycSupportWhatsapp) {
    return (
      <EscalationRow>
        <Clock3 size={15} strokeWidth={2.2} />
        Still under review — thanks for your patience.
      </EscalationRow>
    );
  }

  const message = `Hi, I submitted my ${ROLE_LABELS[role]} KYC on ${branding.platformName} (${user?.email || "no email on file"}) and it's still pending review after ${KYC_ESCALATION_MINUTES} minutes. Could you help?`;
  const whatsappHref = `https://wa.me/91${branding.kycSupportWhatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <WhatsAppLink href={whatsappHref} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={16} strokeWidth={2.2} />
      Chat with us on WhatsApp
    </WhatsAppLink>
  );
};

const ID_PROOF_DOC_TYPES = ["aadhaar", "pan"];

// Driver ("transporter") verification requires an ID proof AND a driving
// licence in the SAME submission (verificationController.submitVerification's
// role-scoped check) — pre-seeding both slots means the transporter sees
// two upload fields from the start instead of discovering, only after a
// failed submit, that one document was never enough. Any other role keeps
// the original single freeform row.
const defaultRows = (role) =>
  role === "transporter"
    ? [
        { docType: "aadhaar", file: null },
        { docType: "driving_license", file: null },
      ]
    : [{ docType: DOC_TYPE_OPTIONS[0].value, file: null }];

const RoleUpload = ({ role, record, onSubmitted, hasProfilePhoto }) => {
  const [rows, setRows] = useState(() => defaultRows(role));
  const [businessName, setBusinessName] = useState(record?.businessName || "");
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (idx, patch) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, { docType: DOC_TYPE_OPTIONS[0].value, file: null }]);

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleView = async (doc) => {
    try {
      const url = await getFileBlobUrl(doc.url);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open that document");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const usable = rows.filter((r) => r.file);
    if (!usable.length) {
      toast.error("Attach at least one document before submitting");
      return;
    }
    // Driver verification requires an ID proof + driving licence + a
    // profile photo already on file — mirrors verificationController.
    // submitVerification's server-side check, so the transporter finds out
    // here instead of after a round trip to the server.
    if (role === "transporter") {
      const docTypes = usable.map((r) => r.docType);
      if (!docTypes.some((t) => ID_PROOF_DOC_TYPES.includes(t))) {
        toast.error("Driver verification needs BOTH an ID proof and a driving licence — attach an ID proof (Aadhaar or PAN) too, using \"+ Add another document\"");
        return;
      }
      if (!docTypes.includes("driving_license")) {
        toast.error("Driver verification needs BOTH an ID proof and a driving licence — attach a driving licence too, using \"+ Add another document\"");
        return;
      }
      if (!hasProfilePhoto) {
        toast.error("Upload a profile photo above before submitting driver verification");
        return;
      }
    }
    setSubmitting(true);
    try {
      const documents = [];
      for (const row of usable) {
        const { file } = await uploadFile(row.file);
        documents.push({ docType: row.docType, fileId: file.id });
      }
      await verificationApi.submitVerification({ type: role, businessName: businessName.trim(), documents });
      toast.success("Documents submitted for review");
      setRows(defaultRows(role));
      onSubmitted();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const status = record?.status;

  return (
    <Card>
      <Stack $gap={3}>
        <CardRow>
          <SectionTitle>{ROLE_LABELS[role]} verification</SectionTitle>
          <StatusBadge status={status}>{status || "Not submitted"}</StatusBadge>
        </CardRow>

        {status === "rejected" && record?.rejectReason && (
          <Muted>Reason for rejection: {record.rejectReason}</Muted>
        )}
        {status === "pending" && (
          <>
            <Muted>Your documents are being reviewed by our team.</Muted>
            <EscalationTimer role={role} submittedAt={record.createdAt} />
          </>
        )}
        {status === "verified" && <Muted>You're verified as a {role} — no action needed.</Muted>}
        {!record && role !== "transporter" && (
          <Muted>Submit your documents so we can verify you as a {role}.</Muted>
        )}
        {!record && role === "transporter" && (
          <Muted>
            Driver verification needs all three: an ID proof (Aadhaar or PAN), a driving licence, and a profile
            photo (upload it above). Attach both documents below before submitting.
          </Muted>
        )}

        {record?.businessName && <Muted>Business name on file: {record.businessName}</Muted>}

        {record?.documents?.length > 0 && (
          <DocList>
            {record.documents.map((doc, i) => (
              <DocListItem key={i}>
                <span>
                  {docLabel(doc.docType)} · uploaded {formatDate(doc.uploadedAt)}
                </span>
                <LinkButton type="button" onClick={() => handleView(doc)}>
                  View
                </LinkButton>
              </DocListItem>
            ))}
          </DocList>
        )}

        <form onSubmit={handleSubmit}>
          <Stack $gap={2}>
            <Field label="Business name (optional)" help="For a registered business, not an individual">
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sharma Logistics Pvt Ltd"
              />
            </Field>
            {rows.map((row, idx) => (
              <DocRow key={idx}>
                <Select
                  value={row.docType}
                  onChange={(e) => updateRow(idx, { docType: e.target.value })}
                  style={{ maxWidth: 220 }}
                >
                  {DOC_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <FileInput
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => updateRow(idx, { file: e.target.files?.[0] || null })}
                />
                {rows.length > 1 && (
                  <Button type="button" $variant="ghost" $size="sm" onClick={() => removeRow(idx)}>
                    Remove
                  </Button>
                )}
              </DocRow>
            ))}
            <Row $gap={2} $wrap>
              <Button type="button" $variant="secondary" $size="sm" onClick={addRow}>
                + Add another document
              </Button>
              <Button type="submit" $size="sm" disabled={submitting}>
                {submitting ? "Submitting…" : record ? "Resubmit for review" : "Submit for review"}
              </Button>
            </Row>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
};

const PasswordCard = ({ user, refreshUser }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await authApi.setPassword({ currentPassword, newPassword, confirmPassword });
      await refreshUser();
      toast.success(user.hasPassword ? "Password updated" : "Password set — you can now log in with email + password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Stack $gap={3}>
        <SectionTitle>Password</SectionTitle>
        <Muted>
          {user.hasPassword
            ? "Change the password you use to log in with your email."
            : "Set a password so you can also log in with your email, not just OTP."}
        </Muted>
        <form onSubmit={handleSubmit}>
          <Stack $gap={2}>
            {user.hasPassword && (
              <Field label="Current password">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
            )}
            <Field label={user.hasPassword ? "New password" : "Password"} help="At least 8 characters.">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <Row>
              <Button type="submit" $size="sm" disabled={saving}>
                {saving ? "Saving…" : user.hasPassword ? "Update password" : "Set password"}
              </Button>
            </Row>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
};

// Own small card rather than folding into NotificationPreferencesCard below
// — this toggle is a browser-level permission/subscription action (async,
// can fail, needs its own loading state), while that one is a plain
// preference PUT.
const PushNotificationsCard = () => {
  const { platformName } = useBranding();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    (async () => {
      const state = await getPushSubscriptionState();
      setSubscribed(state.subscribed);
      setLoading(false);
    })();
  }, []);

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
        toast.success("Push notifications turned off");
      } else {
        await subscribeToPush();
        setSubscribed(true);
        toast.success("Push notifications enabled");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToggling(false);
    }
  };

  if (!isPushSupported()) return null;

  return (
    <Card>
      <Stack $gap={3}>
        <SectionTitle>Push notifications</SectionTitle>
        <Muted>Get notified on this device even when {platformName} isn't open in a tab.</Muted>
        {loading ? (
          <Row style={{ justifyContent: "center", padding: "10px 0" }}>
            <Spinner $size={20} />
          </Row>
        ) : (
          <CardRow>
            <span>Enable push notifications</span>
            <Switch
              type="button"
              $on={subscribed}
              onClick={handleToggle}
              disabled={toggling}
              aria-pressed={subscribed}
              aria-label="Toggle push notifications"
            />
          </CardRow>
        )}
      </Stack>
    </Card>
  );
};

const NotificationPreferencesCard = ({ user, refreshUser }) => {
  const [categories, setCategories] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [togglingKey, setTogglingKey] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { categories } = await notificationsApi.listNotificationCategories();
        setCategories(categories || {});
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const prefs = user.notificationPreferences || {};

  const handleToggle = async (key, nextValue) => {
    setTogglingKey(key);
    try {
      await authApi.updateProfile({ notificationPreferences: { ...prefs, [key]: nextValue } });
      await refreshUser();
      toast.success("Notification preference updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <Card>
      <Stack $gap={3}>
        <SectionTitle>Notification preferences</SectionTitle>
        <Muted>
          Choose which updates you want to hear about. Turning a category off stops both in-app
          and push notifications for it — you can always turn it back on.
        </Muted>
        {loadingCategories ? (
          <Row style={{ justifyContent: "center", padding: "20px 0" }}>
            <Spinner $size={22} />
          </Row>
        ) : (
          <Stack $gap={3}>
            {Object.entries(categories).map(([key, label]) => {
              // Unset/missing means "on", matching notify()'s `=== false` suppression check.
              const isOn = prefs[key] !== false;
              return (
                <CardRow key={key}>
                  <span>{label}</span>
                  <Switch
                    type="button"
                    $on={isOn}
                    onClick={() => handleToggle(key, !isOn)}
                    disabled={togglingKey === key}
                    aria-pressed={isOn}
                    aria-label={`Toggle ${label}`}
                  />
                </CardRow>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

export const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { platformName } = useBranding();

  const [form, setForm] = useState({ name: "", city: "", mobile: "" });
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingRole, setAddingRole] = useState(null);

  const [verifications, setVerifications] = useState([]);
  const [loadingVerifications, setLoadingVerifications] = useState(true);

  useEffect(() => {
    // Re-seeds the editable form from the account whenever it (re)loads —
    // e.g. after AuthContext's initial fetch, or a save's refreshUser().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setForm({ name: user.name || "", city: user.city || "", mobile: user.mobile || "" });
  }, [user]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.profilePhoto) {
        setAvatarUrl(null);
        return;
      }
      try {
        const url = await getFileBlobUrl(user.profilePhoto);
        if (active) setAvatarUrl(url);
      } catch {
        if (active) setAvatarUrl(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.profilePhoto]);

  // SRS-09.2 — name locks once any verification is approved (see
  // authController.updateProfile, which enforces this server-side too;
  // this just avoids the round trip of submitting an edit that's only
  // going to come back rejected).
  const nameLocked = verifications.some((v) => v.status === "verified");

  const loadVerifications = async () => {
    try {
      const { verifications } = await verificationApi.getMyVerifications();
      setVerifications(verifications);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingVerifications(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadVerifications();
    })();
  }, []);

  if (!user) {
    return (
      <PageContainer>
        <Row style={{ justifyContent: "center", padding: "60px 0" }}>
          <Spinner $size={28} />
        </Row>
      </PageContainer>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    try {
      await authApi.updateProfile({
        name: form.name.trim(),
        city: form.city.trim(),
        mobile: form.mobile.trim(),
      });
      await refreshUser();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const { file: uploaded } = await uploadFile(file);
      await authApi.updateProfile({ profilePhoto: uploaded.url });
      await refreshUser();
      toast.success("Photo updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddRole = async (role) => {
    setAddingRole(role);
    try {
      await authApi.addRole(role);
      await refreshUser();
      toast.success(`You can now use ${platformName} as a ${role}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAddingRole(null);
    }
  };

  const missingRoles = ["shipper", "transporter"].filter((r) => !user.roles?.includes(r));

  return (
    <PageContainer>
      <Stack $gap={5}>

        <Card>
          <Stack $gap={4}>
            <AvatarRow>
              <Avatar>
                {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : (user.name?.[0] || "?").toUpperCase()}
              </Avatar>
              <Stack $gap={1}>
                <Button as="label" $variant="secondary" $size="sm" disabled={uploadingPhoto}>
                  {uploadingPhoto ? "Uploading…" : "Change photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                    disabled={uploadingPhoto}
                  />
                </Button>
                <Muted>JPEG or PNG, up to 10MB</Muted>
                <Muted>
                  {ratingLabel(user.ratingAvg, user.ratingCount)}
                  {user.createdAt ? ` · Member since ${formatDate(user.createdAt)}` : ""}
                </Muted>
              </Stack>
            </AvatarRow>

            <form onSubmit={handleSaveProfile}>
              <Stack $gap={3}>
                <Field
                  label="Name"
                  help={nameLocked ? "Locked after verification — matches your approved documents. Contact support to change it." : undefined}
                >
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={nameLocked}
                  />
                </Field>
                <Field label="Email" help="This is your verified login identity and can't be changed.">
                  <Row $gap={2}>
                    <Input value={user.email} disabled style={{ maxWidth: 260 }} />
                    <StatusBadge status={user.emailVerified ? "verified" : "pending"}>
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </StatusBadge>
                  </Row>
                </Field>
                <Field label="City">
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Field>
                <Field label="Mobile number (optional)" help="Adding your mobile number helps in communication.">
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  />
                </Field>
                <Row>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </Row>
              </Stack>
            </form>
          </Stack>
        </Card>

        <PasswordCard user={user} refreshUser={refreshUser} />

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Roles</SectionTitle>
            {user.roles?.length > 0 ? (
              <Row $gap={2} $wrap>
                {user.roles.map((r) => (
                  <StatusBadge key={r} status="verified">
                    {ROLE_LABELS[r] || r}
                  </StatusBadge>
                ))}
              </Row>
            ) : (
              <Muted>You haven't picked a role yet — choose one to get started.</Muted>
            )}

            {missingRoles.length > 0 && (
              <Row $gap={2} $wrap>
                {missingRoles.map((r) => (
                  <Button
                    key={r}
                    $variant="secondary"
                    $size="sm"
                    disabled={addingRole === r}
                    onClick={() => handleAddRole(r)}
                  >
                    {addingRole === r
                      ? "Adding…"
                      : `Also become a ${ROLE_LABELS[r].toLowerCase()}`}
                  </Button>
                ))}
              </Row>
            )}
          </Stack>
        </Card>

        <PushNotificationsCard />
        <NotificationPreferencesCard user={user} refreshUser={refreshUser} />

        {loadingVerifications ? (
          <Row style={{ justifyContent: "center", padding: "24px 0" }}>
            <Spinner $size={22} />
          </Row>
        ) : user.roles?.length > 0 ? (
          user.roles.map((role) => (
            <RoleUpload
              key={role}
              role={role}
              record={verifications.find((v) => v.type === role)}
              onSubmitted={loadVerifications}
              hasProfilePhoto={Boolean(user.profilePhoto)}
            />
          ))
        ) : null}

        <Row style={{ justifyContent: "center" }}>
          <Muted>
            <Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link>
          </Muted>
        </Row>
      </Stack>
    </PageContainer>
  );
};

export default Profile;
