import React, { useCallback, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import * as Haptics from '../../utils/haptics';
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { SpecBarRow, type DetailedSpecRow } from "./SpecBarRow";

// Enable LayoutAnimation on Android (it is on by default on iOS).
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Palette = ReturnType<typeof useThemeColors>["colors"];

interface CategorySectionProps {
  category: string;
  rows: DetailedSpecRow[];
  defaultExpanded?: boolean;
  colors: Palette;
}

export function CategorySection({
  category,
  rows,
  defaultExpanded,
  colors,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded ?? false);

  const handlePress = useCallback(() => {
    const next = !expanded;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [expanded]);

  const specWord = rows.length === 1 ? "spec" : "specs";

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${category} section, ${rows.length} ${specWord}`}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? "Tap to collapse" : "Tap to expand"}
        style={({ pressed }) => [
          styles.header,
          { borderBottomColor: expanded ? colors.border : "transparent" },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {category}
        </Text>
        <Text style={[styles.count, { color: colors.textTertiary }]}>
          {`${rows.length} ${specWord}`}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {rows.map((row) => (
            <SpecBarRow
              key={row.label}
              row={row}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...Typography.headline,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  count: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "none",
    marginLeft: 12,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 18,
  },
});
