import { Tabs } from 'expo-router';
import { Bell, Images, Home, PlusSquare, User } from 'lucide-react-native';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 58,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen
        name="galeria"
        options={{ tabBarIcon: ({ color, size }) => <Images color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="postar"
        options={{ tabBarIcon: ({ color, size }) => <PlusSquare color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="novidades"
        options={{ tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }}
      />
      <Tabs.Screen name="perfil" options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
