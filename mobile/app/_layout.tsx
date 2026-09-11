import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useFonts } from "expo-font";
import { Asset } from "expo-asset";
import { useThemeColors } from "../constants/Colors";
import { ALL_IMAGE_ASSETS } from "../constants/wellCatalog";
import { LoadingOverlay, MASCOT_ASSETS, MascotPreloader } from "../components/home/LoadingOverlay";
import { useComparisonStore } from "../store/useComparisonStore";
import { runLoadingOverlayCancel, runLoadingOverlayCelebrateEnd } from "../store/loadingOverlayBridge";

export default function Layout() {
  const { colors, isDark } = useThemeColors();
  const isLoading = useComparisonStore((s) => s.isLoading);
  const loadPhase = useComparisonStore((s) => s.loadPhase);
  const [loaded] = useFonts({
    "ClashDisplay-Medium": require("../assets/fonts/ClashDisplay-Medium.ttf"),
    "ClashDisplay-Semibold": require("../assets/fonts/ClashDisplay-Semibold.ttf"),
    "ClashDisplay-Bold": require("../assets/fonts/ClashDisplay-Bold.ttf"),
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.ttf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.ttf"),
  });

  useEffect(() => {
    Asset.loadAsync([...(ALL_IMAGE_ASSETS as number[]), ...MASCOT_ASSETS]).catch(() => {});
  }, []);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
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
      <MascotPreloader />
      <LoadingOverlay
        visible={isLoading}
        phase={loadPhase}
        onCancel={runLoadingOverlayCancel}
        onCelebrateEnd={runLoadingOverlayCelebrateEnd}
      />
    </View>
  );
}
