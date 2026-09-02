import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Trophy } from "lucide-react-native";

import { useComparisonStore, Product } from "../../store/useComparisonStore";
import { useThemeColors } from "../../constants/Colors";
import { Typography, Fonts } from "../../constants/Typography";

const ROW_MIN_HEIGHT = 56;
const LABEL_WIDTH = 130;
const HORIZONTAL_PAGE_GAP = 12;
const HEADER_SIDE_PADDING = 16;
const HEADER_HEIGHT = 110;

function normalizeTitle(title: string): string {
  const cleaned = title.replace(/5G|Unlocked|Smartphone|Dual SIM/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) return words.slice(0, 3).join(" ");
  return cleaned;
}

export function DetailedSpreadsheetEmpty() {
  const { colors } = useThemeColors();
  const router = useRouter();
  return (
    <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text }}>No data</Text>
    </View>
  );
}

export function DetailedSpreadsheet() {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeComparison } = useComparisonStore();
  const { width } = useWindowDimensions();

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollRef = useRef<ScrollView>(null);
  const isSyncing = useRef(false);

  if (!activeComparison) return <DetailedSpreadsheetEmpty />;

  const products = activeComparison.products;

  const HEADER_STRIDE = (width - 2 * HEADER_SIDE_PADDING) + HORIZONTAL_PAGE_GAP;
  const VALUE_PANE_WIDTH = width - LABEL_WIDTH - HEADER_SIDE_PADDING;
  const BODY_STRIDE = VALUE_PANE_WIDTH + HORIZONTAL_PAGE_GAP;

  const onHeaderScroll = (e: any) => {
    if (isSyncing.current) return;
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.max(0, Math.min(products.length - 1, Math.round(x / HEADER_STRIDE)));
    if (next !== activeIndex) {
      setActiveIndex(next);
      isSyncing.current = true;
      bodyScrollRef.current?.scrollTo({ x: next * BODY_STRIDE, animated: false });
      setTimeout(() => { isSyncing.current = false; }, 50);
    }
  };

  const onBodyScroll = (e: any) => {
    if (isSyncing.current) return;
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.max(0, Math.min(products.length - 1, Math.round(x / BODY_STRIDE)));
    if (next !== activeIndex) {
      setActiveIndex(next);
      isSyncing.current = true;
      headerScrollRef.current?.scrollTo({ x: next * HEADER_STRIDE, animated: false });
      setTimeout(() => { isSyncing.current = false; }, 50);
    }
  };

  useEffect(() => {
    // Force sync when active index changes imperatively
    isSyncing.current = true;
    bodyScrollRef.current?.scrollTo({ x: activeIndex * BODY_STRIDE, animated: false });
    headerScrollRef.current?.scrollTo({ x: activeIndex * HEADER_STRIDE, animated: false });
    setTimeout(() => { isSyncing.current = false; }, 50);
  }, [activeIndex]);

  const rowLabels = useMemo(() => {
    const labels: { label: string; category: string }[] = [];
    if (!activeComparison.groupedSpecs) return labels;
    for (const [catName, specs] of Object.entries(activeComparison.groupedSpecs)) {
      for (const spec of (specs as any[])) {
        if (!labels.find(l => l.label === spec.label)) {
          labels.push({ label: spec.label, category: catName });
        }
      }
    }
    return labels;
  }, [activeComparison]);

  const handleRowPress = (label: string) => {
    void Haptics.selectionAsync();
    setSelectedLabel((prev) => (prev === label ? null : label));
  };

  const getSpecValue = (productIndex: number, label: string) => {
    if (!activeComparison.groupedSpecs) return { text: "-", isWinner: false };
    for (const [catName, specs] of Object.entries(activeComparison.groupedSpecs)) {
      for (const spec of (specs as any[])) {
        if (spec.label === label) {
          const val = spec.values[productIndex];
          const isWinner = spec.winnerIndex === productIndex;
          return { text: val || "-", isWinner };
        }
      }
    }
    return { text: "-", isWinner: false };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* STICKY TOP SECTION: TopBar + Full-Width Header Pager */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2.25} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Detailed comparison</Text>
          <View style={styles.titleSpacer} />
        </View>

        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={HEADER_STRIDE}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: HEADER_SIDE_PADDING, gap: HORIZONTAL_PAGE_GAP }}
          onScroll={onHeaderScroll}
          scrollEventThrottle={16}
        >
          {products.map((p) => (
            <View key={p.id} style={[styles.headerPage, { width: width - 2 * HEADER_SIDE_PADDING, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.headerPageText}>
                <Text style={[styles.headerPageName, { color: colors.text }]} numberOfLines={2}>{normalizeTitle(p.name)}</Text>
                {p.retailer && (
                  <View style={styles.headerPageRetailer}>
                    <View style={[styles.headerPageDot, { backgroundColor: p.retailerColor || colors.textTertiary }]} />
                    <Text style={[styles.headerPageRetailerText, { color: colors.textSecondary }]} numberOfLines={1}>{p.retailer.toUpperCase()}</Text>
                  </View>
                )}
                {p.price && p.price !== "N/A" && (
                   <Text style={[styles.headerPagePrice, { color: colors.success }]} numberOfLines={1}>{p.price}</Text>
                )}
              </View>
              <View style={[styles.headerPageImage, { backgroundColor: colors.surfaceHighlight }]}>
                {p.imageUrl && <Image source={{ uri: p.imageUrl }} style={styles.headerPageImageReal} resizeMode="contain" />}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {products.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === activeIndex ? colors.text : colors.border }]} />
          ))}
        </View>
      </View>

      {/* BODY SECTION: Fixed Labels + Horizontal Values */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        <View style={{ flexDirection: "row", paddingBottom: insets.bottom + 48 }}>
          
          {/* FIXED LEFT COLUMN (Specs) */}
          <View style={{ width: LABEL_WIDTH, borderRightWidth: 1, borderRightColor: colors.border }}>
            {rowLabels.map((rl, idx) => {
              const prev = idx > 0 ? rowLabels[idx - 1] : null;
              const showCategory = !prev || prev.category !== rl.category;
              const isSelected = selectedLabel === rl.label;

              return (
                <View key={rl.label}>
                  {showCategory && (
                    <View style={[styles.categoryRow, { backgroundColor: colors.surfaceHighlight, borderBottomColor: colors.border }]}>
                      <Text style={[styles.categoryText, { color: colors.textSecondary }]} numberOfLines={1}>{rl.category.toUpperCase()}</Text>
                    </View>
                  )}
                  <Pressable onPress={() => handleRowPress(rl.label)} style={[styles.labelCell, isSelected && { backgroundColor: colors.primaryMuted, borderTopColor: colors.primary, borderBottomColor: colors.primary }]}>
                    {isSelected && <View style={[styles.selectionLeftAccent, { backgroundColor: colors.primary }]} />}
                    <Text style={[styles.labelText, { color: isSelected ? colors.text : colors.textSecondary, fontWeight: isSelected ? "600" : "500" }]} numberOfLines={3}>{rl.label}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* HORIZONTAL VALUE COLUMNS */}
          <ScrollView
            ref={bodyScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={BODY_STRIDE}
            decelerationRate="fast"
            contentContainerStyle={{ paddingLeft: 0, paddingRight: HEADER_SIDE_PADDING, gap: HORIZONTAL_PAGE_GAP }}
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
          >
            {products.map((p, pIdx) => (
              <View key={p.id} style={{ width: VALUE_PANE_WIDTH }}>
                {rowLabels.map((rl, idx) => {
                  const prev = idx > 0 ? rowLabels[idx - 1] : null;
                  const showCategory = !prev || prev.category !== rl.category;
                  const isSelected = selectedLabel === rl.label;
                  const val = getSpecValue(pIdx, rl.label);

                  return (
                    <View key={rl.label}>
                      {showCategory && (
                        <View style={[styles.categoryRow, { backgroundColor: colors.surfaceHighlight, borderBottomColor: colors.border }]} />
                      )}
                      <Pressable onPress={() => handleRowPress(rl.label)} style={[styles.valueCell, isSelected && { backgroundColor: colors.primaryMuted, borderTopColor: colors.primary, borderBottomColor: colors.primary }]}>
                        {val.isWinner && !isSelected && (
                          <View style={[styles.winnerBadge, { backgroundColor: colors.success }]}>
                             <Trophy size={9} color={colors.background} strokeWidth={2.5} />
                          </View>
                        )}
                        <Text style={[styles.valueText, { color: isSelected ? colors.primary : (val.isWinner ? colors.success : colors.text), fontWeight: isSelected || val.isWinner ? "700" : "500" }]} numberOfLines={3}>
                          {val.text}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stickyHeader: { paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { ...Typography.headline, fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  titleSpacer: { width: 40 },

  headerPage: { height: HEADER_HEIGHT, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  headerPageText: { flex: 1, minWidth: 0, justifyContent: "center" },
  headerPageName: { ...Typography.headline, fontSize: 16, fontWeight: "700", lineHeight: 20, letterSpacing: -0.3 },
  headerPageRetailer: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  headerPageDot: { width: 6, height: 6, borderRadius: 3 },
  headerPageRetailerText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  headerPagePrice: { fontSize: 12, fontWeight: "800", marginTop: 6 },
  headerPageImage: { width: 80, height: 80, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerPageImageReal: { width: "70%", height: "70%" },

  dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12, gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  body: { flex: 1 },
  
  categoryRow: { height: 32, justifyContent: "flex-end", paddingBottom: 4, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  categoryText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },

  labelCell: { height: ROW_MIN_HEIGHT, justifyContent: "center", paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "transparent", borderBottomWidth: 1, borderBottomColor: "transparent" },
  labelText: { fontSize: 12, lineHeight: 16 },
  selectionLeftAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },

  valueCell: { height: ROW_MIN_HEIGHT, justifyContent: "center", paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "transparent", borderBottomWidth: 1, borderBottomColor: "transparent" },
  valueText: { fontFamily: Fonts.mono, fontSize: 13, lineHeight: 18 },
  winnerBadge: { position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" }
});
