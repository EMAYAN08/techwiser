import React, { useMemo, useRef } from "react";
import { type } from "../../constants/Typography";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Image,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "../../utils/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useComparisonStore } from "../../store/useComparisonStore";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { NavCircle } from "../../components/ui/NavCircle";
import { useThemeColors, getRetailerColor } from "../../constants/Colors";
import { radii, space } from "../../constants/Layout";
import { exportProductToPDF } from "../../utils/exportPDF";

function normalizeTitle(title: string): string {
  const cleaned = title.replace(/5G|Unlocked|Smartphone|Dual SIM/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) return words.slice(0, 3).join(" ");
  return cleaned;
}

function PriceChip({ price }: { price: string }) {
  return (
    <View style={styles.priceChip}>
      <Text style={styles.priceChipText} numberOfLines={1}>
        {price}
      </Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { colors, isDark } = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recentComparisons, activeComparison, setUrls } = useComparisonStore();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const gutter = space.gutter;
  const topInset = Math.max(insets.top, 16);
  const navH = 44;
  const identityH = 78;
  const stickyH = topInset + 10 + navH + identityH;
  const hasImage = Boolean(product.imageUrl);
  const heroSize = Math.max(160, screenWidth - gutter * 2);
  const thumbSize = 68;
  const titleMorph = 36;
  const imageRange = hasImage ? heroSize : 56;
  const shortName = normalizeTitle(product.name);
  const showPrice = Boolean(product.price && product.price !== "N/A");
  const retColor = getRetailerColor(product.retailer, isDark);

  const fullTitleOpacity = scrollY.interpolate({
    inputRange: [0, titleMorph],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const shortTitleOpacity = scrollY.interpolate({
    inputRange: [0, titleMorph],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const brandOpacity = scrollY.interpolate({
    inputRange: [0, 24],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const brandHeight = scrollY.interpolate({
    inputRange: [0, 24],
    outputRange: [18, 0],
    extrapolate: "clamp",
  });

  const scale = thumbSize / heroSize;
  const x0 = gutter;
  const y0 = stickyH;
  const x1 = screenWidth - gutter - thumbSize;
  const y1 = topInset + 10 + navH + Math.max(0, (identityH - thumbSize) / 2);
  const c0x = x0 + heroSize / 2;
  const c0y = y0 + heroSize / 2;
  const c1x = x1 + thumbSize / 2;
  const c1y = y1 + thumbSize / 2;

  const imageTranslateX = scrollY.interpolate({
    inputRange: [titleMorph, titleMorph + imageRange],
    outputRange: [0, c1x - c0x],
    extrapolate: "clamp",
  });
  const imageTranslateY = scrollY.interpolate({
    inputRange: [titleMorph, titleMorph + imageRange],
    outputRange: [0, c1y - c0y],
    extrapolate: "clamp",
  });
  const imageScale = scrollY.interpolate({
    inputRange: [titleMorph, titleMorph + imageRange],
    outputRange: [1, scale],
    extrapolate: "clamp",
  });
  const imageRadius = scrollY.interpolate({
    inputRange: [titleMorph, titleMorph + imageRange],
    outputRange: [radii.card, 14],
    extrapolate: "clamp",
  });
  const identityPadRight = scrollY.interpolate({
    inputRange: [titleMorph + imageRange * 0.45, titleMorph + imageRange],
    outputRange: [0, thumbSize + 12],
    extrapolate: "clamp",
  });

  const specs = product.rawSpecs && product.rawSpecs.length > 0 ? product.rawSpecs : product.specs || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: product.name, headerBackTitle: "Back" }} />

      <View
        pointerEvents="box-none"
        style={[styles.sticky, { paddingTop: topInset, backgroundColor: colors.bg, zIndex: 20 }]}
      >
        <View style={styles.navRow}>
          <NavCircle onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={colors.ink} />
          </NavCircle>
          <NavCircle onPress={handleExport} accessibilityRole="button" accessibilityLabel="Export to PDF">
            <Feather name="share" size={18} color={colors.ink} />
          </NavCircle>
        </View>

        <Animated.View style={[styles.identity, { paddingRight: hasImage ? identityPadRight : 0 }]}>
          {product.brand ? (
            <Animated.Text style={[styles.brand, { color: colors.stone, opacity: brandOpacity, height: brandHeight }]} numberOfLines={1}>
              {product.brand}
            </Animated.Text>
          ) : null}

          <View style={styles.titleStack}>
            <Animated.Text
              style={[styles.productTitle, { color: colors.ink, opacity: fullTitleOpacity }]}
              numberOfLines={2}
            >
              {product.name}
            </Animated.Text>
            <Animated.Text
              style={[styles.productTitle, styles.titleOverlay, { color: colors.ink, opacity: shortTitleOpacity }]}
              numberOfLines={1}
            >
              {shortName}
            </Animated.Text>
          </View>

          <View style={styles.priceRow}>
            {showPrice ? <PriceChip price={product.price!} /> : null}
            <View
              style={[
                styles.retailerTag,
                {
                  backgroundColor: `${retColor}26`,
                  borderColor: `${retColor}4D`,
                },
              ]}
            >
              <Text style={[styles.retailerTagText, { color: retColor }]} numberOfLines={1}>
                {product.retailer}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {hasImage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heroFloat,
            {
              top: y0,
              left: x0,
              width: heroSize,
              height: heroSize,
              backgroundColor: colors.fog,
              borderRadius: imageRadius,
              transform: [
                { translateX: imageTranslateX },
                { translateY: imageTranslateY },
                { scale: imageScale },
              ],
            },
          ]}
        >
          <Image source={{ uri: product.imageUrl! }} style={styles.heroImage} resizeMode="contain" />
        </Animated.View>
      ) : null}

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: stickyH + (hasImage ? heroSize + 16 : 12),
          paddingHorizontal: gutter,
          paddingBottom: 100 + insets.bottom,
        }}
        style={{ flex: 1, zIndex: 1 }}
      >
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
          {specs.length === 0 ? (
            <Text style={[styles.bodyText, { color: colors.body }]}>No specifications were extracted for this product.</Text>
          ) : (
            specs.map((spec: any, index: number, arr: any[]) => (
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
            ))
          )}
        </View>
      </Animated.ScrollView>

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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.gutter },
  errorText: { ...type.body, marginTop: 16, marginBottom: 24 },
  sticky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.gutter,
    paddingBottom: 8,
  },
  navRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  identity: {
    minHeight: 78,
    justifyContent: "center",
  },
  brand: { ...type.eyebrow, marginBottom: 4, height: 16 },
  titleStack: { minHeight: 40, marginBottom: 8, justifyContent: "center" },
  productTitle: {
    ...type.price,
    fontSize: 16,
    lineHeight: 20,
  },
  titleOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  priceChip: {
    backgroundColor: "#FEF08A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    transform: [{ rotate: "-1deg" }],
  },
  priceChipText: {
    ...type.caption,
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1C1C",
  },
  retailerTag: {
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 140,
  },
  retailerTagText: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "capitalize",
  },
  heroFloat: {
    position: "absolute",
    zIndex: 15,
    overflow: "hidden",
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
  listItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 8, paddingRight: 8 },
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
    zIndex: 30,
  },
});
