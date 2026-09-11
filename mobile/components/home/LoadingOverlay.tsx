import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, Easing, Image, AccessibilityInfo } from "react-native";
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
const SHADOW_LIGHT = require("../../assets/mascot/owl-shadow-light.png");
const SHADOW_DARK = require("../../assets/mascot/owl-shadow-dark.png");

const THUMBS_MS = 2000;
const THUMBS_CAP_MS = 2600;

function GroundShadow({
  isDark,
  phase,
  reduceMotion,
}: {
  isDark: boolean;
  phase: "loading" | "success";
  reduceMotion: boolean;
}) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0.5);
      return;
    }
    pulse.setValue(0);
    const dur = phase === "success" ? 900 : 520;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.stopAnimation();
    };
  }, [phase, reduceMotion, pulse]);

  const scaleX = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.06] });
  const scaleY = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: isDark ? [0.42, 0.78] : [0.38, 0.72],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.shadow, { opacity, transform: [{ scaleX }, { scaleY }] }]}
    >
      <Image source={isDark ? SHADOW_DARK : SHADOW_LIGHT} style={styles.shadowImg} resizeMode="contain" />
    </Animated.View>
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
    scale.setValue(0.94);
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [phase, reduceMotion, scale]);

  const source =
    reduceMotion || gifFailed
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
    <View style={styles.stage}>
      <GroundShadow isDark={isDark} phase={phase} reduceMotion={reduceMotion} />
      <Animated.View style={[styles.mascotLift, { transform: [{ scale }] }]}>
        <Image
          source={source}
          style={styles.mascot}
          resizeMode="contain"
          accessibilityLabel={phase === "success" ? "Comparison ready" : "Owl checking products"}
          onError={() => setGifFailed(true)}
        />
      </Animated.View>
    </View>
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
  const [mounted, setMounted] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
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
    if (visible) {
      setMounted(true);
      overlayOpacity.setValue(1);
      setTabBarHidden(true);
      return () => setTabBarHidden(false);
    }
    if (!mounted) return;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: reduceMotion ? 80 : 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    setTabBarHidden(false);
  }, [visible, overlayOpacity, reduceMotion, mounted]);

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

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.screen,
        {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          opacity: overlayOpacity,
        },
      ]}
    >
      <View style={styles.content}>
        <OwlMascot phase={phase} isDark={isDark} reduceMotion={reduceMotion} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 99,
  },
  content: { alignItems: "center", width: "100%", paddingHorizontal: 40 },
  stage: {
    width: 220,
    height: 210,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 28,
  },
  shadow: {
    position: "absolute",
    bottom: 10,
    width: 168,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  shadowImg: {
    width: 168,
    height: 56,
  },
  mascotLift: {
    width: 188,
    height: 188,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  mascot: {
    width: 188,
    height: 188,
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
