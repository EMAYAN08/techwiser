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
import { BlurView } from "expo-blur";
import { Zap, BookOpen, Settings as SettingsIcon, Tag, LucideIcon } from "lucide-react-native";
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

  const liquidShadow =
    Platform.OS === "web"
      ? ({
          boxShadow: isDark
            ? "0 18px 40px rgba(0,0,0,0.48), 0 2px 8px rgba(0,0,0,0.28)"
            : "0 16px 40px rgba(20,16,10,0.12), 0 2px 8px rgba(20,16,10,0.06)",
        } as const)
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.4 : 0.14,
          shadowRadius: isDark ? 22 : 18,
          elevation: isDark ? 14 : 8,
        };

  const glassChrome =
    Platform.OS === "web"
      ? ({
          backdropFilter: isDark ? "blur(36px) saturate(190%)" : "blur(32px) saturate(180%)",
          WebkitBackdropFilter: isDark ? "blur(36px) saturate(190%)" : "blur(32px) saturate(180%)",
          boxShadow: isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.28)"
            : "inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -0.5px 0 rgba(10,10,10,0.06)",
        } as object)
      : null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        liquidShadow,
        {
          bottom: Math.max(insets.bottom, 10) + 8,
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
                  outputRange: [120, 0], // Slides down 120px completely out of screen
                })
              ),
            },
            {
              scale: tabBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1], // Smoothly shrinks down like Instagram
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.glass,
          { borderColor: colors.tabBarBorder, backgroundColor: colors.tabBar },
          glassChrome,
        ]}
      >
        {Platform.OS !== "web" ? (
          <BlurView
            intensity={isDark ? 48 : 64}
            tint={isDark ? "dark" : "light"}
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            styles.shine,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.42)",
            },
          ]}
        />
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
              pillShadow={
                Platform.OS === "web"
                  ? ({
                      boxShadow: isDark
                        ? "inset 0 1px 0 rgba(255,255,255,0.22), 0 1px 4px rgba(0,0,0,0.25)"
                        : "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 5px rgba(10,10,10,0.08)",
                    } as const)
                  : undefined
              }
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
        <Tabs.Screen name="price" options={{ title: "Price" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
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
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1.5,
    borderRadius: 1,
  },
  tab: {
    flex: 1,
    height: 52,
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
