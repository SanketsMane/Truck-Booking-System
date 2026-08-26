import { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { PageTitle, Body, Muted } from "../../../../src/components/ui/Typography";
import { StatusBadge } from "../../../../src/components/ui/Badge";
import { LoadingView } from "../../../../src/components/ui/LoadingView";
import { theme } from "../../../../src/theme";
import { getPost } from "../../../../src/api/content";
import { BASE_URL } from "../../../../src/api/client";
import { formatDate } from "../../../../src/utils/format";
import { stripHtml } from "../../../../src/utils/stripHtml";

export const ContentDetailScreen = () => {
  const { slug } = useLocalSearchParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setTimeout(() => setLoading(true), 0);
    getPost(slug)
      .then((res) => setPost(res.post))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingView />;
  if (!post) return <Screen><Muted>{error || "Not found"}</Muted></Screen>;

  const byline = post.authorName || post.author?.name;

  return (
    <Screen>
      {post.coverImageUrl && (
        <Image source={{ uri: `${BASE_URL}${post.coverImageUrl}` }} style={styles.cover} resizeMode="cover" />
      )}

      <View style={styles.header}>
        <PageTitle>{post.title}</PageTitle>
        <Muted>
          {byline ? `${byline} · ` : ""}
          {formatDate(post.publishedAt)}
          {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
        </Muted>
        {post.tags?.length > 0 && (
          <View style={styles.tags}>
            {post.tags.map((tag) => (
              <StatusBadge key={tag} status="info">{tag}</StatusBadge>
            ))}
          </View>
        )}
      </View>

      <Body style={styles.body}>{stripHtml(post.body)}</Body>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cover: { width: "100%", height: 200, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceRaised },
  header: { gap: theme.space(2) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(2) },
  body: { fontSize: theme.font.size.md },
});

export default ContentDetailScreen;
