import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Image } from "react-native";
import { X, CheckCircle2, AlertTriangle, Link2, Loader } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";
import * as Haptics from "../../utils/haptics";

export type QrItem = {
  id: string;
  url: string;
  canon: string;
  status: "loading" | "valid" | "unsupported" | "invalid";
  title: string;
  retailer: string;
  domain: string;
  imageUrl: string | null;
  description?: string | null;
  error?: string;
};

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
  const [imgFailed, setImgFailed] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      tension: 140,
      friction: 12,
      delay: index * 40,
    }).start();
    Animated.timing(flash, {
      toValue: 0,
      duration: 700,
      delay: 180,
      useNativeDriver: false,
    }).start();
  }, [enter, flash, index]);

  useEffect(() => {
    if (item.status !== "loading") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [item.status, pulse]);

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

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
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
        <View style={[styles.thumb, { backgroundColor: colors.fog }]}>
          {item.imageUrl && !imgFailed ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.thumbImg}
              resizeMode="cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Animated.View style={{ opacity: isWait ? pulse : 1, alignItems: "center" }}>
              <Link2 size={18} color={colors.stone} strokeWidth={2} />
            </Animated.View>
          )}
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
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove();
              }}
              hitSlop={10}
              style={[styles.removeBtn, { backgroundColor: colors.fog }]}
              accessibilityLabel="Remove scanned product"
            >
              <X size={14} color={colors.body} strokeWidth={2.4} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
            {item.title || "Product link"}
          </Text>
          <Text style={[styles.domain, { color: colors.stone }]} numberOfLines={1}>
            {item.domain || item.url}
          </Text>

          <View style={styles.statusRow}>
            {isOk ? (
              <CheckCircle2 size={13} color={statusColor} strokeWidth={2.4} />
            ) : isWait ? (
              <Loader size={13} color={statusColor} strokeWidth={2.4} />
            ) : (
              <AlertTriangle size={13} color={statusColor} strokeWidth={2.4} />
            )}
            <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
              {statusLabel}
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
  thumb: {
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  thumbImg: {
    ...StyleSheet.absoluteFillObject,
    width: 96,
    height: "100%",
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
    maxWidth: "70%",
  },
  retailerText: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  removeBtn: {
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
