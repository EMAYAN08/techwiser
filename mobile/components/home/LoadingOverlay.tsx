import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, Easing, Modal, Image, AccessibilityInfo } from "react-native";
import { type } from "../../constants/Typography";
import { useThemeColors } from "../../constants/Colors";
import { Button } from "../ui/Button";
import { setTabBarHidden } from "../../store/uiStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "../../utils/haptics";

const MESSAGES = [
  "Fetching product pages...",
  "Extracting specifications...",
  "Aligning data with AI...",
  "Calculating the winner...",
];

const WALK_LIGHT = require("../../assets/mascot/owl-walk-light.gif");
const WALK_DARK = require("../../assets/mascot/owl-walk-dark.gif");
const THUMBS_LIGHT = require("../../assets/mascot/owl-thumbs-light.gif");
const THUMBS_DARK = require("../../assets/mascot/owl-thumbs-dark.gif");
const WALK_STILL = require("../../assets/mascot/owl-walk-still.png");
const THUMBS_STILL = require("../../assets/mascot/owl-thumbs-still.png");

const THUMBS_MS = 2000;
const THUMBS_CAP_MS = 2600;

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

function OwlMascot({
  phase,
  isDark,
  reduceMotion,
}: {
  phase: "loading" | "success";
  isDark: boolean;
  reduceMotion: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [gifFailed, setGifFailed] = useState(false);

  useEffect(() => {
    if (phase !== "success" || reduceMotion) {
      scale.setValue(1);
      return;
    }
    scale.setValue(0.92);
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [phase, reduceMotion, scale]);

  const source = reduceMotion || gifFailed
    ? phase === "success"
      ? THUMBS_STILL
      : WALK_STILL
    : phase === "success"
      ? isDark
        ? THUMBS_DARK
        : THUMBS_LIGHT
      : isDark
        ? WALK_DARK
        : WALK_LIGHT;

  return (
    <Animated.View style={[styles.mascotWrap, { transform: [{ scale }] }]}>
      <Image
        source={source}
        style={styles.mascot}
        resizeMode="contain"
        accessibilityLabel={phase === "success" ? "Comparison ready" : "Owl checking products"}
        onError={() => setGifFailed(true)}
      />
    </Animated.View>
  );
}

export function LoadingOverlay({
  visible,
  phase = "loading",
  onCancel,
  onCelebrateEnd,
}: {
  visible: boolean;
  phase?: "loading" | "success";
  onCancel?: () => void;
  onCelebrateEnd?: () => void;
}) {
  const { colors, isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const [msgIndex, setMsgIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const msgOpacity = useRef(new Animated.Value(1)).current;
  const finishedRef = useRef(false);
  const celebrateEndRef = useRef(onCelebrateEnd);
  celebrateEndRef.current = onCelebrateEnd;

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
    setTabBarHidden(visible);
    return () => setTabBarHidden(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setMsgIndex(0);
      msgOpacity.setValue(1);
      finishedRef.current = false;
      return;
    }
    if (phase === "success") return;
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
  }, [visible, phase, msgOpacity]);

  useEffect(() => {
    if (!visible || phase !== "success") return;
    finishedRef.current = false;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      celebrateEndRef.current?.();
    };

    const delay = reduceMotion ? 380 : THUMBS_MS;
    const t = setTimeout(finish, delay);
    const cap = setTimeout(finish, THUMBS_CAP_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(cap);
    };
  }, [visible, phase, reduceMotion]);

  const message = phase === "success" ? "Ready to compare" : MESSAGES[msgIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
      hardwareAccelerated
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: isDark ? "#2A2A2A" : "#D8D8D4",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.content}>
          <OwlMascot phase={phase} isDark={isDark} reduceMotion={reduceMotion} />
          <ServerStack colors={colors} />
          <Animated.Text style={[styles.message, { opacity: phase === "success" ? 1 : msgOpacity, color: colors.ink }]}>
            {message}
          </Animated.Text>
          <Text style={[styles.sub, { color: isDark ? "#A8A8A4" : "#6A6A66" }]}>
            {phase === "success" ? "Opening comparison" : "Analyzing products"}
          </Text>
          {onCancel ? (
            <View style={styles.cancelContainer}>
              <Button title="Cancel" variant="ghost" onPress={onCancel} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { alignItems: "center", width: "100%", paddingHorizontal: 40 },
  mascotWrap: {
    width: 132,
    height: 132,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: {
    width: 132,
    height: 132,
  },
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
    marginBottom: 32,
  },
  cancelContainer: {
    width: 140,
  },
});
