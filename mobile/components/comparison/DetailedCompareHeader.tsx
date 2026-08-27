import React, { useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { ArrowLeft, Star } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Card } from "../ui/Card";
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { getCategoryIcon } from "./CategoryIcon";
import type { Product } from "../../store/useComparisonStore";

type Palette = ReturnType<typeof useThemeColors>["colors"];

interface DetailedCompareHeaderProps {
  products: Product[];
  onBack: () => void;
}

const TILE_WIDTH = 240;
const TILE_GAP = 12;

function normalizeTitle(title: string): string {
  const cleaned = title.replace(/5G|Unlocked|Smartphone|Dual SIM/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) return words.slice(0, 3).join(" ");
  return cleaned;
}

interface ProductTileProps {
  product: Product;
  colors: Palette;
}

function ProductTile({ product, colors }: ProductTileProps) {
  const Icon = getCategoryIcon(product.name);
  const retailer = product.retailer ? product.retailer.toUpperCase() : "";
  const priceLabel = product.price ?? "";
  const metaLine = priceLabel ? `${retailer} · ${priceLabel}` : retailer;

  return (
    <View style={styles.tileOuter}>
      <View
        style={[
          styles.tileColorBar,
          { backgroundColor: product.retailerColor || colors.primary },
        ]}
      />
      <View style={styles.tileBody}>
        <View
          style={[
            styles.tileImage,
            { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
          ]}
        >
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.tileImageReal}
              resizeMode="contain"
            />
          ) : (
            <Icon size={28} color={colors.textSecondary} strokeWidth={2} />
          )}
        </View>
        <Text
          style={[styles.tileName, { color: colors.text }]}
          numberOfLines={2}
        >
          {normalizeTitle(product.name)}
        </Text>
        {metaLine.length > 0 && (
          <Text
            style={[styles.tileMeta, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {metaLine}
          </Text>
        )}
      </View>
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
              backgroundColor:
                i === activeIndex ? colors.primary : colors.textTertiary,
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
  const [pagerIndex, setPagerIndex] = useState(0);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const usePager = products.length >= 3;

  const renderPagerItem = ({ item }: ListRenderItemInfo<Product>) => (
    <ProductTile product={item} colors={colors} />
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={[
            styles.backBtn,
            { backgroundColor: "rgba(150,150,150,0.1)" },
          ]}
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          Detailed Comparison
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
                Math.min(products.length - 1, Math.round(x / (TILE_WIDTH + TILE_GAP))),
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
          {products.slice(0, 2).map((p) => (
            <View key={p.id} style={styles.splitTile}>
              <ProductTile product={p} colors={colors} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.headline,
    flex: 1,
    textAlign: "center",
  },
  titleSpacer: {
    width: 40,
  },
  splitRow: {
    flexDirection: "row",
    gap: 12,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tileOuter: {
    width: TILE_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.15)",
    backgroundColor: "rgba(20,20,20,1)",
    overflow: "hidden",
  },
  tileColorBar: {
    height: 3,
    width: "100%",
  },
  tileBody: {
    padding: 12,
    gap: 6,
  },
  tileImage: {
    width: 56,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tileImageReal: {
    width: 56,
    height: 40,
    borderRadius: 8,
  },
  tileName: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  tileMeta: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
