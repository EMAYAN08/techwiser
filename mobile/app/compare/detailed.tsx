import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useComparisonStore } from "../../store/useComparisonStore";
import { useThemeColors } from "../../constants/Colors";
import { DetailedCompareHeader } from "../../components/comparison/DetailedCompareHeader";
import { CategorySection } from "../../components/comparison/CategorySection";
import type {
  DetailedSpecRow,
  DetailedSpecValue,
} from "../../components/comparison/SpecBarRow";

export default function DetailedCompareScreen() {
  const router = useRouter();
  const { activeComparison } = useComparisonStore();
  const { colors } = useThemeColors();

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (!activeComparison) {
    return (
      <View
        style={[styles.emptyRoot, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No comparison loaded.
        </Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: pressed
                ? colors.surfaceHighlight
                : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.backBtnText, { color: colors.primary }]}>
            Go back
          </Text>
        </Pressable>
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
        contentContainerStyle={styles.scrollBody}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: "500",
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
