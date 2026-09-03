import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tag } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";

export default function PriceScreen() {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Price Tracking</Text>
      </View>

      <View style={[styles.center, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
        <Tag size={48} color={colors.textTertiary} strokeWidth={1.5} style={{ marginBottom: 16 }} />
        <Text style={[styles.comingSoon, { color: colors.text }]}>Coming Soon</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Price matching, tracking, and drop alerts are currently in development. Check back later!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...Typography.headline,
    fontSize: 28,
  },
  center: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    maxHeight: 400,
  },
  comingSoon: {
    ...Typography.title,
    marginBottom: 12,
  },
  description: {
    ...Typography.body,
    textAlign: "center",
    lineHeight: 24,
  },
});
