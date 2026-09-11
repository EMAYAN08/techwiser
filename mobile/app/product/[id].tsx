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
import { useThemeColors } from "../../constants/Colors";
import { radii, space } from "../../constants/Layout";
import { exportProductToPDF } from "../../utils/exportPDF";
import { GlassPanel } from "../../components/ui/GlassPanel";
import { RetailerSticker } from "../../components/ui/RetailerSticker";

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
  const hasImage = Boolean(product.imageUrl);
  const heroSize = Math.max(200, screenWidth - gutter * 2);
  const thumbSize = 56;
  const titleMorph = 28;
  const imageRange = hasImage ? heroSize * 0.72 : 48;
  const shortName = normalizeTitle(product.name);
  const showPrice = Boolean(product.price && product.price !== "N/A");

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
    inputRange: [0, 18],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const brandHeight = scrollY.interpolate({
    inputRange: [0, 18],
    outputRange: [16, 0],
    extrapolate: "clamp",
  });
  const titleBlockHeight = scrollY.interpolate({
    inputRange: [0, titleMorph],
    outputRange: [40, 20],
    extrapolate: "clamp",
  });
  const titleGap = scrollY.interpolate({
    inputRange: [0, titleMorph],
    outputRange: [4, 2],
    extrapolate: "clamp",
  });
  const identityPadRight = scrollY.interpolate({
    inputRange: [titleMorph, titleMorph + imageRange * 0.55],
    outputRange: [0, thumbSize + 10],
    extrapolate: "clamp",
  });
  const dockedOpacity = scrollY.interpolate({
    inputRange: [titleMorph + imageRange * 0.35, titleMorph + imageRange * 0.75],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const dockedScale = scrollY.interpolate({
    inputRange: [titleMorph + imageRange * 0.35, titleMorph + imageRange * 0.75],
    outputRange: [0.86, 1],
    extrapolate: "clamp",
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [8, titleMorph + imageRange * 0.55],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const heroScale = scrollY.interpolate({
    inputRange: [0, titleMorph + imageRange],
    outputRange: [1, 0.72],
    extrapolate: "clamp",
  });
  const heroTranslateX = scrollY.interpolate({
    inputRange: [0, titleMorph + imageRange],
    outputRange: [0, 18],
    extrapolate: "clamp",
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, titleMorph + imageRange],
    outputRange: [0, -24],
    extrapolate: "clamp",
  });

  const specs = product.rawSpecs && product.rawSpecs.length > 0 ? product.rawSpecs : product.specs || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: product.name, headerBackTitle: "Back" }} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.bg }]}>
        <View style={styles.navRow}>
          <NavCircle onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={colors.ink} />
          </NavCircle>
          <NavCircle onPress={handleExport} accessibilityRole="button" accessibilityLabel="Export to PDF">
            <Feather name="share" size={18} color={colors.ink} />
          </NavCircle>
        </View>

        <View style={styles.identityRow}>
          <Animated.View style={[styles.identity, { paddingRight: hasImage ? identityPadRight : 0 }]}>
            {product.brand ? (
              <Animated.Text
                style={[styles.brand, { color: colors.stone, opacity: brandOpacity, height: brandHeight }]}
                numberOfLines={1}
              >
                {product.brand}
              </Animated.Text>
            ) : null}

            <Animated.View style={[styles.titleStack, { height: titleBlockHeight, marginBottom: titleGap }]}>
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
            </Animated.View>

            <View style={styles.priceRow}>
              {showPrice ? <PriceChip price={product.price!} /> : null}
              <RetailerSticker retailer={product.retailer} />
            </View>
          </Animated.View>

          {hasImage ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.dockedThumb,
                {
                  width: thumbSize,
                  height: thumbSize,
                  backgroundColor: colors.fog,
                  opacity: dockedOpacity,
                  transform: [{ scale: dockedScale }],
                  borderColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(90,90,88,0.28)",
                },
              ]}
            >
              <Image source={{ uri: product.imageUrl! }} style={styles.heroImage} resizeMode="contain" />
            </Animated.View>
          ) : null}
        </View>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: 12,
          paddingBottom: 124 + insets.bottom,
        }}
        style={styles.scroll}
      >
        {hasImage ? (
          <Animated.View
            style={[
              styles.heroWell,
              {
                height: heroSize,
                backgroundColor: colors.fog,
                opacity: heroOpacity,
                transform: [{ translateX: heroTranslateX }, { translateY: heroTranslateY }, { scale: heroScale }],
              },
            ]}
          >
            <Image source={{ uri: product.imageUrl! }} style={styles.heroImage} resizeMode="contain" />
          </Animated.View>
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

      <View style={[styles.footerWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <GlassPanel style={styles.footerGlass} contentStyle={styles.footerInner} radius={0}>
          <View style={{ flex: 1 }}>
            <Button title="View Product" variant="ghost" onPress={() => Linking.openURL(product.url)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Compare" variant="primary" onPress={handleCompare} />
          </View>
        </GlassPanel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.gutter },
  errorText: { ...type.body, marginTop: 16, marginBottom: 24 },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
    zIndex: 5,
  },
  navRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  identityRow: {
    position: "relative",
    minHeight: 64,
    justifyContent: "center",
  },
  identity: {
    justifyContent: "center",
  },
  brand: { ...type.eyebrow, marginBottom: 2, overflow: "hidden" },
  titleStack: { justifyContent: "flex-end", overflow: "hidden" },
  productTitle: {
    ...type.price,
    fontSize: 16,
    lineHeight: 20,
  },
  titleOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 26,
  },
  priceChip: {
    backgroundColor: "#FEF08A",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    transform: [{ rotate: "-1deg" }],
  },
  priceChipText: {
    ...type.caption,
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1C1C",
  },
  dockedThumb: {
    position: "absolute",
    right: 0,
    top: 4,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  heroWell: {
    width: "100%",
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
  listItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 8, paddingRight: 8 },
  reviewCols: { gap: 16 },
  reviewBlock: { gap: 6 },
  reviewHeading: { ...type.eyebrow, marginBottom: 4 },
  footerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  footerGlass: {
    minHeight: 72,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: space.gutter,
    paddingTop: 12,
    paddingBottom: 6,
  },
});
