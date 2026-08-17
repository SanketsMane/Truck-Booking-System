import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ShieldPlus, Trash2, UserPlus } from "lucide-react";
import { listAdminUsers, createAdminUser, setAdminRole, setAdminUserStatus, deleteAdminUser } from "../../api/admin";
import { useAuth } from "../../context/AuthContext";
import { PageContainer, Row, Stack, Muted, SectionTitle, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { Field, Input, PasswordInput, Select, Textarea } from "../../components/ui/Form";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { ADMIN_SCOPES } from "../../utils/adminScopes";
import {
  Toolbar,
  AdminSearchInput,
  AdminSelect,
  ToolbarSpacer,
  ResultsCount,
  ClearFiltersButton,
} from "../../components/ui/AdminToolbar";
import {
  TableScroll,
  Table,
  Th,
  Td,
  Tr,
  IndexTh,
  IndexTd,
  AdminCard,
  AdminSkeletonRows,
} from "../../components/ui/AdminTable";
import { formatDate } from "../../utils/format";
import { fadeIn, scaleIn } from "../../theme/animations";

const NameLink = styled(Link)`
  font-weight: 600;
  &:hover {
    color: ${({ theme }) => theme.admin.color.primary};
  }
`;

// Compact, icon-only secondary actions (Make admin / Delete) so a row's
// action cell never needs to wrap onto a second line the way three
// full-width labeled buttons did — "View" stays a labeled button since
// it's the one every row always has and the one worth scanning for; the
// rest collapse to an icon + tooltip, same hierarchy most admin consoles
// use (one primary label, icon-only for the rest).
const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  background: ${({ theme }) => theme.admin.color.surface};
  color: ${({ theme, $danger }) => ($danger ? theme.color.danger : theme.admin.color.textMuted)};
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $danger }) => ($danger ? theme.color.dangerSoft : theme.admin.color.bg)};
    border-color: ${({ theme, $danger }) => ($danger ? theme.color.danger : theme.admin.color.borderStrong)};
    color: ${({ theme, $danger }) => ($danger ? theme.color.danger : theme.admin.color.text)};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ActionsCell = styled(Row).attrs({ $gap: 1 })`
  justify-content: flex-end;
  flex-wrap: nowrap;
`;

const RolesCell = styled(Row).attrs({ $gap: 1 })`
  flex-wrap: wrap;
`;

// Same pill-toggle pattern as admin/Settings.jsx's own Switch (and
// Profile.jsx's copy of it) — kept local here too rather than extracted,
// following that established precedent — just on admin.color tokens
// instead of the consumer palette, matching this page's own console
// styling. "On" = active; suspended AND banned both render "off" (a
// banned user toggled back on reactivates them, same as a suspended one).
const StatusSwitch = styled.button`
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid ${({ theme, $on }) => ($on ? theme.admin.color.primary : theme.admin.color.border)};
  background: ${({ theme, $on }) => ($on ? theme.admin.color.primary : theme.admin.color.bg)};
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;

  &::after {
    content: "";
    position: absolute;
    top: 1px;
    left: ${({ $on }) => ($on ? "19px" : "1px")};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ theme, $on }) => ($on ? theme.admin.color.onPrimary : theme.admin.color.textMuted)};
    transition: left 0.15s ease;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const GRANTABLE_SCOPES = ADMIN_SCOPES.filter((s) => s.value);

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 21, 15, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  animation: ${fadeIn} 0.15s ease;
`;

const ModalCard = styled(Card)`
  width: 100%;
  max-width: 420px;
  animation: ${scaleIn} 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);

  &:focus {
    outline: none;
  }
`;

// Grants admin access to a user who doesn't have it yet — separate from
// UserDetail.jsx's "Admin access" card (which also handles changing an
// existing admin's scope or revoking it entirely), since this is the fast
// path for the one thing this table's action button offers: promote.
// Mirrors ConfirmModal.jsx's overlay/dialog chrome so it looks and behaves
// like every other admin modal, but needs a scope <select> ConfirmModal's
// single-reason-textarea contract doesn't support.
const MakeAdminModal = ({ user, onConfirm, onCancel, submitting }) => {
  const [scope, setScope] = useState(GRANTABLE_SCOPES[0].value);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, submitting]);

  return (
    <Overlay onClick={submitting ? undefined : onCancel}>
      <ModalCard tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="make-admin-title" onClick={(e) => e.stopPropagation()}>
        <Stack $gap={3}>
          <Stack $gap={1}>
            <SectionTitle id="make-admin-title">Make {user.name || user.email} an admin?</SectionTitle>
            <Muted>They'll get admin console access at the scope you choose below.</Muted>
          </Stack>
          <Field label="Scope">
            <Select value={scope} onChange={(e) => setScope(e.target.value)} autoFocus>
              {GRANTABLE_SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason (optional)" help="Recorded in the audit log.">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Row $gap={2} style={{ justifyContent: "flex-end" }}>
            <Button type="button" $variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onConfirm(scope, reason.trim())} disabled={submitting}>
              {submitting ? "Granting…" : "Grant admin access"}
            </Button>
          </Row>
        </Stack>
      </ModalCard>
    </Overlay>
  );
};

