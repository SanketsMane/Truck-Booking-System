import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { getPost } from "../../api/content";
import { POST_TYPES, postUrl } from "../../content/postTypes";
import { useBranding, brandingAssetUrl } from "../../context/BrandingContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { JsonLd } from "../../components/JsonLd";
import { PostSchema } from "../../components/PostSchema";
import { PageContainer, PageTitle, Stack, Row, Muted } from "../../components/ui/Layout";
import { Button } from "../../components/ui/Button";
import { SkeletonBlock, SkeletonText } from "../../components/ui/Skeleton";
import { formatDate } from "../../utils/format";

const CoverImg = styled.img`
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TagChip = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textMuted};
`;

// `body` is server-sanitized on every write (backend/utils/sanitizeContent.js
// — strict tag/attribute allowlist, javascript:/data: URIs blocked) and is
// always admin-authored, never end-user input, so rendering it via
// dangerouslySetInnerHTML here is safe for the same reason JsonLd.jsx's own
// dangerouslySetInnerHTML is safe: the content passing through it is never
// attacker-controlled by the time it reaches this component.
const ProseBody = styled.div`
  font-size: 16px;
  line-height: 1.75;
  color: ${({ theme }) => theme.color.text};

  p {
    margin: 0 0 1.1em;
  }
  h2 {
    font-size: 1.5em;
    font-weight: 700;
    margin: 1.4em 0 0.5em;
  }
  h3 {
    font-size: 1.25em;
    font-weight: 700;
    margin: 1.2em 0 0.5em;
  }
  ul,
  ol {
    padding-left: 1.4em;
    margin: 0 0 1.1em;
  }
  blockquote {
    margin: 0 0 1.1em;
    padding-left: 1em;
    border-left: 3px solid ${({ theme }) => theme.color.border};
    color: ${({ theme }) => theme.color.textMuted};
  }
  img {
    max-width: 100%;
    border-radius: ${({ theme }) => theme.radius.sm};
  }
  a {
    color: ${({ theme }) => theme.color.accent};
  }
`;

export const PostDetail = ({ type }) => {
  const { slug } = useParams();
  const { platformName, logoUrl } = useBranding();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      setNotFound(false);
      getPost(slug)
        .then((res) => {
          if (!cancelled) setPost(res.post);
        })
        .catch((error) => {
          if (!cancelled && error.status === 404) setNotFound(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug]);

  const cfg = POST_TYPES[type];
  const canonicalUrl = post ? `${window.location.origin}${postUrl(post)}` : "";

  usePageMeta({
    title: post?.title,
    description: post?.seoDescription || post?.excerpt,
    image: post?.coverImageUrl ? brandingAssetUrl(post.coverImageUrl) : undefined,
    type: post ? "article" : undefined,
    publishedTime: post?.publishedAt,
    modifiedTime: post?.updatedAt,
  });

  if (loading) {
    return (
      <PageContainer style={{ maxWidth: 760 }}>
        <Stack $gap={4}>
          <SkeletonBlock style={{ height: 40, width: "70%" }} />
          <SkeletonBlock style={{ aspectRatio: "16 / 9", borderRadius: 16 }} />
          <SkeletonText style={{ width: "100%" }} />
          <SkeletonText style={{ width: "90%" }} />
          <SkeletonText style={{ width: "95%" }} />
        </Stack>
      </PageContainer>
    );
  }

  if (notFound || !post) {
    return (
      <PageContainer style={{ textAlign: "center", paddingTop: 80 }}>
        <PageTitle>Post not found</PageTitle>
        <Muted style={{ margin: "8px auto 24px", maxWidth: "40ch" }}>
          This {cfg?.label.toLowerCase() || "post"} doesn't exist, or may have been unpublished.
        </Muted>
        <Button as={Link} to={cfg?.basePath || "/"}>
          Back to {cfg?.listTitle || "home"}
        </Button>
      </PageContainer>
    );
  }

  // Slugs are globally unique, so a slug can be fetched without knowing its
  // type — but if it doesn't match the type implied by the current route
  // prefix (e.g. a blog post's slug requested at /news/:slug), redirect to
  // its real URL rather than rendering it at two different addresses,
  // which would read as duplicate content to search engines.
  if (post.type !== type) {
    return <Navigate to={postUrl(post)} replace />;
  }

  return (
    <PageContainer style={{ maxWidth: 760 }}>
      <PostSchema post={post} url={canonicalUrl} platformName={platformName} logoUrl={logoUrl} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: cfg.listTitle, item: `${window.location.origin}${cfg.basePath}` },
            { "@type": "ListItem", position: 2, name: post.title, item: canonicalUrl },
          ],
        }}
      />
      <Stack $gap={5}>
        <Stack $gap={2}>
          <PageTitle>{post.title}</PageTitle>
          <Meta>
            {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
            {post.authorName && <span>By {post.authorName}</span>}
            {post.readingMinutes ? <span>{post.readingMinutes} min read</span> : null}
          </Meta>
          {post.tags?.length > 0 && (
            <TagRow>
              {post.tags.map((tag) => (
                <TagChip key={tag}>{tag}</TagChip>
              ))}
            </TagRow>
          )}
        </Stack>

        {post.coverImageUrl && (
          <CoverImg
            src={brandingAssetUrl(post.coverImageUrl)}
            alt={post.coverImageAlt || ""}
            fetchpriority="high"
          />
        )}

        <ProseBody dangerouslySetInnerHTML={{ __html: post.body }} />

        <Row>
          <Button as={Link} to={cfg.basePath} $variant="secondary">
            ← Back to {cfg.listTitle}
          </Button>
        </Row>
      </Stack>
    </PageContainer>
  );
};

export default PostDetail;
