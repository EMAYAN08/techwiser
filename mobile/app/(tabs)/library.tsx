import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useComparisonStore, Product } from "../../store/useComparisonStore";
import { ProductCard } from "../../components/comparison/ProductCard";
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { space } from "../../constants/Layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LibraryScreen() {
  const { recentComparisons } = useComparisonStore();
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();

  const allProducts = useMemo(() => {
    const map = new Map<string, Product>();
    recentComparisons.forEach((comp) => {
      if (comp.result) {
        comp.result.products.forEach((p) => {
          if (!map.has(p.id)) map.set(p.id, p);
        });
      }
    });
    return Array.from(map.values());
  }, [recentComparisons]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.ink }]}>Library</Text>
        {allProducts.length > 0 && (
          <Text style={[styles.count, { color: colors.stone }]}>
            {allProducts.length} saved product{allProducts.length === 1 ? "" : "s"}
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {allProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.ink }]}>No saved products</Text>
            <Text style={[styles.emptySubtext, { color: colors.stone }]}>
              Products you compare will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {allProducts.map((p, index) => (
              <View key={p.id} style={styles.cardWrapper}>
                <ProductCard product={p} index={index} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 16,
  },
  headerTitle: { ...Typography.display },
  count: { ...Typography.caption, marginTop: 6 },
  scroll: { paddingHorizontal: space.gutter },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  cardWrapper: { width: "50%", paddingBottom: 12 },
  emptyState: { alignItems: "flex-start", marginTop: 48 },
  emptyText: { ...Typography.productName, fontSize: 18, marginBottom: 8 },
  emptySubtext: { ...Typography.body },
});
