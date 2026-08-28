import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { PackageOpen, ArrowLeft } from "lucide-react-native";

import { useComparisonStore } from "../../store/useComparisonStore";
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { Button } from "../../components/ui/Button";
import { DetailedCompareHeader } from "../../components/comparison/DetailedCompareHeader";
import { CategorySection } from "../../components/comparison/CategorySection";
import type {
  DetailedSpecRow,
  DetailedSpecValue,
} from "../../components/comparison/SpecBarRow";

export default function DetailedCompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useThemeColors();
  const { activeComparison } = useComparisonStore();

  const screenPadding = Math.max(16, Math.min(24, Math.round(width * 0.05)));

  const categories = useMemo(() => {
    if (!activeComparison) return [];
    const { products } = activeComparison;
    const head = products[0];
    if (!head) return [];
    const specCount = head.specs.length;

    const map = new Map<string, DetailedSpecRow[]>();
    for (let i = 0; i < specCount; i++) {
      const lead = head.specs[i];
      if (!lead) continue;

      const values: DetailedSpecValue[] = products.map((p) => {
        const s = p.specs[i];
        return {
          productId: p.id,
          productName: p.name,
          productColor: p.retailerColor,
          displayValue: s?.value ?? "—",
          numericValue:
            typeof s?.numericValue === "number" ? s.numericValue : null,
          isWinner: !!s?.isWinner,
          isDraw: !!s?.isDraw,
        };
      });

      const row: DetailedSpecRow = {
        label: lead.label,
        unit: lead.unit,
        values,
      };
      const list = map.get(lead.category) ?? [];
      list.push(row);
      map.set(lead.category, list);
    }

    return Array.from(map.entries()).map(([key, rows]) => ({ key, rows }));
  }, [activeComparison]);

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleBackLink = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (!activeComparison) {
    return (
      <View
        style={[styles.emptyRoot, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.emptyIconWrap,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <PackageOpen size={32} color={colors.textTertiary} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Nothing to compare yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add two product URLs on the home screen to see the full
          specification breakdown.
        </Text>
        <View style={styles.emptyButton}>
          <Button title="Go back" variant="primary" onPress={handleBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DetailedCompareHeader
        products={activeComparison.products}
        onBack={handleBack}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          {
            paddingHorizontal: screenPadding,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat, idx) => (
          <CategorySection
            key={cat.key}
            category={cat.key}
            rows={cat.rows}
            defaultExpanded={idx === 0}
            colors={colors}
          />
        ))}

        <Pressable
          onPress={handleBackLink}
          accessibilityRole="link"
          accessibilityLabel="Back to comparison overview"
          style={({ pressed }) => [
            styles.backLink,
            { borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.25} />
          <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>
            Back to comparison
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollBody: {
    paddingTop: 20,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backLinkText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: "600",
  },

  // Empty
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    ...Typography.headline,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtitle: {
    ...Typography.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    alignSelf: "stretch",
  },
});
