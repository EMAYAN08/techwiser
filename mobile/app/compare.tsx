import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Animated, LayoutAnimation, UIManager, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "../components/ui/Card";
import { useComparisonStore } from "../store/useComparisonStore";
import { ProductCard } from "../components/comparison/ProductCard";
import { useThemeColors } from "../constants/Colors";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpecVisualBar({ value1, value2, color1, color2, isWin1, isWin2 }: { value1: number; value2: number; color1: string; color2: string; isWin1: boolean; isWin2: boolean }) {
  const { colors } = useThemeColors();
  const max = Math.max(value1, value2);
  const w1 = max > 0 ? (value1 / max) * 100 : 0;
  const w2 = max > 0 ? (value2 / max) * 100 : 0;
  
  const widthAnim1 = useRef(new Animated.Value(0)).current;
  const widthAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim1, { toValue: w1, useNativeDriver: false, tension: 50, friction: 7 }).start();
    Animated.spring(widthAnim2, { toValue: w2, useNativeDriver: false, tension: 50, friction: 7 }).start();
  }, [w1, w2]);

  return (
    <View style={styles.barContainer}>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.barFill, { 
          width: widthAnim1.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), 
          backgroundColor: isWin1 ? colors.success : color1, 
          opacity: isWin1 ? 1 : 0.6 
        }]} />
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.border, marginTop: 4 }]}>
        <Animated.View style={[styles.barFill, { 
          width: widthAnim2.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), 
          backgroundColor: isWin2 ? colors.success : color2, 
          opacity: isWin2 ? 1 : 0.6 
        }]} />
      </View>
    </View>
  );
}

