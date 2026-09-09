import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScanBarcode } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";

interface BarcodeInputGroupProps {
  onCompare: (urls: string[]) => void;
  isLoading: boolean;
}

export function BarcodeInputGroup({ onCompare, isLoading }: BarcodeInputGroupProps) {
  const { colors } = useThemeColors();

  return (
    <View style={[styles.center, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <ScanBarcode size={48} color={colors.stone} strokeWidth={1.5} style={{ marginBottom: 20 }} />
      <Text style={[styles.comingSoon, { color: colors.ink }]}>Coming soon</Text>
      <Text style={[styles.description, { color: colors.stone }]}>
        UPC Barcode scanning is currently disabled and will be available in the next version of the app! Please use QR or Name search instead.
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
