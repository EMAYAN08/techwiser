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
import * as Haptics from "../utils/haptics";
import { ArrowLeft, Crown, Sparkles, Trophy, Share, X, AlertTriangle, PackageOpen } from "lucide-react-native";
import { BlurView } from "expo-blur";

import { useComparisonStore } from "../store/useComparisonStore";
import { useThemeColors, getRetailerColor } from "../constants/Colors";
import { type } from "../constants/Typography";
import { radii } from "../constants/Layout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { NavCircle } from "../components/ui/NavCircle";
import { RetailerSticker } from "../components/ui/RetailerSticker";
import { getCategoryIcon } from "../components/comparison/CategoryIcon";
import { AlternativesDeck } from "../components/comparison/AlternativesDeck";
import { type DetailedSpecRow, type DetailedSpecValue } from "../components/comparison/SpecBarRow";
import { exportComparisonToPDF } from "../utils/exportPDF";
import { explainSpec, fetchAlternatives, peekAlternativesCache, type SpecExplanationResponse } from "../services/api";

const OVERVIEW_KEY = "Overview";

function specValuesAreEqual(values: string[]): boolean {
  if (!Array.isArray(values) || values.length < 2) return false;
  const canon = values.map((v) =>
    String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9.%+-]+/g, "")
  );
  const present = canon.filter((v) => v && v !== "n/a" && v !== "unknown" && v !== "na");
  return present.length === values.length && present.length >= 2 && present.every((v) => v === present[0]);
}

