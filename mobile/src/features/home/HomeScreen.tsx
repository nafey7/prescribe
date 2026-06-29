import { ActivityIndicator } from "react-native-paper";

import { useAuth } from "../../auth/AuthProvider";
import { Screen } from "../../ui/Screen";
import { AuthScreen } from "./components/AuthScreen";
import { MobilePortalScreen } from "../portal/MobilePortalScreen";

export function HomeScreen() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <Screen centered>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  if (status === "authenticated" && user) {
    return <MobilePortalScreen />;
  }

  return <AuthScreen />;
}
