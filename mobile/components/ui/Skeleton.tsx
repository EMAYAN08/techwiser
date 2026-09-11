import React, { useEffect, useId, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useThemeColors } from "../../constants/Colors";
import { radii } from "../../constants/Layout";

function useBoneColor(tone: "default" | "price" = "default") {
  const { isDark } = useThemeColors();
  if (tone === "price") return isDark ? "rgba(254,240,138,0.22)" : "#F3E7A3";
  return isDark ? "rgba(255,255,255,0.09)" : "#E4E4DF";
}

function ShineBand({
  progress,
  isDark,
}: {
  progress: Animated.Value;
  isDark: boolean;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const gid = `sk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const bandW = Math.max(box.w * 0.52, 112);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandW, box.w + 8],
  });
  const peak = "#FFFFFF";
  const peakOpacity = isDark ? 0.16 : 0.95;

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
      }}
      style={StyleSheet.absoluteFillObject}
    >
      {box.w > 0 && box.h > 0 ? (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            height: box.h,
            width: bandW,
            transform: [{ translateX }, { skewX: "-20deg" }],
          }}
        >
          <Svg width={bandW} height={box.h} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={peak} stopOpacity="0" />
                <Stop offset="42%" stopColor={peak} stopOpacity={peakOpacity} />
                <Stop offset="58%" stopColor={peak} stopOpacity={peakOpacity} />
                <Stop offset="100%" stopColor={peak} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function ShimmerRoot({
  children,
  label,
  style,
  clipStyle,
}: {
  children: React.ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
  clipStyle?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useThemeColors();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    progress.setValue(0);
    const loop = reduceMotion
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(progress, {
              toValue: 1,
              duration: 900,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.quad),
            }),
            Animated.timing(progress, {
              toValue: 0,
              duration: 900,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.quad),
            }),
          ])
        )
      : Animated.loop(
          Animated.timing(progress, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          })
        );
    loop.start();
    return () => {
      loop.stop();
      progress.stopAnimation();
    };
  }, [progress, reduceMotion]);

  const pulseOpacity = reduceMotion
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.52, 1] })
    : 1;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={style}
    >
      <Animated.View style={[styles.clip, clipStyle, { opacity: pulseOpacity }]}>
        {children}
        {!reduceMotion ? <ShineBand progress={progress} isDark={isDark} /> : null}
      </Animated.View>
    </View>
  );
}

export function Bone({
  height,
  width = "100%",
  radius = 8,
  tone = "default",
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  tone?: "default" | "price";
  style?: StyleProp<ViewStyle>;
}) {
  const backgroundColor = useBoneColor(tone);
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

export function FadeIn({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      if (reduce) {
        opacity.setValue(1);
        return;
      }
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      alive = false;
    };
  }, [opacity]);

  return <Animated.View style={[{ flex: 1 }, style, { opacity }]}>{children}</Animated.View>;
}

export function AlternativesSkeleton({
  borderColor,
  surface,
}: {
  borderColor: string;
  surface: string;
}) {
  const { isDark } = useThemeColors();
  return (
    <View style={styles.fill}>
      <ShimmerRoot
        label="Loading alternatives"
        style={styles.fill}
        clipStyle={{ borderRadius: radii.card }}
      >
        <View style={[styles.altCard, { backgroundColor: surface, borderColor }]}>
          <View
            style={[
              styles.altHeader,
              { borderBottomColor: isDark ? "rgba(255,255,255,0.10)" : borderColor },
            ]}
          >
            <View style={styles.altTopRow}>
              <Bone height={72} width={72} radius={radii.cardSm} />
              <View style={styles.altCopy}>
                <Bone height={18} width="92%" radius={6} />
                <Bone height={18} width="64%" radius={6} />
                <View style={styles.priceRow}>
                  <Bone height={22} width={88} radius={4} tone="price" />
                  <Bone height={18} width={18} radius={4} />
                </View>
              </View>
            </View>
            <View style={styles.tagRow}>
              <Bone height={34} width={92} radius={999} />
              <Bone height={34} width={108} radius={999} />
              <Bone height={34} width={84} radius={999} />
            </View>
          </View>
          <View style={styles.altBody}>
            <Bone height={13} width="100%" radius={6} />
            <Bone height={13} width="97%" radius={6} />
            <Bone height={13} width="91%" radius={6} />
            <Bone height={13} width="95%" radius={6} />
            <Bone height={13} width="86%" radius={6} />
            <Bone height={13} width="93%" radius={6} />
            <Bone height={13} width="72%" radius={6} />
            <Bone height={13} width="80%" radius={6} />
          </View>
        </View>
      </ShimmerRoot>
      <View style={styles.dots} accessibilityElementsHidden>
        <Bone height={6} width={16} radius={99} />
        <Bone height={6} width={6} radius={99} />
        <Bone height={6} width={6} radius={99} />
      </View>
    </View>
  );
}

export function ExplainSpecSkeleton({
  productCount,
  lineColor,
}: {
  productCount: number;
  lineColor: string;
}) {
  const rows = Math.max(2, Math.min(productCount || 2, 4));
  return (
    <ShimmerRoot label="Loading spec explanation" style={styles.explainWrap}>
      <View style={styles.concept}>
        <Bone height={16} width="100%" radius={6} />
        <Bone height={16} width="96%" radius={6} />
        <Bone height={16} width="88%" radius={6} />
        <Bone height={16} width="70%" radius={6} />
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.explainRow, { borderTopColor: lineColor }]}>
          <View style={styles.explainName}>
            <Bone height={15} width="52%" radius={6} />
            <Bone height={13} width={72} radius={6} />
          </View>
          <Bone height={14} width="100%" radius={6} />
          <Bone height={14} width="92%" radius={6} />
          <Bone height={14} width="78%" radius={6} />
        </View>
      ))}
    </ShimmerRoot>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clip: {
    flex: 1,
    overflow: "hidden",
  },
  altCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  altHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  altTopRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  altCopy: { flex: 1, gap: 8, justifyContent: "center" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  altBody: { flex: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 10 },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  explainWrap: { flex: 1, minHeight: 180 },
  concept: { gap: 10, marginBottom: 8 },
  explainRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    marginTop: 16,
    gap: 8,
  },
  explainName: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
});
