import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
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

  // Reanimated shared values replace Animated.Value
  const panelX = useSharedValue(-DRAWER_WIDTH);
  const dragX = useSharedValue(0);
  const backdropAlpha = useSharedValue(0);
  // Avoid double-animation when gesture already completed the close
  const dragDidClose = useRef(false);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panelX.value + dragX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropAlpha.value,
  }));

  // RNGH Gesture.Pan replaces PanResponder — no conflict with TouchableOpacity/ScrollView
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 0])   // only leftward horizontal swipes
    .failOffsetY([-12, 12])    // fail if vertical movement exceeds threshold
    .onUpdate((e) => {
      const clamped = Math.min(0, e.translationX);
      dragX.value = clamped;
      backdropAlpha.value = interpolate(clamped, [-DRAWER_WIDTH, 0], [0, 1]);
    })
    .onEnd((e) => {
      const shouldClose =
        e.translationX < -DRAWER_WIDTH * 0.35 || e.velocityX < -400;
      if (shouldClose) {
        // Absorb dragX into panelX first so the animation starts from the
        // current visual position (no rightward jump on reset).
        const currentX = panelX.value + dragX.value;
        panelX.value = currentX;
        dragX.value = 0;
        panelX.value = withTiming(-DRAWER_WIDTH, { duration: 200 });
        backdropAlpha.value = withTiming(0, { duration: 200 });
        dragDidClose.current = true;
        runOnJS(close)();
      } else {
        dragX.value = withSpring(0, { damping: 40, stiffness: 300 });
        backdropAlpha.value = withTiming(1, { duration: 150 });
      }
    });

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      dragX.value = 0;
      panelX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      backdropAlpha.value = withTiming(1, { duration: 280 });
    } else {
      if (dragDidClose.current) {
        dragDidClose.current = false;
        dragX.value = 0;
        setVisible(false);
        return;
      }
      panelX.value = withTiming(-DRAWER_WIDTH, { duration: 220 }, (finished) => {
        if (finished) {
          dragX.value = 0;
          runOnJS(setVisible)(false);
        }
      });
      backdropAlpha.value = withTiming(0, { duration: 220 });
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
    router.navigate(route as any);
    close();
  }

  function isActive(route: string) {
    return pathname === route.replace('/(tabs)', '') || pathname.startsWith(route.replace('/(tabs)', '') + '/');
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'box-none'}>
      {/* Backdrop — only covers area outside the panel */}
      <Pressable style={StyleSheet.absoluteFill} onPress={close}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      {/* Panel wrapped in RNGH GestureDetector for swipe-to-close */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.panel, panelStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
          >
          {/* Header: logo + company */}
          <View style={[styles.drawerHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <Image
              source={require('../assets/images/favicons/logo-wide.png')}
              style={styles.logo}
              resizeMode="cover"
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
      </GestureDetector>
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
    width: 130,
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
