import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAdminUserDetail, setAdminUserStatus, setAdminRole } from "../../api/admin";
import { getFileBlobUrl } from "../../api/files";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import { PageContainer, PageTitle, SectionTitle, Stack, Row, Grid, Muted } from "../../components/ui/Layout";
import { Card, CardRow } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Field, Select } from "../../components/ui/Form";
import { formatDate, formatDateTime, formatINR } from "../../utils/format";

const ADMIN_SCOPES = [
  { value: "", label: "None — not an admin" },
  { value: "full", label: "Full admin (superuser)" },
  { value: "verification", label: "Verification" },
  { value: "support", label: "Support" },
  { value: "finance", label: "Finance" },
];

const handleView = async (doc) => {
  try {
    const url = await getFileBlobUrl(doc.url);
    window.open(url, "_blank", "noopener");
  } catch {
    toast.error("Could not open that document");
  }
};

const DocRow = ({ doc }) => (
  <Row style={{ justifyContent: "space-between" }}>
    <Muted>{doc.docType}</Muted>
    <Button $variant="ghost" $size="sm" onClick={() => handleView(doc)}>
      View
    </Button>
  </Row>
);

export const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();
  const { platformName } = useBranding();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null); // "suspend" | "ban" | "reactivate"
  const [submitting, setSubmitting] = useState(false);
  const [scopeDraft, setScopeDraft] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const load = async (cancelled) => {
    try {
      const detail = await getAdminUserDetail(id);
      if (cancelled?.current) return;
      setData(detail);
      setScopeDraft(detail.user.adminScope || "");
    } catch (error) {
      if (cancelled?.current) return;
      toast.error(error.message);
    } finally {
      if (!cancelled?.current) setLoading(false);
    }
  };

  useEffect(() => {
    const cancelled = { current: false };
    (async () => {
      await load(cancelled);
    })();
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveRole = async () => {
    setSavingRole(true);
    try {
      await setAdminRole(id, { isAdmin: !!scopeDraft, adminScope: scopeDraft || undefined });
      toast.success("Admin access updated");
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingRole(false);
    }
  };

  const handleStatusChange = async (reason) => {
    const status = action === "reactivate" ? "active" : action;
    setSubmitting(true);
    try {
      await setAdminUserStatus(id, { status, reason: reason || undefined });
      toast.success(`User ${status === "active" ? "reactivated" : status}`);
      setAction(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Row style={{ justifyContent: "center", padding: "80px 0" }}>
          <Spinner $size={28} />
        </Row>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <PageTitle>User not found</PageTitle>
        <Button $variant="secondary" onClick={() => navigate("/admin/users")}>
          Back to Users
        </Button>
      </PageContainer>
    );
  }

  const { user, verifications, trucks, bookingsAsShipper, tripsAsTransporter } = data;

  return (
    <PageContainer style={{ maxWidth: 960 }}>
      <Stack $gap={5}>
        <Row style={{ justifyContent: "space-between" }} $wrap>
          <PageTitle>{user.name || "User"}</PageTitle>
          <Button $variant="ghost" $size="sm" onClick={() => navigate("/admin/users")}>
            ← Back to Users
          </Button>
        </Row>

        <Card>
          <Stack $gap={3}>
            <CardRow>
              <SectionTitle>Profile</SectionTitle>
              <StatusBadge status={user.status} />
            </CardRow>
            <Grid $cols={1} $colsTablet={2} $gap={2}>
              <Muted>Mobile: {user.mobile || "—"}</Muted>
              <Muted>Email: {user.email || "—"}</Muted>
              <Muted>City: {user.city || "—"}</Muted>
              <Muted>Joined: {formatDate(user.createdAt)}</Muted>
              <Muted>
                Rating: {user.ratingCount ? `★ ${Number(user.ratingAvg).toFixed(1)} (${user.ratingCount})` : "No ratings yet"}
              </Muted>
              <Muted>Roles: {(user.roles || []).join(", ") || "None"}</Muted>
            </Grid>
            {user.status !== "active" && user.statusReason && (
              <Muted>Current status reason: {user.statusReason}</Muted>
            )}

            <Row $gap={2} $wrap>
              {user.status !== "active" && (
                <Button $size="sm" onClick={() => setAction("reactivate")}>
                  Reactivate
                </Button>
              )}
              {user.status !== "suspended" && (
                <Button $variant="secondary" $size="sm" onClick={() => setAction("suspend")}>
                  Suspend
                </Button>
              )}
              {user.status !== "banned" && (
                <Button $variant="danger" $size="sm" onClick={() => setAction("ban")}>
                  Ban
                </Button>
              )}
            </Row>
          </Stack>
        </Card>

        {viewer?.adminScope === "full" && (
          <Card>
            <Stack $gap={3}>
              <SectionTitle>Admin access</SectionTitle>
              {user._id === viewer.id ? (
                <Muted>You can't change your own admin access — ask another full admin.</Muted>
              ) : (
                <>
                  <Muted>
                    Current: {user.isAdmin ? ADMIN_SCOPES.find((s) => s.value === (user.adminScope || ""))?.label || "Admin" : "Not an admin"}
                  </Muted>
                  <Field label="Scope">
                    <Select value={scopeDraft} onChange={(e) => setScopeDraft(e.target.value)}>
                      {ADMIN_SCOPES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Row>
                    <Button
                      $size="sm"
                      disabled={savingRole || scopeDraft === (user.adminScope || "")}
                      onClick={handleSaveRole}
                    >
                      {savingRole ? "Saving…" : "Save admin access"}
                    </Button>
                  </Row>
                </>
              )}
            </Stack>
          </Card>
        )}

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Verifications</SectionTitle>
            {verifications?.length ? (
              <Stack $gap={3}>
                {verifications.map((v) => (
                  <Stack $gap={1} key={v._id}>
                    <CardRow>
                      <strong style={{ textTransform: "capitalize" }}>{v.type}</strong>
                      <StatusBadge status={v.status} />
                    </CardRow>
                    {v.status === "rejected" && v.rejectReason && <Muted>Reason: {v.rejectReason}</Muted>}
                    {v.documents?.map((doc, i) => (
                      <DocRow key={i} doc={doc} />
                    ))}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Muted>No verification submissions yet.</Muted>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Trucks</SectionTitle>
            {trucks?.length ? (
              <Stack $gap={3}>
                {trucks.map((t) => (
                  <Stack $gap={1} key={t._id}>
                    <CardRow>
                      <strong>
                        {t.regNumber} · {t.truckType}
                        {t.bodyType ? ` / ${t.bodyType}` : ""}
                      </strong>
                      <StatusBadge status={t.status} />
                    </CardRow>
                    <Muted>Capacity: {t.totalCapacity}t</Muted>
                    {t.status === "rejected" && t.rejectReason && <Muted>Reason: {t.rejectReason}</Muted>}
                    {t.documents?.map((doc, i) => (
                      <DocRow key={i} doc={doc} />
                    ))}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Muted>No trucks registered.</Muted>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Bookings as shipper</SectionTitle>
            {bookingsAsShipper?.length ? (
              <Stack $gap={2}>
                {bookingsAsShipper.map((b) => (
                  <CardRow key={b._id}>
                    <Stack $gap={0}>
                      <span>{b.goodsDescription || "Booking"}</span>
                      <Muted>
                        {b.capacityRequested}t · {formatDateTime(b.createdAt)}
                      </Muted>
                    </Stack>
                    <Stack $gap={0} style={{ alignItems: "flex-end" }}>
                      <StatusBadge status={b.status} />
                      <Muted>{formatINR(b.priceEstimate)}</Muted>
                    </Stack>
                  </CardRow>
                ))}
              </Stack>
            ) : (
              <Muted>No bookings as a shipper yet.</Muted>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack $gap={3}>
            <SectionTitle>Trips as transporter</SectionTitle>
            {tripsAsTransporter?.length ? (
              <Stack $gap={2}>
                {tripsAsTransporter.map((t) => (
                  <CardRow key={t._id}>
                    <Stack $gap={0}>
                      <span>
                        {t.fromCity} → {t.toCity}
                      </span>
                      <Muted>{formatDateTime(t.departureAt)}</Muted>
                    </Stack>
                    <Stack $gap={0} style={{ alignItems: "flex-end" }}>
                      <StatusBadge status={t.status} />
                      <Muted>
                        {t.availableCapacity}/{t.totalCapacity}t · {formatINR(t.pricePerTon)}/t
                      </Muted>
                    </Stack>
                  </CardRow>
                ))}
              </Stack>
            ) : (
              <Muted>No trips posted as a transporter yet.</Muted>
            )}
          </Stack>
        </Card>
      </Stack>

      <ConfirmModal
        open={!!action}
        title={
          action === "reactivate"
            ? "Reactivate this user?"
            : action === "suspend"
            ? "Suspend this user?"
            : "Ban this user?"
        }
        description={
          action === "reactivate"
            ? `They'll regain full access to ${platformName}.`
            : `They'll be signed out and blocked from using ${platformName} until reactivated.`
        }
        requireReason={action !== "reactivate"}
        reasonLabel={action === "ban" ? "Reason for ban" : "Reason for suspension"}
        confirmLabel={action === "reactivate" ? "Reactivate" : action === "ban" ? "Ban user" : "Suspend user"}
        danger={action !== "reactivate"}
        submitting={submitting}
        onConfirm={handleStatusChange}
        onCancel={() => setAction(null)}
      />
    </PageContainer>
  );
};

export default UserDetail;
