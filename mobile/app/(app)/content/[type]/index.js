import { useCallback, useState } from "react";
import { View, Image, FlatList, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { PageTitle, Body, Muted } from "../../../../src/components/ui/Typography";
import { Card } from "../../../../src/components/ui/Card";
import { Button } from "../../../../src/components/ui/Button";
import { EmptyState } from "../../../../src/components/ui/EmptyState";
import { LoadingView } from "../../../../src/components/ui/LoadingView";
import { theme } from "../../../../src/theme";
import { listPosts } from "../../../../src/api/content";
import { BASE_URL } from "../../../../src/api/client";
import { formatDate } from "../../../../src/utils/format";
import { POST_TYPES } from "../../../../src/content/postTypes";

const PAGE_SIZE = 10;

export const ContentListScreen = () => {
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const meta = POST_TYPES[type] || POST_TYPES.blog;
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listPosts({ type, page: 1, limit: PAGE_SIZE })
      .then((res) => {
        setPosts(res.items || []);
        setPage(res.page || 1);
        setPages(res.pages || 1);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [type]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadMore = () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    listPosts({ type, page: page + 1, limit: PAGE_SIZE })
      .then((res) => {
        setPosts((prev) => [...prev, ...(res.items || [])]);
        setPage(res.page || page + 1);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <PageTitle>{meta.listTitle}</PageTitle>
        <Muted>{meta.listDescription}</Muted>
      </View>

      {loading ? (
        <LoadingView />
      ) : posts.length === 0 ? (
        <EmptyState>Nothing published here yet.</EmptyState>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListFooterComponent={
            page < pages ? <Button title="Load more" variant="secondary" onPress={loadMore} loading={loadingMore} fullWidth /> : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/content/${type}/${item.slug}`)}>
              <Card style={styles.postCard}>
                {item.coverImageUrl && (
                  <Image source={{ uri: `${BASE_URL}${item.coverImageUrl}` }} style={styles.cover} resizeMode="cover" />
                )}
                <Body style={styles.title}>{item.title}</Body>
                {item.excerpt ? <Muted numberOfLines={2}>{item.excerpt}</Muted> : null}
                <Muted>
                  {formatDate(item.publishedAt)}
                  {item.readingMinutes ? ` · ${item.readingMinutes} min read` : ""}
                </Muted>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { gap: theme.space(1), padding: theme.space(4), paddingBottom: 0 },
  list: { padding: theme.space(4), gap: theme.space(3) },
  postCard: { gap: theme.space(2) },
  cover: { width: "100%", height: 160, borderRadius: theme.radius.sm, backgroundColor: theme.color.surfaceRaised },
  title: { fontWeight: theme.font.weight.bold, fontSize: theme.font.size.lg },
});

export default ContentListScreen;
