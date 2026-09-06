import { Typography } from "../../constants/Typography";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Tabs, usePathname } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Zap, BookOpen, Settings as SettingsIcon, Tag, LucideIcon } from "lucide-react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { radii, size } from "../../constants/Layout";

interface TabDef {
  name: string;
  label: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { name: "index", label: "Home", Icon: Zap },
  { name: "library", label: "Library", Icon: BookOpen },
  { name: "price", label: "Price", Icon: Tag },
  { name: "settings", label: "Settings", Icon: SettingsIcon },
];

function isTabPath(path: string) {
  const p = (path || "/").replace(/\/$/, "") || "/";
  return p === "/" || p === "/library" || p === "/price" || p === "/settings";
}

function useActivePath() {
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);

  useEffect(() => {
    setPath(pathname);
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const read = () => {
      const next = window.location.pathname;
      setPath((cur) => (cur === next ? cur : next));
    };
    read();
    const id = setInterval(read, 200);
    window.addEventListener("popstate", read);
    return () => {
      clearInterval(id);
      window.removeEventListener("popstate", read);
    };
  }, []);

  return path;
}

interface TabItemProps {
  def: TabDef;
  focused: boolean;
  onPress: () => void;
  pillBg: string;
  activeColor: string;
  inactiveColor: string;
  activeLabel: string;
}

function TabItem({
  def,
  focused,
  onPress,
  pillBg,
  activeColor,
  inactiveColor,
  activeLabel,
}: TabItemProps) {
  const { Icon, label } = def;
  const color = focused ? activeColor : inactiveColor;
  const labelColor = focused ? activeLabel : inactiveColor;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  };

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
      style={[styles.tab, focused && { backgroundColor: pillBg }]}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 1.75} />
        <Text
          style={[
            styles.tabLabel,
            {
              color: labelColor,
              fontFamily: focused ? Typography.button.fontFamily : Typography.chip.fontFamily,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useThemeColors();
  const path = useActivePath();
  const hidden = !isTabPath(path);

  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
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

  if (hidden) return null;

  const elevationStyle =
    Platform.OS === "web"
      ? ({
          boxShadow: isDark
            ? "0 10px 28px rgba(0,0,0,0.42), 0 1px 0 rgba(255,255,255,0.06) inset"
            : "0 12px 32px rgba(10,10,10,0.08), 0 1px 0 rgba(255,255,255,0.65) inset",
        } as const)
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: isDark ? 8 : 6 },
          shadowOpacity: isDark ? 0.28 : 0.1,
          shadowRadius: isDark ? 18 : 16,
          elevation: isDark ? 10 : 4,
        };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        elevationStyle,
        {
          bottom: insets.bottom + 12,
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
      ]}
    >
      <View style={[styles.glass, { borderColor: colors.tabBarBorder }]}>
        <BlurView
          intensity={isDark ? 42 : 55}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[styles.frost, { backgroundColor: colors.tabBar }]}
        />
        {state.routes.map((route, index) => {
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
              pillBg={colors.tabPill}
              activeColor={colors.tabSelectedIcon}
              activeLabel={colors.tabSelectedLabel}
              inactiveColor={colors.tabUnselected}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
      <Tabs.Screen name="price" options={{ title: "Price" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    height: size.tabBar,
    borderRadius: radii.pill,
    zIndex: 4,
  },
  glass: {
    flex: 1,
    height: size.tabBar,
    borderRadius: radii.pill,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    gap: 4,
  },
  frost: {
    ...StyleSheet.absoluteFillObject,
  },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
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
