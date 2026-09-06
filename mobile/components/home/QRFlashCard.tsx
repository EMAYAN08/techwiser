import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Image, Easing, Platform } from "react-native";
import { X, CheckCircle2, AlertTriangle, Loader, Copy, Check, ShoppingBag } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";
import * as Haptics from "../../utils/haptics";

const FLOW = Easing.bezier(0.16, 1, 0.3, 1);

export type QrItem = {
  id: string;
  url: string;
  canon: string;
  status: "loading" | "valid" | "unsupported" | "invalid";
  title: string;
  retailer: string;
  domain: string;
  imageUrl: string | null;
  imageCandidates?: string[];
  description?: string | null;
  error?: string;
};

function retailerLetter(retailer: string, domain: string) {
  const src = retailer || domain || "?";
  const letter = src.replace(/[^A-Za-z]/g, "").charAt(0);
  return (letter || "?").toUpperCase();
}

function PreviewThumb({
  sources,
  loading,
  retailer,
  domain,
  colors,
}: {
  sources: string[];
  loading: boolean;
  retailer: string;
  domain: string;
  colors: ReturnType<typeof useThemeColors>["colors"];
}) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(sources.length === 0);
  const imgOp = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.45)).current;
  const sourceKey = sources.join("|");

  useEffect(() => {
    setSrcIndex(0);
    setFailed(sources.length === 0);
    imgOp.setValue(0);
  }, [sourceKey, sources.length, imgOp]);

  useEffect(() => {
    if (!loading && !failed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 780,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 780,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, failed, pulse]);

  const src = !failed && sources[srcIndex] ? sources[srcIndex] : null;
  const letter = retailerLetter(retailer, domain);

  const showImage = Boolean(src);
  const webImgProps =
    Platform.OS === "web" ? ({ referrerPolicy: "no-referrer" } as Record<string, string>) : {};

  return (
    <View style={[styles.thumb, { backgroundColor: colors.fog }]}>
      {showImage ? (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: imgOp }]}>
          <Image
            source={{ uri: src as string }}
            style={styles.thumbImg}
            resizeMode="cover"
            onLoad={() => {
              Animated.timing(imgOp, { toValue: 1, duration: 380, easing: FLOW, useNativeDriver: true }).start();
            }}
            onError={() => {
              if (srcIndex < sources.length - 1) setSrcIndex((n) => n + 1);
              else setFailed(true);
            }}
            {...webImgProps}
          />
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.fallback,
            { opacity: loading ? pulse : 1 },
          ]}
        >
          <View style={[styles.fallbackGlyph, { backgroundColor: colors.ink }]}>
            <Text style={[styles.fallbackLetter, { color: colors.bg }]}>{letter}</Text>
          </View>
          <ShoppingBag size={16} color={colors.stone} strokeWidth={2} />
          <Text style={[styles.fallbackStore, { color: colors.stone }]} numberOfLines={1}>
            {retailer || domain || "Product"}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

