import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  AccessibilityInfo,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors, getRetailerColor } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { getCategoryIcon } from "./CategoryIcon";
import { normalizeTitle } from "./utils";
import type { Product } from "../../store/useComparisonStore";

type Palette = ReturnType<typeof useThemeColors>["colors"];

interface DetailedCompareHeaderProps {
  products: Product[];
  onBack: () => void;
}

const TILE_WIDTH = 200;
const TILE_GAP = 10;

// ---------------------------------------------------------------------------
// Product tile — flat, no decorative borders
// ---------------------------------------------------------------------------

interface ProductTileProps {
  product: Product;
  colors: Palette;
  isPagerItem: boolean;
}

function ProductTile({ product, colors, isPagerItem }: ProductTileProps) {
  const Icon = getCategoryIcon(product.name);
  const retailer = product.retailer ? product.retailer.toUpperCase() : "";

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: colors.surface, width: isPagerItem ? TILE_WIDTH : undefined },
      ]}
    >
      <View
        style={[
          styles.tileImage,
          { backgroundColor: colors.surfaceHighlight },
        ]}
      >
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.tileImageReal}
            resizeMode="contain"
          />
        ) : (
          <Icon size={22} color={colors.textSecondary} strokeWidth={1.75} />
        )}
      </View>

      <Text
        style={[styles.tileName, { color: colors.text }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {normalizeTitle(product.name)}
      </Text>

      {retailer.length > 0 && (
        <View style={styles.tileRetailerRow}>
          <View
            style={[
              styles.tileDot,
              { backgroundColor: getRetailerColor(product.retailer) || colors.textTertiary },
            ]}
          />
          <Text
            style={[styles.tileRetailer, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {retailer}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pager dots
// ---------------------------------------------------------------------------

interface PagerDotsProps {
  count: number;
  activeIndex: number;
  colors: Palette;
}

function PagerDots({ count, activeIndex, colors }: PagerDotsProps) {
  if (count <= 1) return null;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                i === activeIndex ? colors.text : colors.textTertiary,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function DetailedCompareHeader({
  products,
  onBack,
}: DetailedCompareHeaderProps) {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const [pagerIndex, setPagerIndex] = useState(0);

  // Stagger mount animation for the product tiles.
  const staggerAnims = useRef(
    products.map(() => new Animated.Value(0))
  ).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      if (enabled) {
        staggerAnims.forEach((a) => a.setValue(1));
        return;
      }
      Animated.stagger(
        70,
        staggerAnims.map((a) =>
          Animated.timing(a, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          })
        )
      ).start();
    });
    return () => {
      cancelled = true;
    };
  }, [staggerAnims]);

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const usePager = products.length >= 3;
  const renderPagerItem = ({ item }: ListRenderItemInfo<Product>) => (
    <ProductTile product={item} colors={colors} isPagerItem />
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 4,
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          Detailed comparison
        </Text>
        <View style={styles.titleSpacer} />
      </View>

      {usePager ? (
        <View>
          <FlatList
            data={products}
            keyExtractor={(p) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TILE_WIDTH + TILE_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.pagerContent}
            renderItem={renderPagerItem}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const next = Math.max(
                0,
                Math.min(
                  products.length - 1,
                  Math.round(x / (TILE_WIDTH + TILE_GAP))
                )
              );
              if (next !== pagerIndex) setPagerIndex(next);
            }}
          />
          <PagerDots
            count={products.length}
            activeIndex={pagerIndex}
            colors={colors}
          />
        </View>
      ) : (
        <View style={styles.splitRow}>
          {products.slice(0, 2).map((p, i) => (
            <Animated.View
              key={p.id}
              style={[
                styles.splitTile,
                {
                  opacity: staggerAnims[i] ?? 1,
                  transform: [
                    {
                      translateY:
                        staggerAnims[i]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }) ?? 0,
                    },
                  ],
                },
              ]}
            >
              <ProductTile product={p} colors={colors} isPagerItem={false} />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.headline,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    flex: 1,
    textAlign: "center",
  },
  titleSpacer: {
    width: 40,
  },

  // Two-product row
  splitRow: {
    flexDirection: "row",
    gap: 10,
  },
  splitTile: {
    flex: 1,
  },

  // 3+ product pager
  pagerContent: {
    gap: TILE_GAP,
    paddingRight: TILE_GAP,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  // Tile (shared)
  tile: {
    borderRadius: 14,
    padding: 12,
  },
  tileImage: {
    width: "100%",
    aspectRatio: 2.4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tileImageReal: {
    width: "70%",
    height: "70%",
  },
  tileName: {
    ...Typography.headline,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  tileRetailerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 5,
  },
  tileDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  tileRetailer: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
