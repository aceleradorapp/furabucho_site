import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { colors, fonts } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !minSplashDone) return;
    const path: string[] = segments;
    const inAuthGroup = path[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user?.mustChangePassword) {
      if (path[1] !== 'trocar-senha') router.replace('/(auth)/trocar-senha');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, minSplashDone, segments, router]);

  if (loading || !minSplashDone) return <BrandSplash />;

  return <Slot />;
}

function BrandSplash() {
  return (
    <View style={styles.splash}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>FB</Text>
      </View>
      <Text style={styles.brandText}>Amigos Fura-Bucho</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 32,
    fontFamily: fonts.sansExtraBold,
  },
  brandText: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
