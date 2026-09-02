import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { colors, fonts } from '../../src/theme/tokens';

export default function TrocarSenhaScreen() {
  const { refreshUser, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter ao menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      await refreshUser();
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível trocar a senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Defina sua senha</Text>
      <Text style={styles.subtitle}>
        Por segurança, troque a senha temporária antes de continuar.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Senha temporária atual</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="mínimo 6 caracteres"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="repita a nova senha"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar e continuar</Text>}
        </Pressable>

        <Pressable onPress={() => logout()} style={styles.logoutLink}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: colors.textMain,
    fontSize: 20,
    fontFamily: fonts.sansBold,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.sans,
    marginBottom: 28,
    textAlign: 'center',
    maxWidth: 320,
  },
  form: {
    width: '100%',
    maxWidth: 360,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.sansMedium,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textMain,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: fonts.sans,
    marginTop: 14,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 26,
  },
  buttonPressed: {
    backgroundColor: colors.primaryHover,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  logoutLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
  },
});
