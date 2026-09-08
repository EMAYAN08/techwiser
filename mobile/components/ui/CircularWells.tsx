import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Image,
  ScrollView,
} from "react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { fonts } from "../../constants/Typography";
import { size } from "../../constants/Layout";
import type { WellDef } from "../../constants/wellCatalog";

interface CircularWellsProps {
  items: WellDef[];
  selectedId: string;
  onSelect: (id: string) => void;
  layout?: "spread" | "scroll";
  allowDeselectToAll?: boolean;
  shape?: "circle" | "squircle";
}

export function CircularWells({
  items,
  selectedId,
  onSelect,
  layout = "spread",
  allowDeselectToAll = false,
  shape = "circle",
}: CircularWellsProps) {
  const { colors, isDark } = useThemeColors();
  const anims = useRef<Record<string, { scale: Animated.Value; wobble: Animated.Value }>>({}).current;

  const ensure = (id: string) => {
    if (!anims[id]) {
      anims[id] = { scale: new Animated.Value(1), wobble: new Animated.Value(0) };
    }
    return anims[id];
  };

  const bounce = (id: string) => {
    const a = ensure(id);
    a.scale.setValue(1);
    a.wobble.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(a.scale, { toValue: 0.82, duration: 70, useNativeDriver: true }),
        Animated.spring(a.scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 260 }),
      ]),
      Animated.sequence([
        Animated.timing(a.wobble, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(a.wobble, { toValue: -0.7, duration: 90, useNativeDriver: true }),
        Animated.spring(a.wobble, { toValue: 0, useNativeDriver: true, friction: 5, tension: 220 }),
      ]),
    ]).start();
  };

  const handlePress = (item: WellDef) => {
    bounce(item.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (allowDeselectToAll && item.id === selectedId && item.id !== "all") {
      onSelect("all");
      return;
    }
    if (item.id !== selectedId) onSelect(item.id);
  };

  const nodes = items.map((item) => {
    const isActive = selectedId === item.id;
    const wellBg = isActive ? item.tint.wash : (isDark ? "#EBEBEB" : colors.modeWell);
    const a = ensure(item.id);
    return (
      <Pressable
        key={item.id}
        onPress={() => handlePress(item)}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isActive }}
        style={[styles.item, layout === "scroll" ? styles.itemScroll : styles.itemSpread]}
      >
        <View style={[styles.well, { backgroundColor: wellBg, borderRadius: shape === 'squircle' ? 16 : size.modeWell / 2, overflow: 'hidden' }]}>
          <Animated.View
            style={[
              { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
              {
                transform: [
                  { scale: a.scale },
                  {
                    rotate: a.wobble.interpolate({
                      inputRange: [-1, 1],
                      outputRange: ["-8deg", "8deg"],
                    }),
                  },
                ],
              }
            ]}
          >
            <Image 
              source={item.icon} 
              style={shape === 'squircle' ? styles.iconFull : styles.icon} 
              resizeMode={shape === 'squircle' ? "cover" : "contain"} 
            />
          </Animated.View>
        </View>
        <Text
          style={[
            styles.label,
            {
              color: isActive ? colors.ink : colors.stone,
              fontFamily: isActive ? fonts.uiBold : fonts.uiMedium,
            },
          ]}
          numberOfLines={2}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  });

  if (layout === "scroll") {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        accessibilityRole="tablist"
      >
        {nodes}
      </ScrollView>
    );
  }

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {nodes}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  scrollView: {
    flexGrow: 0,
    height: 112,
  },
  scroll: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    paddingRight: 8,
  },
  item: {
    alignItems: "center",
    gap: 8,
  },
  itemSpread: {
    flex: 1,
  },
  itemScroll: {
    width: 76,
  },
  well: {
    width: size.modeWell,
    height: size.modeWell,
    borderRadius: size.modeWell / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 56,
    height: 56,
  },
  iconFull: {
    width: "100%",
    height: "100%",
  },
  label: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: -0.1,
    textAlign: "center",
    minHeight: 16,
  },
});