// "Admin" here is one of the three Role choices (not a second roles[]
// entry like Shipper/Transporter) — creating an admin sets isAdmin/
// adminScope directly, mirroring MakeAdminModal's own scope choice, just
// folded into this form's single Role field instead of a separate step.
const ROLE_OPTIONS = [
  { value: "shipper", label: "Shipper" },
  { value: "transporter", label: "Transporter" },
  { value: "admin", label: "Admin" },
];

const initialAddUserForm = { name: "", email: "", password: "", role: "shipper", adminScope: GRANTABLE_SCOPES[0].value };

// Creates a user account directly (name/email/password/role) rather than
// through the normal email-OTP signup flow — for standing up a known
// contact, a test account, or another admin without them self-registering
// first. Same Overlay/ModalCard chrome as MakeAdminModal above, for the
// same reason that one doesn't reuse ConfirmModal: more than one field.
const AddUserModal = ({ onConfirm, onCancel, submitting }) => {
  const [form, setForm] = useState(initialAddUserForm);
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, submitting]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(form);
  };

  return (
    <Overlay onClick={submitting ? undefined : onCancel}>
      <ModalCard
        as="form"
        onSubmit={handleSubmit}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-title"
        onClick={(e) => e.stopPropagation()}
      >
        <Stack $gap={3}>
          <Stack $gap={1}>
            <SectionTitle id="add-user-title">Add a user</SectionTitle>
            <Muted>Creates the account directly — no email OTP step.</Muted>
          </Stack>
          <Field label="Name">
            <Input value={form.name} onChange={setField("name")} autoFocus required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={setField("email")} required />
          </Field>
          <Field label="Password" help="At least 8 characters.">
            <PasswordInput value={form.password} onChange={setField("password")} autoComplete="new-password" required />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={setField("role")}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          {form.role === "admin" && (
            <Field label="Admin scope">
              <Select value={form.adminScope} onChange={setField("adminScope")}>
                {GRANTABLE_SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Row $gap={2} style={{ justifyContent: "flex-end" }}>
            <Button type="button" $variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </Row>
        </Stack>
      </ModalCard>
    </Overlay>
  );
};

export const Users = () => {
  const { user: viewer } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promoting, setPromoting] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  // Bumped after a successful create to re-run the fetch effect below even
  // though none of its other dependencies (page/pageSize/filters) changed —
  // the simplest way to make the new user show up without duplicating the
  // fetch logic here.
  const [refreshTick, setRefreshTick] = useState(0);
  // Holds the user being paused/reactivated so the confirm modal can read
  // both directions off one piece of state — pausing (active -> suspended)
  // needs a reason and reactivating (suspended/banned -> active) doesn't,
  // so the modal's own requireReason/title/etc. are derived from
  // statusTarget.user.status rather than tracked separately.
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const hasFilters = Boolean(search || role || status);

  const handlePromote = async (scope, reason) => {
    setPromoting(true);
    try {
      const { user: updated } = await setAdminRole(promoteTarget._id, {
        isAdmin: true,
        adminScope: scope,
        reason: reason || undefined,
      });
      toast.success(`${updated.name || updated.email} is now an admin`);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
      setPromoteTarget(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPromoting(false);
    }
  };

  const handleCreateUser = async (form) => {
    setCreatingUser(true);
    try {
      const { user: created } = await createAdminUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        adminScope: form.role === "admin" ? form.adminScope : undefined,
      });
      toast.success(`${created.name || created.email} was created`);
      setAddUserOpen(false);
      setPage(1);
      setRefreshTick((n) => n + 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleStatusConfirm = async (reason) => {
    const nextStatus = statusTarget.user.status === "active" ? "suspended" : "active";
    setStatusSubmitting(true);
    try {
      const { user: updated } = await setAdminUserStatus(statusTarget.user._id, {
        status: nextStatus,
        reason: reason || undefined,
      });
      toast.success(
        nextStatus === "active"
          ? `${updated.name || updated.email}'s access was restored`
          : `${updated.name || updated.email}'s access was paused`
      );
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
      setStatusTarget(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeletingUser(true);
    try {
      await deleteAdminUser(deleteTarget._id);
      toast.success(`${deleteTarget.name || deleteTarget.email} was deleted`);
      setDeleteTarget(null);
      setRefreshTick((n) => n + 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeletingUser(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listAdminUsers({
        page,
        limit: pageSize,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      })
        .then((res) => {
          if (cancelled) return;
          setUsers(res.items || []);
          setTotal(res.total || 0);
          setPages(res.pages || 1);
        })
        .catch((error) => {
          if (!cancelled) toast.error(error.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page, pageSize, search, role, status, refreshTick]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setRole("");
    setStatus("");
    setPage(1);
  };

  return (
    <PageContainer style={{ maxWidth: 1200 }}>
      <Toolbar>
        <AdminSearchInput
          placeholder="Search by name or email…"
          value={search}
          onChange={handleFilterChange(setSearch)}
        />
        <AdminSelect value={role} onChange={handleFilterChange(setRole)}>
          <option value="">All roles</option>
          <option value="shipper">Shipper</option>
          <option value="transporter">Transporter</option>
        </AdminSelect>
        <AdminSelect value={status} onChange={handleFilterChange(setStatus)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} user{total === 1 ? "" : "s"}</ResultsCount>}
        {viewer?.adminScope === "full" && (
          <Button type="button" $size="sm" onClick={() => setAddUserOpen(true)}>
            <UserPlus size={14} strokeWidth={2.4} />
            Add user
          </Button>
        )}
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && users.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>No users match these filters.</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="900px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Roles</Th>
                    <Th>City</Th>
                    <Th>Status</Th>
                    <Th>Joined</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    users.map((u, i) => (
                      <Tr key={u._id}>
                        <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                        <Td>
                          <NameLink to={`/admin/users/${u._id}`}>{u.name || "—"}</NameLink>
                          {u.isAdmin && (
                            <StatusBadge status="verified" style={{ marginLeft: 8 }}>
                              admin
                            </StatusBadge>
                          )}
                        </Td>
                        <Td>{u.email}</Td>
                        <Td>
                          {u.roles?.length ? (
                            <RolesCell>
                              {u.roles.map((r) => (
                                <StatusBadge key={r} status="verified">
                                  {r}
                                </StatusBadge>
                              ))}
                            </RolesCell>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>{u.city || "—"}</Td>
                        <Td>
                          <Row $gap={2}>
                            <StatusBadge status={u.status} />
                            {viewer?.adminScope === "full" && String(u._id) !== String(viewer.id) && (
                              <StatusSwitch
                                type="button"
                                $on={u.status === "active"}
                                onClick={() => setStatusTarget({ user: u })}
                                aria-label={u.status === "active" ? "Pause access" : "Restore access"}
                                title={u.status === "active" ? "Pause access" : "Restore access"}
                              />
                            )}
                          </Row>
                        </Td>
                        <Td>{formatDate(u.createdAt)}</Td>
                        <Td>
                          <ActionsCell>
                            <Button as={Link} to={`/admin/users/${u._id}`} $variant="secondary" $size="sm">
                              View
                            </Button>
                            {!u.isAdmin && viewer?.adminScope === "full" && (
                              <IconButton type="button" onClick={() => setPromoteTarget(u)} title="Grant admin access" aria-label="Grant admin access">
                                <ShieldPlus size={15} strokeWidth={2.2} />
                              </IconButton>
                            )}
                            {viewer?.adminScope === "full" && String(u._id) !== String(viewer.id) && (
                              <IconButton type="button" $danger onClick={() => setDeleteTarget(u)} title="Delete user" aria-label="Delete user">
                                <Trash2 size={15} strokeWidth={2.2} />
                              </IconButton>
                            )}
                          </ActionsCell>
                        </Td>
                      </Tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableScroll>
            <div style={{ padding: "0 20px 16px" }}>
              {!loading && (
                <Pagination
                  variant="admin"
                  page={page}
                  pages={pages}
                  total={total}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                  }}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              )}
            </div>
          </>
        )}
      </AdminCard>

      {promoteTarget && (
        <MakeAdminModal
          user={promoteTarget}
          submitting={promoting}
          onConfirm={handlePromote}
          onCancel={() => setPromoteTarget(null)}
        />
      )}

      {addUserOpen && (
        <AddUserModal submitting={creatingUser} onConfirm={handleCreateUser} onCancel={() => setAddUserOpen(false)} />
      )}

      <ConfirmModal
        open={Boolean(statusTarget)}
        title={
          statusTarget?.user.status === "active"
            ? `Pause ${statusTarget?.user.name || statusTarget?.user.email}'s access?`
            : `Restore ${statusTarget?.user.name || statusTarget?.user.email}'s access?`
        }
        description={
          statusTarget?.user.status === "active"
            ? "They won't be able to log in until you restore access."
            : "They'll be able to log in again immediately."
        }
        requireReason={statusTarget?.user.status === "active"}
        reasonLabel="Reason"
        confirmLabel={statusTarget?.user.status === "active" ? "Pause access" : "Restore access"}
        danger={statusTarget?.user.status === "active"}
        submitting={statusSubmitting}
        onConfirm={handleStatusConfirm}
        onCancel={() => setStatusTarget(null)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name || deleteTarget?.email}?`}
        description="Permanent — only possible if they have no booking, trip, or truck history. If they do, ban them instead to keep those records intact."
        confirmLabel="Delete user"
        danger
        submitting={deletingUser}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
};

export default Users;
