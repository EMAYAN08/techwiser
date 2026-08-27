import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useComparisonStore, Product } from "../store/useComparisonStore";
import { useThemeColors } from "../constants/Colors";
import { Card } from "../components/ui/Card";
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, withSpring, useSharedValue, FadeInRight } from "react-native-reanimated";

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

// Maps category strings to MaterialCommunityIcons names
function getCategoryIconName(category: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const c = category.toLowerCase();
  
  // Devices
  if (c.includes("phone")) return "cellphone";
  if (c.includes("tablet") || c.includes("ipad")) return "tablet";
  if (c.includes("laptop") || c.includes("macbook")) return "laptop";
  if (c.includes("watch") || c.includes("smartwatch")) return "watch-variant";
  if (c.includes("headphone")) return "headphones";
  if (c.includes("earphone") || c.includes("buds")) return "earbuds";
  if (c.includes("tv") || c.includes("television")) return "television";
  if (c.includes("fridge") || c.includes("refrigerator")) return "fridge";
  if (c.includes("ac") || c.includes("air")) return "air-conditioner";
  if (c.includes("desktop") || c.includes("pc")) return "desktop-tower-monitor";
  if (c.includes("monitor")) return "monitor";
  if (c.includes("keyboard")) return "keyboard";

  // Specs
  if (c.includes("performance") || c.includes("processor") || c.includes("speed")) return "cpu-64-bit";
  if (c.includes("display") || c.includes("screen")) return "monitor-shimmer";
  if (c.includes("battery") || c.includes("power")) return "battery-charging-100";
  if (c.includes("camera") || c.includes("video")) return "camera-iris";
  if (c.includes("design") || c.includes("build") || c.includes("size")) return "ruler-square";
  if (c.includes("memory") || c.includes("ram") || c.includes("storage")) return "memory";
  if (c.includes("audio") || c.includes("sound")) return "volume-high";
  if (c.includes("network") || c.includes("connectivity") || c.includes("cellular")) return "wifi";
  if (c.includes("overview")) return "view-dashboard";
  
  return "star-circle-outline";
}

function ProductHeaderBox({ product, index, colors }: { product: Product; index: number; colors: any }) {
  const isLeft = index === 0;
  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify().damping(18)}
      style={[
        styles.productHeaderBox, 
        { 
          backgroundColor: product.retailerColor || (isLeft ? colors.primary : colors.error),
        }
      ]}
    >
      <View style={styles.productImagePlaceholder}>
        <MaterialCommunityIcons name={getCategoryIconName(product.name)} size={28} color="#FFF" />
      </View>
      <Text style={styles.productHeaderText} numberOfLines={2}>
        {normalizeTitle(product.name)}
      </Text>
    </Animated.View>
  );
}

