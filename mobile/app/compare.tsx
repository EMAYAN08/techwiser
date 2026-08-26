import React, { useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "../components/ui/Card";
import { useComparisonStore } from "../store/useComparisonStore";
import { ProductCard } from "../components/comparison/ProductCard";
import { useThemeColors } from "../constants/Colors";

function SpecRow({
  label, values, winnerIndex, isDraw, index, colors
}: {
  label: string; values: string[]; winnerIndex: number; isDraw: boolean; index: number; colors: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 350, delay: index * 40 + 200, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.specRow, { opacity: fadeAnim }]}>
      <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.specValues}>
        {values.map((val, i) => {
          const isWinner = !isDraw && i === winnerIndex;
          const isLoser = !isDraw && i !== winnerIndex;
          return (
            <View
              key={i}
              style={[
                styles.specValueCell,
                isWinner && { backgroundColor: colors.successMuted },
              ]}
            >
              {isWinner && <View style={[styles.winnerBorder, { backgroundColor: colors.success }]} />}
              <Text
                style={[
                  styles.specValue,
                  { color: colors.text },
                  isWinner && [styles.specValueWinText, { color: colors.success }],
                  isLoser && { color: colors.textTertiary },
                ]}
                numberOfLines={2}
              >
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

  const categories = new Map<string, { label: string; values: string[]; winnerIndex: number; isDraw: boolean }[]>();
  const specCount = products[0]?.specs.length ?? 0;
  for (let si = 0; si < specCount; si++) {
    const spec0 = products[0].specs[si];
    if (!spec0) continue;
    const cat = spec0.category;
    const values = products.map((p) => p.specs[si]?.value ?? "—");
    const isDraw = !!spec0.isDraw;
    const winnerIndex = products.findIndex((p) => p.specs[si]?.isWinner);
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push({ label: spec0.label, values, winnerIndex: winnerIndex < 0 ? 0 : winnerIndex, isDraw });
  }

  let rowIndex = 0;

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

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.productRow}>
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </View>

        <Card borderRadius={10} style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.ai }]}>✦ AI Summary</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{aiSummary}</Text>
        </Card>

        {keyDifferences.length > 0 && (
          <View style={styles.section}>
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
                          <Text 
                            style={{ fontSize: 11, color: products[idx]?.retailerColor || colors.textSecondary, marginBottom: 4, fontWeight: "600" }} 
                            numberOfLines={1}
                          >
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
          </View>
        )}

        {Array.from(categories.entries()).map(([cat, rows]) => (
          <View key={cat} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{cat.toUpperCase()}</Text>
            <Card borderRadius={10} style={styles.specCard}>
              {rows.map((row, i) => (
                <React.Fragment key={row.label}>
                  <SpecRow {...row} index={rowIndex++} colors={colors} />
                  {i < rows.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  backIcon: { padding: 6 },
  scroll: { padding: 16 },

  productRow: { flexDirection: "row", marginBottom: 16 },
  summaryCard: { padding: 16, marginBottom: 16 },
  summaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  summaryText: { fontSize: 14, lineHeight: 22 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 1.2, marginBottom: 8 },
  specCard: { overflow: "hidden" },

  specRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14 },
  specLabel: { flex: 1, fontSize: 13 },
  specValues: { flex: 2, flexDirection: "row" },
  specValueCell: { flex: 1, paddingHorizontal: 4, position: "relative" },
  winnerBorder: { position: "absolute", left: 0, top: 2, bottom: 2, width: 2, borderRadius: 1 },
  specValue: { fontSize: 13, paddingLeft: 6 },
  specValueWinText: { fontWeight: "600" },
  rowDivider: { height: 1, marginHorizontal: 14 },

  emptyRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, marginBottom: 20 },
  backBtn: { padding: 12 },
  backBtnText: { fontSize: 15 },
});