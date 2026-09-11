import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "../../constants/Colors";
import { radii } from "../../constants/Layout";

type ShimmerCtx = {
  progress: Animated.Value;
  reduceMotion: boolean;
};

const Ctx = createContext<ShimmerCtx | null>(null);

export function ShimmerRoot({
  children,
  label,
  style,
}: {
  children: React.ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
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
            Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
            Animated.timing(progress, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          ])
        )
      : Animated.loop(
          Animated.timing(progress, {
            toValue: 1,
            duration: 1400,
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

  return (
    <Ctx.Provider value={{ progress, reduceMotion }}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        style={style}
      >
        {children}
      </View>
    </Ctx.Provider>
  );
}

export function Bone({
  height,
  width = "100%",
  radius = 8,
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useThemeColors();
  const ctx = useContext(Ctx);
  const [measured, setMeasured] = useState(typeof width === "number" ? width : 180);
  const bone = isDark ? "rgba(255,255,255,0.10)" : "#E6E6E1";
  const shine = isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.88)";

  const opacity =
    ctx?.reduceMotion && ctx.progress
      ? ctx.progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })
      : 1;
  const translateX =
    ctx && !ctx.reduceMotion
      ? ctx.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-Math.max(measured, 40), Math.max(measured, 40)],
        })
      : 0;

  return (
    <Animated.View
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: bone,
          overflow: "hidden",
          opacity,
        },
        style,
      ]}
    >
      {ctx && !ctx.reduceMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shine,
            {
              width: Math.max(measured * 0.42, 36),
              backgroundColor: shine,
              transform: [{ translateX }, { skewX: "-20deg" }],
            },
          ]}
        />
      ) : null}
    </Animated.View>
  );
}

export function AlternativesSkeleton({
  borderColor,
  surface,
}: {
  borderColor: string;
  surface: string;
}) {
  return (
    <ShimmerRoot label="Loading alternatives" style={styles.fill}>
      <View style={[styles.altCard, { backgroundColor: surface, borderColor }]}>
        <View style={styles.altHeader}>
          <Bone height={72} width={72} radius={radii.cardSm} />
          <View style={styles.altCopy}>
            <Bone height={16} width="92%" />
            <Bone height={16} width="64%" />
            <Bone height={22} width={88} radius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
        <View style={styles.tagRow}>
          <Bone height={34} width={92} radius={999} />
          <Bone height={34} width={108} radius={999} />
          <Bone height={34} width={84} radius={999} />
        </View>
        <View style={styles.lines}>
          <Bone height={12} width="100%" />
          <Bone height={12} width="96%" />
          <Bone height={12} width="88%" />
          <Bone height={12} width="92%" />
          <Bone height={12} width="70%" />
          <Bone height={12} width="84%" />
          <Bone height={12} width="60%" />
        </View>
      </View>
      <View style={styles.dots}>
        <Bone height={6} width={16} radius={99} />
        <Bone height={6} width={6} radius={99} />
        <Bone height={6} width={6} radius={99} />
      </View>
    </ShimmerRoot>
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
      <View style={styles.lines}>
        <Bone height={14} width="100%" />
        <Bone height={14} width="94%" />
        <Bone height={14} width="78%" />
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.explainRow, { borderTopColor: lineColor }]}>
          <View style={styles.explainName}>
            <Bone height={14} width="58%" />
            <Bone height={12} width={64} />
          </View>
          <Bone height={12} width="100%" />
          <Bone height={12} width="86%" />
        </View>
      ))}
    </ShimmerRoot>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    opacity: 0.95,
  },
  altCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 18,
  },
  altHeader: { flexDirection: "row", gap: 14, alignItems: "center" },
  altCopy: { flex: 1, gap: 8, justifyContent: "center" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  lines: { gap: 10, marginTop: 16 },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  explainWrap: { paddingTop: 4 },
  explainRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    marginTop: 16,
    gap: 8,
  },
  explainName: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
});
