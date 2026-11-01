import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// The RootLayout sets up the main navigation container for the entire application.
// We configure it to hide headers by default so each screen can manage its own header.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#121417' },
        }}
      />
    </>
  );
}
