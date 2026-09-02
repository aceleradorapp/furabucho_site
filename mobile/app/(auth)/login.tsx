import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { colors, fonts } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!identifier || !password) {
      setError('Preencha usuário/e-mail e senha');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>FB</Text>
      </View>
      <Text style={styles.title}>Amigos Fura-Bucho</Text>
      <Text style={styles.subtitle}>Entre com sua conta pra acessar o portal</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Usuário ou e-mail</Text>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="seu.usuario ou email@exemplo.com"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.showToggle}>
            <Text style={styles.showToggleText}>{showPassword ? 'ocultar' : 'mostrar'}</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
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
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: {
    color: '#fff',
    fontSize: 26,
    fontFamily: fonts.sansExtraBold,
  },
  title: {
    color: colors.textMain,
    fontSize: 20,
    fontFamily: fonts.sansBold,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.sans,
    marginBottom: 32,
    textAlign: 'center',
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
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 70,
  },
  showToggle: {
    position: 'absolute',
    right: 14,
  },
  showToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: fonts.sansMedium,
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
});
