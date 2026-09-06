import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import { useComparisonStore, Product } from "../../store/useComparisonStore";
import { ProductCard } from "../../components/comparison/ProductCard";
import { CircularWells } from "../../components/ui/CircularWells";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { NavCircle } from "../../components/ui/NavCircle";
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { space } from "../../constants/Layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "../../utils/haptics";
import { ALL_WELL, TYPE_WELLS, RETAIL_WELLS, RETAIL_ORDER, type WellDef } from "../../constants/wellCatalog";
import { classifyProduct, getRetailerKey } from "../../utils/productKind";

type FilterBy = "retailer" | "type";

function uniqueProducts(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  products.forEach((p) => {
    if (!map.has(p.id)) map.set(p.id, p);
  });
  return Array.from(map.values());
}

export default function LibraryScreen() {
  const { recentComparisons } = useComparisonStore();
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<FilterBy>("retailer");
  const [selectedId, setSelectedId] = useState("all");

  const allProducts = useMemo(() => {
    const list: Product[] = [];
    recentComparisons.forEach((comp) => {
      if (comp.result) list.push(...comp.result.products);
    });
    return uniqueProducts(list);
  }, [recentComparisons]);

  const retailerWells = useMemo(() => {
    const present = new Set(allProducts.map((p) => getRetailerKey(p.retailer)));
    const wells: WellDef[] = [ALL_WELL];
    RETAIL_ORDER.forEach((key) => {
      if (present.has(key) && RETAIL_WELLS[key]) wells.push(RETAIL_WELLS[key]);
    });
    return wells;
  }, [allProducts]);

  const typeWells = useMemo(() => {
    const present = new Set(allProducts.map(classifyProduct));
    const wells: WellDef[] = [ALL_WELL];
    TYPE_WELLS.forEach((w) => {
      if (present.has(w.id as ReturnType<typeof classifyProduct>)) wells.push(w);
    });
    return wells;
  }, [allProducts]);

  const activeWells = filterBy === "retailer" ? retailerWells : typeWells;

  const filtered = useMemo(() => {
    if (selectedId === "all") return allProducts;
    if (filterBy === "retailer") {
      return allProducts.filter((p) => getRetailerKey(p.retailer) === selectedId);
    }
    return allProducts.filter((p) => classifyProduct(p) === selectedId);
  }, [allProducts, filterBy, selectedId]);

  const isFiltered = selectedId !== "all";

  const toggleFilter = () => {
    const next = !filterOpen;
    setFilterOpen(next);
    if (!next) {
      setSelectedId("all");
    }
  };

  const handleFilterBy = (index: number) => {
    const next: FilterBy = index === 0 ? "retailer" : "type";
    if (next === filterBy) return;
    setFilterBy(next);
    setSelectedId("all");
    void Haptics.selectionAsync();
  };

  const handleSelectWell = (id: string) => {
    const valid = activeWells.some((w) => w.id === id) ? id : "all";
    setSelectedId(valid);
  };

  const emptyTitle =
    allProducts.length === 0
      ? "No saved products"
      : isFiltered
        ? "Nothing in this filter"
        : "No saved products";
  const emptySub =
    allProducts.length === 0
      ? "Products you compare will show up here."
      : "Try another well, or tap All to see everything you’ve saved.";

  const countLabel = isFiltered
    ? `${filtered.length} of ${allProducts.length}`
    : `${allProducts.length} saved product${allProducts.length === 1 ? "" : "s"}`;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.ink }]}>Library</Text>
            {allProducts.length > 0 && (
              <Text style={[styles.count, { color: colors.stone }]}>{countLabel}</Text>
            )}
          </View>
          {allProducts.length > 0 && (
            <View>
              <NavCircle
                onPress={toggleFilter}
                accessibilityRole="button"
                accessibilityLabel="Filter by"
                accessibilityState={{ expanded: filterOpen }}
                style={filterOpen ? { backgroundColor: colors.ink } : undefined}
              >
                <SlidersHorizontal
                  size={18}
                  color={filterOpen ? colors.bg : colors.ink}
                  strokeWidth={2}
                />
              </NavCircle>
              {isFiltered && !filterOpen ? (
                <View style={[styles.dot, { backgroundColor: colors.spotify }]} />
              ) : null}
            </View>
          )}
        </View>

        {filterOpen && allProducts.length > 0 && (
          <View style={styles.filterPanel}>
            <SegmentedControl
              options={["Retailer", "Product type"]}
              selectedIndex={filterBy === "retailer" ? 0 : 1}
              onChange={handleFilterBy}
            />
            <CircularWells
              items={activeWells}
              selectedId={activeWells.some((w) => w.id === selectedId) ? selectedId : "all"}
              onSelect={handleSelectWell}
              layout="scroll"
              allowDeselectToAll
            />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.ink }]}>{emptyTitle}</Text>
            <Text style={[styles.emptySubtext, { color: colors.stone }]}>{emptySub}</Text>
            {isFiltered ? (
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedId("all");
                }}
                style={[styles.clearBtn, { borderColor: colors.ink }]}
                accessibilityRole="button"
                accessibilityLabel="Clear filter"
              >
                <Text style={[styles.clearText, { color: colors.ink }]}>Clear filter</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((p, index) => (
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
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { ...Typography.display },
  count: { ...Typography.caption, marginTop: 6 },
  filterPanel: { marginTop: 16, gap: 16 },
  dot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scroll: { paddingHorizontal: space.gutter },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  cardWrapper: { width: "50%", paddingBottom: 12 },
  emptyState: { alignItems: "flex-start", marginTop: 48 },
  emptyText: { ...Typography.productName, fontSize: 18, marginBottom: 8 },
  emptySubtext: { ...Typography.body },
  clearBtn: {
    marginTop: 20,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  clearText: { ...Typography.caption, fontFamily: Typography.button.fontFamily, fontSize: 14 },
});
