import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  PackageOpen,
  Trophy,
} from "lucide-react-native";

import { useThemeColors } from "../../constants/Colors";
import { Fonts, Typography } from "../../constants/Typography";
import { Button } from "../ui/Button";
import { getCategoryIcon } from "./CategoryIcon";
import { normalizeTitle } from "./utils";
import type { Product } from "../../store/useComparisonStore";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const HEADER_SIDE_PADDING = 16;
const HEADER_HEIGHT = 132;
const HORIZONTAL_PAGE_GAP = 12;
const ROW_HORIZONTAL_PADDING = 16;
const ROW_MIN_HEIGHT = 64;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CellValue {
  productId: string;
  productName: string;
  displayValue: string;
  isWinner: boolean;
  isDraw: boolean;
}

interface SpecRow {
  label: string;
  category: string;
  values: CellValue[];
}

interface ProductPage {
  product: Product;
  rows: Array<{
    label: string;
    category: string;
    value: CellValue;
  }>;
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface DetailedSpreadsheetProps {
  groupedSpecs?: any;
  products: Product[];
  onBack: () => void;
}

export function DetailedSpreadsheet({ products, groupedSpecs, onBack }: DetailedSpreadsheetProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useThemeColors();
  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // One page per product. Each page is a vertical stack of (label + value)
  // rows, with no horizontal scroll inside. The body has one horizontal
  // ScrollView, one page per product.
  const pages = useMemo<ProductPage[]>(() => {
    return products.map((p, pIndex) => {
      let rows: Array<{ label: string; category: string; value: CellValue; }> = [];
      
      if (p.rawSpecs && p.rawSpecs.length > 0) {
        rows = p.rawSpecs.map((s) => ({
          label: s.label,
          category: "Specifications",
          value: {
            productId: p.id,
            productName: p.name,
            displayValue: s.value ?? "-",
            isWinner: false,
            isDraw: false,
          },
        }));
      } else if (groupedSpecs) {
        for (const [category, specs] of Object.entries(groupedSpecs)) {
          for (const spec of (specs as any[])) {
            rows.push({
              label: spec.label,
              category,
              value: {
                productId: p.id,
                productName: p.name,
                displayValue: spec.values && spec.values[pIndex] ? spec.values[pIndex] : "�",
                isWinner: spec.winnerIndex === pIndex,
                isDraw: spec.winnerIndex === -1,
              }
            });
          }
        }
      } else if (p.specs) {
        rows = p.specs.map((s) => ({
          label: s.label,
          category: s.category,
          value: {
            productId: p.id,
            productName: p.name,
            displayValue: s.value ?? "�",
            isWinner: !!s.isWinner,
            isDraw: !!s.isDraw,
          },
        }));
      }

      return { product: p, rows };
    });
  }, [products, groupedSpecs]);

  // All unique labels, in first-product order. Used to drive selection and
  // for category eyebrow placement.
  const rowLabels = useMemo(() => {
    if (pages.length === 0) return [];
    return pages[0].rows.map((r) => ({ label: r.label, category: r.category }));
  }, [pages]);

  // ---- Header / pager handlers -------------------------------------------

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const snapToIndex = (idx: number) => {
    const clamped = Math.max(0, Math.min(products.length - 1, idx));
    if (clamped === activeIndex) return;
    setActiveIndex(clamped);
  };

  const onHeaderScrollEnd = (e: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const x = e.nativeEvent.contentOffset.x;
    const pageWidth = width - 2 * HEADER_SIDE_PADDING;
    const stride = pageWidth + HORIZONTAL_PAGE_GAP;
    const next = Math.max(
      0,
      Math.min(products.length - 1, Math.round(x / stride))
    );
    snapToIndex(next);
  };

  const onBodyScrollEnd = (e: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const x = e.nativeEvent.contentOffset.x;
    const pageWidth = width - 2 * ROW_HORIZONTAL_PADDING;
    const stride = pageWidth + HORIZONTAL_PAGE_GAP;
    const next = Math.max(
      0,
      Math.min(products.length - 1, Math.round(x / stride))
    );
    snapToIndex(next);
  };

  // Body scroll -> header sync. Both share activeIndex as the source of
  // truth; we just imperatively move whichever one isn't being dragged.
  const onBodyScroll = (e: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const x = e.nativeEvent.contentOffset.x;
    const pageWidth = width - 2 * ROW_HORIZONTAL_PADDING;
    const stride = pageWidth + HORIZONTAL_PAGE_GAP;
    const next = Math.max(
      0,
      Math.min(products.length - 1, Math.round(x / stride))
    );
    if (next !== activeIndex) {
      setActiveIndex(next);
      // Push the header to match
      const headerStride = (width - 2 * HEADER_SIDE_PADDING) + HORIZONTAL_PAGE_GAP;
      headerScrollRef.current?.scrollTo({
        x: next * headerStride,
        animated: false,
      });
    }
  };

  // When activeIndex changes (e.g. dots tapped), push both views to it.
  useEffect(() => {
    const pageWidth = width - 2 * ROW_HORIZONTAL_PADDING;
    const bodyStride = pageWidth + HORIZONTAL_PAGE_GAP;
    const headerStride = (width - 2 * HEADER_SIDE_PADDING) + HORIZONTAL_PAGE_GAP;
    bodyScrollRef.current?.scrollTo({
      x: activeIndex * bodyStride,
      animated: false,
    });
    headerScrollRef.current?.scrollTo({
      x: activeIndex * headerStride,
      animated: false,
    });
    // We intentionally want to react to activeIndex changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // ---- Row selection ------------------------------------------------------

  const handleRowPress = (label: string) => {
    void Haptics.selectionAsync();
    setSelectedLabel((prev) => (prev === label ? null : label));
  };

  // ---- A11y helper --------------------------------------------------------
  const a11yForRow = (page: ProductPage, label: string) => {
    const row = page.rows.find((r) => r.label === label);
    if (!row) return label;
    const win = row.value.isWinner && !row.value.isDraw ? " Winner." : "";
    return `${row.label}. ${page.product.name}: ${row.value.displayValue}.${win}`;
  };

  // -------------------------------------------------------------------------

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* STICKY: top bar + product header pager */}
      <View
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top + 4,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ArrowLeft size={20} color={colors.text} strokeWidth={2.25} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            Detailed comparison
          </Text>
          <View style={styles.titleSpacer} />
        </View>

        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 2 * HEADER_SIDE_PADDING + HORIZONTAL_PAGE_GAP}
          decelerationRate="fast"
          contentContainerStyle={styles.headerContent}
          onMomentumScrollEnd={onHeaderScrollEnd}
        >
          {pages.map((p) => (
            <View
              key={p.product.id}
              style={[
                styles.headerPage,
                {
                  width: width - 2 * HEADER_SIDE_PADDING,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.headerPageText}>
                <Text
                  style={[styles.headerPageName, { color: colors.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {normalizeTitle(p.product.name)}
                </Text>
                {p.product.retailer ? (
                  <View style={styles.headerPageRetailer}>
                    <View
                      style={[
                        styles.headerPageDot,
                        {
                          backgroundColor:
                            p.product.retailerColor || colors.textTertiary,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.headerPageRetailerText,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {p.product.retailer.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View
                style={[
                  styles.headerPageImage,
                  { backgroundColor: colors.surfaceHighlight },
                ]}
              >
                {p.product.imageUrl ? (
                  <Image
                    source={{ uri: p.product.imageUrl }}
                    style={styles.headerPageImageReal}
                    resizeMode="contain"
                  />
                ) : (
                  <HeaderPagePlaceholder product={p.product} colors={colors} />
                )}
              </View>
            </View>
          ))}
        </ScrollView>
        <PagerDots
          count={products.length}
          activeIndex={activeIndex}
          colors={colors}
        />
      </View>

      {/* BODY: horizontal pager, one page per product. Each page is a
          vertical stack of (label, value) rows. */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          ref={bodyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 2 * ROW_HORIZONTAL_PADDING + HORIZONTAL_PAGE_GAP}
          decelerationRate="fast"
          onScroll={onBodyScroll}
          onMomentumScrollEnd={onBodyScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={styles.bodyHorizontalContent}
        >
          {pages.map((page) => (
            <View
              key={page.product.id}
              style={[
                styles.bodyPage,
                { width: width - 2 * ROW_HORIZONTAL_PADDING },
              ]}
            >
              {rowLabels.map((rl, idx) => {
                const rowData = page.rows.find((r) => r.label === rl.label);
                if (!rowData) return null;
                const isSelected = selectedLabel === rl.label;
                // Show category eyebrow whenever the category changes.
                const prev = idx > 0 ? rowLabels[idx - 1] : null;
                const showCategory = !prev || prev.category !== rl.category;
                // The very first row of the entire list has no top separator
                // (the page already has top padding from its container).
                const isVeryFirst = idx === 0 && !showCategory;
                return (
                  <View key={rl.label}>
                    {showCategory && (
                      <View
                        style={[
                          styles.categoryHeaderRow,
                          { borderTopColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryHeaderText,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {rl.category.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <SpecRow
                      label={rl.label}
                      value={rowData.value}
                      colors={colors}
                      hasTopSeparator={!isVeryFirst}
                      isSelected={isSelected}
                      isInSelectedRow={isSelected}
                      onPress={() => handleRowPress(rl.label)}
                      a11yLabel={a11yForRow(page, rl.label)}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

interface DetailedSpreadsheetEmptyProps {
  onBack: () => void;
}

export function DetailedSpreadsheetEmpty({ onBack }: DetailedSpreadsheetEmptyProps) {
  const { colors } = useThemeColors();
  return (
    <View style={[styles.emptyRoot, { backgroundColor: colors.background }]}>
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
        Add two product URLs on the home screen to see the full specification
        breakdown.
      </Text>
      <View style={styles.emptyButton}>
        <Button title="Go back" variant="primary" onPress={onBack} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header page placeholder icon
// ---------------------------------------------------------------------------

function HeaderPagePlaceholder({
  product,
  colors,
}: {
  product: Product;
  colors: ReturnType<typeof useThemeColors>["colors"];
}) {
  const Icon = getCategoryIcon(product.name);
  return <Icon size={36} color={colors.textSecondary} strokeWidth={1.5} />;
}

// ---------------------------------------------------------------------------
// Pager dots
// ---------------------------------------------------------------------------

interface PagerDotsProps {
  count: number;
  activeIndex: number;
  colors: ReturnType<typeof useThemeColors>["colors"];
}

function PagerDots({ count, activeIndex, colors }: PagerDotsProps) {
  if (count <= 1) return null;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === activeIndex ? colors.text : colors.textTertiary,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Spec row — one label + one value. Tap to highlight. The highlight is an
// AI-verdict-style blue card (left accent border + tint). When selected,
// winner green is suppressed in favor of the row's blue treatment.
// ---------------------------------------------------------------------------

interface SpecRowProps {
  label: string;
  value: CellValue;
  colors: ReturnType<typeof useThemeColors>["colors"];
  hasTopSeparator: boolean;
  isSelected: boolean;
  isInSelectedRow: boolean;
  onPress: () => void;
  a11yLabel: string;
}

function SpecRow({
  label,
  value,
  colors,
  hasTopSeparator,
  isSelected,
  isInSelectedRow,
  onPress,
  a11yLabel,
}: SpecRowProps) {
  const selectedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      Animated.timing(selectedValue, {
        toValue: isSelected ? 1 : 0,
        duration: enabled ? 0 : 180,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [isSelected, selectedValue]);

  // AI-verdict-style blue card. Left accent border + soft tint + radius.
  // When the row is selected, the value cell also paints with the same
  // accent on the right edge to "close" the card visually.
  const cardBg = selectedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background, colors.primaryMuted],
  });
  const cardBorderColor = selectedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });
  const leftAccentOpacity = selectedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Winner green. Suppressed when the row is selected.
  const isWinner = value.isWinner && !value.isDraw;
  const winnerOpacity = selectedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isWinner ? 1 : 0, 0],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={isSelected ? "Tap to deselect" : "Tap to highlight this row"}
      style={({ pressed }) => [
        styles.row,
        hasTopSeparator && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && { opacity: 0.96 },
      ]}
    >
      <Animated.View
        style={[
          styles.rowCard,
          { backgroundColor: cardBg, borderColor: cardBorderColor },
        ]}
      >
        {/* Left accent border — AI verdict style */}
        <Animated.View
          style={[
            styles.rowCardAccent,
            { backgroundColor: colors.primary, opacity: leftAccentOpacity },
          ]}
        />

        {/* Label cell */}
        <View style={styles.labelCell}>
          <Text
            style={[
              styles.labelCellText,
              {
                color: isInSelectedRow ? colors.text : colors.textSecondary,
                fontWeight: isInSelectedRow ? "600" : "500",
              },
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </View>

        {/* Value cell — single container; bg/border/text all animate based
            on (isInSelectedRow, isWinner) so there's no overlap glitch. */}
        <Animated.View
          style={[
            styles.valueCellWrap,
            {
              backgroundColor: selectedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  isWinner ? colors.successMuted : colors.surface,
                  colors.primaryMuted,
                ],
              }),
              borderColor: selectedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  isWinner ? colors.success : colors.border,
                  colors.primary,
                ],
              }),
            },
          ]}
        >
          {/* Winner trophy badge — fades out when row is selected */}
          {isWinner && (
            <Animated.View
              style={[
                styles.valueCellTrophy,
                { backgroundColor: colors.success, opacity: winnerOpacity },
              ]}
            >
              <Trophy size={9} color={colors.background} strokeWidth={2.5} />
            </Animated.View>
          )}

          <Animated.Text
            style={[
              styles.valueCellText,
              {
                fontFamily: Fonts.mono,
                color: selectedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    isWinner ? colors.success : colors.text,
                    colors.primary,
                  ],
                }),
                fontWeight: isInSelectedRow ? "700" : "600",
              },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value.displayValue}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Sticky header
  stickyHeader: {
    paddingBottom: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HEADER_SIDE_PADDING,
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.headline,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    flex: 1,
    textAlign: "center",
  },
  titleSpacer: { width: 40 },

  // Header pager
  headerContent: {
    paddingHorizontal: HEADER_SIDE_PADDING,
    gap: HORIZONTAL_PAGE_GAP,
  },
  headerPage: {
    height: HEADER_HEIGHT,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  headerPageText: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  headerPageName: {
    ...Typography.headline,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  headerPageRetailer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  headerPageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerPageRetailerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  headerPageImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerPageImageReal: {
    width: "70%",
    height: "70%",
  },

  // Pager dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },

  // Body
  body: { flex: 1 },
  bodyContent: {},
  bodyHorizontalContent: {
    paddingHorizontal: ROW_HORIZONTAL_PADDING,
    gap: HORIZONTAL_PAGE_GAP,
  },
  bodyPage: {
    // vertical flex — children stack
  },

  // Category eyebrow
  categoryHeaderRow: {
    paddingTop: 18,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  categoryHeaderText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  // Row (one label + one value, full row width)
  row: {
    paddingVertical: 4,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: ROW_MIN_HEIGHT,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  rowCardAccent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
  labelCell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "center",
    minWidth: 0,
  },
  labelCellText: {
    fontSize: 13,
    lineHeight: 17,
  },

  // Value cell wrap (one cell, animates between winner-green and selected-blue)
  valueCellWrap: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    minWidth: 0,
    position: "relative",
  },
  valueCellTrophy: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  valueCellText: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: "left",
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
  emptyButton: { marginTop: 24, alignSelf: "stretch" },
});
