import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors, formatRetailerName } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";

export function RetailerPill({ retailer }: { retailer?: string }) {
  const { colors } = useThemeColors();
  const label = formatRetailerName(retailer).toUpperCase();

  return (
    <View style={[styles.pill, { borderColor: colors.line }]}>
      <Text style={[type.eyebrow, styles.label, { color: colors.stone }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
