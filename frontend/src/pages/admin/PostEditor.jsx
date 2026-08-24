import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ArrowLeft, ExternalLink, Send, EyeOff, Archive, Pencil } from "lucide-react";
import {
  getAdminPost,
  createAdminPost,
  updateAdminPost,
  publishAdminPost,
  unpublishAdminPost,
  archiveAdminPost,
} from "../../api/admin";
import { uploadFile } from "../../api/files";
import { brandingAssetUrl } from "../../context/BrandingContext";
import { RichTextEditor } from "../../components/admin/RichTextEditor";
import { POST_TYPE_LIST, postUrl } from "../../content/postTypes";
import { PageContainer, Stack, Row, SubHeading, Muted } from "../../components/ui/Layout";
import { AdminCard } from "../../components/ui/AdminTable";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { StatusBadge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { UploadField } from "../../components/ui/UploadField";

// Simple client-side mirror of backend/utils/slugify.js, used ONLY to
// drive the live "Edit URL" preview as the admin types — the server's
// normalize-then-uniquify pass in postController.js is the actual source
// of truth for what a post's slug ends up being.
const previewSlug = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const EditorGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: 1fr;
  }
`;

const CharCount = styled.span`
  font-size: 11px;
  color: ${({ theme, $over }) => ($over ? theme.color.danger : theme.color.textFaint)};
`;

const SlugRow = styled(Row)`
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const SlugPrefix = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textFaint};
  white-space: nowrap;
`;

const GooglePreview = styled.div`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.admin.color.bg};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
`;

const GTitle = styled.div`
  color: #1a0dab;
  font-size: 18px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const GUrl = styled.div`
  color: #006621;
  font-size: 13px;
  margin: 2px 0 4px;
`;

