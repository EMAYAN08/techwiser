import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  AccessibilityInfo,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";
import { getCategoryIcon } from "./CategoryIcon";
import { normalizeTitle } from "./utils";
import { NavCircle } from "../ui/NavCircle";
import { RetailerPill } from "../ui/RetailerPill";
import type { Product } from "../../store/useComparisonStore";

type Palette = ReturnType<typeof useThemeColors>["colors"];

interface DetailedCompareHeaderProps {
  products: Product[];
  onBack: () => void;
}

const TILE_WIDTH = 200;
const TILE_GAP = 10;

interface ProductTileProps {
  product: Product;
  colors: Palette;
  isPagerItem: boolean;
}

function ProductTile({ product, colors, isPagerItem }: ProductTileProps) {
  const Icon = getCategoryIcon(product.name);

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          width: isPagerItem ? TILE_WIDTH : undefined,
        },
      ]}
    >
      <View style={[styles.tileImage, { backgroundColor: colors.fog }]}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.tileImageReal}
            resizeMode="contain"
          />
        ) : (
          <Icon size={22} color={colors.stone} strokeWidth={1.75} />
        )}
      </View>

      <Text style={[styles.tileName, { color: colors.ink }]} numberOfLines={2} ellipsizeMode="tail">
        {normalizeTitle(product.name)}
      </Text>

      {product.price ? (
        <Text style={[styles.tilePrice, { color: colors.stone }]} numberOfLines={1}>
          {product.price}
        </Text>
      ) : null}

      {product.retailer ? <RetailerPill retailer={product.retailer} /> : null}
    </View>
  );
}

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
              backgroundColor: i === activeIndex ? colors.ink : colors.stone,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function DetailedCompareHeader({
  products,
  onBack,
}: DetailedCompareHeaderProps) {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const [pagerIndex, setPagerIndex] = useState(0);

  const staggerAnims = useRef(products.map(() => new Animated.Value(0))).current;
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
          backgroundColor: colors.bg,
          paddingTop: insets.top + 4,
        },
      ]}
    >
      <View style={styles.topBar}>
        <NavCircle onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2.25} />
        </NavCircle>
        <Text style={[styles.title, { color: colors.ink }]}>Comparison</Text>
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
                Math.min(products.length - 1, Math.round(x / (TILE_WIDTH + TILE_GAP)))
              );
              if (next !== pagerIndex) setPagerIndex(next);
            }}
          />
          <PagerDots count={products.length} activeIndex={pagerIndex} colors={colors} />
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
  title: {
    ...type.navTitle,
    flex: 1,
    textAlign: "center",
  },
  titleSpacer: {
    width: size.navCircle,
  },
  splitRow: {
    flexDirection: "row",
    gap: 10,
  },
  splitTile: {
    flex: 1,
  },
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
  tile: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  tileImage: {
    width: "100%",
    aspectRatio: 2.4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileImageReal: {
    width: "70%",
    height: "70%",
  },
  tileName: {
    ...type.productName,
    fontSize: 14,
    lineHeight: 18,
  },
  tilePrice: {
    ...type.caption,
    fontSize: 14,
  },
});
