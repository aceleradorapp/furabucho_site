import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BadgeCheck, Heart, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveMediaUrl } from '../api/config';
import type { Post } from '../api/types';
import { colors, fonts } from '../theme/tokens';
import { Avatar } from './Avatar';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function VideoPost({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.media} nativeControls allowsFullscreen contentFit="cover" />;
}

export function PostCard({ post, onToggleLike }: { post: Post; onToggleLike: (post: Post) => void }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const mediaUri = resolveMediaUrl(post.imageUrl);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.author.nickname || post.author.name} avatarUrl={post.author.avatarUrl} size={36} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{post.author.nickname || post.author.name}</Text>
            {post.author.isPontaFirme && <BadgeCheck size={13} color={colors.primary} />}
          </View>
          <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
        </View>
      </View>

      {mediaUri && post.mediaType === 'image' && (
        <Image source={{ uri: mediaUri }} style={styles.media} contentFit="cover" />
      )}
      {mediaUri && post.mediaType === 'video' && <VideoPost uri={mediaUri} />}

      <View style={styles.actions}>
        <Pressable onPress={() => onToggleLike(post)} style={styles.actionBtn}>
          <Heart size={22} color={post.likedByMe ? colors.primary : colors.textMain} fill={post.likedByMe ? colors.primary : 'none'} />
        </Pressable>
        <Pressable onPress={() => setCommentsOpen((v) => !v)} style={styles.actionBtn}>
          <MessageCircle size={22} color={colors.textMain} />
        </Pressable>
      </View>

      {post.likeCount > 0 && (
        <Text style={styles.likeCount}>
          {post.likeCount} curtida{post.likeCount === 1 ? '' : 's'}
        </Text>
      )}

      {post.caption && (
        <Text style={styles.caption}>
          <Text style={styles.name}>{post.author.nickname || post.author.name} </Text>
          {post.caption}
        </Text>
      )}

      {post.comments.length > 0 && (
        <Pressable onPress={() => setCommentsOpen((v) => !v)}>
          <Text style={styles.viewComments}>
            {commentsOpen ? 'ocultar comentários' : `ver ${post.comments.length} comentário${post.comments.length === 1 ? '' : 's'}`}
          </Text>
        </Pressable>
      )}

      {commentsOpen &&
        post.comments.map((c) => (
          <Text key={c.id} style={styles.comment}>
            <Text style={styles.name}>{c.user.name} </Text>
            {c.text}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    color: colors.textMain,
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  time: {
    color: colors.textFaint,
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  media: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bgAlt,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  actionBtn: {
    padding: 2,
  },
  likeCount: {
    color: colors.textMain,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  caption: {
    color: colors.textMain,
    fontFamily: fonts.sans,
    fontSize: 13,
    paddingHorizontal: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  viewComments: {
    color: colors.textFaint,
    fontFamily: fonts.sans,
    fontSize: 12.5,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  comment: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 12.5,
    paddingHorizontal: 12,
    marginTop: 3,
    lineHeight: 17,
  },
});
