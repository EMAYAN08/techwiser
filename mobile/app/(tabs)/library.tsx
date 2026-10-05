import React, { useMemo, useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Animated } from "react-native";
import { SlidersHorizontal, Check } from "lucide-react-native";
import { useComparisonStore, Product } from "../../store/useComparisonStore";
import { handleScroll } from "../../store/uiStore";
import { ProductCard } from "../../components/comparison/ProductCard";
import { CircularWells } from "../../components/ui/CircularWells";
import { NavCircle } from "../../components/ui/NavCircle";
import { useThemeColors } from "../../constants/Colors";
import { Typography, fonts } from "../../constants/Typography";
import { radii, space, tabBarScrollPadding } from "../../constants/Layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LibraryEmptyState } from "../../components/library/LibraryEmptyState";
import * as Haptics from "../../utils/haptics";
import { ALL_WELL, TYPE_WELLS, RETAIL_WELLS, RETAIL_ORDER, type WellDef } from "../../constants/wellCatalog";
import { filterSavedProducts, libraryCountLabel, libraryEmptyCopy, uniqueProductsById } from "../../utils/userFlows";

type FilterBy = "retailer" | "type";

const FILTER_OPTIONS: { id: FilterBy; label: string }[] = [
  { id: "retailer", label: "Retailer" },
  { id: "type", label: "Product type" },
];

