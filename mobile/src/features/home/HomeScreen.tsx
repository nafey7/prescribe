import { ActivityIndicator, Button, Text } from "react-native-paper";

import { useAuth } from "../../auth/AuthProvider";
import { Screen } from "../../ui/Screen";
import { AuthScreen } from "./components/AuthScreen";

export function HomeScreen() {
  const { logout, status, user } = useAuth();

  if (status === "loading") {
    return (
      <Screen centered>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  if (status === "authenticated" && user) {
    return (
      <Screen>
        <Text variant="headlineMedium">Welcome back</Text>
        <Text variant="bodyLarge">{user.email}</Text>
        <Text variant="bodyMedium">Role: {user.role}</Text>
        <Button mode="contained" onPress={logout}>
          Sign out
        </Button>
      </Screen>
    );
  }

  return <AuthScreen />;
}
