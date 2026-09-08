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

  const handlePress = (item: WellDef) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (allowDeselectToAll && item.id === selectedId && item.id !== "all") {
      onSelect("all");
      return;
    }
    if (item.id !== selectedId) onSelect(item.id);
  };

  const nodes = items.map((item) => {
    const isActive = selectedId === item.id;
    const wellBg = isDark ? "#EBEBEB" : colors.modeWell;

    return (
      <Pressable
        key={item.id}
        onPress={() => handlePress(item)}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isActive }}
        style={[styles.item, layout === "scroll" ? styles.itemScroll : styles.itemSpread]}
      >
        <View 
          style={[
            styles.well, 
            { 
              backgroundColor: wellBg, 
              borderRadius: shape === 'squircle' ? 16 : size.modeWell / 2, 
              overflow: 'hidden',
              borderWidth: isActive ? 2 : 0,
              borderColor: isActive ? colors.primary : "transparent"
            }
          ]}
        >
          <View style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <Image 
              source={item.icon} 
              style={shape === 'squircle' ? styles.iconFull : styles.icon} 
              resizeMode={shape === 'squircle' ? "cover" : "contain"} 
            />
          </View>
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
