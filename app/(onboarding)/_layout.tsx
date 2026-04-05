import { Stack } from 'expo-router';
import { useTheme } from '../../context/theme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="create-company" />
    </Stack>
  );
}