function ExpandableCategory({ cat, rows, colors, products, index }: { cat: string; rows: any[]; colors: any; products: any[]; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }).start();
  }, []);

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setExpanded(!expanded);
  };

  return (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <AnimatedPressable
        onPress={toggleExpand}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        style={[styles.categoryHeader, { transform: [{ scale: scaleAnim }] }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>{cat.toUpperCase()}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textTertiary} />
      </AnimatedPressable>

      {expanded && (
        <Card borderRadius={10} style={styles.specCard}>
          {rows.map((row: any, i: number) => {
            const hasNumeric = typeof row.numericValue1 === 'number' && typeof row.numericValue2 === 'number';
            
            return (
              <React.Fragment key={row.label}>
                <View style={styles.specRow}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                  
                  <View style={styles.specValues}>
                    {row.values.map((val: string, pIdx: number) => {
                      const isWinner = !row.isDraw && pIdx === row.winnerIndex;
                      const isLoser = !row.isDraw && pIdx !== row.winnerIndex;
                      return (
                        <View key={pIdx} style={[styles.specValueCell, isWinner && { backgroundColor: colors.successMuted }]}>
                          {isWinner && <View style={[styles.winnerBorder, { backgroundColor: colors.success }]} />}
                          <Text style={[
                            styles.specValue, 
                            { color: colors.text },
                            isWinner && [styles.specValueWinText, { color: colors.success }],
                            isLoser && { color: colors.textTertiary }
                          ]} numberOfLines={2}>
                            {val}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                {hasNumeric && (
                  <View style={styles.barRow}>
                    <SpecVisualBar 
                      value1={row.numericValue1} 
                      value2={row.numericValue2} 
                      color1={products[0]?.retailerColor || colors.primary}
                      color2={products[1]?.retailerColor || colors.primary}
                      isWin1={!row.isDraw && row.winnerIndex === 0}
                      isWin2={!row.isDraw && row.winnerIndex === 1}
                    />
                  </View>
                )}
                {i < rows.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            );
          })}
        </Card>
      )}
    </Animated.View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const { activeComparison } = useComparisonStore();
  const { colors } = useThemeColors();

  const heroFadeAnim = useRef(new Animated.Value(0)).current;
  const diffFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroFadeAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }).start();
    Animated.timing(diffFadeAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }).start();
  }, []);

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
  const categories = new Map<string, any[]>();
  const specCount = products[0]?.specs.length ?? 0;
  for (let si = 0; si < specCount; si++) {
    const spec0 = products[0].specs[si];
    if (!spec0) continue;
    const cat = spec0.category;
    const values = products.map((p) => p.specs[si]?.value ?? "-");
    const isDraw = !!spec0.isDraw;
    const winnerIndex = products.findIndex((p) => p.specs[si]?.isWinner);
    
    // Check if numeric comparison is possible for the first two products
    const n1 = products[0].specs[si]?.numericValue;
    const n2 = products[1]?.specs[si]?.numericValue;
    
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push({ 
      label: spec0.label, 
      values, 
      winnerIndex: winnerIndex < 0 ? 0 : winnerIndex, 
      isDraw,
      numericValue1: n1,
      numericValue2: n2
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          hitSlop={12}
          style={styles.backIcon}
        >
          <Feather name="arrow-left" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comparison</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        stickyHeaderIndices={[1]} 
      >
        <Animated.View style={{ opacity: heroFadeAnim, transform: [{ translateY: heroFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <Card borderRadius={12} style={[styles.heroCard, { borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.surface }]}>
            <View style={styles.heroHeader}>
              <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.heroLabel, { color: colors.primary }]}>AI VERDICT</Text>
            </View>
            <Text style={[styles.heroText, { color: colors.text }]}>{aiSummary}</Text>
          </Card>
        </Animated.View>

        <View style={[styles.stickyHeader, { backgroundColor: colors.background, paddingBottom: 16 }]}>
          <View style={styles.productRow}>
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </View>
        </View>

        {keyDifferences.length > 0 && (
          <Animated.View style={[styles.section, { opacity: diffFadeAnim, transform: [{ translateY: diffFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>KEY DIFFERENCES</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              snapToInterval={280 + 12}
              decelerationRate="fast"
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 }}
            >
              {keyDifferences.map((diff, i) => (
                <Card key={diff.label} borderRadius={12} style={{ width: 280, marginRight: i === keyDifferences.length - 1 ? 0 : 12, padding: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {diff.label}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    {diff.values.map((val, idx) => (
                      <React.Fragment key={idx}>
                        <View style={{ flex: 1, paddingRight: idx === 0 ? 12 : 0, paddingLeft: idx > 0 ? 12 : 0 }}>
                          <Text style={{ fontSize: 11, color: products[idx]?.retailerColor || colors.textSecondary, marginBottom: 4, fontWeight: "600" }} numberOfLines={1}>
                            {products[idx]?.name}
                          </Text>
                          <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "500", lineHeight: 20 }}>
                            {val}
                          </Text>
                        </View>
                        {idx < diff.values.length - 1 && <View style={{ width: 1, backgroundColor: colors.border }} />}
                      </React.Fragment>
                    ))}
                  </View>
                </Card>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {Array.from(categories.entries()).map(([cat, rows], idx) => (
          <ExpandableCategory key={cat} cat={cat} rows={rows} colors={colors} products={products} index={idx + 3} />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderWidth: 0, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  backIcon: { padding: 6 },
  scroll: { padding: 16 },

  stickyHeader: { zIndex: 10, paddingTop: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  productRow: { flexDirection: "row" },
  
  heroCard: { padding: 20, marginBottom: 24, shadowColor: "#2383E2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  heroLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, marginLeft: 6 },
  heroText: { fontSize: 15, lineHeight: 24, fontWeight: "500" },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 1.2, marginBottom: 12 },
  
  categoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4, paddingVertical: 4 },
  specCard: { overflow: "hidden" },

  specRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14 },
  specLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
  specValues: { flex: 2, flexDirection: "row" },
  specValueCell: { flex: 1, paddingHorizontal: 4, position: "relative", justifyContent: "center" },
  winnerBorder: { position: "absolute", left: 0, top: -12, bottom: -12, width: 2, borderRadius: 1 },
  specValue: { fontSize: 13, paddingLeft: 6 },
  specValueWinText: { fontWeight: "700" },
  rowDivider: { height: 1, marginHorizontal: 14 },

  barRow: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 0 },
  barContainer: { flex: 1 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden", width: "100%" },
  barFill: { height: "100%", borderRadius: 3 },

  emptyRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, marginBottom: 20 },
  backBtn: { padding: 12 },
  backBtnText: { fontSize: 15, fontWeight: "600" },
});
