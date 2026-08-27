import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Card } from "../ui/Card";
import { Typography } from "../../constants/Typography";
import { useThemeColors } from "../../constants/Colors";
import { getCategoryIcon } from "./CategoryIcon";
import { SpecBarRow, type DetailedSpecRow } from "./SpecBarRow";

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
  const rotateAnim = useRef(
    new Animated.Value(defaultExpanded ? 1 : 0),
  ).current;

  const handlePress = useCallback(() => {
    const next = !expanded;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(next);
    Animated.timing(rotateAnim, {
      toValue: next ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [expanded, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-90deg"],
  });

  const Icon = getCategoryIcon(category);
  const specWord = rows.length === 1 ? "spec" : "specs";

  return (
    <Card borderRadius={12} style={styles.card}>
      <Pressable onPress={handlePress} style={styles.header}>
        <Icon size={18} color={colors.text} strokeWidth={2.25} />
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {category}
        </Text>
        <Text style={[styles.count, { color: colors.textTertiary }]}>
          {`${rows.length} ${specWord}`}
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={18} color={colors.textTertiary} strokeWidth={2.25} />
        </Animated.View>
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          {rows.map((row) => (
            <SpecBarRow key={row.label} row={row} colors={colors} />
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  title: {
    ...Typography.headline,
    flex: 1,
  },
  count: {
    ...Typography.caption,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 4,
  },
});