export default function LibraryScreen() {
  const recentComparisons = useComparisonStore((s) => s.recentComparisons);
  const removeProductFromHistory = useComparisonStore((s) => s.removeProductFromHistory);
  const { colors, isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wellsOpen, setWellsOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<FilterBy>("retailer");
  const [selectedId, setSelectedId] = useState("all");

  const allProducts = useMemo(() => {
    const list: Product[] = [];
    recentComparisons.forEach((comp) => {
      if (comp.result) list.push(...comp.result.products);
    });
    return uniqueProductsById(list);
  }, [recentComparisons]);

  const retailerWells = useMemo(() => {
    const wells: WellDef[] = [ALL_WELL];
    RETAIL_ORDER.forEach((key) => {
      if (RETAIL_WELLS[key]) wells.push(RETAIL_WELLS[key]);
    });
    return wells;
  }, [allProducts]);

  const typeWells = useMemo(() => {
    const wells: WellDef[] = [ALL_WELL];
    TYPE_WELLS.forEach((w) => {
      wells.push(w);
    });
    return wells;
  }, [allProducts]);

  const activeWells = filterBy === "retailer" ? retailerWells : typeWells;

  const filtered = useMemo(
    () => filterSavedProducts(allProducts, { wellsOpen, filterBy, selectedId }),
    [allProducts, filterBy, selectedId, wellsOpen]
  );

  const isFiltered = wellsOpen && selectedId !== "all";
  const iconActive = menuOpen || wellsOpen;

  const dismissFilters = () => {
    setMenuOpen(false);
    setWellsOpen(false);
    setSelectedId("all");
  };

  const onIconPress = () => {
    if (menuOpen) {
      dismissFilters();
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(true);
  };

  const handleFilterBy = (next: FilterBy) => {
    setFilterBy(next);
    setSelectedId("all");
    setWellsOpen(true);
    setMenuOpen(false);
    void Haptics.selectionAsync();
  };

  const handleSelectWell = (id: string) => {
    const valid = activeWells.some((w) => w.id === id) ? id : "all";
    setSelectedId(valid);
  };

  const empty = libraryEmptyCopy(allProducts.length, isFiltered);
  const emptyTitle = empty.title;
  const emptySub = empty.subtitle;

  const countLabel = libraryCountLabel(filtered.length, allProducts.length, isFiltered);

  const menuShadow =
    Platform.OS === "web"
      ? ({
          boxShadow: isDark ? "0 10px 28px rgba(0,0,0,0.45)" : "0 10px 24px rgba(10,10,10,0.10)",
        } as const)
      : {
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        };

  const isWellsSticky = wellsOpen && allProducts.length > 0;
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
      listener: handleScroll,
    })
  ).current;

  // Measure constants for smooth translation
  const TITLE_HEIGHT = 90; 
  const WELLS_HEIGHT = isWellsSticky ? 130 : 16;
  const HEADER_HEIGHT = TITLE_HEIGHT + WELLS_HEIGHT;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, TITLE_HEIGHT],
    outputRange: [0, isWellsSticky ? -TITLE_HEIGHT : 0],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 20) }]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(insets.top, 20), backgroundColor: colors.bg, zIndex: 999, elevation: 99 }} />
      <Animated.View
        style={{
          position: "absolute",
          top: Math.max(insets.top, 20),
          left: 0,
          right: 0,
          zIndex: 100,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        {/* Child 0: Title and Menu */}
        <View style={{ width: "100%", backgroundColor: colors.bg, zIndex: menuOpen ? 20 : 9, height: TITLE_HEIGHT }}>
          <View style={[styles.headerRow, { paddingHorizontal: space.gutter, paddingTop: 16, paddingBottom: 8 }]}>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.ink }]}>Library</Text>
              {allProducts.length > 0 && (
                <Text style={[styles.count, { color: colors.stone }]}>{countLabel}</Text>
              )}
            </View>
            {allProducts.length > 0 && (
              <View style={styles.iconWrap}>
                <NavCircle
                  onPress={onIconPress}
                  accessibilityRole="button"
                  accessibilityLabel="Filter library"
                  accessibilityState={{ expanded: menuOpen }}
                  style={iconActive ? { backgroundColor: isDark ? colors.surfaceHighlight : colors.ink } : undefined}
                >
                  <SlidersHorizontal
                    size={18}
                    color={iconActive ? (isDark ? colors.ink : colors.bg) : colors.ink}
                    strokeWidth={2}
                  />
                </NavCircle>
                {isFiltered && !menuOpen ? (
                  <View style={[styles.dot, { backgroundColor: colors.spotify }]} />
                ) : null}

                {menuOpen ? (
                  <View
                    style={[
                      styles.menu,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.line,
                      },
                      menuShadow,
                    ]}
                  >
                    {FILTER_OPTIONS.map((opt) => {
                      const active = wellsOpen && opt.id === filterBy;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => handleFilterBy(opt.id)}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected: active }}
                          style={({ pressed }) => [
                            styles.menuRow,
                            { opacity: pressed ? 0.6 : 1 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.menuLabel,
                              {
                                color: colors.ink,
                                fontFamily: active ? fonts.uiBold : fonts.uiMedium,
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          {active ? <Check size={15} color={colors.spotify} strokeWidth={2.4} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>

        {/* Child 1: Sticky Wells */}
        <View style={{ backgroundColor: colors.bg, zIndex: 10, height: WELLS_HEIGHT }}>
          {isWellsSticky ? (
            <View style={[styles.wells, { paddingHorizontal: space.gutter, paddingBottom: 16 }]}>
              <CircularWells
                items={activeWells}
                selectedId={activeWells.some((w) => w.id === selectedId) ? selectedId : "all"}
                onSelect={handleSelectWell}
                layout="scroll"
                allowDeselectToAll
                shape={filterBy === "retailer" ? "squircle" : "circle"}
              />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        onScrollBeginDrag={() => { if (menuOpen) setMenuOpen(false); }}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, filtered.length === 0 && styles.scrollEmpty, { paddingTop: HEADER_HEIGHT, paddingBottom: tabBarScrollPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <LibraryEmptyState
                variant={isFiltered ? "filtered" : "empty"}
                title={emptyTitle}
                subtitle={emptySub}
                onStartComparing={() => router.navigate("/")}
                onClearFilter={() => setSelectedId("all")}
              />
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((p, index) => (
                <View key={p.id} style={styles.cardWrapper}>
                  <ProductCard product={p} index={index} onDelete={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    removeProductFromHistory(p.id);
                  }} />
                </View>
              ))}
            </View>
          )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 12,
    zIndex: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 9,
  },
  headerText: { flex: 1 },
  headerTitle: { ...Typography.display },
  count: { ...Typography.caption, marginTop: 6 },
  iconWrap: {
    position: "relative",
    zIndex: 10,
  },
  menu: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 168,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 20,
  },
  menuRow: {
    minHeight: 42,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  menuLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  wells: {
    marginTop: 16,
  },
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
  scrollEmpty: { flexGrow: 1 },
  // Optically centred in the space between the header and the dock.
  emptyWrap: { flex: 1, justifyContent: "center", paddingBottom: 48, minHeight: 420 },
});
