import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Star,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  IdCard,
  FileCheck2,
  Truck as TruckIcon,
  Package,
  Route as RouteIcon,
  FileText,
  ArrowUpRight,
  Inbox,
} from "lucide-react";
import { getAdminUserDetail, setAdminUserStatus, setAdminRole } from "../../api/admin";
import { getFileBlobUrl } from "../../api/files";
import { ADMIN_SCOPES } from "../../utils/adminScopes";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Field, Select } from "../../components/ui/Form";
import { AdminCard } from "../../components/ui/AdminTable";
import { formatDate, formatDateTime, formatINR } from "../../utils/format";

// Opens a verification/truck document in a new tab. Unchanged from the
// pre-redesign version — same api/files call, same window.open contract —
// only the trigger element around it (DocChip below) changed shape.
const handleView = async (doc) => {
  try {
    const url = await getFileBlobUrl(doc.url);
    window.open(url, "_blank", "noopener");
  } catch {
    toast.error("Could not open that document");
  }
};

const Page = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 16px 56px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 28px 32px 64px;
  }
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

const Section = styled.div`
  margin-top: 20px;

  &:first-child {
    margin-top: 0;
  }
`;

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
`;

const SectionIconWrap = styled.span`
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.admin.color.primarySoft};
  color: ${({ theme }) => theme.admin.color.primaryDark};
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};
`;

const SectionCount = styled.span`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

// --- Header ----------------------------------------------------------------

const HeaderCard = styled(AdminCard)`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: flex;
  gap: 14px;
  min-width: 0;
`;

const HeaderBody = styled.div`
  min-width: 0;
`;

const HeaderNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const HeaderName = styled.h1`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};
`;

const HeaderEmail = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  margin-top: 3px;
`;

const RoleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const StatusReason = styled.div`
  margin-top: 12px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  background: ${({ theme }) => theme.admin.color.bg};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  padding: 8px 12px;
  max-width: 480px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: none;
`;

// --- KPI strip ---------------------------------------------------------

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const KpiCard = styled(AdminCard)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const KpiTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const KpiLabel = styled.div`
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const KpiIconWrap = styled.span`
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.admin.color.primarySoft};
  color: ${({ theme }) => theme.admin.color.primaryDark};
`;

const KpiValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.admin.color.text};
  line-height: 1.1;
`;

const KpiSub = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

// --- Two-column row (profile info + admin access) ---------------------

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;

  @media (min-width: ${({ theme }) => theme.breakpoint.phone}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const InfoItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

const InfoIconWrap = styled.span`
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.admin.color.bg};
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const InfoLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const InfoValue = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.text};
  margin-top: 1px;
  word-break: break-word;
`;

const NoRolesText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textMuted};
`;

const AdminAccessCurrent = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.admin.color.textSecondary};

  strong {
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

// --- Repeating list sections (verifications / trucks / bookings / trips) --

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ItemRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 0;
  flex-wrap: wrap;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.admin.color.border};
  }
`;

const ItemMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 220px;
`;

const ItemTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.admin.color.text};
  text-transform: capitalize;
`;

const RouteTitle = styled(ItemTitle)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-transform: none;

  svg {
    color: ${({ theme }) => theme.admin.color.textMuted};
  }
`;

const ItemMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
`;

const ItemReason = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.danger};
`;

const ItemRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex: none;
`;

const DocRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const DocChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  background: ${({ theme }) => theme.admin.color.surface};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  white-space: nowrap;
  text-transform: none;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.admin.color.primary};
    color: ${({ theme }) => theme.admin.color.primaryDark};
    background: ${({ theme }) => theme.admin.color.primarySoft};
  }
`;

const EmptyBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 16px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  text-align: center;
  font-size: 13px;
`;

const AdminEmptyState = ({ icon: Icon = Inbox, children }) => (
  <EmptyBlock>
    <Icon size={20} strokeWidth={1.8} />
    <span>{children}</span>
  </EmptyBlock>
);

const CenteredSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 100px 0;
`;

