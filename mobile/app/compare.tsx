import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useComparisonStore, Product } from "../store/useComparisonStore";
import { useThemeColors } from "../constants/Colors";
import { Card } from "../components/ui/Card";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Helper to shorten long product names
function normalizeTitle(title: string) {
  let cleaned = title.replace(/5G|Unlocked|Smartphone|Dual SIM/gi, "").trim();
  const words = cleaned.split(" ");
  if (words.length > 3) {
    return words.slice(0, 3).join(" ");
  }
  return cleaned;
}

// Maps category strings to icons
function getCategoryIcon(category: string): any {
  const c = category.toLowerCase();
  if (c.includes("performance") || c.includes("processor") || c.includes("speed")) return "cpu";
  if (c.includes("display") || c.includes("screen")) return "monitor";
  if (c.includes("battery") || c.includes("power")) return "battery";
  if (c.includes("camera") || c.includes("video")) return "camera";
  if (c.includes("design") || c.includes("build") || c.includes("size")) return "smartphone";
  if (c.includes("memory") || c.includes("ram") || c.includes("storage")) return "hard-drive";
  if (c.includes("network") || c.includes("connectivity") || c.includes("cellular")) return "wifi";
  return "list";
}

function ProductHeaderBox({ product, index, colors }: { product: Product; index: number; colors: any }) {
  const isLeft = index === 0;
  return (
    <View style={[styles.productHeaderBox, { backgroundColor: product.retailerColor || (isLeft ? colors.primary : colors.error) }]}>
      <View style={styles.productImagePlaceholder}>
        <Feather name={getCategoryIcon(product.name)} size={28} color="rgba(255,255,255,0.8)" />
      </View>
      <Text style={styles.productHeaderText} numberOfLines={2}>
        {normalizeTitle(product.name)}
      </Text>
    </View>
  );
}

