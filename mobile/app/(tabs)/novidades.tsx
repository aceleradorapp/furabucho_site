import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { resolveMediaUrl } from '../../src/api/config';
import { colors, fonts } from '../../src/theme/tokens';

interface Announcement {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  link: string | null;
  scheduledAt: string;
  viewed: boolean;
}

export default function NovidadesScreen() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    const data = await api.get<Announcement[]>('/announcements/active');
    setItems(data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function openAnnouncement(item: Announcement) {
    setOpen(item);
    if (!item.viewed) {
      await api.post(`/announcements/${item.id}/view`);
      setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, viewed: true } : a)));
    }
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
        <Text style={styles.title}>Novidades</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(a) => String(a.id)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhuma novidade por aqui ainda.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openAnnouncement(item)} style={styles.thumbWrap}>
            <Image source={{ uri: resolveMediaUrl(item.imageUrl) }} style={styles.thumb} contentFit="cover" />
            {!item.viewed && <View style={styles.unviewedDot} />}
          </Pressable>
        )}
      />

      <Modal visible={!!open} animationType="fade" transparent onRequestClose={() => setOpen(null)}>
        <View style={styles.modalBackdrop}>
          {open && (
            <>
              <Image source={{ uri: resolveMediaUrl(open.imageUrl) }} style={styles.modalImage} contentFit="contain" />
              <View style={styles.modalTextWrap}>
                <Text style={styles.modalTitle}>{open.title}</Text>
                {open.description && <Text style={styles.modalDescription}>{open.description}</Text>}
                {open.link && (
                  <Pressable onPress={() => Linking.openURL(open.link as string)}>
                    <Text style={styles.modalLink}>{open.link}</Text>
                  </Pressable>
                )}
              </View>
              <Pressable onPress={() => setOpen(null)} style={styles.closeButton}>
                <X size={22} color="#fff" />
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const THUMB_SIZE = '33.33%';

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
  title: {
    color: colors.textMain,
    fontFamily: fonts.sansBold,
    fontSize: 18,
  },
  grid: {
    flexGrow: 1,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    aspectRatio: 1,
    padding: 1,
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
  },
  unviewedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '70%',
  },
  modalTextWrap: {
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontFamily: fonts.sansBold,
    fontSize: 16,
    textAlign: 'center',
  },
  modalDescription: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  modalLink: {
    color: colors.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    marginTop: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    padding: 8,
  },
});
