import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, Easing } from "react-native";
import { type } from "../../constants/Typography";
import { useThemeColors } from "../../constants/Colors";
import { Button } from "../ui/Button";

const MESSAGES = [
  "Fetching product pages...",
  "Extracting specifications...",
  "Aligning data with AI...",
  "Calculating the winner...",
];

function ServerStack({ colors }: { colors: any }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [progress, pulse]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -36],
  });

  const topOpacity = progress.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0, 0],
  });
  const topScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
  });

  const bottomOpacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  });
  const bottomScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const led = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  const renderBlock = (opacity: any, scale: any) => (
    <Animated.View
      style={[
        styles.serverBlock,
        {
          borderColor: colors.spotify,
          backgroundColor: colors.spotifyWash,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={{ flexDirection: "row", gap: 6 }}>
        <View style={[styles.serverLine, { width: 24, backgroundColor: colors.spotify }]} />
        <View style={[styles.serverLine, { width: 12, backgroundColor: colors.spotify }]} />
      </View>
      <Animated.View style={[styles.serverLed, { backgroundColor: colors.spotify, opacity: led }]} />
    </Animated.View>
  );

  return (
    <View style={styles.serverContainer}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {renderBlock(topOpacity, topScale)}
        {renderBlock(1, 1)}
        {renderBlock(1, 1)}
        {renderBlock(bottomOpacity, bottomScale)}
      </Animated.View>
    </View>
  );
}

export function LoadingOverlay({ visible, onCancel }: { visible: boolean; onCancel?: () => void }) {
  const { colors, isDark } = useThemeColors();
  const [msgIndex, setMsgIndex] = useState(0);
  const msgOpacity = useRef(new Animated.Value(1)).current;

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

  if (!visible) return null;

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: isDark ? "rgba(10,10,10,0.97)" : "rgba(246,246,244,0.97)" },
      ]}
    >
      <View style={styles.content}>
        <ServerStack colors={colors} />
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
    ...{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  content: { alignItems: "center", width: "100%", paddingHorizontal: 40, marginTop: 72 },
  serverContainer: {
    height: 100,
    overflow: "hidden",
    marginBottom: 32,
    justifyContent: "flex-start",
  },
  serverBlock: {
    width: 80,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  serverLine: {
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  serverLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
