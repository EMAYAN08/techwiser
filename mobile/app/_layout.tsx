import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Image } from "react-native";
import { useFonts } from "expo-font";
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

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      />
      {/* GPU Preload Cache for high-resolution logos/icons to prevent flicker */}
      <View style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
        {ALL_IMAGE_ASSETS.map((asset, i) => (
          <Image key={i} source={asset} style={{ width: 1, height: 1 }} />
        ))}
      </View>
    </View>
  );
}