const DocList = ({ documents }) =>
  documents?.length ? (
    <DocRow>
      {documents.map((doc, i) => (
        <DocChip key={i} type="button" onClick={() => handleView(doc)}>
          <FileText size={12.5} strokeWidth={2.2} />
          {doc.docType}
        </DocChip>
      ))}
    </DocRow>
  ) : null;

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
      <Page>
        <CenteredSpinner>
          <Spinner $size={28} />
        </CenteredSpinner>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        <AdminCard>
          <AdminEmptyState>User not found.</AdminEmptyState>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
            <Button $variant="secondary" $size="sm" onClick={() => navigate("/admin/users")}>
              <ArrowLeft size={14} strokeWidth={2.4} />
              Back to Users
            </Button>
          </div>
        </AdminCard>
      </Page>
    );
  }

  const { user, verifications, trucks, bookingsAsShipper, tripsAsTransporter } = data;
  const isFullAdmin = viewer?.adminScope === "full";

  const ProfileInfoCard = (
    <AdminCard>
      <SectionHead>
        <SectionIconWrap>
          <IdCard size={15} strokeWidth={2.2} />
        </SectionIconWrap>
        <SectionTitle>Profile</SectionTitle>
      </SectionHead>
      <InfoGrid>
        <InfoItem>
          <InfoIconWrap>
            <Phone size={14} strokeWidth={2.2} />
          </InfoIconWrap>
          <div>
            <InfoLabel>Mobile</InfoLabel>
            <InfoValue>{user.mobile || "—"}</InfoValue>
          </div>
        </InfoItem>
        <InfoItem>
          <InfoIconWrap>
            <Mail size={14} strokeWidth={2.2} />
          </InfoIconWrap>
          <div>
            <InfoLabel>Email</InfoLabel>
            <InfoValue>{user.email || "—"}</InfoValue>
          </div>
        </InfoItem>
        <InfoItem>
          <InfoIconWrap>
            <MapPin size={14} strokeWidth={2.2} />
          </InfoIconWrap>
          <div>
            <InfoLabel>City</InfoLabel>
            <InfoValue>{user.city || "—"}</InfoValue>
          </div>
        </InfoItem>
        <InfoItem>
          <InfoIconWrap>
            <CalendarDays size={14} strokeWidth={2.2} />
          </InfoIconWrap>
          <div>
            <InfoLabel>Joined</InfoLabel>
            <InfoValue>{formatDate(user.createdAt)}</InfoValue>
          </div>
        </InfoItem>
      </InfoGrid>
    </AdminCard>
  );

  const AdminAccessCard = (
    <AdminCard>
      <SectionHead>
        <SectionIconWrap>
          <ShieldCheck size={15} strokeWidth={2.2} />
        </SectionIconWrap>
        <SectionTitle>Admin access</SectionTitle>
      </SectionHead>
      {user._id === viewer.id ? (
        <AdminAccessCurrent>You can't change your own admin access — ask another full admin.</AdminAccessCurrent>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <AdminAccessCurrent>
            Current:{" "}
            <strong>
              {user.isAdmin
                ? ADMIN_SCOPES.find((s) => s.value === (user.adminScope || ""))?.label || "Admin"
                : "Not an admin"}
            </strong>
          </AdminAccessCurrent>
          <Field label="Scope">
            <Select value={scopeDraft} onChange={(e) => setScopeDraft(e.target.value)}>
              {ADMIN_SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <Button
              $size="sm"
              disabled={savingRole || scopeDraft === (user.adminScope || "")}
              onClick={handleSaveRole}
            >
              {savingRole ? "Saving…" : "Save admin access"}
            </Button>
          </div>
        </div>
      )}
    </AdminCard>
  );

  return (
    <Page>
      <BackButton type="button" onClick={() => navigate("/admin/users")}>
        <ArrowLeft size={14} strokeWidth={2.4} />
        Back to Users
      </BackButton>

      <Section>
        <HeaderCard>
          <HeaderLeft>
            <Avatar name={user.name} size={52} />
            <HeaderBody>
              <HeaderNameRow>
                <HeaderName>{user.name || "User"}</HeaderName>
                <StatusBadge status={user.status} />
                {user.isAdmin && <StatusBadge status="verified">admin</StatusBadge>}
              </HeaderNameRow>
              <HeaderEmail>{user.email || "—"}</HeaderEmail>
              <RoleRow>
                {(user.roles || []).length ? (
                  user.roles.map((r) => (
                    <StatusBadge key={r} status="verified">
                      {r}
                    </StatusBadge>
                  ))
                ) : (
                  <NoRolesText>No roles</NoRolesText>
                )}
              </RoleRow>
              {user.status !== "active" && user.statusReason && (
                <StatusReason>Current status reason: {user.statusReason}</StatusReason>
              )}
            </HeaderBody>
          </HeaderLeft>

          <HeaderActions>
            {user.status !== "active" && (
              <Button $size="sm" onClick={() => setAction("reactivate")}>
                <ShieldCheck size={14} strokeWidth={2.4} />
                Reactivate
              </Button>
            )}
            {user.status !== "suspended" && (
              <Button $variant="secondary" $size="sm" onClick={() => setAction("suspend")}>
                <ShieldAlert size={14} strokeWidth={2.4} />
                Suspend
              </Button>
            )}
            {user.status !== "banned" && (
              <Button $variant="danger" $size="sm" onClick={() => setAction("ban")}>
                <ShieldX size={14} strokeWidth={2.4} />
                Ban
              </Button>
            )}
          </HeaderActions>
        </HeaderCard>
      </Section>

      <Section>
        <KpiGrid>
          <KpiCard>
            <KpiTop>
              <KpiLabel>Rating</KpiLabel>
              <KpiIconWrap>
                <Star size={15} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{user.ratingCount ? Number(user.ratingAvg).toFixed(1) : "—"}</KpiValue>
            <KpiSub>{user.ratingCount ? `${user.ratingCount} rating${user.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}</KpiSub>
          </KpiCard>

          <KpiCard>
            <KpiTop>
              <KpiLabel>Trucks</KpiLabel>
              <KpiIconWrap>
                <TruckIcon size={15} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{trucks?.length || 0}</KpiValue>
            <KpiSub>registered</KpiSub>
          </KpiCard>

          <KpiCard>
            <KpiTop>
              <KpiLabel>Bookings</KpiLabel>
              <KpiIconWrap>
                <Package size={15} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{bookingsAsShipper?.length || 0}</KpiValue>
            <KpiSub>as shipper</KpiSub>
          </KpiCard>

          <KpiCard>
            <KpiTop>
              <KpiLabel>Trips</KpiLabel>
              <KpiIconWrap>
                <RouteIcon size={15} strokeWidth={2.2} />
              </KpiIconWrap>
            </KpiTop>
            <KpiValue>{tripsAsTransporter?.length || 0}</KpiValue>
            <KpiSub>as transporter</KpiSub>
          </KpiCard>
        </KpiGrid>
      </Section>

      <Section>{isFullAdmin ? <TwoCol>{ProfileInfoCard}{AdminAccessCard}</TwoCol> : ProfileInfoCard}</Section>

      <Section>
        <AdminCard>
          <SectionHead>
            <SectionIconWrap>
              <FileCheck2 size={15} strokeWidth={2.2} />
            </SectionIconWrap>
            <SectionTitle>Verifications</SectionTitle>
            {!!verifications?.length && <SectionCount>{verifications.length}</SectionCount>}
          </SectionHead>
          {verifications?.length ? (
            <ItemList>
              {verifications.map((v) => (
                <ItemRow key={v._id}>
                  <ItemMain>
                    <ItemTitle>{v.type}</ItemTitle>
                    {v.status === "rejected" && v.rejectReason && <ItemReason>Reason: {v.rejectReason}</ItemReason>}
                    <DocList documents={v.documents} />
                  </ItemMain>
                  <ItemRight>
                    <StatusBadge status={v.status} />
                  </ItemRight>
                </ItemRow>
              ))}
            </ItemList>
          ) : (
            <AdminEmptyState icon={ShieldQuestion}>No verification submissions yet.</AdminEmptyState>
          )}
        </AdminCard>
      </Section>

      <Section>
        <AdminCard>
          <SectionHead>
            <SectionIconWrap>
              <TruckIcon size={15} strokeWidth={2.2} />
            </SectionIconWrap>
            <SectionTitle>Trucks</SectionTitle>
            {!!trucks?.length && <SectionCount>{trucks.length}</SectionCount>}
          </SectionHead>
          {trucks?.length ? (
            <ItemList>
              {trucks.map((t) => (
                <ItemRow key={t._id}>
                  <ItemMain>
                    <ItemTitle style={{ textTransform: "none" }}>
                      {t.regNumber} · {t.truckType}
                      {t.bodyType ? ` / ${t.bodyType}` : ""}
                    </ItemTitle>
                    <ItemMeta>Capacity: {t.totalCapacity}t</ItemMeta>
                    {t.status === "rejected" && t.rejectReason && <ItemReason>Reason: {t.rejectReason}</ItemReason>}
                    <DocList documents={t.documents} />
                  </ItemMain>
                  <ItemRight>
                    <StatusBadge status={t.status} />
                  </ItemRight>
                </ItemRow>
              ))}
            </ItemList>
          ) : (
            <AdminEmptyState icon={TruckIcon}>No trucks registered.</AdminEmptyState>
          )}
        </AdminCard>
      </Section>

      <Section>
        <AdminCard>
          <SectionHead>
            <SectionIconWrap>
              <Package size={15} strokeWidth={2.2} />
            </SectionIconWrap>
            <SectionTitle>Bookings as shipper</SectionTitle>
            {!!bookingsAsShipper?.length && <SectionCount>{bookingsAsShipper.length}</SectionCount>}
          </SectionHead>
          {bookingsAsShipper?.length ? (
            <ItemList>
              {bookingsAsShipper.map((b) => (
                <ItemRow key={b._id}>
                  <ItemMain>
                    <ItemTitle style={{ textTransform: "none" }}>{b.goodsDescription || "Booking"}</ItemTitle>
                    <ItemMeta>
                      {b.capacityRequested}t · {formatDateTime(b.createdAt)}
                    </ItemMeta>
                  </ItemMain>
                  <ItemRight>
                    <StatusBadge status={b.status} />
                    <ItemMeta>{formatINR(b.priceEstimate)}</ItemMeta>
                  </ItemRight>
                </ItemRow>
              ))}
            </ItemList>
          ) : (
            <AdminEmptyState icon={Package}>No bookings as a shipper yet.</AdminEmptyState>
          )}
        </AdminCard>
      </Section>

      <Section>
        <AdminCard>
          <SectionHead>
            <SectionIconWrap>
              <RouteIcon size={15} strokeWidth={2.2} />
            </SectionIconWrap>
            <SectionTitle>Trips as transporter</SectionTitle>
            {!!tripsAsTransporter?.length && <SectionCount>{tripsAsTransporter.length}</SectionCount>}
          </SectionHead>
          {tripsAsTransporter?.length ? (
            <ItemList>
              {tripsAsTransporter.map((t) => (
                <ItemRow key={t._id}>
                  <ItemMain>
                    <RouteTitle>
                      {t.fromCity} <ArrowUpRight size={12} style={{ transform: "rotate(45deg)" }} /> {t.toCity}
                    </RouteTitle>
                    <ItemMeta>{formatDateTime(t.departureAt)}</ItemMeta>
                  </ItemMain>
                  <ItemRight>
                    <StatusBadge status={t.status} />
                    <ItemMeta>
                      {t.availableCapacity}/{t.totalCapacity}t · {formatINR(t.pricePerTon)}/t
                    </ItemMeta>
                  </ItemRight>
                </ItemRow>
              ))}
            </ItemList>
          ) : (
            <AdminEmptyState icon={RouteIcon}>No trips posted as a transporter yet.</AdminEmptyState>
          )}
        </AdminCard>
      </Section>

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
    </Page>
  );
};

export default UserDetail;