const GDesc = styled.div`
  color: #545454;
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EMPTY_FORM = {
  type: "blog",
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  coverImageUrl: "",
  coverImageAlt: "",
  tags: "",
  authorName: "",
  seoTitle: "",
  seoDescription: "",
  noIndex: false,
};

// One page, two routes (/admin/posts/new, /admin/posts/:id/edit) — the
// app's first full-page content-authoring UI, deliberately not a modal:
// a rich editor + image upload + SEO panel need real vertical room that
// Users.jsx's small AddUserModal was never built for.
export const PostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [post, setPost] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState("");

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    getAdminPost(id)
      .then((res) => {
        if (cancelled) return;
        const p = res.post;
        setPost(p);
        setForm({
          type: p.type,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt || "",
          body: p.body || "",
          coverImageUrl: p.coverImageUrl || "",
          coverImageAlt: p.coverImageAlt || "",
          tags: (p.tags || []).join(", "),
          authorName: p.authorName || "",
          seoTitle: p.seoTitle || "",
          seoDescription: p.seoDescription || "",
          noIndex: Boolean(p.noIndex),
        });
        setSlugTouched(true);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : previewSlug(title) }));
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: e.target.value }));
  };

  const handleCoverPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const { file: uploaded } = await uploadFile(file, { isPublic: true });
      setForm((f) => ({ ...f, coverImageUrl: uploaded.url }));
    } catch (error) {
      toast.error(error.message);
      setCoverPreview("");
    } finally {
      setUploadingCover(false);
    }
  };

  const buildPayload = () => ({
    type: form.type,
    title: form.title.trim(),
    slug: slugTouched ? form.slug.trim() : "",
    excerpt: form.excerpt.trim(),
    body: form.body,
    coverImageUrl: form.coverImageUrl,
    coverImageAlt: form.coverImageAlt.trim(),
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    authorName: form.authorName.trim(),
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    noIndex: form.noIndex,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || form.title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (!form.body || !form.body.replace(/<[^>]*>/g, "").trim()) {
      toast.error("Write something in the body before saving");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const res = await createAdminPost(buildPayload());
        toast.success("Post created");
        navigate(`/admin/posts/${res.post._id}/edit`, { replace: true });
      } else {
        const res = await updateAdminPost(id, buildPayload());
        setPost(res.post);
        toast.success("Post saved");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async (fn, successMsg) => {
    setActionLoading(true);
    try {
      const res = await fn(id);
      setPost(res.post);
      toast.success(successMsg);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const seoTitlePreview = form.seoTitle.trim() || form.title.trim() || "Untitled post";
  const seoDescPreview = form.seoDescription.trim() || form.excerpt.trim() || "";
  const previewUrl = useMemo(() => {
    const path = postUrl({ type: form.type, slug: form.slug || "your-post" });
    return `truckgee.com${path}`;
  }, [form.type, form.slug]);

  if (loading) {
    return (
      <PageContainer style={{ maxWidth: 1100 }}>
        <Row style={{ justifyContent: "center", padding: "60px 0" }}>
          <Spinner $size={28} />
        </Row>
      </PageContainer>
    );
  }

  const coverSrc = coverPreview || (form.coverImageUrl ? brandingAssetUrl(form.coverImageUrl) : "");

  return (
    <PageContainer style={{ maxWidth: 1100 }}>
      <form onSubmit={handleSave}>
        <Stack $gap={4}>
          <Row style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <Row $gap={3} style={{ alignItems: "center" }}>
              <Button as={Link} to="/admin/posts" type="button" $variant="ghost" $size="sm">
                <ArrowLeft size={14} strokeWidth={2.4} />
                Posts
              </Button>
              {post && <StatusBadge status={post.status} />}
            </Row>
            <Row $gap={2}>
              {post && post.status === "published" && (
                <Button
                  as="a"
                  href={postUrl(post)}
                  target="_blank"
                  rel="noreferrer"
                  type="button"
                  $variant="ghost"
                  $size="sm"
                >
                  <ExternalLink size={14} strokeWidth={2.4} />
                  View live
                </Button>
              )}
              {post && post.status !== "archived" && (
                <Button
                  type="button"
                  $variant="secondary"
                  $size="sm"
                  disabled={actionLoading}
                  onClick={() => runTransition(archiveAdminPost, "Post archived")}
                >
                  <Archive size={14} strokeWidth={2.4} />
                  Archive
                </Button>
              )}
              {post && post.status === "published" && (
                <Button
                  type="button"
                  $variant="secondary"
                  $size="sm"
                  disabled={actionLoading}
                  onClick={() => runTransition(unpublishAdminPost, "Post unpublished")}
                >
                  <EyeOff size={14} strokeWidth={2.4} />
                  Unpublish
                </Button>
              )}
              {post && post.status !== "published" && (
                <Button
                  type="button"
                  $variant="secondary"
                  $size="sm"
                  disabled={actionLoading}
                  onClick={() => runTransition(publishAdminPost, "Post published")}
                >
                  <Send size={14} strokeWidth={2.4} />
                  Publish
                </Button>
              )}
              <Button type="submit" $size="sm" disabled={saving}>
                <Pencil size={14} strokeWidth={2.4} />
                {saving ? "Saving…" : "Save"}
              </Button>
            </Row>
          </Row>

          <EditorGrid>
            <Stack $gap={4}>
              <AdminCard>
                <Stack $gap={3}>
                  <Field label="Title">
                    <Input value={form.title} onChange={handleTitleChange} maxLength={160} placeholder="Post title" />
                  </Field>

                  <Field label="URL">
                    <SlugRow>
                      <SlugPrefix>truckgee.com{POST_TYPE_LIST.find((t) => t.type === form.type)?.basePath}/</SlugPrefix>
                      <Input
                        value={form.slug}
                        onChange={handleSlugChange}
                        maxLength={90}
                        placeholder="auto-generated-from-title"
                        style={{ flex: 1, minWidth: 160 }}
                      />
                    </SlugRow>
                    {post?.status === "published" && (
                      <Muted style={{ fontSize: 12, marginTop: 4 }}>
                        This post is live — changing the URL breaks any existing links to it.
                      </Muted>
                    )}
                  </Field>

                  <Field label="Excerpt" help="Shown on listing cards and used as the fallback meta description.">
                    <Textarea value={form.excerpt} onChange={setField("excerpt")} maxLength={300} rows={3} />
                    <CharCount $over={form.excerpt.length > 300}>{form.excerpt.length}/300</CharCount>
                  </Field>

                  <Field label="Body">
                    <RichTextEditor
                      value={form.body}
                      onChange={(html) => setForm((f) => ({ ...f, body: html }))}
                      placeholder="Start writing…"
                    />
                  </Field>
                </Stack>
              </AdminCard>
            </Stack>

            <Stack $gap={4}>
              <AdminCard>
                <Stack $gap={3}>
                  <SubHeading>Publishing</SubHeading>
                  <Field label="Type">
                    <Select value={form.type} onChange={setField("type")} disabled={post?.status === "published"}>
                      {POST_TYPE_LIST.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Byline" help="Optional — overrides the account name in structured data.">
                    <Input value={form.authorName} onChange={setField("authorName")} maxLength={80} placeholder="Truckgee Team" />
                  </Field>
                  <Field label="Tags" help="Comma-separated, up to 8.">
                    <Input value={form.tags} onChange={setField("tags")} placeholder="logistics, fleet, hiring" />
                  </Field>
                </Stack>
              </AdminCard>

              <AdminCard>
                <Stack $gap={3}>
                  <SubHeading>Cover image</SubHeading>
                  <Row $gap={3} style={{ alignItems: "flex-start" }}>
                    <UploadField
                      label="Cover"
                      hint="JPEG or PNG · 1200×630px recommended"
                      imageSrc={coverSrc}
                      uploading={uploadingCover}
                      onPick={handleCoverPick}
                    />
                  </Row>
                  {form.coverImageUrl && (
                    <Field label="Alt text" help="Describes the image for screen readers and search engines.">
                      <Input value={form.coverImageAlt} onChange={setField("coverImageAlt")} maxLength={160} />
                    </Field>
                  )}
                </Stack>
              </AdminCard>

              <AdminCard>
                <Stack $gap={3}>
                  <SubHeading>SEO</SubHeading>
                  <Field label="SEO title" help="Falls back to the post title if left blank.">
                    <Input value={form.seoTitle} onChange={setField("seoTitle")} maxLength={70} />
                    <CharCount $over={form.seoTitle.length > 70}>{form.seoTitle.length}/70</CharCount>
                  </Field>
                  <Field label="SEO description" help="Falls back to the excerpt if left blank.">
                    <Textarea value={form.seoDescription} onChange={setField("seoDescription")} maxLength={180} rows={3} />
                    <CharCount $over={form.seoDescription.length > 180}>{form.seoDescription.length}/180</CharCount>
                  </Field>
                  <Row $gap={2} style={{ alignItems: "center" }}>
                    <input
                      type="checkbox"
                      id="noIndex"
                      checked={form.noIndex}
                      onChange={(e) => setForm((f) => ({ ...f, noIndex: e.target.checked }))}
                    />
                    <label htmlFor="noIndex">
                      <Muted style={{ fontSize: 13 }}>Exclude from sitemap and search indexing</Muted>
                    </label>
                  </Row>
                  <div>
                    <Muted style={{ fontSize: 12, marginBottom: 6 }}>Search result preview</Muted>
                    <GooglePreview>
                      <GTitle>{seoTitlePreview}</GTitle>
                      <GUrl>{previewUrl}</GUrl>
                      <GDesc>{seoDescPreview || "Add an excerpt or SEO description to see how this appears in search."}</GDesc>
                    </GooglePreview>
                  </div>
                </Stack>
              </AdminCard>
            </Stack>
          </EditorGrid>
        </Stack>
      </form>
    </PageContainer>
  );
};

export default PostEditor;
