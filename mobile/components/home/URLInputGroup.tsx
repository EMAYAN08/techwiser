import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, PanResponder, Pressable,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from '../../utils/haptics';
import { useThemeColors } from "../../constants/Colors";
import { Feather } from "@expo/vector-icons";
import { useComparisonStore } from "../../store/useComparisonStore";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

const SUPPORTED_DOMAINS = [
  "bestbuy.ca", "amazon.ca", "canadacomputers.com",
  "memoryexpress.com", "newegg.ca", "staples.ca", "thesource.ca", "costco.ca",
  "walmart.ca"
];

type ValidationState = "idle" | "valid" | "invalid";

function validateUrl(url: string): ValidationState {
  if (!url.trim()) return "idle";
  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return "invalid";
    const host = parsed.hostname.replace(/^www\./, "");
    return SUPPORTED_DOMAINS.some(
      (d) => host === d || host.endsWith("." + d)
    ) ? "valid" : "invalid";
  } catch { return "invalid"; }
}

const THRESHOLD   = 90;
const ICON_REVEAL = 48;

interface SwipeableRowProps {
  index: number;
  url: string;
  canDelete: boolean;
  onPaste: () => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  onSwipeStart: () => void;
  onSwipeEnd: () => void;
  colors: any;
}

function SwipeableRow({
  colors,
  index, url, canDelete,
  onPaste, onUpdate, onDelete,
  onSwipeStart, onSwipeEnd,
}: SwipeableRowProps) {
  const translateX  = useRef(new Animated.Value(0)).current;
  const rowHeight   = useRef(new Animated.Value(62)).current;
  const rowOpacity  = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale   = useRef(new Animated.Value(0.5)).current;
  const hapticFired   = useRef(false);
  const deleting      = useRef(false);
  const swiping       = useRef(false);
  const canDeleteRef = useRef(canDelete);
  canDeleteRef.current = canDelete;

  const snapBack = () => {
    onSwipeEnd();
    swiping.current = false;
    hapticFired.current = false;
    // All three use native driver — no mixing issue
    Animated.parallel([
      Animated.spring(translateX,  { toValue: 0,   useNativeDriver: true, tension: 160, friction: 10 }),
      Animated.timing(iconOpacity, { toValue: 0,   duration: 180, useNativeDriver: true }),
      Animated.timing(iconScale,   { toValue: 0.5, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const commitDelete = () => {
    if (deleting.current) return;
    deleting.current = true;
    onSwipeEnd();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // native driver: slide + fade (height cannot use native driver)
    Animated.parallel([
      Animated.timing(translateX, { toValue: -360, duration: 220, useNativeDriver: true }),
      Animated.timing(rowOpacity, { toValue: 0,    duration: 180, useNativeDriver: true }),
    ]).start(() => {
      // JS driver: collapse height after slide completes
      Animated.timing(rowHeight, { toValue: 0, duration: 180, useNativeDriver: false }).start(
        () => onDelete()
      );
    });
  };

  const panResponder = useRef(PanResponder.create({
    // Dont claim on tap - only on clear horizontal move
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,

    // Capture phase - fires BEFORE the ScrollView sees it
    onMoveShouldSetPanResponderCapture: (_, g) => {
      if (!canDeleteRef.current) return false;
      const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
      const isLeftSwipe  = g.dx < -8;
      return isHorizontal && isLeftSwipe;
    },

    onPanResponderGrant: () => {
      // Lock the scroll immediately when we claim the gesture
      if (!swiping.current) {
        swiping.current = true;
        onSwipeStart();
      }
    },

    // Never surrender the gesture to ScrollView or anything else
    onPanResponderTerminationRequest: () => false,

    onPanResponderMove: (_, g) => {
      const dx = Math.max(-THRESHOLD - 20, Math.min(0, g.dx));
      translateX.setValue(dx);

      const progress = Math.min(1, Math.abs(dx) / ICON_REVEAL);
      iconOpacity.setValue(progress);
      iconScale.setValue(0.5 + 0.5 * progress);

      if (Math.abs(dx) >= THRESHOLD && !hapticFired.current) {
        hapticFired.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (Math.abs(dx) < THRESHOLD - 15) {
        hapticFired.current = false;
      }
    },

    onPanResponderRelease: (_, g) => {
      if (g.dx <= -THRESHOLD || g.vx < -0.5) {
        commitDelete();
      } else {
        snapBack();
      }
    },

    onPanResponderTerminate: () => snapBack(),
  })).current;

  return (
    // Outer: JS driver only (height collapse) — never touched by native driver
    <Animated.View style={[styles.rowWrap, { height: rowHeight }]}>
      {/* Inner: native driver (opacity fade) — separate node from height */}
      <Animated.View style={{ opacity: rowOpacity, flex: 1 }}>
        {/* Tiny red icon revealed behind the input */}
        <Animated.View style={[styles.deleteIcon, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
          <Feather name="trash-2" size={17} color={colors.error} />
        </Animated.View>

        {/* Input slides left — native driver */}
        <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
          <Input
            placeholder={`Product ${index + 1} URL`}
            value={url}
            onChangeText={onUpdate}
            onPaste={onPaste}
            onClear={() => onUpdate("")}
            validationState={validateUrl(url)}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// -- Group ---------------------------------------------------------------------
interface URLInputGroupProps {
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

export function URLInputGroup({ onSwipeStart = () => {}, onSwipeEnd = () => {} }: URLInputGroupProps) {
  const { colors } = useThemeColors();
  const { urls, updateUrl, addUrl, removeUrl, setUrls } = useComparisonStore();
  const animValues    = useRef(urls.map(() => new Animated.Value(0))).current;
  const clearScale    = useRef(new Animated.Value(1)).current;

  while (animValues.length < urls.length + 1) {
    animValues.push(new Animated.Value(0));
  }

  useEffect(() => {
    const anims = [
      ...urls.map((_, i) =>
        Animated.timing(animValues[i], { toValue: 1, duration: 380, delay: i * 60, useNativeDriver: true })
      ),
      ...(urls.length < 4
        ? [Animated.timing(animValues[urls.length], { toValue: 1, duration: 380, delay: urls.length * 60, useNativeDriver: true })]
        : []),
    ];
    Animated.parallel(anims).start();
  }, [urls.length]);

  const handlePaste = async (index: number) => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text?.trim()) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateUrl(index, text.trim());
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClearAll = () => {
    if (!urls.some((u) => u.trim())) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(clearScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(clearScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 7 }),
    ]).start();
    setUrls(urls.map(() => ""));
  };

  const hasAnyContent = urls.some((u) => u.trim().length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.textTertiary }]}>Product URLs</Text>
        <View style={styles.headerRight}>
          {urls.length > 2 && (
            <Text style={[styles.swipeHint, { color: colors.textTertiary }]}>Swipe left to remove</Text>
          )}
          {hasAnyContent && (
            <Animated.View style={{ transform: [{ scale: clearScale }] }}>
              <Pressable onPress={handleClearAll} style={[styles.clearAllBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} hitSlop={8}>
                <Feather name="trash-2" size={12} color={colors.textSecondary} />
                <Text style={[styles.clearAllText, { color: colors.textSecondary }]}>Clear all</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>

      {urls.map((url, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animValues[index],
            transform: [{
              translateY: animValues[index].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
            }],
          }}
        >
          <SwipeableRow
            index={index}
            url={url}
            canDelete={index >= 2}
            onPaste={() => handlePaste(index)}
            onUpdate={(text) => updateUrl(index, text)}
            onDelete={() => removeUrl(index)}
            onSwipeStart={onSwipeStart}
            onSwipeEnd={onSwipeEnd}
            colors={colors}
          />
        </Animated.View>
      ))}

      {urls.length < 4 && (
        <Animated.View
          style={{
            opacity: animValues[urls.length],
            transform: [{
              translateY: animValues[urls.length].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
            }],
          }}
        >
          <Pressable
            onPress={addUrl}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: 'rgba(210, 153, 34, 0.15)', borderColor: 'rgba(210, 153, 34, 0.4)' },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Feather name="plus" size={14} color="#d29922" />
            <Text style={[styles.addBtnText, { color: "#d29922" }]}>Add product</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  headerLabel: {
    fontSize: 12, fontWeight: "600",
    color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  swipeHint: { fontSize: 11, color: "rgba(255,255,255,0.20)" },
  clearAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A",
  },
  clearAllText: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  rowWrap: { justifyContent: "center", overflow: "hidden" },
  deleteIcon: {
    position: "absolute", right: 14,
    top: 0, bottom: 12,
    alignItems: "center", justifyContent: "center", width: 32,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