function CategoryBox({ category, isSelected, onSelect, colors, index }: { category: string; isSelected: boolean; onSelect: () => void; colors: any; index: number }) {
  const scale = useSharedValue(1);

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      entering={FadeInRight.delay(index * 50).springify().damping(20)}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      onPressIn={() => { scale.value = withSpring(0.92, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      style={[
        styles.categoryBox,
        { backgroundColor: isSelected ? colors.text : colors.surface },
        rStyle
      ]}
    >
      <View style={[styles.categoryIconContainer, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.surfaceHighlight }]}>
        <MaterialCommunityIcons name={getCategoryIconName(category)} size={24} color={isSelected ? colors.background : colors.text} style={{ opacity: isSelected ? 1 : 0.8 }} />
      </View>
      <Text style={[styles.categoryBoxText, { color: isSelected ? colors.background : colors.textSecondary }]} numberOfLines={1}>
        {category}
      </Text>
    </AnimatedPressable>
  );
}

function SpecResultBoxes({ specRow, colors, index }: { specRow: any; colors: any; index: number }) {
  return (
    <Animated.View 
      entering={FadeInUp.delay(index * 100).springify().damping(20)} 
      style={styles.specResultContainer}
    >
      <Text style={[styles.specResultLabel, { color: colors.textSecondary }]}>{specRow.label}</Text>
      <View style={styles.specResultBoxesRow}>
        {specRow.values.map((val: string, idx: number) => {
          const isWinner = !specRow.isDraw && idx === specRow.winnerIndex;
          return (
            <View 
              key={idx} 
              style={[
                styles.bigBox, 
                { 
                  backgroundColor: isWinner ? colors.successMuted : colors.surface, 
                  borderColor: isWinner ? colors.success : 'transparent',
                  borderWidth: isWinner ? 1 : 0,
                }
              ]}
            >
              {isWinner && <View style={[styles.winnerIndicator, { backgroundColor: colors.success }]} />}
              <Text style={[styles.bigBoxText, { color: isWinner ? colors.success : colors.text }]} adjustsFontSizeToFit numberOfLines={5}>
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
        <Animated.View 
          entering={FadeInDown.springify().damping(20)}
          style={styles.overviewContainer}
        >
          <Card borderRadius={20} style={[styles.heroCard, { backgroundColor: colors.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }]}>
            <View style={styles.heroHeader}>
              <View style={[styles.aiBadge, { backgroundColor: 'rgba(35, 131, 226, 0.15)' }]}>
                <Feather name="zap" size={14} color={colors.primary} />
                <Text style={[styles.heroLabel, { color: colors.primary }]}>AI VERDICT</Text>
              </View>
            </View>
            <Text style={[styles.heroText, { color: colors.text }]}>{aiSummary}</Text>
          </Card>
          
          {keyDifferences.length > 0 && (
            <Animated.View entering={FadeInUp.delay(150).springify().damping(20)} style={{ marginTop: 24 }}>
              <Text style={[styles.overviewSectionTitle, { color: colors.textTertiary }]}>KEY DIFFERENCES</Text>
              <View style={[styles.differencesCard, { backgroundColor: colors.surface }]}>
                {keyDifferences.map((diff, i) => (
                  <View key={i} style={[styles.diffRow, i === keyDifferences.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={[styles.diffLabel, { color: colors.textSecondary }]}>{diff.label}</Text>
                    <View style={styles.diffValuesRow}>
                      <Text style={[styles.diffValueLeft, { color: products[0].retailerColor || colors.primary }]} numberOfLines={2}>{diff.values[0]}</Text>
                      <View style={[styles.vsBadge, { backgroundColor: colors.background }]}>
                        <Text style={[styles.vsText, { color: colors.textTertiary }]}>VS</Text>
                      </View>
                      <Text style={[styles.diffValueRight, { color: products[1]?.retailerColor || colors.error }]} numberOfLines={2}>{diff.values[1]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      );
    }

    const rows = categoriesMap.get(selectedCategory!) || [];
    return rows.map((row, idx) => <SpecResultBoxes key={row.label + idx} specRow={row} colors={colors} index={idx} />);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={12} style={styles.backIcon}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comparison</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* FIXED HEADER PORTION */}
      <View style={styles.fixedHeaderContainer}>
        {/* Top 2 Boxes */}
        <View style={styles.productRow}>
          <ProductHeaderBox product={products[0]} index={0} colors={colors} />
          {products[1] && <ProductHeaderBox product={products[1]} index={1} colors={colors} />}
        </View>

        {/* Small Soft Boxes (Categories) */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {categoryList.map((cat, idx) => (
            <CategoryBox 
              key={cat} 
              category={cat} 
              isSelected={selectedCategory === cat} 
              onSelect={() => setSelectedCategory(cat)} 
              colors={colors} 
              index={idx}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.5 },
  backIcon: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  
  fixedHeaderContainer: { paddingBottom: 16, paddingTop: 4 },
  productRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, gap: 16, marginBottom: 20 },
  productHeaderBox: { flex: 1, borderRadius: 20, padding: 16, alignItems: "center", justifyContent: "center", minHeight: 110, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  productImagePlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  productHeaderText: { color: "#FFF", fontSize: 14, fontWeight: "800", textAlign: "center", letterSpacing: -0.2 },

  categoryScroll: { flexGrow: 0 },
  categoryScrollContent: { paddingHorizontal: 20, gap: 12 },
  categoryBox: { width: 76, height: 86, borderRadius: 20, alignItems: "center", justifyContent: "center", padding: 8 },
  categoryIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryBoxText: { fontSize: 11, fontWeight: "700", textAlign: "center", letterSpacing: -0.2 },

  scrollBody: { padding: 20, paddingBottom: 80 },

  overviewContainer: { flex: 1 },
  heroCard: { padding: 24, marginBottom: 12 },
  heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  heroLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  heroText: { fontSize: 16, lineHeight: 26, fontWeight: "500", letterSpacing: -0.2 },
  
  overviewSectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 1.2, marginBottom: 16, marginLeft: 4 },
  differencesCard: { borderRadius: 20, padding: 20 },
  diffRow: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  diffLabel: { fontSize: 12, fontWeight: "700", marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  diffValuesRow: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', gap: 12 },
  diffValueLeft: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  diffValueRight: { flex: 1, fontSize: 15, fontWeight: "600", textAlign: "right", lineHeight: 22 },
  vsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  vsText: { fontSize: 10, fontWeight: '800' },

  specResultContainer: { marginBottom: 32 },
  specResultLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16, marginLeft: 8 },
  specResultBoxesRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  
  bigBox: { flex: 1, borderRadius: 24, padding: 20, minHeight: 120, justifyContent: "center", position: "relative", overflow: "hidden" },
  winnerIndicator: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6 },
  bigBoxText: { fontSize: 15, fontWeight: "600", textAlign: "center", lineHeight: 22, letterSpacing: -0.2 },

  emptyRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, marginBottom: 20, fontWeight: '500' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(35, 131, 226, 0.1)' },
  backBtnText: { fontSize: 15, fontWeight: "700" },
});
