import React, { useEffect, useMemo } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useFonts } from "expo-font";
import { Asset } from "expo-asset";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useThemeColors } from "../constants/Colors";
import { ALL_IMAGE_ASSETS } from "../constants/wellCatalog";

export default function Layout() {
  const { colors, isDark } = useThemeColors();
  const [loaded] = useFonts({
    "ClashDisplay-Medium": require("../assets/fonts/ClashDisplay-Medium.ttf"),
    "ClashDisplay-Semibold": require("../assets/fonts/ClashDisplay-Semibold.ttf"),
    "ClashDisplay-Bold": require("../assets/fonts/ClashDisplay-Bold.ttf"),
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.ttf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.ttf"),
  });

  useEffect(() => {
    Asset.loadAsync(ALL_IMAGE_ASSETS as number[]).catch(() => {});
  }, []);

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.bg,
        card: colors.bg,
        border: colors.line,
        text: colors.ink,
        primary: colors.spotify,
      },
    }),
    [isDark, colors.bg, colors.line, colors.ink, colors.spotify]
  );

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <ThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "fade",
            freezeOnBlur: true,
          }}
        />
      </View>
    </ThemeProvider>
  );
}