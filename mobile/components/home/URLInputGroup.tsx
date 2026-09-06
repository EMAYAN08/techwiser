import { type } from "../../constants/Typography";
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, PanResponder, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { Feather } from "@expo/vector-icons";
import { useComparisonStore } from "../../store/useComparisonStore";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { radii, size } from "../../constants/Layout";

const SUPPORTED_DOMAINS = [
  "bestbuy.ca",
  "amazon.ca",
  "canadacomputers.com",
  "memoryexpress.com",
  "newegg.ca",
  "staples.ca",
  "thesource.ca",
  "costco.ca",
  "walmart.ca",
];

type ValidationState = "idle" | "valid" | "invalid";

function validateUrl(url: string): ValidationState {
  if (!url.trim()) return "idle";
  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return "invalid";
    const host = parsed.hostname.replace(/^www\./, "");
    return SUPPORTED_DOMAINS.some((d) => host === d || host.endsWith("." + d)) ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

const THRESHOLD = 90;
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
  index,
  url,
  canDelete,
  onPaste,
  onUpdate,
  onDelete,
  onSwipeStart,
  onSwipeEnd,
}: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(68)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const hapticFired = useRef(false);
  const deleting = useRef(false);
  const swiping = useRef(false);
  const canDeleteRef = useRef(canDelete);
  canDeleteRef.current = canDelete;

  const snapBack = () => {
    onSwipeEnd();
    swiping.current = false;
    hapticFired.current = false;
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 160, friction: 10 }),
      Animated.timing(iconOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(iconScale, { toValue: 0.5, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const commitDelete = () => {
    if (deleting.current) return;
    deleting.current = true;
    onSwipeEnd();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(translateX, { toValue: -360, duration: 220, useNativeDriver: true }),
      Animated.timing(rowOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(rowHeight, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => onDelete());
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (!canDeleteRef.current) return false;
        const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        const isLeftSwipe = g.dx < -8;
        return isHorizontal && isLeftSwipe;
      },
      onPanResponderGrant: () => {
        if (!swiping.current) {
          swiping.current = true;
          onSwipeStart();
        }
      },
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
    })
  ).current;

  return (
    <Animated.View style={[styles.rowWrap, { height: rowHeight }]}>
      <Animated.View style={{ opacity: rowOpacity, flex: 1 }}>
        <Animated.View style={[styles.deleteIcon, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
          <Feather name="trash-2" size={17} color={colors.error} />
        </Animated.View>
        <Animated.View
          style={{ transform: [{ translateX }] }}
          {...panResponder.panHandlers}
          {...({ dataSet: { tabSwipeIgnore: "true" } } as object)}
        >
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

interface URLInputGroupProps {
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  onCompare?: () => void;
  isLoading?: boolean;
  canCompare?: boolean;
}

export function URLInputGroup({
  onSwipeStart = () => {},
  onSwipeEnd = () => {},
  onCompare = () => {},
  isLoading = false,
  canCompare = false,
}: URLInputGroupProps) {
  const { colors } = useThemeColors();
  const { urls, updateUrl, addUrl, removeUrl, setUrls } = useComparisonStore();
  const animValues = useRef(urls.map(() => new Animated.Value(0))).current;
  const clearScale = useRef(new Animated.Value(1)).current;

  while (animValues.length < urls.length + 1) {
    animValues.push(new Animated.Value(0));
  }

  useEffect(() => {
    const anims = [
      ...urls.map((_, i) =>
        Animated.timing(animValues[i], { toValue: 1, duration: 380, delay: i * 60, useNativeDriver: true })
      ),
      ...(urls.length < 3
        ? [Animated.timing(animValues[urls.length], { toValue: 1, duration: 380, delay: urls.length * 60, useNativeDriver: true })]
        : []),
    ];
    Animated.parallel(anims).start();
  }, [urls.length, animValues]);

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
        <Text style={[styles.headerLabel, { color: colors.stone }]}>Product URLs</Text>
        <View style={styles.headerRight}>
          {urls.length > 2 ? (
            <Text style={[styles.swipeHint, { color: colors.stone }]}>Swipe left to remove</Text>
          ) : null}
          {hasAnyContent ? (
            <Animated.View style={{ transform: [{ scale: clearScale }] }}>
              <Pressable
                onPress={handleClearAll}
                style={[styles.clearAllBtn, { backgroundColor: colors.fog }]}
                hitSlop={8}
              >
                <Feather name="trash-2" size={12} color={colors.body} />
                <Text style={[styles.clearAllText, { color: colors.body }]}>Clear all</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </View>

      {urls.map((url, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animValues[index],
            transform: [
              {
                translateY: animValues[index].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              },
            ],
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

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {urls.length < 3 ? (
          <Animated.View
            style={{
              flex: 1,
              opacity: animValues[urls.length],
              transform: [
                {
                  translateY: animValues[urls.length].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                },
              ],
            }}
          >
            <Pressable
              onPress={addUrl}
              style={({ pressed }) => [styles.addBtn, { borderColor: colors.ink, opacity: pressed ? 0.72 : 1 }]}
            >
              <Feather name="plus" size={16} color={colors.ink} />
              <Text style={[styles.addBtnText, { color: colors.ink }]}>Add product</Text>
            </Pressable>
          </Animated.View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            title={isLoading ? "Comparing..." : "Compare"}
            variant="primary"
            onPress={onCompare}
            disabled={!canCompare || isLoading}
            style={{ width: "100%" }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, marginTop: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLabel: {
    ...type.eyebrow,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  swipeHint: { ...type.caption, fontSize: 11 },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  clearAllText: { ...type.caption, fontSize: 12 },
  rowWrap: { justifyContent: "center", overflow: "hidden" },
  deleteIcon: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    pointerEvents: "none",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: size.button,
  },
  addBtnText: {
    ...type.button,
    fontSize: 15,
  },
});
