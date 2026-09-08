import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Image } from "react-native";
import { type } from "../../constants/Typography";
import { useComparisonStore, Comparison } from "../../store/useComparisonStore";
import { useRouter } from "expo-router";
import { Card } from "../ui/Card";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { radii } from "../../constants/Layout";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ComparisonCard({ comparison, index }: { comparison: Comparison; index: number }) {
  const { colors } = useThemeColors();
  const router = useRouter();
  const setActiveComparison = useComparisonStore((state) => state.setActiveComparison);
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const products = comparison.result?.products ?? [];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 50 + 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (comparison.result) {
      setActiveComparison(comparison.result);
      router.push("/compare");
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        style={[styles.cardWrapper, { transform: [{ scale }] }]}
      >
        <Card borderRadius={radii.cardSm} style={styles.card}>
          <View style={styles.thumbs}>
            {products.slice(0, 3).map((p, i) => (
              <View
                key={p.id}
                style={{
                  marginLeft: i === 0 ? 0 : -10,
                  zIndex: 4 - i,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={[
                    styles.thumb,
                    {
                      backgroundColor: colors.fog,
                      borderColor: colors.stone,
                    },
                  ]}
                >
                  {p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={styles.thumbImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumbSilhouette, { borderColor: colors.stone }]} />
                  )}
                </View>
              </View>
            ))}
          </View>
          <View style={styles.meta}>
            <Text style={[styles.cardTitle, { color: colors.ink }]} numberOfLines={1} ellipsizeMode="tail">
              {comparison.title}
            </Text>
            <Text style={[styles.cardDate, { color: colors.stone }]}>{comparison.date}</Text>
          </View>
        </Card>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function RecentComparisons() {
  const { colors } = useThemeColors();
  const { recentComparisons } = useComparisonStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 150,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      {/* Header removed and exported */}
      {recentComparisons.length === 0 ? (
        <Text style={[styles.empty, { color: colors.stone }]}>No comparisons yet</Text>
      ) : (
        recentComparisons.map((comp, index) => (
          <ComparisonCard key={comp.id} comparison={comp} index={index} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  header: { ...type.eyebrow, marginBottom: 16 },
  empty: { ...type.body },
  cardWrapper: { marginBottom: 12 },
  card: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  thumbs: { flexDirection: "row", alignItems: "center" },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbSilhouette: {
    width: 12,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  meta: { flex: 1, minWidth: 0 },
  cardTitle: { ...type.productName, fontSize: 15, marginBottom: 4 },
  cardDate: { ...type.caption },
});

export function RecentHeader() {
  const { colors } = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.bg, paddingBottom: 8, paddingTop: 4 }}>
      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />
      <Text style={[styles.header, { color: colors.stone, marginBottom: 0 }]}>RECENT</Text>
    </View>
  );
}
