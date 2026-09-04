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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from '../utils/haptics';
import { ArrowLeft, Crown, Sparkles, PackageOpen, Trophy, Info, Share, X, AlertTriangle } from "lucide-react-native";
import { BlurView } from "expo-blur";

import { useComparisonStore } from "../store/useComparisonStore";
import { useThemeColors, getRetailerColor, formatRetailerName } from "../constants/Colors";
import { Typography } from "../constants/Typography";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { getCategoryIcon } from "../components/comparison/CategoryIcon";
import { type DetailedSpecRow, type DetailedSpecValue } from "../components/comparison/SpecBarRow";
import { exportComparisonToPDF } from "../utils/exportPDF";
import { explainSpec, type SpecExplanationResponse } from "../services/api";

const OVERVIEW_KEY = "Overview";

function AnimatedErrorIcon({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulse]);
  return (
    <Animated.View style={{ opacity: pulse, marginBottom: 16 }}>
      <AlertTriangle size={48} color={color} strokeWidth={1.5} />
    </Animated.View>
  );
}

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
  product: { id: string; name: string; retailer: string; retailerColor: string; imageUrl?: string | null; price?: string };
  isRecommended: boolean;
  index: number;
  compact: boolean;
  onPress?: () => void;
}

function ProductHeaderCard({ product, isRecommended, index, compact, onPress }: ProductHeaderCardProps) {
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
      <Pressable onPress={onPress} style={{ flexGrow: 1 }}>
      <Card
        borderRadius={16}
        style={[
          styles.headerCard,
          { flexGrow: 1 },
          compact && styles.headerCardCompact,
          isRecommended && { borderColor: colors.success, borderWidth: 1 },
        ]}
      >
        <View style={styles.infoWrap}>
          <Info size={14} color={colors.textTertiary} strokeWidth={2.5} />
        </View>
        {isRecommended && (
          <View style={[styles.crownWrap, { backgroundColor: colors.successMuted }]}>
            <Crown size={12} color={colors.success} strokeWidth={2.5} />
          </View>
        )}

        <View
          style={[
            styles.headerImageWrap,
            compact && styles.headerImageWrapCompact,
            { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
          ]}
        >
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={[styles.headerImage, compact && styles.headerImageCompact]}
              resizeMode="contain"
            />
          ) : (
            <Icon size={compact ? 20 : 28} color={colors.textSecondary} strokeWidth={1.75} />
          )}
        </View>

        <Text
          style={[
            styles.headerName,
            compact && styles.headerNameCompact,
            { color: colors.text },
          ]}
          numberOfLines={compact ? 3 : 2}
          ellipsizeMode="tail"
        >
          {normalizeTitle(product.name)}
        </Text>

        {product.price && product.price !== "N/A" && (
          <Text
            style={[
              styles.productPrice,
              compact && styles.productPriceCompact,
              { color: colors.text }
            ]}
            numberOfLines={1}
          >
            {product.price}
          </Text>
        )}

        <View
          style={[
            styles.retailerPill,
            compact && styles.retailerPillCompact,
            { borderColor: getRetailerColor(product.retailer) || colors.border },
          ]}
        >
          <View style={[styles.retailerDot, { backgroundColor: getRetailerColor(product.retailer) || colors.textTertiary }]} />
          <Text
            style={[
              styles.retailerText,
              compact && styles.retailerTextCompact,
              { color: getRetailerColor(product.retailer) || colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {product.retailer ? formatRetailerName(product.retailer) : "STORE"}
          </Text>
        </View>
      </Card>
      </Pressable>
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
  productColors,
  onSpecPress,
}: {
  differences: KeyDifference[];
  productColors: string[];
  onSpecPress: (label: string, values: string[]) => void;
}) {
  const { colors } = useThemeColors();
  if (differences.length === 0) return null;

  return (
    <Card borderRadius={16} style={styles.diffCard}>
      <Text style={[styles.diffHeading, { color: colors.textTertiary }]}>KEY DIFFERENCES</Text>
      {differences.map((diff, i) => (
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
          <Pressable 
            style={styles.diffValuesRow}
            onPress={() => onSpecPress(diff.label, diff.values)}
          >
            {diff.values.map((val, idx) => {
              const win = diff.winnerIndex === idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.diffCol,
                    { 
                      backgroundColor: win ? colors.successMuted : colors.surface,
                      borderColor: win ? colors.success : colors.border,
                    },
                  ]}
                >
                  {win && (
                    <View style={[styles.valueCardTrophyWrap, { backgroundColor: colors.success }]}>
                      <Trophy size={9} color={colors.background} strokeWidth={2.5} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.diffValue,
                      { color: win ? colors.success : colors.text },
                    ]}
                    numberOfLines={3}
                  >
                    {val || "—"}
                  </Text>
                </View>
              );
            })}
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Category body (label on its own line, values stacked beneath in columns
// that align vertically with the sticky product cards above)
// ---------------------------------------------------------------------------

interface ValueCardProps {
  value: DetailedSpecValue;
  colors: ReturnType<typeof useThemeColors>["colors"];
  width: number;
}

function ValueCard({ value, colors, width }: ValueCardProps) {
  const isWinner = value.isWinner && !value.isDraw;
  return (
    <View
      style={[
        styles.valueCard,
        {
          width,
          backgroundColor: isWinner ? colors.successMuted : colors.surface,
          borderColor: isWinner ? colors.success : colors.border,
        },
      ]}
      accessible={false}
    >
      {isWinner && (
        <View style={[styles.valueCardTrophyWrap, { backgroundColor: colors.success }]}>
          <Trophy size={9} color={colors.background} strokeWidth={2.5} />
        </View>
      )}
      <Text
        style={[
          styles.valueCardText,
          { color: isWinner ? colors.success : colors.text },
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value.displayValue}
      </Text>
    </View>
  );
}

interface CategoryBodyProps {
  category: { key: string; rows: DetailedSpecRow[] };
  colors: ReturnType<typeof useThemeColors>["colors"];
  valueColumnWidth: number;
  headerGap: number;
  onSpecPress: (label: string, values: string[]) => void;
}

function CategoryBody({
  category,
  colors,
  valueColumnWidth,
  headerGap,
  onSpecPress,
}: CategoryBodyProps) {
  if (category.rows.length === 0) {
    return (
      <View style={styles.emptyCategory}>
        <Text style={[styles.emptyCategoryText, { color: colors.textSecondary }]}>
          No specs available in this category.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {category.rows.map((row, i) => {
        const rowA11y =
          row.label +
          ". " +
          row.values
            .map((v) => {
              const win = v.isWinner && !v.isDraw ? " (Winner)" : "";
              return `${v.productName}: ${v.displayValue}${win}`;
            })
            .join(". ");

        return (
          <View
            key={row.label}
            accessible
            accessibilityRole="text"
            accessibilityLabel={rowA11y}
          >
            {i > 0 && (
              <View
                style={[styles.specDivider, { backgroundColor: colors.border }]}
              />
            )}
            <Text
              style={[
                styles.specLabel,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {row.label}
            </Text>
            <Pressable 
              style={[styles.specValuesRow, { gap: headerGap }]}
              onPress={() => onSpecPress(row.label, row.values.map(v => v.displayValue))}
            >
              {row.values.map((v) => (
                <ValueCard
                  key={v.productId}
                  value={v}
                  colors={colors}
                  width={valueColumnWidth}
                />
              ))}
            </Pressable>
          </View>
        );
      })}
    </View>
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
        <Icon size={14} strokeWidth={2} color={isSelected ? colors.background : colors.text} />
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
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useThemeColors();
  const { activeComparison } = useComparisonStore();
  const [selectedCategory, setSelectedCategory] = useState<string>(OVERVIEW_KEY);
  
  const [selectedSpecDetail, setSelectedSpecDetail] = useState<{
    label: string;
    values: string[];
    loading: boolean;
    title?: string;
    data?: SpecExplanationResponse;
    error?: string;
  } | null>(null);

  const handleSpecPress = async (label: string, values: string[]) => {
    if (!activeComparison) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const FRIENDLY_TITLES = [
      "Techvisor Says:",
      "Geek Speak Translation:",
      "Nerd Alert:",
      "The Breakdown:",
      "Simply Put:",
      "Jargon Buster:"
    ];
    const randomTitle = FRIENDLY_TITLES[Math.floor(Math.random() * FRIENDLY_TITLES.length)];

    console.log(`[Frontend] Fetching spec explanation for: ${label}`);
    setSelectedSpecDetail({ label, values, loading: true, title: randomTitle });
    
    try {
      const productNames = activeComparison.products.map(p => p.name);
      const data = await explainSpec(productNames, label, values);
      console.log(`[Frontend] Successfully fetched spec explanation for: ${label}`);
      setSelectedSpecDetail(prev => prev ? { ...prev, loading: false, data } : null);
    } catch (error: any) {
      console.error(`[Frontend] Error fetching spec explanation for ${label}:`, error);
      setSelectedSpecDetail(prev => prev ? { ...prev, loading: false, error: error.message } : null);
    }
  };

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

  // Width of one value card in the category body. Matches the sticky
  // product card width above so columns align pixel-perfect.
  const valueColumnWidth = useMemo(
    () =>
      Math.max(
        60,
        (width - 2 * screenPadding - (products.length - 1) * headerGap) /
          products.length
      ),
    [width, screenPadding, headerGap, products.length]
  );

  // Group specs by category for category views.
  const categories = useMemo(() => {
    if (!productA) return [] as Array<{ key: string; rows: DetailedSpecRow[] }>;
    
    // 1) Support new backend schema format (groupedSpecs)
    if ((activeComparison as any).groupedSpecs) {
      const specsSource = (activeComparison as any).groupedSpecs;
      const gs = specsSource;
      return Object.entries(gs).map(([key, specsArray]: [string, any]) => {
        const rows = specsArray.map((spec: any) => {
          const values = products.map((p, pIndex) => ({
            productId: p.id,
            productName: p.name,
            productColor: getRetailerColor(p.retailer),
            displayValue: spec.values && spec.values[pIndex] ? spec.values[pIndex] : "�",
            numericValue: null,
            isWinner: spec.winnerIndex === pIndex,
            isDraw: spec.winnerIndex === -1,
          }));
          return { label: spec.label, values, unit: spec.unit || "" };
        });
        return { key, rows };
      });
    }

    // 2) Fallback to old mock format (product.specs)
    if (productA.specs) {
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
            productColor: getRetailerColor(p.retailer),
            displayValue: s?.value ?? "�",
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
    }
    
    return [];
  }, [productA, products, activeComparison]);

  // Decorate key differences with winner index from the underlying specs.
  const decoratedDifferences = useMemo<KeyDifference[]>(() => {
    if (!productA) return [];
    return keyDifferences.map((diff) => {
      let winnerIndex = null;
      let isDraw = false;

      if ((activeComparison as any).groupedSpecs) {
        for (const [group, specs] of Object.entries((activeComparison as any).groupedSpecs)) {
          const match = (specs as any[]).find(s => s.label === diff.label);
          if (match) {
             if (match.winnerIndex === -1) isDraw = true;
             else winnerIndex = match.winnerIndex;
             break;
          }
        }
      } else if (productA.specs) {
        const idx = productA.specs.findIndex(
          (s) => s.label === diff.label && s.category !== OVERVIEW_KEY
        );
        if (idx >= 0) {
          isDraw = !!productA.specs[idx]?.isDraw;
          const winnerIdx = products.findIndex((p) => p.specs[idx]?.isWinner);
          winnerIndex = winnerIdx >= 0 ? winnerIdx : null;
        }
      }

      return { ...diff, winnerIndex, isDraw };
    });
  }, [keyDifferences, productA, products, activeComparison]);

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

  const handleExport = async () => {
    if (!activeComparison) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await exportComparisonToPDF(activeComparison, isDark);
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
            productColors={products.map((p) => getRetailerColor(p.retailer) || colors.primary)}
            onSpecPress={handleSpecPress}
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
    return (
      <CategoryBody
        category={found}
        colors={colors}
        valueColumnWidth={valueColumnWidth}
        headerGap={headerGap}
        onSpecPress={handleSpecPress}
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ zIndex: 10, backgroundColor: colors.background }}>
        {/* STICKY: header */}
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
          <Pressable
            onPress={handleExport}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Export to PDF"
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Share size={18} color={colors.text} strokeWidth={2.25} />
          </Pressable>
        </View>

        {/* STICKY: product cards */}
        <View
          style={[
            styles.productRow,
            {
              paddingHorizontal: screenPadding,
              gap: headerGap,
              backgroundColor: colors.background,
            },
          ]}
        >
          {products.map((p, i) => (
            <ProductHeaderCard
              key={p.id}
              product={p}
              index={i}
              isRecommended={recommendedIndex === i}
              compact={products.length >= 3}
              onPress={() => router.push('/product/' + p.id)}
            />
          ))}
        </View>

        {/* STICKY: category pills */}
        <View
          style={[
            styles.pillsWrap,
            {
              paddingHorizontal: screenPadding,
              borderTopColor: colors.border,
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
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
      </View>

      {/* SCROLLING: body */}
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: screenPadding,
              paddingTop: 24,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {selectedCategory === OVERVIEW_KEY
            ? renderOverview()
            : renderCategory(selectedCategory)}
        </ScrollView>
        
        {selectedSpecDetail && (
          <BlurView
            intensity={isDark ? 30 : 60}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { zIndex: 5, padding: screenPadding, paddingBottom: insets.bottom + 24 }]}
          >
            <View style={[styles.aiOverlayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setSelectedSpecDetail(null)}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
              <View style={styles.aiOverlayHeader}>
                <View style={styles.aiOverlayTitleWrap}>
                  <Sparkles size={16} color={colors.ai} strokeWidth={2.25} style={{ marginTop: 2 }} />
                  <Text style={[styles.aiOverlayTitle, { color: colors.ai }]}>
                    {selectedSpecDetail.title || "Techvisor Says:"} {selectedSpecDetail.label}
                  </Text>
                </View>
              </View>

              {selectedSpecDetail.loading ? (
                <View style={styles.aiOverlayLoading}>
                  <ActivityIndicator size="large" color={colors.ai} />
                  <Text style={[styles.aiOverlayLoadingText, { color: colors.textSecondary }]}>Analyzing spec...</Text>
                </View>
              ) : selectedSpecDetail.error ? (
                <View style={styles.aiOverlayError}>
                  <AnimatedErrorIcon color={colors.error} />
                  <Text style={{ color: colors.error, textAlign: 'center' }}>
                    Failed to fetch explanation. Please try again.
                  </Text>
                </View>
              ) : selectedSpecDetail.data ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.aiOverlayConcept, { color: colors.text }]}>
                    {selectedSpecDetail.data.concept}
                  </Text>
                  <View style={styles.aiOverlayBreakdowns}>
                    {selectedSpecDetail.data.breakdowns.map((b, idx) => (
                      <View key={idx} style={[styles.aiOverlayBreakdownItem, { borderTopColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[styles.aiOverlayProductName, { color: colors.text }]}>{b.productName}</Text>
                          <Text style={[styles.aiOverlayValue, { color: colors.textTertiary }]}> • {b.value}</Text>
                        </View>
                        <Text style={[styles.aiOverlayInsight, { color: colors.textSecondary }]}>{b.insight}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </View>
          </BlurView>
        )}
      </View>
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
  scrollContent: {},

  productRow: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 22,
  },

  // Product header card
  headerWrapper: { flex: 1, minWidth: 0 },
  headerCard: {
    padding: 14,
    alignItems: "center",
    minHeight: 168,
    position: "relative",
  },
  headerCardCompact: {
    padding: 8,
    minHeight: 0,
  },
  infoWrap: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 2,
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
  headerImageWrapCompact: {
    width: 44,
    height: 40,
    borderRadius: 8,
    marginBottom: 6,
    marginTop: 0,
  },
  headerImage: { width: 64, height: 56 },
  headerImageCompact: { width: 40, height: 36 },
  headerName: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 18,
    marginBottom: 8,
  },
  headerNameCompact: {
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  productPriceCompact: {
    fontSize: 12,
    marginBottom: 4,
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
  retailerPillCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  retailerDot: { width: 6, height: 6, borderRadius: 3 },
  retailerText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  retailerTextCompact: {
    fontSize: 8,
    letterSpacing: 0.4,
  },

  // Pills
  pillsWrap: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  diffValuesRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  diffCol: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: "center",
    position: "relative",
  },
  diffValue: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
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

  // Category body
  specDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  specLabel: {
    fontSize: 13,
    fontWeight: "500",
    paddingTop: 14,
    paddingBottom: 6,
  },
  specValuesRow: {
    flexDirection: "row",
    paddingBottom: 14,
  },

  // Value card
  valueCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: "center",
    position: "relative",
  },
  valueCardTrophyWrap: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  valueCardText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "left",
  },

  detailedCta: { marginTop: 24 },

  // AI Overlay
  aiOverlayCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  aiOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingRight: 32, // space for close btn
  },
  aiOverlayTitleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexShrink: 1,
  },
  aiOverlayTitle: {
    ...Typography.headline,
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  aiOverlayLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  aiOverlayLoadingText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: "500",
  },
  aiOverlayError: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  aiOverlayConcept: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  aiOverlayBreakdowns: {
    gap: 16,
    paddingBottom: 20,
  },
  aiOverlayBreakdownItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  aiOverlayProductName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: "600",
  },
  aiOverlayValue: {
    ...Typography.body,
    fontSize: 14,
  },
  aiOverlayInsight: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
