import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Trophy, Sparkles } from "lucide-react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import type { AlternativeProduct } from "../../services/api";

function AltImage({ uri, colors }: { uri?: string; colors: { fog: string; stone: string; spotify: string } }) {
  const valid = Boolean(uri && uri.trim().startsWith("http"));
  const [error, setError] = useState(false);
  if (!valid || error) {
    return (
      <View style={styles.imageFallback}>
        <Sparkles size={36} color={colors.spotify} strokeWidth={1.75} />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.image} resizeMode="contain" onError={() => setError(true)} />;
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
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState({ width: Math.max(280, screenWidth - 40), height: 420 });

  const onLayout = useCallback((w: number, h: number) => {
    if (w > 0 && h > 0) setPage({ width: w, height: h });
  }, []);

  const cardHeight = Math.max(page.height - (alternatives.length > 1 ? 28 : 0), 200);

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

  const interpolations = useMemo(
    () =>
      alternatives.map((_, i) => ({
        scale: scrollX.interpolate({
          inputRange: [(i - 1) * page.width, i * page.width, (i + 1) * page.width],
          outputRange: [0.9, 1, 0.9],
          extrapolate: "clamp",
        }),
        opacity: scrollX.interpolate({
          inputRange: [(i - 1) * page.width, i * page.width, (i + 1) * page.width],
          outputRange: [0.52, 1, 0.52],
          extrapolate: "clamp",
        }),
        lift: scrollX.interpolate({
          inputRange: [(i - 1) * page.width, i * page.width, (i + 1) * page.width],
          outputRange: [10, 0, 10],
          extrapolate: "clamp",
        }),
      })),
    [alternatives, page.width, scrollX]
  );

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
      <Animated.ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        bounces
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onMomentumEnd}
      >
        {alternatives.map((item, i) => {
          const tags = (item.highlights || []).filter(Boolean).slice(0, 5);
          return (
            <View key={`${item.name}-${i}`} style={{ width: page.width, height: cardHeight }}>
              <Animated.View
                style={[
                  styles.cardMotion,
                  {
                    opacity: interpolations[i]?.opacity,
                    transform: [{ translateY: interpolations[i]?.lift || 0 }, { scale: interpolations[i]?.scale || 1 }],
                  },
                ]}
              >
                <Pressable style={styles.cardPress} onPress={() => openAlt(item)}>
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isDark ? "rgba(255,255,255,0.16)" : colors.line,
                      },
                    ]}
                  >
                    <View style={styles.topRow}>
                      <AltImage uri={item.imageUrl} colors={colors} />
                      <View style={styles.topCopy}>
                        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={3}>
                          {item.name}
                        </Text>
                        {item.estimatedPrice ? (
                          <View style={styles.priceChip}>
                            <Text style={styles.priceChipText}>{item.estimatedPrice}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {tags.length > 0 ? (
                      <View style={styles.tagsRow}>
                        {tags.map((tag) => (
                          <Chip key={tag} label={tag} variant="tag" />
                        ))}
                      </View>
                    ) : null}
                    <ScrollView
                      style={styles.reasonScroll}
                      contentContainerStyle={styles.reasonContent}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      <Text style={[styles.reason, { color: colors.body }]}>{item.reasonWhyBetter}</Text>
                    </ScrollView>
                    <Text style={[styles.cta, { color: colors.stone }]}>Tap to view listings</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {alternatives.length > 1 ? (
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
  cardMotion: { flex: 1, marginHorizontal: 2, marginVertical: 4 },
  cardPress: { flex: 1 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 18,
  },
  topRow: { flexDirection: "row", gap: 14, marginBottom: 14, alignItems: "center" },
  image: { width: 88, height: 88 },
  imageFallback: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  topCopy: { flex: 1, minWidth: 0, justifyContent: "center" },
  name: { ...type.productName, fontSize: 18, lineHeight: 22, marginBottom: 8 },
  priceChip: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF08A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    transform: [{ rotate: "-1deg" }],
  },
  priceChipText: {
    ...type.caption,
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1C1C",
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  reasonScroll: { flex: 1 },
  reasonContent: { paddingBottom: 8 },
  reason: { ...type.body, fontSize: 15, lineHeight: 23 },
  cta: { ...type.caption, marginTop: 10, letterSpacing: 0.3 },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  dot: { height: 6, borderRadius: 99 },
});
