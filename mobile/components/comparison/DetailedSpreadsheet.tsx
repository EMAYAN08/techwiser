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
import { Typography } from "../../constants/Typography";
import { Fonts } from "../../constants/Typography";

const ROW_MIN_HEIGHT = 60;
const LABEL_WIDTH = 130;
const HEADER_HEIGHT = 140;

function normalizeTitle(title: string): string {
  const cleaned = title.replace(/5G|Unlocked|Smartphone|Dual SIM/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) return words.slice(0, 3).join(" ");
  return cleaned;
}

export function DetailedSpreadsheet() {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeComparison } = useComparisonStore();
  const { width } = useWindowDimensions();

  const PRODUCT_WIDTH = Math.max(140, (width - LABEL_WIDTH) / 1.5);

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollRef = useRef<ScrollView>(null);

  const onBodyScroll = (e: any) => {
    headerScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };
  const onHeaderScroll = (e: any) => {
    bodyScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };

  if (!activeComparison) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const products = activeComparison.products;

  // Build a unified list of row labels from all groupedSpecs
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
      {/* TOP BAR */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Detailed comparison</Text>
        <View style={styles.titleSpacer} />
      </View>

      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
        {/* STICKY HEADER */}
        <View style={{ backgroundColor: colors.background, zIndex: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: "row" }}>
            {/* Top Left Empty Space */}
            <View style={{ width: LABEL_WIDTH, borderRightWidth: 1, borderRightColor: colors.border }} />

            {/* Scrollable Product Headers */}
            <ScrollView
              ref={headerScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={onHeaderScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {products.map((p, i) => (
                <View key={p.id} style={[styles.headerCell, { width: PRODUCT_WIDTH, borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <View style={[styles.headerImageWrap, { backgroundColor: colors.surfaceHighlight }]}>
                    {p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.headerImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.headerImage} />
                    )}
                  </View>
                  <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={2}>{normalizeTitle(p.name)}</Text>
                  {p.price && p.price !== "N/A" && (
                     <Text style={[styles.headerPrice, { color: colors.success }]} numberOfLines={1}>{p.price}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* BODY */}
        <View style={{ flexDirection: "row", paddingBottom: insets.bottom + 48 }}>
          
          {/* Fixed Label Column */}
          <View style={{ width: LABEL_WIDTH, borderRightWidth: 1, borderRightColor: colors.border }}>
            {rowLabels.map((rl, idx) => {
              const prev = idx > 0 ? rowLabels[idx - 1] : null;
              const showCategory = !prev || prev.category !== rl.category;
              const isSelected = selectedLabel === rl.label;

              return (
                <View key={rl.label}>
                  {showCategory && (
                    <View style={[styles.categoryRow, { borderBottomColor: colors.border }]}>
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

          {/* Scrollable Value Columns */}
          <ScrollView
            ref={bodyScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {products.map((p, pIdx) => (
              <View key={p.id} style={{ width: PRODUCT_WIDTH }}>
                {rowLabels.map((rl, idx) => {
                  const prev = idx > 0 ? rowLabels[idx - 1] : null;
                  const showCategory = !prev || prev.category !== rl.category;
                  const isSelected = selectedLabel === rl.label;
                  const val = getSpecValue(pIdx, rl.label);

                  return (
                    <View key={rl.label}>
                      {showCategory && (
                        <View style={[styles.categoryRow, { borderBottomColor: colors.border }]} />
                      )}
                      <Pressable onPress={() => handleRowPress(rl.label)} style={[styles.valueCell, { borderRightColor: colors.border }, isSelected && { backgroundColor: colors.primaryMuted, borderTopColor: colors.primary, borderBottomColor: colors.primary }]}>
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
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { ...Typography.headline, fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  titleSpacer: { width: 40 },

  headerCell: { height: HEADER_HEIGHT, justifyContent: "center", alignItems: "center", padding: 12 },
  headerImageWrap: { width: 64, height: 64, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  headerImage: { width: "70%", height: "70%" },
  headerName: { fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 16 },
  headerPrice: { fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 },

  categoryRow: { height: 40, justifyContent: "flex-end", paddingBottom: 6, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  categoryText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },

  labelCell: { height: ROW_MIN_HEIGHT, justifyContent: "center", paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "transparent", borderBottomWidth: 1, borderBottomColor: "transparent" },
  labelText: { fontSize: 13, lineHeight: 18 },
  selectionLeftAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },

  valueCell: { height: ROW_MIN_HEIGHT, justifyContent: "center", paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: "transparent", borderBottomWidth: 1, borderBottomColor: "transparent", borderRightWidth: StyleSheet.hairlineWidth },
  valueText: { fontFamily: Fonts.mono, fontSize: 13, lineHeight: 18 },
  winnerBadge: { position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" }
});

export function DetailedSpreadsheetEmpty() {
  const { colors } = useThemeColors();
  const router = useRouter();
  return (
    <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text }}>No data</Text>
    </View>
  );
}

