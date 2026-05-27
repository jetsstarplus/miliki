import { AppHeader } from '@/components/AppHeader';
import { UnitListShared } from '@/components/units/UnitListShared';
import { useTheme } from '@/context/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UnitsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Units"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(tabs)/units/add' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        <UnitListShared scope="all" embedded={false} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: { background: string }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, backgroundColor: colors.background },
    addBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
