import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { listPosts } from "../../api/content";
import { POST_TYPES, postUrl } from "../../content/postTypes";
import { useBranding, brandingAssetUrl } from "../../context/BrandingContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { PageContainer, PageTitle, Body, Stack, Grid, EmptyState, Muted } from "../../components/ui/Layout";
import { Card } from "../../components/ui/Card";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonBlock, SkeletonText } from "../../components/ui/Skeleton";
import { formatDate } from "../../utils/format";

const PAGE_SIZE = 12;

const PostCard = styled(Card).attrs({ as: Link, $interactive: true })`
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-decoration: none;
  color: inherit;
`;

const CoverImg = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const CoverPlaceholder = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const CardMeta = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const CardTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
`;

// Shared list page for all three content types — /blog, /news, /updates —
// parameterized by `type` from Routing.jsx rather than three near-identical
// components, matching the backend's own "one Post model, a type field"
// design.
export const PostList = ({ type }) => {
  const { platformName } = useBranding();
  const cfg = POST_TYPES[type];
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: cfg.listTitle,
    description: `${cfg.listDescription} ${platformName}.`,
  });

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listPosts({ type, page, limit: PAGE_SIZE })
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
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [type, page]);

  return (
    <PageContainer>
      <Stack $gap={6}>
        <Stack $gap={2}>
          <PageTitle>{cfg.listTitle}</PageTitle>
          <Body>{cfg.listDescription}</Body>
        </Stack>

        {loading ? (
          <Grid $cols={1} $colsTablet={3} $gap={4}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Stack key={i} $gap={2}>
                <SkeletonBlock style={{ aspectRatio: "16 / 9", borderRadius: 16 }} />
                <SkeletonText style={{ width: "80%" }} />
                <SkeletonText style={{ width: "40%" }} />
              </Stack>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <EmptyState>
            <Muted>Nothing published here yet — check back soon.</Muted>
          </EmptyState>
        ) : (
          <Grid $cols={1} $colsTablet={3} $gap={4}>
            {posts.map((post) => (
              <PostCard key={post._id} to={postUrl(post)}>
                {post.coverImageUrl ? (
                  <CoverImg src={brandingAssetUrl(post.coverImageUrl)} alt={post.coverImageAlt || ""} loading="lazy" />
                ) : (
                  <CoverPlaceholder />
                )}
                <Stack $gap={1}>
                  <CardTitle>{post.title}</CardTitle>
                  {post.excerpt && <Body style={{ margin: 0 }}>{post.excerpt}</Body>}
                  <CardMeta>
                    {post.publishedAt && formatDate(post.publishedAt)}
                    {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
                  </CardMeta>
                </Stack>
              </PostCard>
            ))}
          </Grid>
        )}

        <Pagination
          page={page}
          pages={pages}
          total={total}
          onPageChange={setPage}
        />
      </Stack>
    </PageContainer>
  );
};

export default PostList;
