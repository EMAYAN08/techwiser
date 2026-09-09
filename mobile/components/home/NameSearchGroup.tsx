import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Type } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";

interface NameSearchGroupProps {
  onCompare: (urls: string[]) => void;
  isLoading: boolean;
}

export function NameSearchGroup({ onCompare, isLoading }: NameSearchGroupProps) {
  const { colors } = useThemeColors();

  return (
    <View style={[styles.center, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Type size={48} color={colors.stone} strokeWidth={1.5} style={{ marginBottom: 20 }} />
      <Text style={[styles.comingSoon, { color: colors.ink }]}>Coming soon</Text>
      <Text style={[styles.description, { color: colors.stone }]}>
        Product name search is currently disabled and will be available in the next version of the app! Please use URL or QR search instead.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    borderRadius: radii.card,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 8,
    minHeight: 280,
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
