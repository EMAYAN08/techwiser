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
import { usePathname, Tabs } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Zap, BookOpen, Settings as SettingsIcon, LucideIcon } from "lucide-react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { radii, size } from "../../constants/Layout";
import { tabBarAnim } from "../../store/uiStore";

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

function isTabPath(path: string) {
  const p = (path || "/").replace(/\/$/, "") || "/";
  return p === "/" || p === "/library" || p === "/settings";
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
  pillShadow?: object;
  activeColor: string;
  inactiveColor: string;
  activeLabel: string;
}

function TabItem({
  def,
  focused,
  onPress,
  pillBg,
  pillShadow,
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
      style={[styles.tab, focused && { backgroundColor: pillBg }, focused && pillShadow]}
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

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const path = useActivePath();
  const hidden = !isTabPath(path);

  // Web: start visible to avoid FOUC; native keeps a short mount fade.
  const mountAnim = useRef(new Animated.Value(Platform.OS === "web" ? 1 : 0)).current;
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

  const safeBottom = Math.max(insets.bottom, 0);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          bottom: 0,
          // Whole dock, including the home-indicator strip, is the nav color.
          backgroundColor: colors.tabBar,
          opacity: Animated.multiply(mountAnim, tabBarAnim),
          transform: [
            {
              translateY: Animated.add(
                mountAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
                tabBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [size.tabBar + safeBottom + 40, 0],
                })
              ),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.glass,
          { borderColor: colors.tabBarBorder, backgroundColor: colors.tabBar },
        ]}
      >
        {state?.routes?.map((route: any, index: number) => {
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
      {/* Safe-area / home-indicator fill — same color as the bar, not the screen. */}
      <View
        pointerEvents="none"
        style={{ height: safeBottom, backgroundColor: colors.tabBar }}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const { colors } = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: "fade",
          freezeOnBlur: false,
          sceneStyle: { backgroundColor: colors.bg },
        }}
        screenListeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
        tabBar={(props) => <CustomTabBar {...props as any} />}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="library" options={{ title: "Library" }} />
        <Tabs.Screen name="price" options={{ href: null, title: "Price" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
  },
  glass: {
    height: size.tabBar,
    width: "100%",
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 52,
    minHeight: size.hit,
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
    letterSpacing: 0.15,
  },
});
