import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useThemeColors } from "../constants/Colors";

export default function Layout() {
  const { colors, isDark } = useThemeColors();
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: { backgroundColor: colors.background }, 
          animation: "fade" 
        }} 
      />
    </View>
  );
}
