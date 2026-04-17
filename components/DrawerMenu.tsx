import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Typography } from '../constants/theme';
import { useAuth } from '../context/auth';
import { useDrawer } from '../context/drawer';
import { useTheme } from '../context/theme';

const DRAWER_WIDTH = 288;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface NavChild {
  label: string;
  route: string;
}

interface NavItem {
  label: string;
  icon: IoniconName;
  route: string;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: 'grid', route: '/(tabs)/home' },
      { label: 'Portfolio', icon: 'briefcase', route: '/(tabs)/portfolio' },
    ],
  },
  {
    title: 'PROPERTIES',
    items: [
      { label: 'Units', icon: 'layers', route: '/(tabs)/units' },
      { label: 'Tenants', icon: 'people', route: '/(tabs)/tenants' },
      { label: 'Leases', icon: 'document-text', route: '/(tabs)/leases' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Maintenance', icon: 'construct', route: '/(tabs)/maintenance' },
      {
        label: 'Payments',
        icon: 'card',
        route: '/(tabs)/payments',
        // children: [
        //   { label: 'Payments', route: '/(tabs)/payments' },
        //   { label: 'Successful Payments', route: '/(tabs)/payments/transactions' },
        //   { label: 'Unmatched Payments', route: '/(tabs)/payments/unmatched' },
        //   { label: 'Manual Receipts', route: '/(tabs)/payments/manual-receipts' },
        //   { label: 'SMS Read Policies', route: '/(tabs)/payments/sms-read-policies' },
        // ],
      },
      { label: 'Communication', icon: 'chatbubbles', route: '/(tabs)/communication' },
      { label: 'Rent Schedules', icon: 'calendar', route: '/(tabs)/rent-schedules' },
      { label: 'Arrears', icon: 'alert-circle', route: '/(tabs)/arrears' },
    ],
  },
  {
    title: 'ACCOUNTING',
    items: [
      {
        label: 'Accounting',
        icon: 'calculator',
        route: '/(tabs)/accounting',
        children: [
          { label: 'Dashboard', route: '/(tabs)/accounting' },
          { label: 'Chart of Accounts', route: '/(tabs)/accounting' },
          { label: 'Journal Entries', route: '/(tabs)/accounting' },
          { label: 'Tenant Credits', route: '/(tabs)/accounting' },
          { label: 'Refunds', route: '/(tabs)/accounting' },
          { label: 'Reports', route: '/(tabs)/accounting' },
        ],
      },
      { label: 'Agent Statements', icon: 'stats-chart', route: '/(tabs)/agent-statements' },
      { label: 'Manual Transfer', icon: 'swap-horizontal', route: '/(tabs)/manual-transfer' },
    ],
  },
];

export function DrawerMenu() {
  const { isOpen, close } = useDrawer();
  const { user, activeCompany } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [expanded, setExpanded] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // Track drag offset separately so we can add it to the base position
  const dragX = useRef(new Animated.Value(0)).current;
  // Set to true when the drag gesture has already completed the close animation
  const dragDidClose = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      // Only capture horizontal swipes that start moving left
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) && gs.dx < 0,
      onPanResponderMove: (_, gs) => {
        // Only allow leftward drag (clamped at 0)
        const clamped = Math.min(0, gs.dx);
        dragX.setValue(clamped);
        // Fade backdrop proportionally
        backdropOpacity.setValue(1 + clamped / DRAWER_WIDTH);
      },
      onPanResponderRelease: (_, gs) => {
        const shouldClose = gs.dx < -DRAWER_WIDTH * 0.35 || gs.vx < -0.4;
        if (shouldClose) {
          Animated.parallel([
            Animated.timing(dragX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => {
            // Move the offset into translateX so resetting dragX causes no visual jump
            translateX.setValue(-DRAWER_WIDTH);
            dragX.setValue(0);
            // Signal the useEffect to skip its own close animation
            dragDidClose.current = true;
            close();
          });
        } else {
          Animated.parallel([
            Animated.spring(dragX, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      dragX.setValue(0);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // If the drag gesture already animated the close, just hide — no re-animation
      if (dragDidClose.current) {
        dragDidClose.current = false;
        dragX.setValue(0);
        setVisible(false);
        return;
      }
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        dragX.setValue(0);
        setVisible(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!visible) return null;

  function toggleExpand(label: string) {
    setExpanded(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label],
    );
  }

  function navigate(route: string) {
    close();
    router.push(route as any);
  }

  function isActive(route: string) {
    return pathname === route.replace('/(tabs)', '') || pathname.startsWith(route.replace('/(tabs)', '') + '/');
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'box-none'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateX: Animated.add(translateX, dragX) }] }]}
        {...panResponder.panHandlers}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
        >
          {/* Header: logo + company */}
          <View style={[styles.drawerHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <Image
              source={require('../assets/images/favicons/logo-wide.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            {activeCompany && (
              <View style={styles.companyRow}>
                <View style={[styles.companyBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.companyBadgeText}>
                    {activeCompany.companyType === 'LANDLORD' ? 'Landlord' : 'Agent'}
                  </Text>
                </View>
                <Text style={styles.companyName} numberOfLines={1}>
                  {activeCompany.name}
                </Text>
              </View>
            )}
            {user && (
              <Text style={styles.userName}>
                {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Navigation sections */}
          {NAV.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>

              {section.items.map(item => {
                const active = isActive(item.route);
                const isExpanded = expanded.includes(item.label);
                const hasChildren = !!item.children?.length;

                return (
                  <View key={item.label}>
                    <TouchableOpacity
                      style={[styles.navItem, active && [styles.navItemActive, { backgroundColor: colors.primary }]]}
                      onPress={() => {
                        if (hasChildren) toggleExpand(item.label);
                        else navigate(item.route);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={active ? item.icon : (`${item.icon}-outline` as IoniconName)}
                        size={20}
                        color={active ? '#fff' : 'rgba(255,255,255,0.65)'}
                        style={styles.navIcon}
                      />
                      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                        {item.label}
                      </Text>
                      {hasChildren && (
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color="rgba(255,255,255,0.4)"
                        />
                      )}
                    </TouchableOpacity>

                    {/* Children */}
                    {hasChildren && isExpanded && (
                      <View style={styles.childrenWrap}>
                        {item.children!.map(child => (
                          <TouchableOpacity
                            key={child.label}
                            style={styles.childItem}
                            onPress={() => navigate(child.route)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.childDot} />
                            <Text style={styles.childLabel}>{child.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#0A1628',
  },
  drawerHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: Spacing.md,
    tintColor: '#fff',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  companyBadge: {
    backgroundColor: '#1267CC',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  companyBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: Typography.fontWeightSemibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  companyName: {
    fontSize: Typography.fontSizeSm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: Typography.fontWeightSemibold,
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSizeXs,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: Typography.fontWeightBold,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.sm,
  },
  navItemActive: {
    backgroundColor: '#1267CC',
  },
  navIcon: {
    width: 22,
  },
  navLabel: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: Typography.fontWeightMedium,
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: Typography.fontWeightSemibold,
  },
  childrenWrap: {
    marginLeft: Spacing.lg + 22 + Spacing.sm,
    marginBottom: Spacing.xs,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  childDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  childLabel: {
    fontSize: Typography.fontSizeXs + 1,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: Typography.fontWeightMedium,
  },
});
