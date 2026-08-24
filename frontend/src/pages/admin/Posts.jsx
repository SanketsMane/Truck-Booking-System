import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ExternalLink, Pencil, Trash2, Send, EyeOff } from "lucide-react";
import {
  listAdminPosts,
  publishAdminPost,
  unpublishAdminPost,
  deleteAdminPost,
} from "../../api/admin";
import { POST_TYPES } from "../../content/postTypes";
import { PageContainer, Muted, EmptyState, Row } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
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
import { formatDateTime } from "../../utils/format";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Admin authoring/management for all three content types (Blog/News/
// Updates) — one shared list+editor rather than three near-identical admin
// sections, matching postModel.js's own "one model, a `type` field" design.
// Same list-page skeleton as admin/Trucks.jsx (search/filter/pagination via
// the shared AdminToolbar/AdminTable component set), extended with the
// publish/unpublish action this resource has and Trucks doesn't.
export const Posts = () => {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const hasFilters = Boolean(search || type || status);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listAdminPosts({
        page,
        limit: pageSize,
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
      })
        .then((res) => {
          if (cancelled) return;
          setPosts(res.items || []);
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
  }, [page, pageSize, search, type, status, reloadToken]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setType("");
    setStatus("");
    setPage(1);
  };

  const handleTogglePublish = async (post) => {
    setActionId(post._id);
    try {
      if (post.status === "published") {
        await unpublishAdminPost(post._id);
        toast.success("Post unpublished");
      } else {
        await publishAdminPost(post._id);
        toast.success("Post published");
      }
      setReloadToken((n) => n + 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionId(null);
    }
  };

  // archivePost has no dedicated "unarchive" endpoint — unpublishPost sets
  // status to "draft" unconditionally regardless of the prior status, so
  // it doubles as the archive -> draft restore path.
  const handleRestore = async (post) => {
    setActionId(post._id);
    try {
      await unpublishAdminPost(post._id);
      toast.success("Post restored to draft");
      setReloadToken((n) => n + 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteAdminPost(deleteTarget._id);
      toast.success("Post deleted");
      setDeleteTarget(null);
      setReloadToken((n) => n + 1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 1200 }}>
      <Toolbar>
        <AdminSearchInput placeholder="Search by title…" value={search} onChange={handleFilterChange(setSearch)} />
        <AdminSelect value={type} onChange={handleFilterChange(setType)}>
          <option value="">All types</option>
          {Object.values(POST_TYPES).map((cfg) => (
            <option key={cfg.type} value={cfg.type}>
              {cfg.label}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect value={status} onChange={handleFilterChange(setStatus)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </AdminSelect>
        <ToolbarSpacer />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        {!loading && <ResultsCount>{total} post{total === 1 ? "" : "s"}</ResultsCount>}
        <Button as={Link} to="/admin/posts/new" $size="sm">
          New post
        </Button>
      </Toolbar>

      <AdminCard $padding="0">
        {!loading && posts.length === 0 ? (
          <EmptyState style={{ margin: 20 }}>
            <Muted>{hasFilters ? "No posts match these filters." : "No posts yet — create the first one."}</Muted>
          </EmptyState>
        ) : (
          <>
            <TableScroll>
              <Table $minWidth="900px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Title</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Author</Th>
                    <Th>Published</Th>
                    <Th>Updated</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <AdminSkeletonRows rows={pageSize > 10 ? 10 : pageSize} cols={8} />
                  ) : (
                    posts.map((p, i) => {
                      const cfg = POST_TYPES[p.type];
                      return (
                        <Tr key={p._id}>
                          <IndexTd>{(page - 1) * pageSize + i + 1}</IndexTd>
                          <Td>
                            <Link to={`/admin/posts/${p._id}/edit`}>{p.title}</Link>
                          </Td>
                          <Td>{cfg?.label || p.type}</Td>
                          <Td>
                            <StatusBadge status={p.status} />
                          </Td>
                          <Td>{p.authorName || p.author?.name || "—"}</Td>
                          <Td>{p.publishedAt ? formatDateTime(p.publishedAt) : "—"}</Td>
                          <Td>{formatDateTime(p.updatedAt)}</Td>
                          <Td>
                            <Row $gap={2}>
                              <Button as={Link} to={`/admin/posts/${p._id}/edit`} $variant="secondary" $size="sm">
                                <Pencil size={14} strokeWidth={2.4} />
                                Edit
                              </Button>
                              {p.status === "archived" ? (
                                <Button
                                  type="button"
                                  $variant="secondary"
                                  $size="sm"
                                  disabled={actionId === p._id}
                                  onClick={() => handleRestore(p)}
                                >
                                  <EyeOff size={14} strokeWidth={2.4} />
                                  Restore to draft
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  $variant="secondary"
                                  $size="sm"
                                  disabled={actionId === p._id}
                                  onClick={() => handleTogglePublish(p)}
                                >
                                  {p.status === "published" ? (
                                    <>
                                      <EyeOff size={14} strokeWidth={2.4} />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Send size={14} strokeWidth={2.4} />
                                      Publish
                                    </>
                                  )}
                                </Button>
                              )}
                              {p.status === "published" && cfg && (
                                <Button
                                  as="a"
                                  href={`${cfg.basePath}/${p.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  $variant="ghost"
                                  $size="sm"
                                >
                                  <ExternalLink size={14} strokeWidth={2.4} />
                                  View
                                </Button>
                              )}
                              <Button type="button" $variant="danger" $size="sm" onClick={() => setDeleteTarget(p)}>
                                <Trash2 size={14} strokeWidth={2.4} />
                                Delete
                              </Button>
                            </Row>
                          </Td>
                        </Tr>
                      );
                    })
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete post permanently"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently removed. This can't be undone.` : ""}
        confirmLabel="Delete post"
        danger
        submitting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
};

export default Posts;
