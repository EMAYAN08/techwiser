import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "../../constants/Colors";

interface TabIconProps {
  name: React.ComponentProps<typeof Feather>["name"];
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
}

function TabIcon({ name, focused, activeColor, inactiveColor }: TabIconProps) {
  return (
    <View style={styles.iconWrapper}>
      {focused && <View style={[styles.activeDot, { backgroundColor: activeColor }]} />}
      <Feather name={name} size={22} color={focused ? activeColor : inactiveColor} />
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark } = useThemeColors();
  const active = colors.text;
  const inactive = colors.textTertiary;
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar, 
          { backgroundColor: isDark ? "#0F0F0F" : "#FFFFFF", borderTopColor: colors.border }
        ],
        tabBarShowLabel: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="zap" focused={focused} activeColor={active} inactiveColor={inactive} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="layers" focused={focused} activeColor={active} inactiveColor={inactive} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="sliders" focused={focused} activeColor={active} inactiveColor={inactive} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 12,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    top: -10,
    width: 3,
    height: 3,
    borderRadius: 2,
  },
});
