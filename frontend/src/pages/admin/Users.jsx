import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ShieldPlus } from "lucide-react";
import { listAdminUsers, setAdminRole } from "../../api/admin";
import { useAuth } from "../../context/AuthContext";
import { PageContainer, Row, Stack, Muted, SectionTitle, EmptyState } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { Field, Select, Textarea } from "../../components/ui/Form";
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
  }, [page, pageSize, search, role, status]);

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
                          <Row $gap={1} $wrap>
                            {(u.roles || []).map((r) => (
                              <StatusBadge key={r} status="verified">
                                {r}
                              </StatusBadge>
                            ))}
                          </Row>
                        </Td>
                        <Td>{u.city || "—"}</Td>
                        <Td>
                          <StatusBadge status={u.status} />
                        </Td>
                        <Td>{formatDate(u.createdAt)}</Td>
                        <Td>
                          <Row $gap={2} $wrap>
                            <Button as={Link} to={`/admin/users/${u._id}`} $variant="secondary" $size="sm">
                              View
                            </Button>
                            {!u.isAdmin && viewer?.adminScope === "full" && (
                              <Button
                                type="button"
                                $variant="ghost"
                                $size="sm"
                                onClick={() => setPromoteTarget(u)}
                                title="Grant admin access"
                              >
                                <ShieldPlus size={14} strokeWidth={2.4} />
                                Make admin
                              </Button>
                            )}
                          </Row>
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
    </PageContainer>
  );
};

export default Users;
