import React, { useMemo } from "react";
import { type } from "../../constants/Typography";
import { View, Text, ScrollView, StyleSheet, Linking, Image } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "../../utils/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useComparisonStore } from "../../store/useComparisonStore";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { NavCircle } from "../../components/ui/NavCircle";
import { RetailerPill } from "../../components/ui/RetailerPill";
import { useThemeColors } from "../../constants/Colors";
import { radii, space } from "../../constants/Layout";
import { exportProductToPDF } from "../../utils/exportPDF";

export default function ProductDetailScreen() {
  const { colors, isDark } = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recentComparisons, activeComparison, setUrls } = useComparisonStore();
  const insets = useSafeAreaInsets();

  const product = useMemo(() => {
    if (activeComparison) {
      const fromActive = activeComparison.products.find((p) => p.id === id);
      if (fromActive) return fromActive;
    }
    for (const comp of recentComparisons) {
      if (comp.result) {
        const found = comp.result.products.find((p) => p.id === id);
        if (found) return found;
      }
    }
    return null;
  }, [id, recentComparisons, activeComparison]);

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "Not Found" }} />
        <Feather name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.body }]}>Product details not found.</Text>
        <Button title="Go Back" variant="primary" onPress={() => router.back()} />
      </View>
    );
  }

  const handleCompare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUrls([product.url, ""]);
    router.navigate("/");
  };

  const handleExport = async () => {
    await exportProductToPDF(product, isDark);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: product.name, headerBackTitle: "Back" }} />
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bg,
            borderBottomColor: colors.line,
            paddingTop: Math.max(insets.top, 24),
          },
        ]}
      >
        <View style={styles.headerTop}>
          <NavCircle onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={colors.ink} />
          </NavCircle>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <RetailerPill retailer={product.retailer} />
            <NavCircle onPress={handleExport} accessibilityRole="button" accessibilityLabel="Export to PDF">
              <Feather name="share" size={18} color={colors.ink} />
            </NavCircle>
          </View>
        </View>
        <Text style={[styles.brand, { color: colors.stone }]}>{product.brand}</Text>
        <Text style={[styles.productName, { color: colors.ink }]}>{product.name}</Text>
        {product.price && product.price !== "N/A" ? (
          <Text style={[styles.price, { color: colors.ink }]}>{product.price}</Text>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {product.imageUrl ? (
          <View style={[styles.heroWell, { backgroundColor: colors.fog }]}>
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="contain" />
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.aiHeader}>
            <Feather name="zap" size={16} color={colors.spotify} />
            <Text style={[styles.aiTitle, { color: colors.ink }]}>AI summary</Text>
          </View>
          <Text style={[styles.aiSummary, { color: colors.body }]}>
            {product.aiSummary?.trim() ||
              `${product.name} is listed in this comparison. Use the spec sheet below to see what it is best suited for.`}
          </Text>
          {product.badges && product.badges.length > 0 ? (
            <View style={styles.badgesRow}>
              {product.badges.filter(Boolean).map((badge, i) => (
                <Chip key={`${badge}-${i}`} label={badge} variant="tag" />
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.sectionHeader}>
            <Feather name="users" size={18} color={colors.ink} />
            <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 0, marginLeft: 8 }]}>
              Real user reviews
            </Text>
          </View>
          {product.userInsights?.trim() ? (
            <Text style={[styles.bodyText, { color: colors.body, marginBottom: 14 }]}>{product.userInsights}</Text>
          ) : null}
          {(product.userPros && product.userPros.length > 0) || (product.userCons && product.userCons.length > 0) ? (
            <View style={styles.reviewCols}>
              {product.userPros && product.userPros.length > 0 ? (
                <View style={styles.reviewBlock}>
                  <Text style={[styles.reviewHeading, { color: colors.spotify }]}>Pros</Text>
                  {product.userPros.map((item, i) => (
                    <View key={`pro-${i}`} style={styles.listItem}>
                      <Feather name="check" size={14} color={colors.spotify} style={{ marginTop: 3 }} />
                      <Text style={[styles.bodyText, { color: colors.body, flex: 1 }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {product.userCons && product.userCons.length > 0 ? (
                <View style={styles.reviewBlock}>
                  <Text style={[styles.reviewHeading, { color: colors.error }]}>Cons</Text>
                  {product.userCons.map((item, i) => (
                    <View key={`con-${i}`} style={styles.listItem}>
                      <Feather name="minus" size={14} color={colors.error} style={{ marginTop: 3 }} />
                      <Text style={[styles.bodyText, { color: colors.body, flex: 1 }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : !product.userInsights?.trim() ? (
            <Text style={[styles.bodyText, { color: colors.body }]}>
              No reliable buyer consensus was available for this model yet. Check the retailer listing for the latest reviews.
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Specifications</Text>
          {(product.rawSpecs && product.rawSpecs.length > 0 ? product.rawSpecs : product.specs || []).length === 0 ? (
            <Text style={[styles.bodyText, { color: colors.body }]}>No specifications were extracted for this product.</Text>
          ) : (
            (product.rawSpecs && product.rawSpecs.length > 0 ? product.rawSpecs : product.specs || []).map(
              (spec: any, index: number, arr: any[]) => (
                <View
                  key={`${spec.label}-${index}`}
                  style={[
                    styles.specRow,
                    { borderBottomColor: colors.line },
                    index === arr.length - 1 && styles.noBorder,
                  ]}
                >
                  <Text style={[styles.specLabel, { color: colors.stone }]}>{spec.label}</Text>
                  <Text style={[styles.specValue, { color: colors.ink }]}>{spec.value || "—"}</Text>
                </View>
              )
            )
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.bg,
            borderTopColor: colors.line,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Button title="View Product" variant="ghost" onPress={() => Linking.openURL(product.url)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Compare" variant="primary" onPress={handleCompare} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, zIndex: 50 },
  content: { padding: space.gutter, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.gutter },
  errorText: { ...type.body, marginTop: 16, marginBottom: 24 },
  header: { paddingHorizontal: space.gutter, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  brand: { ...type.eyebrow, marginBottom: 6 },
  productName: { ...type.productHero, marginBottom: 8 },
  price: { ...type.priceHero },
  heroWell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radii.card,
    overflow: "hidden",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: { width: "100%", height: "100%" },
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 16,
  },
  aiHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  aiTitle: { ...type.productName, fontSize: 16 },
  aiSummary: { ...type.body, marginBottom: 16 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTitle: { ...type.productName, fontSize: 18, marginBottom: 16 },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  noBorder: { borderBottomWidth: 0 },
  specLabel: { ...type.body, fontSize: 14, flex: 1, paddingRight: 16 },
  specValue: { ...type.specValue, fontSize: 14, flex: 1, textAlign: "right" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  bodyText: { ...type.body },
  listContainer: { marginTop: 4 },
  listItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 8, paddingRight: 8 },
  bullet: { width: 4, height: 4, borderRadius: 2, marginTop: 9, marginRight: 8 },
  reviewCols: { gap: 16 },
  reviewBlock: { gap: 6 },
  reviewHeading: { ...type.eyebrow, marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: space.gutter,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
