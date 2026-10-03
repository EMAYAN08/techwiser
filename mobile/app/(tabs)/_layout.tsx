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
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Zap, BookOpen, Settings as SettingsIcon, LucideIcon } from "lucide-react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { dock, dockBottomOffset, radii } from "../../constants/Layout";
import { tabBarAnim } from "../../store/uiStore";

interface TabDef {
  name: string;
  label: string;
  Icon: LucideIcon;
}

/** How far the frosted wash reaches above the pill. Kept short so lists stay readable. */
const FADE_LEAD = 36;

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
  const { colors, isDark } = useThemeColors();
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

  const floatBottom = dockBottomOffset(insets.bottom);
  const scrimHeight = FADE_LEAD + dock.height + floatBottom;
  const webChrome =
    Platform.OS === "web"
      ? ({
          backdropFilter: isDark ? "blur(22px) saturate(160%)" : "blur(20px) saturate(180%)",
          WebkitBackdropFilter: isDark ? "blur(22px) saturate(160%)" : "blur(20px) saturate(180%)",
          boxShadow: isDark
            ? "0 12px 32px rgba(0,0,0,0.48), 0 2px 8px rgba(0,0,0,0.28)"
            : "0 12px 28px rgba(10,10,10,0.14), 0 2px 6px rgba(10,10,10,0.06)",
        } as object)
      : null;

  const shellMotion = {
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
            outputRange: [scrimHeight + 24, 0],
          })
        ),
      },
    ],
  };

  const webBlur =
    Platform.OS === "web"
      ? ({
          backdropFilter: isDark ? "blur(8px) saturate(140%)" : "blur(8px) saturate(150%)",
          WebkitBackdropFilter: isDark ? "blur(8px) saturate(140%)" : "blur(8px) saturate(150%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.18) 68%, rgba(0,0,0,0.4) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.18) 68%, rgba(0,0,0,0.4) 100%)",
        } as object)
      : null;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.shell, { height: scrimHeight }, shellMotion]}>
      <View pointerEvents="none" style={styles.scrim}>
        <View style={[styles.scrimBlur, webBlur]} />
        {Platform.OS !== "web" ? (
          <BlurView
            intensity={isDark ? 12 : 16}
            tint={isDark ? "dark" : "light"}
            blurMethod="dimezisBlurView"
            style={styles.scrimBlur}
          />
        ) : null}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="dockScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
              <Stop offset="0.42" stopColor={colors.bg} stopOpacity="0" />
              <Stop offset="0.62" stopColor={colors.bg} stopOpacity="0.05" />
              <Stop offset="0.78" stopColor={colors.bg} stopOpacity="0.14" />
              <Stop offset="0.9" stopColor={colors.bg} stopOpacity="0.28" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="0.42" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dockScrim)" />
        </Svg>
      </View>
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          left: dock.side,
          right: dock.side,
          bottom: floatBottom,
          shadowOpacity: isDark ? 0.45 : 0.16,
          backgroundColor: isDark ? "rgba(28,28,28,0.88)" : "rgba(255,255,255,0.92)",
        },
      ]}
    >
      <View
        style={[
          styles.wrap,
          webChrome,
          {
            backgroundColor: isDark ? "rgba(28,28,28,0.88)" : "rgba(255,255,255,0.92)",
            borderColor: colors.dockBorder,
          },
        ]}
      >
      {Platform.OS !== "web" ? (
        <BlurView
          intensity={isDark ? 42 : 56}
          tint={isDark ? "dark" : "light"}
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.glass}>
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
      </View>
    </Animated.View>
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
          // Keep this "none". expo-router's vendored BottomTabView still
          // derives a blurred tab's activityState from a native-driver
          // Animated value when animation is "fade" or "shift". On iOS that
          // detaches Library and Settings (any tab to the right of the focused
          // one) and a fast switch can leave the native screen stuck detached:
          // the tab bar updates, the scene does not, and it never accepts
          // touches again. A numeric activityState avoids that race.
          animation: "none",
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
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  // Blur starts below the transparent top so the frost fades in instead of clipping.
  scrimBlur: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: "58%",
  },
  // Shadow lives here so overflow:hidden on the pill does not clip it.
  host: {
    position: "absolute",
    zIndex: 2,
    height: dock.height,
    borderRadius: radii.pill,
    // Shadow on the host (overflow visible) so the pill lift is not clipped.
    shadowColor: "#000",
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  wrap: {
    flex: 1,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  glass: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 52,
    minHeight: 44,
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
