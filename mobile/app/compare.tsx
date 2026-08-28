import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
  Animated,
  AccessibilityInfo,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Crown, Sparkles, ArrowLeftRight, PackageOpen } from "lucide-react-native";

import { useComparisonStore } from "../store/useComparisonStore";
import { useThemeColors } from "../constants/Colors";
import { Typography } from "../constants/Typography";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { getCategoryIcon } from "../components/comparison/CategoryIcon";
import { CategorySection } from "../components/comparison/CategorySection";
import {
  SpecBarRow,
  type DetailedSpecRow,
} from "../components/comparison/SpecBarRow";

const OVERVIEW_KEY = "Overview";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTitle(title: string): string {
  const cleaned = title.replace(/5G|Unlocked|Smartphone|Dual SIM/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) return words.slice(0, 3).join(" ");
  return cleaned;
}

// ---------------------------------------------------------------------------
// Product header card (sticky, two-up)
// ---------------------------------------------------------------------------

interface ProductHeaderCardProps {
  product: { name: string; retailerColor: string; imageUrl?: string | null };
  isRecommended: boolean;
  index: number;
}

function ProductHeaderCard({ product, isRecommended, index }: ProductHeaderCardProps) {
  const { colors } = useThemeColors();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      if (enabled) {
        fade.setValue(1);
        slide.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 320, delay: index * 80, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 320, delay: index * 80, useNativeDriver: true }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, [fade, index, slide]);

  const Icon = getCategoryIcon(product.name);

  return (
    <Animated.View style={[styles.headerWrapper, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <Card
        borderRadius={16}
        style={[
          styles.headerCard,
          isRecommended && { borderColor: colors.success, borderWidth: 1 },
        ]}
      >
        {isRecommended && (
          <View style={[styles.crownWrap, { backgroundColor: colors.successMuted }]}>
            <Crown size={12} color={colors.success} strokeWidth={2.5} />
          </View>
        )}

        <View
          style={[
            styles.headerImageWrap,
            { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
          ]}
        >
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.headerImage} resizeMode="contain" />
          ) : (
            <Icon size={28} color={colors.textSecondary} strokeWidth={1.75} />
          )}
        </View>

        <Text
          style={[styles.headerName, { color: colors.text }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {normalizeTitle(product.name)}
        </Text>

        <View
          style={[
            styles.retailerPill,
            { borderColor: product.retailerColor || colors.border },
          ]}
        >
          <View style={[styles.retailerDot, { backgroundColor: product.retailerColor || colors.textTertiary }]} />
          <Text
            style={[styles.retailerText, { color: product.retailerColor || colors.textSecondary }]}
            numberOfLines={1}
          >
            {product.retailerColor ? "RETAILER" : "STORE"}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// AI verdict card
// ---------------------------------------------------------------------------

function AIVerdictCard({ summary }: { summary: string }) {
  const { colors } = useThemeColors();
  return (
    <View
      style={[
        styles.aiCard,
        { backgroundColor: colors.aiMuted, borderLeftColor: colors.ai },
      ]}
    >
      <View style={styles.aiHeader}>
        <View style={[styles.aiIconWrap, { backgroundColor: colors.ai + "22" }]}>
          <Sparkles size={12} color={colors.ai} strokeWidth={2.25} />
        </View>
        <Text style={[styles.aiLabel, { color: colors.ai }]}>AI VERDICT</Text>
      </View>
      <Text style={[styles.aiBody, { color: colors.text }]}>{summary}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Key differences card
// ---------------------------------------------------------------------------

interface KeyDifference {
  label: string;
  values: string[];
  winnerIndex: number | null;
}

function KeyDifferencesCard({
  differences,
  leftColor,
  rightColor,
}: {
  differences: KeyDifference[];
  leftColor: string;
  rightColor: string;
}) {
  const { colors } = useThemeColors();
  if (differences.length === 0) return null;

  return (
    <Card borderRadius={16} style={styles.diffCard}>
      <Text style={[styles.diffHeading, { color: colors.textTertiary }]}>KEY DIFFERENCES</Text>
      {differences.map((diff, i) => {
        const leftWin = diff.winnerIndex === 0;
        const rightWin = diff.winnerIndex === 1;
        const isDraw = diff.winnerIndex === null;
        return (
          <View
            key={`${diff.label}-${i}`}
            style={[
              styles.diffRow,
              i < differences.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.diffLabel, { color: colors.textSecondary }]}>{diff.label}</Text>
            <View style={styles.diffValuesRow}>
              <View
                style={[
                  styles.diffCol,
                  { borderTopColor: leftWin ? leftColor : "transparent" },
                ]}
              >
                <Text
                  style={[
                    styles.diffValue,
                    {
                      color: isDraw || leftWin ? colors.text : colors.textSecondary,
                    },
                    leftWin && styles.diffValueWinner,
                  ]}
                  numberOfLines={2}
                >
                  {diff.values[0] ?? "—"}
                </Text>
                {leftWin && <Text style={[styles.diffWinnerTag, { color: leftColor }]}>WINNER</Text>}
              </View>

              <View style={[styles.diffDivider, { backgroundColor: colors.border }]}>
                <View style={[styles.diffDividerIconWrap, { backgroundColor: colors.background }]}>
                  <ArrowLeftRight size={10} color={colors.textTertiary} strokeWidth={2} />
                </View>
              </View>

              <View
                style={[
                  styles.diffCol,
                  styles.diffColRight,
                  { borderTopColor: rightWin ? rightColor : "transparent" },
                ]}
              >
                <Text
                  style={[
                    styles.diffValue,
                    styles.diffValueRight,
                    {
                      color: isDraw || rightWin ? colors.text : colors.textSecondary,
                    },
                    rightWin && styles.diffValueWinner,
                  ]}
                  numberOfLines={2}
                >
                  {diff.values[1] ?? "—"}
                </Text>
                {rightWin && <Text style={[styles.diffWinnerTag, { color: rightColor }]}>WINNER</Text>}
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Category pill
// ---------------------------------------------------------------------------

interface CategoryPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function CategoryPill({ label, isSelected, onPress }: CategoryPillProps) {
  const { colors } = useThemeColors();
  const Icon = getCategoryIcon(label);
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, tension: 220, friction: 14 }).start();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${label} category`}
        accessibilityState={{ selected: isSelected }}
        style={[
          styles.pill,
          isSelected
            ? { backgroundColor: colors.text, borderColor: colors.text }
            : { backgroundColor: "transparent", borderColor: colors.border },
        ]}
      >
        <Icon size={14} strokeWidth={2} color={isSelected ? colors.background : colors.textSecondary} />
        <Text
          style={[styles.pillLabel, { color: isSelected ? colors.background : colors.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onBack }: { onBack: () => void }) {
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
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No comparison loaded</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Add two product URLs on the home screen to start comparing.
      </Text>
      <View style={styles.emptyButton}>
        <Button title="Go back" variant="primary" onPress={onBack} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useThemeColors();
  const { activeComparison } = useComparisonStore();
  const [selectedCategory, setSelectedCategory] = useState<string>(OVERVIEW_KEY);

  // Responsive horizontal padding — between 16 and 24.
  const screenPadding = useMemo(
    () => Math.max(16, Math.min(24, Math.round(width * 0.05))),
    [width]
  );
  const headerGap = 10;

  useEffect(() => {
    if (activeComparison) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [activeComparison]);

  if (!activeComparison) {
    return <EmptyState onBack={() => router.back()} />;
  }

  const { products, keyDifferences, aiSummary } = activeComparison;
  const productA = products[0];
  const productB = products[1];

  // Group specs by category for category views.
  const categories = useMemo(() => {
    if (!productA) return [] as Array<{ key: string; rows: DetailedSpecRow[] }>;
    const map = new Map<string, DetailedSpecRow[]>();
    const specCount = productA.specs.length;
    for (let i = 0; i < specCount; i++) {
      const lead = productA.specs[i];
      if (!lead) continue;
      const values = products.map((p) => {
        const s = p.specs[i];
        return {
          productId: p.id,
          productName: p.name,
          productColor: p.retailerColor,
          displayValue: s?.value ?? "—",
          numericValue: typeof s?.numericValue === "number" ? s.numericValue : null,
          isWinner: !!s?.isWinner,
          isDraw: !!s?.isDraw,
        };
      });
      const row: DetailedSpecRow = { label: lead.label, unit: lead.unit, values };
      const list = map.get(lead.category) ?? [];
      list.push(row);
      map.set(lead.category, list);
    }
    return Array.from(map.entries()).map(([key, rows]) => ({ key, rows }));
  }, [productA, products]);

  // Decorate key differences with winner index from the underlying specs.
  const decoratedDifferences = useMemo<KeyDifference[]>(() => {
    if (!productA || !productB) return [];
    return keyDifferences.map((diff) => {
      const idx = productA.specs.findIndex(
        (s) => s.label === diff.label && s.category !== OVERVIEW_KEY
      );
      if (idx < 0) return { ...diff, winnerIndex: null };
      const isDraw = !!productA.specs[idx]?.isDraw;
      const raw = products.findIndex((p) => p.specs[idx]?.isWinner);
      return { ...diff, winnerIndex: isDraw ? null : raw < 0 ? null : raw };
    });
  }, [keyDifferences, productA, productB, products]);

  const categoryList = useMemo(
    () => [OVERVIEW_KEY, ...categories.map((c) => c.key)],
    [categories]
  );

  const recommendedIndex = useMemo(
    () => decoratedDifferences[0]?.winnerIndex ?? null,
    [decoratedDifferences]
  );

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSelectCategory = (cat: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(cat);
  };

  const handleViewDetailed = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/compare/detailed");
  };

  const renderOverview = () => (
    <View>
      <AIVerdictCard summary={aiSummary} />
      {decoratedDifferences.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <KeyDifferencesCard
            differences={decoratedDifferences}
            leftColor={productA?.retailerColor ?? colors.primary}
            rightColor={productB?.retailerColor ?? colors.primary}
          />
        </View>
      )}
      <View style={styles.detailedCta}>
        <Button title="View Detailed Comparison" variant="primary" onPress={handleViewDetailed} />
      </View>
    </View>
  );

  const renderCategory = (cat: string) => {
    const found = categories.find((c) => c.key === cat);
    if (!found || found.rows.length === 0) {
      return (
        <View style={styles.emptyCategory}>
          <Text style={[styles.emptyCategoryText, { color: colors.textSecondary }]}>
            No specs available in this category.
          </Text>
        </View>
      );
    }
    const sectionProps = {
      category: found.key,
      rows: found.rows,
      defaultExpanded: true,
      colors,
    };
    return <CategorySection {...sectionProps} />;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingHorizontal: screenPadding, paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comparison</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: screenPadding, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* PRODUCT HEADERS */}
        <View style={[styles.productRow, { gap: headerGap }]}>
          {productA && (
            <ProductHeaderCard
              product={productA}
              index={0}
              isRecommended={recommendedIndex === 0}
            />
          )}
          {productB && (
            <ProductHeaderCard
              product={productB}
              index={1}
              isRecommended={recommendedIndex === 1}
            />
          )}
        </View>

        {/* CATEGORY PILLS */}
        <View
          style={[
            styles.pillsWrap,
            { borderTopColor: colors.border, borderBottomColor: colors.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContent}
          >
            {categoryList.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                isSelected={selectedCategory === cat}
                onPress={() => handleSelectCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {selectedCategory === OVERVIEW_KEY
            ? renderOverview()
            : renderCategory(selectedCategory)}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...Typography.headline,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSpacer: { width: 40, height: 40 },
  scrollContent: { paddingTop: 8 },

  productRow: {
    flexDirection: "row",
    marginBottom: 22,
  },

  // Product header card
  headerWrapper: { flex: 1, minWidth: 0 },
  headerCard: {
    padding: 14,
    alignItems: "center",
    minHeight: 168,
    position: "relative",
  },
  crownWrap: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerImageWrap: {
    width: 72,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  headerImage: { width: 64, height: 56 },
  headerName: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 18,
    marginBottom: 8,
  },
  retailerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
    maxWidth: "100%",
  },
  retailerDot: { width: 6, height: 6, borderRadius: 3 },
  retailerText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // Pills
  pillsWrap: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 22,
  },
  pillsContent: { gap: 8, paddingRight: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
    minHeight: 36,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  // Body
  body: { flex: 1 },

  // AI Verdict
  aiCard: {
    borderLeftWidth: 3,
    borderRadius: 16,
    padding: 16,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  aiIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  aiLabel: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  aiBody: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
  },

  // Key differences
  diffCard: { padding: 18 },
  diffHeading: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  diffRow: { paddingVertical: 14 },
  diffLabel: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "none",
    marginBottom: 10,
  },
  diffValuesRow: { flexDirection: "row", alignItems: "stretch" },
  diffCol: {
    flex: 1,
    minWidth: 0,
    borderTopWidth: 2,
    paddingTop: 8,
  },
  diffColRight: { alignItems: "flex-end" },
  diffValue: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  diffValueRight: { textAlign: "right" },
  diffValueWinner: { fontWeight: "700" },
  diffWinnerTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  diffDivider: {
    width: 1,
    marginHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  diffDividerIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty / fallback
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
  emptyCategory: { paddingVertical: 32, alignItems: "center" },
  emptyCategoryText: { ...Typography.body, fontSize: 14 },

  detailedCta: { marginTop: 24 },
});
