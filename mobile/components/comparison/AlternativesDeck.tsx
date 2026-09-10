import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  FlatList,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { PackageOpen, Trophy, ChevronLeft, ChevronRight } from "lucide-react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";
import { Button } from "../ui/Button";
import { GlassPanel } from "../ui/GlassPanel";
import type { AlternativeProduct } from "../../services/api";

function AltImage({ uri, colors }: { uri?: string; colors: { fog: string; stone: string } }) {
  const [error, setError] = useState(false);
  const valid = Boolean(uri && uri.trim().startsWith("http"));
  if (!valid || error) {
    return (
      <View style={[styles.imageFallback, { backgroundColor: colors.fog }]}>
        <PackageOpen size={40} color={colors.stone} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
}

type Props = {
  loading: boolean;
  error?: string;
  alternatives: AlternativeProduct[];
  onRetry: () => void;
};

export function AlternativesDeck({ loading, error, alternatives, onRetry }: Props) {
  const { colors, isDark } = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<AlternativeProduct>>(null);
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState({ width: Math.max(280, screenWidth - 40), height: 420 });

  const onLayout = useCallback((w: number, h: number) => {
    if (w > 0 && h > 0) setPage({ width: w, height: h });
  }, []);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(alternatives.length - 1, next));
    if (clamped === index) return;
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(page.width, 1));
    if (next !== index && next >= 0 && next < alternatives.length) {
      setIndex(next);
      void Haptics.selectionAsync();
    }
  };

  const openAlt = (alt: AlternativeProduct) => {
    const href =
      alt.url && alt.url.startsWith("http")
        ? alt.url
        : `https://www.google.ca/search?tbm=shop&q=${encodeURIComponent(`${alt.name} canada`)}`;
    Linking.openURL(href);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color={colors.spotify} />
        <Text style={[styles.statusText, { color: colors.body }]}>
          Techvisor is searching for better alternatives...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerFill}>
        <Text style={[styles.statusText, { color: colors.error }]}>{error}</Text>
        <Button title="Retry" variant="ghost" onPress={onRetry} />
      </View>
    );
  }

  if (!alternatives.length) {
    return (
      <View style={styles.centerFill}>
        <Trophy size={48} color={colors.spotify} strokeWidth={1.5} />
        <Text style={[styles.emptyTitle, { color: colors.ink }]}>You picked well!</Text>
        <Text style={[styles.statusText, { color: colors.body }]}>
          Techvisor couldn't find any strictly better alternatives in this price range.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
    >
      <FlatList
        ref={listRef}
        data={alternatives}
        keyExtractor={(item, i) => `${item.name}-${i}`}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        bounces
        style={{ height: Math.max(page.height - (alternatives.length > 1 ? 44 : 0), 200) }}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: page.width, offset: page.width * i, index: i })}
        onScrollToIndexFailed={({ index: failed }) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: failed, animated: true }), 80);
        }}
        renderItem={({ item }) => (
          <View
            style={{
              width: page.width,
              height: Math.max(page.height - (alternatives.length > 1 ? 44 : 0), 200),
              paddingBottom: 8,
            }}
          >
            <Pressable style={styles.cardPress} onPress={() => openAlt(item)}>
              <GlassPanel style={styles.card} contentStyle={styles.cardInner}>
                <View style={[styles.imageWell, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)" }]}>
                  <AltImage uri={item.imageUrl} colors={colors} />
                </View>
                <Text style={[styles.name, { color: colors.ink }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.estimatedPrice ? (
                  <View style={styles.priceChip}>
                    <Text style={styles.priceChipText}>{item.estimatedPrice}</Text>
                  </View>
                ) : null}
                <Text style={[styles.reason, { color: colors.body }]} numberOfLines={6}>
                  {item.reasonWhyBetter}
                </Text>
                <Text style={[styles.cta, { color: colors.stone }]}>Tap to view listings</Text>
              </GlassPanel>
            </Pressable>
          </View>
        )}
      />

      {alternatives.length > 1 ? (
        <View style={styles.controls}>
          <Pressable
            onPress={() => goTo(index - 1)}
            disabled={index === 0}
            hitSlop={10}
            style={[styles.chevron, { opacity: index === 0 ? 0.28 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Previous alternative"
          >
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.25} />
          </Pressable>
          <View style={styles.dots}>
            {alternatives.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? colors.ink : colors.stone,
                    opacity: i === index ? 1 : 0.35,
                    width: i === index ? 16 : 6,
                  },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={() => goTo(index + 1)}
            disabled={index === alternatives.length - 1}
            hitSlop={10}
            style={[styles.chevron, { opacity: index === alternatives.length - 1 ? 0.28 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Next alternative"
          >
            <ChevronRight size={22} color={colors.ink} strokeWidth={2.25} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  statusText: { ...type.body, textAlign: "center" },
  emptyTitle: { ...type.productName, fontSize: 18, textAlign: "center" },
  cardPress: { flex: 1 },
  card: {
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  cardInner: {
    flex: 1,
    padding: 20,
  },
  imageWell: {
    flex: 1,
    minHeight: 140,
    borderRadius: radii.cardSm,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { ...type.productName, fontSize: 20, lineHeight: 24, marginBottom: 10 },
  priceChip: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF08A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 12,
    transform: [{ rotate: "-1deg" }],
  },
  priceChipText: {
    ...type.caption,
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1C1C",
  },
  reason: { ...type.body, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  cta: { ...type.caption, marginTop: 12, letterSpacing: 0.3 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chevron: { padding: 4 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 6, borderRadius: 99 },
});
