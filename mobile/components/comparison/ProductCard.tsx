import React, { useEffect, useRef, memo } from "react";
import { type } from "../../constants/Typography";
import { View, Text, Animated, StyleSheet, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { RetailerPill } from "../ui/RetailerPill";
import { Trash2 } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { radii } from "../../constants/Layout";

export const ProductCard = memo(function ProductCard({ product, index, onDelete }: { product: any; index: number; onDelete?: () => void }) {
  const { colors } = useThemeColors();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: Math.min(index, 6) * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: Math.min(index, 6) * 60,
        useNativeDriver: true,
      }),
    ]).start();
    // Fade in once on mount so later store updates don't replay the intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badges: string[] = product.badges || [];

  return (
    <Animated.View
      style={[{ flex: 1, marginHorizontal: 6 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <Pressable
        onPress={() => router.push(`/product/${product.id}`)}
        style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <Card borderRadius={radii.library} style={styles.productCard}>
          <View style={[styles.imageWell, { backgroundColor: colors.fog }]}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.silhouette, { borderColor: colors.stone }]} />
            )}
            
            {onDelete && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  { backgroundColor: colors.surfaceHighlight, opacity: pressed ? 0.7 : 1 }
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Delete item"
              >
                <Trash2 size={16} color={colors.ink} strokeWidth={2} />
              </Pressable>
            )}
          </View>
          <RetailerPill retailer={product.retailer} />
          <Text style={[styles.productName, { color: colors.ink }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.price ? (
            <Text style={[styles.productPrice, { color: colors.ink }]}>{product.price}</Text>
          ) : null}

          <View style={styles.badgesContainer}>
            {badges.slice(0, 2).map((b) => (
              <Chip key={b} label={b} variant="tag" style={styles.chip} />
            ))}
            {badges.length > 2 ? <Chip label={`+${badges.length - 2}`} variant="overflow" style={styles.chip} /> : null}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  productCard: { padding: 12, minHeight: 260, gap: 8 },
  imageWell: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  silhouette: {
    width: 28,
    height: 48,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  productName: { ...type.productName, fontSize: 14 },
  productPrice: { ...type.price },
  badgesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: "auto" },
  chip: { height: 26, paddingHorizontal: 8 },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
