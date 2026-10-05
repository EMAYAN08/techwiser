import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight, SearchX } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { Button } from "../ui/Button";
import * as Haptics from "../../utils/haptics";
import { LibraryEmptyIllustration } from "./LibraryEmptyIllustration";

interface LibraryEmptyStateProps {
  /** "empty" = nothing saved yet; "filtered" = saved products exist but the filter hides them. */
  variant: "empty" | "filtered";
  title: string;
  subtitle: string;
  onStartComparing?: () => void;
  onClearFilter?: () => void;
}

const useNative = Platform.OS !== "web";

export function LibraryEmptyState({ variant, title, subtitle, onStartComparing, onClearFilter }: LibraryEmptyStateProps) {
  const { colors, isDark } = useThemeColors();
  const enter = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    }).start();
  }, [enter, variant]);

  useEffect(() => {
    if (variant !== "empty") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(float, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float, variant]);

  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const bob = float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <Animated.View
      testID={variant === "empty" ? "library-empty" : "library-empty-filtered"}
      style={[styles.root, { opacity: enter, transform: [{ translateY: rise }] }]}
    >
      <View accessible accessibilityRole="text" accessibilityLabel={`${title}. ${subtitle}`} style={styles.copyBlock}>
        {variant === "empty" ? (
          <Animated.View style={[styles.art, { transform: [{ translateY: bob }] }]}>
            <LibraryEmptyIllustration />
          </Animated.View>
        ) : (
          <View style={[styles.filterBadge, { backgroundColor: colors.spotifyWash, borderColor: isDark ? "rgba(29,185,84,0.28)" : "rgba(29,185,84,0.22)" }]}>
            <SearchX size={26} color={colors.spotify} strokeWidth={2} />
          </View>
        )}
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.stone }]}>{subtitle}</Text>
      </View>

      {variant === "empty" && onStartComparing ? (
        <Button
          title="Start a comparison"
          onPress={onStartComparing}
          accessibilityLabel="Start a comparison"
          icon={<ArrowRight size={18} color={colors.primaryBtnFg} strokeWidth={2.2} />}
          style={styles.cta}
          testID="library-empty-cta"
        />
      ) : null}

      {variant === "filtered" && onClearFilter ? (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClearFilter();
          }}
          style={({ pressed }) => [styles.clearBtn, { borderColor: colors.ink, opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Clear filter"
          hitSlop={8}
        >
          <Text style={[styles.clearText, { color: colors.ink }]}>Clear filter</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", paddingHorizontal: 12 },
  copyBlock: { alignItems: "center" },
  art: { marginBottom: 20 },
  filterBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { ...Typography.productName, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, textAlign: "center", marginBottom: 8 },
  subtitle: { ...Typography.body, textAlign: "center", maxWidth: 290 },
  cta: { marginTop: 28, alignSelf: "center", minWidth: 220 },
  clearBtn: {
    marginTop: 20,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  clearText: { ...Typography.caption, fontFamily: Typography.button.fontFamily, fontSize: 14 },
});
