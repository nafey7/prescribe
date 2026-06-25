import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../theme/theme";

type ScreenProps = {
  centered?: boolean;
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
};

export function Screen({ centered = false, children, padded = true, style }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        padded && styles.padded,
        centered && styles.centered,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, padded ? 24 : 0),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 20,
    backgroundColor: theme.colors.background,
  },
  padded: {
    paddingHorizontal: 24,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});
