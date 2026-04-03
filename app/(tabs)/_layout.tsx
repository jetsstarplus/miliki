import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DrawerMenu } from '../../components/DrawerMenu';
import { Colors } from '../../constants/theme';
import { DrawerProvider } from '../../context/drawer';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, outlineName, focused }: { name: IoniconName; outlineName: IoniconName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : outlineName}
      size={26}
      color={focused ? Colors.primary : Colors.textMuted}
    />
  );
}

// Screens that belong to the tab group but are NOT shown in the tab bar
const HIDDEN_SCREENS = [
  'portfolio', 'properties', 'units', 'leases', 'maintenance',
  'payments', 'communication', 'rent-schedules', 'arrears',
  'accounting', 'agent-statements', 'manual-transfer',
  'building/[id]', 'building/add',
];

export default function TabsLayout() {
  return (
    <DrawerProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textMuted,
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
            name="building/index"
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    height: 56,
    paddingBottom: 4,
    paddingTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
});
