import { Redirect } from 'expo-router';

// Root entry point redirects to the cinematic Namaste welcome screen.
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
