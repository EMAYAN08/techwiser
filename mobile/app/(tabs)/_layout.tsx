import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Zap, BookOpen, Settings as SettingsIcon, LucideIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "../../constants/Colors";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

interface TabDef {
  name: string;
  label: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { name: "index", label: "Home", Icon: Zap },
  { name: "library", label: "Library", Icon: BookOpen },
  { name: "settings", label: "Settings", Icon: SettingsIcon },
];

// ---------------------------------------------------------------------------
// Single tab item — pill button with active sub-pill background
// ---------------------------------------------------------------------------

interface TabItemProps {
  def: TabDef;
  focused: boolean;
  onPress: () => void;
  pillBg: string;
  activeColor: string;
  inactiveColor: string;
}

function TabItem({
  def,
  focused,
  onPress,
  pillBg,
  activeColor,
  inactiveColor,
}: TabItemProps) {
  const { Icon, label } = def;
  const color = focused ? activeColor : inactiveColor;

  // Press-in scale (matches Button.tsx pattern).
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  // Selection haptic when this tab becomes the focused one.
  const wasFocused = useRef(focused);
  useEffect(() => {
    if (focused && !wasFocused.current) {
      void Haptics.selectionAsync();
    }
    wasFocused.current = focused;
  }, [focused]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      accessibilityHint={`Go to ${label} tab`}
      hitSlop={4}
      style={[
        styles.tab,
        focused && { backgroundColor: pillBg },
      ]}
    >
      <Animated.View
        style={[styles.tabInner, { transform: [{ scale }] }]}
      >
        <Icon size={20} color={color} strokeWidth={focused ? 2.25 : 1.75} />
        <Text
          style={[
            styles.tabLabel,
            { color, fontWeight: focused ? "600" : "500" },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Custom floating-pill tab bar
// ---------------------------------------------------------------------------

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useThemeColors();

  // Mount fade-in (gated by reduce-motion).
  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      // When reduce-motion is on, jump straight to the resting value with
      // a 0ms duration so the translateY/transform resolves to its final
      // state without animating.
      Animated.timing(mountAnim, {
        toValue: 1,
        duration: enabled ? 0 : 220,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [mountAnim]);

  const shadow = isDark
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
        elevation: 12,
      }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 8,
      };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom: insets.bottom + 12,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: mountAnim,
          transform: [
            {
              translateY: mountAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
        shadow,
      ]}
    >
      {state.routes.map((route: BottomTabBarProps["state"]["routes"][number], index: number) => {
        const def = TABS.find((t) => t.name === route.name);
        if (!def) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            def={def}
            focused={focused}
            onPress={onPress}
            pillBg={colors.surfaceHighlight}
            activeColor={colors.text}
            inactiveColor={colors.textTertiary}
          />
        );
      })}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Hide the built-in tab bar; we render a custom floating pill below.
        tabBarStyle: { display: "none" },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
