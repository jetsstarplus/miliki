import { DrawerMenu } from '@/components/DrawerMenu';
import { DrawerProvider } from '@/context/drawer';
import { useTheme } from '@/context/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, outlineName, focused }: { name: IoniconName; outlineName: IoniconName; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={focused ? name : outlineName}
      size={26}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

// Screens that belong to the tab group but are NOT shown in the tab bar
const HIDDEN_SCREENS = [
  'portfolio', 'properties', 'units', 'leases', 'maintenance',
  'payments', 'communication', 'rent-schedules', 'arrears',
  'accounting', 'agent-statements', 'manual-transfer',
];

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.background },
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              height: 56,
              paddingBottom: 4,
              paddingTop: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 8,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarShowLabel: false,
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              tabBarIcon: ({ focused }) => <TabIcon name="home" outlineName="home-outline" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="building"
            options={{
              tabBarIcon: ({ focused }) => <TabIcon name="business" outlineName="business-outline" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="tenants"
            options={{
              tabBarIcon: ({ focused }) => <TabIcon name="people" outlineName="people-outline" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              tabBarIcon: ({ focused }) => <TabIcon name="person-circle" outlineName="person-circle-outline" focused={focused} />,
            }}
          />
          {/* Hidden screens — accessible via drawer navigation, not shown in tab bar */}
          {HIDDEN_SCREENS.map(name => (
            <Tabs.Screen key={name} name={name} options={{ href: null }} />
          ))}
        </Tabs>

        {/* Drawer overlay — rendered above the tab content */}
        <DrawerMenu />
      </View>
    </DrawerProvider>
  );
}
