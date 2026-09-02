import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import type { Post } from '../../src/api/types';
import { PostCard } from '../../src/components/PostCard';
import { colors, fonts } from '../../src/theme/tokens';

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get<Post[]>('/posts');
    setPosts(data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load().finally(() => setRefreshing(false));
  }

  async function toggleLike(post: Post) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) } : p,
      ),
    );
    await api.post(`/posts/${post.id}/like`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>Amigos Fura-Bucho</Text>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <PostCard post={item} onToggleLike={toggleLike} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Ainda não há publicações. Seja o primeiro a postar!</Text>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyContent : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  brand: {
    color: colors.textMain,
    fontFamily: fonts.sansExtraBold,
    fontSize: 18,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
});
