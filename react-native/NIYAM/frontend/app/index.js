import { Redirect } from 'expo-router';

// Root index route automatically redirects to the welcome screen.
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
