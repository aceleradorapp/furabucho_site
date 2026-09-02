import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image as ImageIcon, Video, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { colors, fonts } from '../../src/theme/tokens';

export default function PostarScreen() {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) setMedia(result.assets[0]);
  }

  async function handleSubmit() {
    if (!media && !caption.trim()) {
      setError('Escreva algo ou anexe uma foto/vídeo');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      if (caption.trim()) form.append('caption', caption.trim());
      if (media) {
        const isVideo = media.type === 'video';
        form.append('media', {
          uri: media.uri,
          name: isVideo ? 'upload.mp4' : 'upload.jpg',
          type: isVideo ? 'video/mp4' : 'image/jpeg',
        } as unknown as Blob);
      }
      await api.post('/posts', form);
      setCaption('');
      setMedia(null);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível publicar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nova publicação</Text>

      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Escreva uma legenda..."
        placeholderTextColor={colors.textFaint}
        style={styles.textArea}
        multiline
      />

      {media ? (
        <View style={styles.previewWrap}>
          {media.type === 'video' ? (
            <View style={styles.videoPreview}>
              <Video size={28} color={colors.textMuted} />
              <Text style={styles.videoPreviewText}>Vídeo selecionado</Text>
            </View>
          ) : (
            <Image source={{ uri: media.uri }} style={styles.preview} />
          )}
          <Pressable onPress={() => setMedia(null)} style={styles.removeMedia}>
            <X size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pickMedia} style={styles.pickButton}>
          <ImageIcon size={20} color={colors.primary} />
          <Text style={styles.pickButtonText}>Adicionar foto ou vídeo</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed, submitting && styles.submitDisabled]}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Publicar</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingTop: 56,
  },
  title: {
    color: colors.textMain,
    fontFamily: fonts.sansBold,
    fontSize: 18,
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.textMain,
    fontFamily: fonts.sans,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    marginTop: 12,
  },
  pickButtonText: {
    color: colors.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  previewWrap: {
    marginTop: 12,
    position: 'relative',
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.bgAlt,
  },
  videoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoPreviewText: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    padding: 6,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.sans,
    fontSize: 13,
    marginTop: 14,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitPressed: {
    backgroundColor: colors.primaryHover,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
});
