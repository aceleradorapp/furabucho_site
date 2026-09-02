import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { resolveMediaUrl } from '../api/config';
import { colors, fonts } from '../theme/tokens';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const uri = resolveMediaUrl(avatarUrl);
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, style]} contentFit="cover" />;
  }

  return (
    <View style={[styles.fallback, style]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.card,
  },
  fallback: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackText: {
    color: colors.textMuted,
    fontFamily: fonts.sansBold,
  },
});
