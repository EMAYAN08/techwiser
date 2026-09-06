import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tag } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii, space } from "../../constants/Layout";

export default function PriceScreen() {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 100 }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
        <Text style={[styles.title, { color: colors.ink }]}>Price</Text>
      </View>

      <View style={[styles.center, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Tag size={36} color={colors.stone} strokeWidth={1.5} style={{ marginBottom: 16 }} />
        <Text style={[styles.comingSoon, { color: colors.ink }]}>Coming soon</Text>
        <Text style={[styles.description, { color: colors.stone }]}>
          Price matching, tracking, and drop alerts are currently in development. Check back later!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 16,
  },
  title: { ...type.screenTitle },
  center: {
    flex: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginHorizontal: space.gutter,
    marginTop: 24,
    maxHeight: 360,
  },
  comingSoon: {
    ...type.sectionTitle,
    marginBottom: 12,
  },
  description: {
    ...type.body,
    textAlign: "center",
  },
});
