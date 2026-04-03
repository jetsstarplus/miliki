import { Redirect } from 'expo-router';

// Root index redirects; actual routing is handled by _layout.tsx RootNavigator
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}