function CategoryBox({ category, isSelected, onSelect, colors }: { category: string; isSelected: boolean; onSelect: () => void; colors: any }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      style={[
        styles.categoryBox,
        { backgroundColor: isSelected ? colors.ai : colors.surface, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Feather name={getCategoryIcon(category)} size={20} color={isSelected ? "#FFF" : colors.textSecondary} />
      <Text style={[styles.categoryBoxText, { color: isSelected ? "#FFF" : colors.textSecondary }]} numberOfLines={1}>
        {category}
      </Text>
    </AnimatedPressable>
  );
}

function SpecResultBoxes({ specRow, colors }: { specRow: any; colors: any }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [specRow.label]);

  return (
    <Animated.View style={[styles.specResultContainer, { opacity: fadeAnim }]}>
      <Text style={[styles.specResultLabel, { color: colors.textSecondary }]}>{specRow.label}</Text>
      <View style={styles.specResultBoxesRow}>
        {specRow.values.map((val: string, idx: number) => {
          const isWinner = !specRow.isDraw && idx === specRow.winnerIndex;
          return (
            <View key={idx} style={[styles.bigBox, { backgroundColor: isWinner ? colors.successMuted : colors.surfaceHighlight, borderColor: isWinner ? colors.success : colors.border }]}>
              {isWinner && <View style={[styles.winnerIndicator, { backgroundColor: colors.success }]} />}
              <Text style={[styles.bigBoxText, { color: isWinner ? colors.success : colors.text }]} adjustsFontSizeToFit numberOfLines={4}>
                {val}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const { activeComparison } = useComparisonStore();
  const { colors } = useThemeColors();

  const [selectedCategory, setSelectedCategory] = useState<string | null>("Overview");

  if (!activeComparison) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No comparison loaded.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { products, keyDifferences, aiSummary } = activeComparison;

  // Process categories
  const categoriesMap = new Map<string, any[]>();
  const specCount = products[0]?.specs.length ?? 0;
  
  for (let si = 0; si < specCount; si++) {
    const spec0 = products[0].specs[si];
    if (!spec0) continue;
    const cat = spec0.category;
    const values = products.map((p) => p.specs[si]?.value ?? "-");
    const isDraw = !!spec0.isDraw;
    const winnerIndex = products.findIndex((p) => p.specs[si]?.isWinner);
    
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
    categoriesMap.get(cat)!.push({ 
      label: spec0.label, 
      values, 
      winnerIndex: winnerIndex < 0 ? 0 : winnerIndex, 
      isDraw 
    });
  }

  const categoryList = ["Overview", ...Array.from(categoriesMap.keys())];

  const renderContent = () => {
    if (selectedCategory === "Overview") {
      return (
        <Animated.View style={styles.overviewContainer}>
          <Card borderRadius={12} style={[styles.heroCard, { borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.surface }]}>
            <View style={styles.heroHeader}>
              <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.heroLabel, { color: colors.primary }]}>AI VERDICT</Text>
            </View>
            <Text style={[styles.heroText, { color: colors.text }]}>{aiSummary}</Text>
          </Card>
          
          {keyDifferences.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.overviewSectionTitle, { color: colors.textTertiary }]}>KEY DIFFERENCES</Text>
              {keyDifferences.map((diff, i) => (
                <View key={i} style={styles.diffRow}>
                  <Text style={[styles.diffLabel, { color: colors.text }]}>{diff.label}</Text>
                  <View style={styles.diffValuesRow}>
                    <Text style={[styles.diffValueLeft, { color: products[0].retailerColor || colors.primary }]} numberOfLines={2}>{diff.values[0]}</Text>
                    <Text style={[styles.diffValueRight, { color: products[1]?.retailerColor || colors.error }]} numberOfLines={2}>{diff.values[1]}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      );
    }

    const rows = categoriesMap.get(selectedCategory!) || [];
    return rows.map((row, idx) => <SpecResultBoxes key={row.label + idx} specRow={row} colors={colors} />);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={12} style={styles.backIcon}>
          <Feather name="arrow-left" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comparison</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* FIXED HEADER PORTION */}
      <View style={[styles.fixedHeaderContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {/* Top 2 Boxes */}
        <View style={styles.productRow}>
          <ProductHeaderBox product={products[0]} index={0} colors={colors} />
          {products[1] && <ProductHeaderBox product={products[1]} index={1} colors={colors} />}
        </View>

        {/* Small Pink Boxes (Categories) */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {categoryList.map(cat => (
            <CategoryBox 
              key={cat} 
              category={cat} 
              isSelected={selectedCategory === cat} 
              onSelect={() => setSelectedCategory(cat)} 
              colors={colors} 
            />
          ))}
        </ScrollView>
      </View>

      {/* SCROLLABLE RESULTS PORTION */}
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  backIcon: { padding: 6 },
  
  fixedHeaderContainer: { borderBottomWidth: 1, paddingBottom: 12, paddingTop: 16 },
  productRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  productHeaderBox: { flex: 1, borderRadius: 12, padding: 16, alignItems: "center", justifyContent: "center", minHeight: 120 },
  productImagePlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  productHeaderText: { color: "#FFF", fontSize: 14, fontWeight: "700", textAlign: "center", letterSpacing: 0.5 },

  categoryScroll: { flexGrow: 0 },
  categoryScrollContent: { paddingHorizontal: 16, gap: 12 },
  categoryBox: { width: 80, height: 80, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 8 },
  categoryBoxText: { fontSize: 11, fontWeight: "600", marginTop: 8, textAlign: "center" },

  scrollBody: { padding: 16, paddingBottom: 60 },

  overviewContainer: { flex: 1 },
  heroCard: { padding: 20, marginBottom: 8 },
  heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  heroLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, marginLeft: 6 },
  heroText: { fontSize: 15, lineHeight: 24, fontWeight: "500" },
  
  overviewSectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 1.2, marginBottom: 12 },
  diffRow: { marginBottom: 16 },
  diffLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  diffValuesRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  diffValueLeft: { flex: 1, fontSize: 14, fontWeight: "500" },
  diffValueRight: { flex: 1, fontSize: 14, fontWeight: "500", textAlign: "right" },

  specResultContainer: { marginBottom: 24 },
  specResultLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textAlign: "center" },
  specResultBoxesRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  
  bigBox: { flex: 1, borderRadius: 12, padding: 16, minHeight: 100, justifyContent: "center", borderWidth: 1, position: "relative", overflow: "hidden" },
  winnerIndicator: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  bigBoxText: { fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24 },

  emptyRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, marginBottom: 20 },
  backBtn: { padding: 12 },
  backBtnText: { fontSize: 15, fontWeight: "600" },
});