function AnimatedErrorIcon({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  return (
    <Animated.View style={{ opacity: pulse, marginBottom: 16 }}>
      <AlertTriangle size={48} color={color} strokeWidth={1.5} />
    </Animated.View>
  );
}

function normalizeTitle(title: string): string {
  const cleaned = title.replace(/5G|Unlocked|Smartphone|Dual SIM/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) return words.slice(0, 3).join(" ");
  return cleaned;
}

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
          borderRadius={radii.card}
          style={[
            styles.headerCard,
            { flexGrow: 1, paddingTop: compact ? 6 : 10 },
            compact && styles.headerCardCompact,
            isRecommended && { borderColor: colors.spotify, borderWidth: 2 },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', alignItems: 'flex-start', minHeight: 22, width: '100%', marginBottom: 4 }}>
            <View>
              {isRecommended && (
                <View style={[styles.crownWrap, { backgroundColor: colors.spotifyWash }]}>
                  <Crown size={12} color={colors.spotify} strokeWidth={2.5} />
                </View>
              )}
            </View>
            <RetailerSticker retailer={product.retailer} compact />
          </View>

          <View
            style={[
              styles.headerImageWrap,
              compact && styles.headerImageWrapCompact,
              { backgroundColor: colors.fog, marginTop: 0 },
            ]}
          >
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={[styles.headerImage, compact && styles.headerImageCompact]}
                resizeMode="contain"
              />
            ) : (
              <Icon size={compact ? 20 : 28} color={colors.stone} strokeWidth={1.75} />
            )}
          </View>

          <Text
            style={[styles.headerName, compact && styles.headerNameCompact, { color: colors.ink }]}
            numberOfLines={compact ? 3 : 2}
            ellipsizeMode="tail"
          >
            {normalizeTitle(product.name)}
          </Text>

          {product.price && product.price !== "N/A" && (
            <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, transform: [{ rotate: '-1deg' }] }}>
              <Text
                style={[styles.productPrice, compact && styles.productPriceCompact, { color: '#1C1C1C', fontWeight: '700' }]}
                numberOfLines={1}
              >
                {product.price}
              </Text>
            </View>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

function AIVerdictCard({ summary }: { summary: string }) {
  const { colors } = useThemeColors();
  return (
    <View style={[styles.aiCard, { backgroundColor: colors.verdictBg }]}>
      <View style={styles.aiHeader}>
        <Sparkles size={14} color={colors.spotify} strokeWidth={2.25} />
        <Text style={[styles.aiLabel, { color: colors.spotify }]}>AI VERDICT</Text>
      </View>
      <Text style={[styles.aiBody, { color: colors.verdictFg }]}>{summary}</Text>
    </View>
  );
}

interface KeyDifference {
  label: string;
  values: string[];
  winnerIndex: number | null;
  isDraw?: boolean;
}

function KeyDifferencesCard({
  differences,
  onSpecPress,
}: {
  differences: KeyDifference[];
  productColors: string[];
  onSpecPress: (label: string, values: string[]) => void;
}) {
  const { colors } = useThemeColors();
  if (differences.length === 0) return null;

  return (
    <Card borderRadius={radii.card} style={styles.diffCard}>
      <Text style={[styles.diffHeading, { color: colors.body }]}>KEY DIFFERENCES</Text>
      {differences.map((diff, i) => (
        <View
          key={`${diff.label}-${i}`}
          style={[
            styles.diffRow,
            i < differences.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.line,
            },
          ]}
        >
          <Text style={[styles.diffLabel, { color: colors.ink, opacity: 0.9 }]}>{diff.label}</Text>
          <Pressable
            style={styles.diffValuesRow}
            onPress={() => onSpecPress(diff.label, Array.isArray(diff.values) ? diff.values : [])}
          >
            {(Array.isArray(diff.values) ? diff.values : []).map((val, idx) => {
              const win = !diff.isDraw && diff.winnerIndex === idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.diffCol,
                    {
                      backgroundColor: win ? colors.spotifyWash : colors.fog,
                      borderColor: win ? colors.spotify : colors.stone,
                      borderWidth: win ? 1.5 : 1,
                    },
                  ]}
                >
                  {win && (
                    <View style={[styles.valueCardTrophyWrap, { backgroundColor: colors.spotify }]}>
                      <Trophy size={9} color={colors.spotifyInk} strokeWidth={2.5} />
                    </View>
                  )}
                  <Text style={[styles.diffValue, { color: colors.ink, fontWeight: win ? "700" : "400" }]}>
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
          backgroundColor: isWinner ? colors.spotifyWash : colors.fog,
          borderColor: isWinner ? colors.spotify : colors.stone,
          borderWidth: isWinner ? 1.5 : 1,
        },
      ]}
      accessible={false}
    >
      {isWinner && (
        <View style={[styles.valueCardTrophyWrap, { backgroundColor: colors.spotify }]}>
          <Trophy size={9} color={colors.spotifyInk} strokeWidth={2.5} />
        </View>
      )}
      <Text
        style={[styles.valueCardText, { color: colors.ink, fontWeight: isWinner ? "700" : "400" }]}
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
        <Text style={[styles.emptyCategoryText, { color: colors.body }]}>
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
          <View key={row.label} accessible accessibilityRole="text" accessibilityLabel={rowA11y}>
            {i > 0 && <View style={[styles.specDivider, { backgroundColor: colors.line }]} />}
            <Text style={[styles.specLabel, { color: colors.stone }]} numberOfLines={2}>
              {row.label}
            </Text>
            <Pressable
              style={[styles.specValuesRow, { gap: headerGap }]}
              onPress={() => onSpecPress(row.label, row.values.map((v) => v.displayValue))}
            >
              {row.values.map((v) => (
                <ValueCard key={v.productId} value={v} colors={colors} width={valueColumnWidth} />
              ))}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

interface CategoryPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  iconKey?: string;
}

function CategoryPill({ label, isSelected, onPress, iconKey }: CategoryPillProps) {
  const { colors } = useThemeColors();
  const Icon = getCategoryIcon(label, iconKey);
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
            ? { backgroundColor: colors.segmentSelectedBg, borderColor: colors.segmentSelectedBg }
            : { backgroundColor: "transparent", borderColor: colors.line },
        ]}
      >
        <Icon size={14} strokeWidth={2} color={isSelected ? colors.segmentSelectedFg : colors.ink} />
        <Text
          style={[styles.pillLabel, { color: isSelected ? colors.segmentSelectedFg : colors.body }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  const { colors } = useThemeColors();
  return (
    <View style={[styles.emptyRoot, { backgroundColor: colors.bg }]}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <PackageOpen size={32} color={colors.stone} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.ink }]}>No comparison loaded</Text>
      <Text style={[styles.emptySubtitle, { color: colors.body }]}>
        Add two product URLs on the home screen to start comparing.
      </Text>
      <View style={styles.emptyButton}>
        <Button title="Go back" variant="primary" onPress={onBack} />
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useThemeColors();
  const { activeComparison, setComparisonAlternatives } = useComparisonStore();
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
      "Jargon Buster:",
    ];
    const randomTitle = FRIENDLY_TITLES[Math.floor(Math.random() * FRIENDLY_TITLES.length)];

    setSelectedSpecDetail({ label, values, loading: true, title: randomTitle });

    try {
      const productNames = activeComparison.products.map((p) => p.name);
      const data = await explainSpec(productNames, label, values);
      setSelectedSpecDetail((prev) => (prev ? { ...prev, loading: false, data } : null));
    } catch (error: unknown) {
      setSelectedSpecDetail((prev) =>
        prev ? { ...prev, loading: false, error: error instanceof Error ? error.message : "Unknown error" } : null
      );
    }
  };

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

  const valueColumnWidth = useMemo(
    () =>
      Math.max(
        60,
        (width - 2 * screenPadding - (products.length - 1) * headerGap) / products.length
      ),
    [width, screenPadding, headerGap, products.length]
  );

  const categories = useMemo(() => {
    if (!productA) return [] as Array<{ key: string; rows: DetailedSpecRow[] }>;

    if ((activeComparison as any).groupedSpecs) {
      const gs = (activeComparison as any).groupedSpecs;
      return Object.entries(gs).map(([key, specsArray]: [string, any]) => {
        const rows = (Array.isArray(specsArray) ? specsArray : []).map((spec: any) => {
          const specValues = Array.isArray(spec?.values) ? spec.values.map((v: unknown) => (v == null ? "—" : String(v))) : [];
          const tied = specValuesAreEqual(specValues);
          const values = products.map((p, pIndex) => ({
            productId: p.id,
            productName: p.name,
            productColor: getRetailerColor(p.retailer),
            displayValue: specValues[pIndex] ? specValues[pIndex] : "—",
            numericValue: null,
            isWinner: !tied && spec?.winnerIndex === pIndex,
            isDraw: tied || spec?.winnerIndex === -1,
          }));
          return { label: spec?.label || "Spec", values, unit: spec?.unit || "" };
        });
        return { key, rows };
      });
    }

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
    }

    return [];
  }, [productA, products, activeComparison]);

  const decoratedDifferences = useMemo<KeyDifference[]>(() => {
    if (!productA || !Array.isArray(keyDifferences)) return [];
    return keyDifferences
      .filter((diff) => diff && typeof diff === "object")
      .map((diff) => {
        const values = Array.isArray(diff.values) ? diff.values.map((v) => (v == null ? "—" : String(v))) : [];
        let winnerIndex = null;
        let isDraw = specValuesAreEqual(values);

        if ((activeComparison as any).groupedSpecs) {
          for (const specs of Object.values((activeComparison as any).groupedSpecs)) {
            if (!Array.isArray(specs)) continue;
            const match = (specs as any[]).find((s) => s && s.label === diff.label);
            if (match) {
              if (match.winnerIndex === -1) isDraw = true;
              else winnerIndex = match.winnerIndex;
              break;
            }
          }
        } else if (productA.specs) {
          const idx = productA.specs.findIndex((s) => s.label === diff.label && s.category !== OVERVIEW_KEY);
          if (idx >= 0) {
            isDraw = !!productA.specs[idx]?.isDraw;
            const winnerIdx = products.findIndex((p) => p.specs[idx]?.isWinner);
            winnerIndex = winnerIdx >= 0 ? winnerIdx : null;
          }
        }

        return { ...diff, label: diff.label || "Difference", values, winnerIndex, isDraw };
      });
  }, [keyDifferences, productA, products, activeComparison]);

  const categoryList = useMemo(
    () => [OVERVIEW_KEY, ...categories.map((c) => c.key), "Alternatives"],
    [categories]
  );

  const recommendedIndex = useMemo(
    () => decoratedDifferences[0]?.winnerIndex ?? null,
    [decoratedDifferences]
  );

  const handleBack = () => {
    router.back();
  };

  const handleExport = async () => {
    if (!activeComparison) return;
    await exportComparisonToPDF(activeComparison, isDark);
  };

  const [alternativesData, setAlternativesData] = useState<{ loading: boolean; data?: any; error?: string } | null>(
    () => {
      const hit = activeComparison?.alternatives || peekAlternativesCache(activeComparison?.products || []);
      return hit ? { loading: false, data: hit } : null;
    }
  );

  const loadAlternatives = (force = false) => {
    if (!activeComparison) return;
    if (!force) {
      const hit = alternativesData?.data || activeComparison.alternatives || peekAlternativesCache(activeComparison.products);
      if (hit) {
        setAlternativesData({ loading: false, data: hit });
        return;
      }
    }
    setAlternativesData({ loading: true });
    fetchAlternatives(activeComparison.products, { force })
      .then((data) => {
        setComparisonAlternatives(data);
        setAlternativesData({ loading: false, data });
      })
      .catch((error: unknown) =>
        setAlternativesData({
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
  };

  const handleSelectCategory = (cat: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(cat);

    if (cat === "Alternatives") {
      loadAlternatives(false);
    }
  };

  const retryAlternatives = () => loadAlternatives(true);

  const renderOverview = () => (
    <View>
      <AIVerdictCard summary={aiSummary} />
      {decoratedDifferences.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <KeyDifferencesCard
            differences={decoratedDifferences}
            productColors={products.map((p) => getRetailerColor(p.retailer) || colors.ink)}
            onSpecPress={handleSpecPress}
          />
        </View>
      )}
    </View>
  );

  const renderCategory = (cat: string) => {
    const found = categories.find((c) => c.key === cat);
    if (!found || found.rows.length === 0) {
      return (
        <View style={styles.emptyCategory}>
          <Text style={[styles.emptyCategoryText, { color: colors.body }]}>
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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ zIndex: 10, backgroundColor: colors.bg }}>
        <View style={[styles.header, { paddingHorizontal: screenPadding, paddingTop: insets.top + 4 }]}>
          <NavCircle onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={20} color={colors.ink} strokeWidth={2.25} />
          </NavCircle>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>Comparison</Text>
          <NavCircle onPress={handleExport} accessibilityRole="button" accessibilityLabel="Export to PDF">
            <Share size={18} color={colors.ink} strokeWidth={2.25} />
          </NavCircle>
        </View>

        <View
          style={[
            styles.productRow,
            {
              paddingHorizontal: screenPadding,
              gap: headerGap,
              backgroundColor: colors.bg,
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
              onPress={() => router.push("/product/" + p.id)}
            />
          ))}
        </View>

        <View
          style={[
            styles.pillsWrap,
            {
              paddingHorizontal: screenPadding,
              borderTopColor: colors.line,
              borderBottomColor: colors.line,
              backgroundColor: colors.bg,
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
                iconKey={activeComparison.groupIcons?.[cat]}
                isSelected={selectedCategory === cat}
                onPress={() => handleSelectCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {selectedCategory === "Alternatives" ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: screenPadding,
              paddingTop: 12,
              paddingBottom: insets.bottom + 12,
            }}
          >
            <AlternativesDeck
              loading={!alternativesData || alternativesData.loading}
              error={alternativesData?.error}
              alternatives={alternativesData?.data?.alternatives || []}
              onRetry={retryAlternatives}
            />
          </View>
        ) : (
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
            {selectedCategory === OVERVIEW_KEY ? renderOverview() : renderCategory(selectedCategory)}
          </ScrollView>
        )}

        {selectedSpecDetail && (
          <BlurView
            intensity={isDark ? 30 : 60}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { zIndex: 5, padding: screenPadding, paddingBottom: insets.bottom + 24 }]}
          >
            <View style={[styles.aiOverlayCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Pressable onPress={() => setSelectedSpecDetail(null)} hitSlop={12} style={styles.closeBtn}>
                <X size={20} color={colors.body} />
              </Pressable>
              <View style={styles.aiOverlayHeader}>
                <View style={styles.aiOverlayTitleWrap}>
                  <Sparkles size={16} color={colors.spotify} strokeWidth={2.25} style={{ marginTop: 2 }} />
                  <Text style={[styles.aiOverlayTitle, { color: colors.ink }]}>
                    {selectedSpecDetail.title || "Techvisor Says:"} {selectedSpecDetail.label}
                  </Text>
                </View>
              </View>

              {selectedSpecDetail.loading ? (
                <View style={styles.aiOverlayLoading}>
                  <ActivityIndicator size="large" color={colors.spotify} />
                  <Text style={[styles.aiOverlayLoadingText, { color: colors.body }]}>Analyzing spec...</Text>
                </View>
              ) : selectedSpecDetail.error ? (
                <View style={styles.aiOverlayError}>
                  <AnimatedErrorIcon color={colors.error} />
                  <Text style={{ ...type.body, color: colors.error, textAlign: "center" }}>
                    Failed to fetch explanation. Please try again.
                  </Text>
                </View>
              ) : selectedSpecDetail.data ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.aiOverlayConcept, { color: colors.ink }]}>
                    {selectedSpecDetail.data.concept}
                  </Text>
                  <View style={styles.aiOverlayBreakdowns}>
                    {selectedSpecDetail.data.breakdowns.map((b, idx) => (
                      <View key={idx} style={[styles.aiOverlayBreakdownItem, { borderTopColor: colors.line }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                          <Text style={[styles.aiOverlayProductName, { color: colors.ink }]}>{b.productName}</Text>
                          <Text style={[styles.aiOverlayValue, { color: colors.stone }]}> • {b.value}</Text>
                        </View>
                        <Text style={[styles.aiOverlayInsight, { color: colors.body }]}>{b.insight}</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, zIndex: 50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  headerTitle: { ...type.navTitle },
  scrollContent: {},
  productRow: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 22,
  },
  headerWrapper: { flex: 1, minWidth: 0 },
  headerCard: {
    padding: 14,
    alignItems: "center",
    minHeight: 168,
    position: "relative",
    gap: 8,
  },
  headerCardCompact: {
    padding: 8,
    minHeight: 0,
    gap: 6,
  },
  crownWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  topRightBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radii.pill,
    flexShrink: 1,
  },
  topRightBadgeCompact: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  retailerText: {
    ...type.caption,
    fontSize: 10,
    fontWeight: "600",
  },
  headerImageWrap: {
    width: 72,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headerImageWrapCompact: {
    width: 44,
    height: 40,
    borderRadius: 8,
    marginTop: 0,
  },
  headerImage: { width: 64, height: 56 },
  headerImageCompact: { width: 40, height: 36 },
  headerName: {
    ...type.productName,
    textAlign: "center",
  },
  headerNameCompact: {
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: -0.1,
  },
  productPrice: {
    ...type.caption,
    fontSize: 14,
    textAlign: "center",
  },
  productPriceCompact: {
    fontSize: 12,
  },
  pillsWrap: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pillsContent: { gap: 8, paddingRight: 20 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    gap: 6,
    minHeight: 36,
  },
  pillLabel: { ...type.chip },
  aiCard: {
    borderRadius: radii.card,
    padding: 20,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  aiLabel: { ...type.eyebrow },
  aiBody: { ...type.body },
  diffCard: { padding: 18 },
  diffHeading: { ...type.eyebrow, marginBottom: 14 },
  diffRow: { paddingVertical: 14 },
  diffLabel: { ...type.caption, marginBottom: 10 },
  diffValuesRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  diffCol: {
    flex: 1,
    minWidth: 0,
    borderRadius: radii.spec,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: "center",
    position: "relative",
  },
  diffValue: { ...type.body, fontSize: 14, lineHeight: 18 },
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
  emptyTitle: { ...type.productName, fontSize: 18, textAlign: "center", marginBottom: 6 },
  emptySubtitle: { ...type.body, fontSize: 14, textAlign: "center" },
  emptyButton: { marginTop: 24, alignSelf: "stretch" },
  emptyCategory: { paddingVertical: 32, alignItems: "center" },
  emptyCategoryText: { ...type.body, fontSize: 14 },
  specDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  specLabel: { ...type.specLabel, paddingTop: 14, paddingBottom: 6 },
  specValuesRow: {
    flexDirection: "row",
    paddingBottom: 14,
  },
  valueCard: {
    borderRadius: radii.spec,
    borderWidth: 1.5,
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
  valueCardText: { ...type.specValue, fontSize: 15, lineHeight: 20, textAlign: "left" },
  aiOverlayCard: {
    flex: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 24,
  },
  aiOverlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingRight: 32,
  },
  aiOverlayTitleWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexShrink: 1,
  },
  aiOverlayTitle: { ...type.productName, fontSize: 18, flexShrink: 1 },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  aiOverlayLoading: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  aiOverlayLoadingText: { ...type.body, fontSize: 14 },
  aiOverlayError: {
    paddingVertical: 40,
    alignItems: "center",
  },
  aiOverlayConcept: {
    ...type.body,
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
  aiOverlayProductName: { ...type.productName, fontSize: 15 },
  aiOverlayValue: { ...type.body, fontSize: 14 },
  aiOverlayInsight: { ...type.body, fontSize: 14, lineHeight: 20 },
});
