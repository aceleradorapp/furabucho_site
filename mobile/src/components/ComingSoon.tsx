import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens';

export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.textMain,
    fontFamily: fonts.sansBold,
    fontSize: 16,
    marginBottom: 6,
  },
  description: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
