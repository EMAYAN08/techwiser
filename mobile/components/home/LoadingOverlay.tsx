import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { type } from "../../constants/Typography";
import { useThemeColors } from "../../constants/Colors";
import { Button } from "../ui/Button";

const MESSAGES = [
  "Fetching product pages...",
  "Extracting specifications...",
  "Aligning data with AI...",
  "Calculating the winner...",
];

export function LoadingOverlay({ visible, onCancel }: { visible: boolean; onCancel?: () => void }) {
  const { colors, isDark } = useThemeColors();
  const [msgIndex, setMsgIndex] = useState(0);
  const msgOpacity = useRef(new Animated.Value(1)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      Animated.timing(msgOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(msgOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [visible, msgOpacity]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const pulse = () => {
      if (cancelled) return;
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) pulse();
      });
    };
    pulse();
    return () => {
      cancelled = true;
    };
  }, [visible, dot1, dot2, dot3]);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: isDark ? "rgba(10,10,10,0.97)" : "rgba(246,246,244,0.97)" },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.dots}>
          <Animated.View style={[styles.dot, { opacity: dot1, backgroundColor: colors.spotify }]} />
          <Animated.View style={[styles.dot, { opacity: dot2, backgroundColor: colors.spotify }]} />
          <Animated.View style={[styles.dot, { opacity: dot3, backgroundColor: colors.spotify }]} />
        </View>
        <Animated.Text style={[styles.message, { opacity: msgOpacity, color: colors.ink }]}>
          {MESSAGES[msgIndex]}
        </Animated.Text>
        <Text style={[styles.sub, { color: colors.stone, marginBottom: 32 }]}>Powered by Gemini AI</Text>
        {onCancel ? (
          <View style={styles.cancelContainer}>
            <Button title="Cancel" variant="ghost" onPress={onCancel} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  content: { alignItems: "center", width: "100%", paddingHorizontal: 40 },
  dots: { flexDirection: "row", marginBottom: 24 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  message: {
    ...type.body,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  sub: {
    ...type.caption,
    letterSpacing: 0.5,
  },
  cancelContainer: {
    width: 140,
  },
});
