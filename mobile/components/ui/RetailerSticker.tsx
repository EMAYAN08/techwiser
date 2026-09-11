import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors, getRetailerColor, formatRetailerName } from "../../constants/Colors";

function hexLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return 0;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function RetailerSticker({
  retailer,
  compact = false,
}: {
  retailer?: string;
  compact?: boolean;
}) {
  const { isDark } = useThemeColors();
  const fill = getRetailerColor(retailer, false);
  const label = formatRetailerName(retailer).toUpperCase();
  const fg = hexLuminance(fill) > 0.65 ? "#111111" : "#FFFFFF";
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!isDark ? <View style={[styles.shadow, compact && styles.shadowCompact]} /> : null}
      <View style={[styles.face, compact && styles.faceCompact, { backgroundColor: fill }]}>
        <Text style={[styles.text, compact && styles.textCompact, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  wrapCompact: { maxWidth: 108 },
  shadow: {
    position: "absolute",
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    borderRadius: 6,
    backgroundColor: "#111111",
  },
  shadowCompact: {
    top: 1,
    left: 1,
    right: -1,
    bottom: -1,
    borderRadius: 5,
  },
  face: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  faceCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  text: {
    fontFamily: "Satoshi-Bold",
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    fontWeight: "800",
  },
  textCompact: {
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.4,
  },
});