export function QRFlashCard({
  item,
  index,
  onRemove,
}: {
  item: QrItem;
  index: number;
  onRemove: () => void;
}) {
  const { colors } = useThemeColors();
  const [copied, setCopied] = useState(false);
  const life = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const checkPop = useRef(new Animated.Value(1)).current;
  const copyPop = useRef(new Animated.Value(1)).current;
  const removing = useRef(false);
  const lastStatus = useRef(item.status);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.spring(life, {
      toValue: 1,
      useNativeDriver: true,
      tension: 110,
      friction: 14,
      delay: Math.min(index, 3) * 55,
    }).start();
    Animated.timing(flash, {
      toValue: 0,
      duration: 780,
      delay: 160,
      easing: FLOW,
      useNativeDriver: false,
    }).start();
    // mount-only enter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (item.status !== "valid" || lastStatus.current === "valid") {
      lastStatus.current = item.status;
      return;
    }
    lastStatus.current = item.status;
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 640,
      easing: FLOW,
      useNativeDriver: false,
    }).start();
    checkPop.setValue(0.25);
    Animated.spring(checkPop, {
      toValue: 1,
      tension: 220,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [item.status, flash, checkPop]);

  useEffect(() => {
    if (item.status !== "loading") return;
    spin.setValue(0);
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    );
    spinLoop.start();
    return () => spinLoop.stop();
  }, [item.status, spin]);

  const handleRemove = () => {
    if (removing.current) return;
    removing.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(life, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(shift, {
        toValue: 16,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onRemove();
      else removing.current = false;
    });
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(item.url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      copyPop.setValue(0.25);
      Animated.spring(copyPop, { toValue: 1, tension: 220, friction: 8, useNativeDriver: true }).start();
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const isOk = item.status === "valid";
  const isWait = item.status === "loading";
  const borderColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [isOk ? colors.line : isWait ? colors.line : colors.error, colors.spotify],
  });

  const statusColor = isOk ? colors.spotify : isWait ? colors.stone : colors.error;
  const statusLabel = isOk
    ? "Ready to compare"
    : isWait
      ? "Fetching preview…"
      : item.error || "Can't use this link";

  const sources =
    item.imageCandidates && item.imageCandidates.length
      ? item.imageCandidates
      : item.imageUrl
        ? [item.imageUrl]
        : [];

  return (
    <Animated.View
      style={{
        opacity: life,
        transform: [
          { translateY: life.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { translateX: shift },
          { scale: life.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
        ],
      }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor,
          },
        ]}
      >
        <View style={styles.thumbWrap}>
          <PreviewThumb
            sources={sources}
            loading={isWait}
            retailer={item.retailer}
            domain={item.domain}
            colors={colors}
          />
          <View style={[styles.indexBadge, { backgroundColor: colors.ink }]}>
            <Text style={[styles.indexText, { color: colors.bg }]}>{index + 1}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={[styles.retailerPill, { borderColor: colors.line }]}>
              <Text style={[styles.retailerText, { color: colors.stone }]} numberOfLines={1}>
                {item.retailer || item.domain || "LINK"}
              </Text>
            </View>
            <View style={styles.iconRow}>
              <Pressable
                onPress={handleCopy}
                hitSlop={8}
                style={[styles.iconBtn, { backgroundColor: copied ? colors.spotifyWash : colors.fog }]}
                accessibilityLabel="Copy product URL"
              >
                <Animated.View style={{ transform: [{ scale: copyPop }] }}>
                  {copied ? (
                    <Check size={13} color={colors.spotify} strokeWidth={2.6} />
                  ) : (
                    <Copy size={13} color={colors.body} strokeWidth={2.4} />
                  )}
                </Animated.View>
              </Pressable>
              <Pressable
                onPress={handleRemove}
                hitSlop={8}
                style={[styles.iconBtn, { backgroundColor: colors.fog }]}
                accessibilityLabel="Remove scanned product"
              >
                <X size={14} color={colors.body} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
            {item.title || "Product link"}
          </Text>
          <Text style={[styles.domain, { color: colors.stone }]} numberOfLines={1}>
            {item.domain || item.url}
          </Text>

          <View style={styles.statusRow}>
            {isOk ? (
              <Animated.View style={{ transform: [{ scale: checkPop }] }}>
                <CheckCircle2 size={13} color={statusColor} strokeWidth={2.4} />
              </Animated.View>
            ) : isWait ? (
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: spin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }}
              >
                <Loader size={13} color={statusColor} strokeWidth={2.4} />
              </Animated.View>
            ) : (
              <AlertTriangle size={13} color={statusColor} strokeWidth={2.4} />
            )}
            <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
              {copied ? "URL copied" : statusLabel}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: radii.card,
    overflow: "hidden",
    minHeight: 108,
  },
  thumbWrap: {
    width: 96,
    alignSelf: "stretch",
  },
  thumb: {
    width: 96,
    flex: 1,
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  thumbImg: {
    ...StyleSheet.absoluteFillObject,
    width: 96,
    height: "100%",
  },
  fallback: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  fallbackGlyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackLetter: {
    ...type.button,
    fontSize: 16,
  },
  fallbackStore: {
    ...type.caption,
    fontSize: 10,
    textAlign: "center",
  },
  indexBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  indexText: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 0,
  },
  body: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  retailerPill: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "52%",
  },
  retailerText: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...type.productName,
    fontSize: 15,
    lineHeight: 19,
  },
  domain: {
    ...type.caption,
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    ...type.caption,
    fontSize: 12,
    flex: 1,
  },
});
