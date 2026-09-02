import { BadgeCheck } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { Avatar } from '../../src/components/Avatar';
import { colors, fonts } from '../../src/theme/tokens';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size={84} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}</Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <BadgeCheck size={13} color={colors.primary} />
          <Text style={styles.roleText}>{user.roleLabel}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => logout()}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
      >
        <Text style={styles.logoutText}>Sair da conta</Text>
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
    padding: 20,
    paddingTop: 64,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  name: {
    color: colors.textMain,
    fontFamily: fonts.sansBold,
    fontSize: 18,
  },
  email: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  roleText: {
    color: colors.textMuted,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
  },
  logoutButton: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logoutPressed: {
    backgroundColor: colors.card,
  },
  logoutText: {
    color: colors.danger,
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
});
