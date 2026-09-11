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
const THINK_LIGHT = require("../../assets/mascot/owl-think-light.gif");
const THINK_DARK = require("../../assets/mascot/owl-think-dark.gif");
const THUMBS_LIGHT = require("../../assets/mascot/owl-thumbs-light.gif");
const THUMBS_DARK = require("../../assets/mascot/owl-thumbs-dark.gif");
const WALK_STILL_LIGHT = require("../../assets/mascot/owl-walk-still-light.png");
const WALK_STILL_DARK = require("../../assets/mascot/owl-walk-still-dark.png");
const THINK_STILL_LIGHT = require("../../assets/mascot/owl-think-still-light.png");
const THINK_STILL_DARK = require("../../assets/mascot/owl-think-still-dark.png");
const THUMBS_STILL_LIGHT = require("../../assets/mascot/owl-thumbs-still-light.png");
const THUMBS_STILL_DARK = require("../../assets/mascot/owl-thumbs-still-dark.png");

export const MASCOT_ASSETS = [
  WALK_LIGHT,
  WALK_DARK,
  THINK_LIGHT,
  THINK_DARK,
  THUMBS_LIGHT,
  THUMBS_DARK,
  WALK_STILL_LIGHT,
  WALK_STILL_DARK,
  THINK_STILL_LIGHT,
  THINK_STILL_DARK,
  THUMBS_STILL_LIGHT,
  THUMBS_STILL_DARK,
];

export function MascotPreloader() {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.preloader}
    >
      {MASCOT_ASSETS.map((source, i) => (
        <Image key={i} source={source} style={styles.preloaderImg} />
      ))}
    </View>
  );
}

const THUMBS_MS = 2000;
const THUMBS_CAP_MS = 2600;
const WALK_MS = 5000;
const THINK_MS = 5000;

type LoadClip = "walk" | "think";

function pickAssets(clip: "walk" | "think" | "thumbs", isDark: boolean) {
  if (clip === "thumbs") {
    return {
      gif: isDark ? THUMBS_DARK : THUMBS_LIGHT,
      still: isDark ? THUMBS_STILL_DARK : THUMBS_STILL_LIGHT,
    };
  }
  if (clip === "think") {
    return {
      gif: isDark ? THINK_DARK : THINK_LIGHT,
      still: isDark ? THINK_STILL_DARK : THINK_STILL_LIGHT,
    };
  }
  return {
    gif: isDark ? WALK_DARK : WALK_LIGHT,
    still: isDark ? WALK_STILL_DARK : WALK_STILL_LIGHT,
  };
}

function OwlMascot({
  phase,
  isDark,
  reduceMotion,
  active,
}: {
  phase: "loading" | "success";
  isDark: boolean;
  reduceMotion: boolean;
  active: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const skipFade = useRef(true);
  const [gifFailed, setGifFailed] = useState(false);
  const [clip, setClip] = useState<LoadClip>("walk");

  useEffect(() => {
    setGifFailed(false);
  }, [phase, isDark, clip]);

  useEffect(() => {
    if (!active || phase === "success" || reduceMotion) {
      setClip("walk");
      return;
    }
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout> | undefined;
    const schedule = (current: LoadClip) => {
      const wait = current === "walk" ? WALK_MS : THINK_MS;
      const next: LoadClip = current === "walk" ? "think" : "walk";
      handle = setTimeout(() => {
        if (cancelled) return;
        setClip(next);
        schedule(next);
      }, wait);
    };
    setClip("walk");
    schedule("walk");
    return () => {
      cancelled = true;
      if (handle) clearTimeout(handle);
    };
  }, [active, phase, reduceMotion]);

  useEffect(() => {
    if (skipFade.current) {
      skipFade.current = false;
      fade.setValue(1);
      return;
    }
    fade.setValue(0.35);
    Animated.timing(fade, {
      toValue: 1,
      duration: reduceMotion ? 0 : 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [clip, phase, fade, reduceMotion]);

  useEffect(() => {
    if (phase !== "success" || reduceMotion) {
      scale.setValue(1);
      return;
    }
    scale.setValue(0.94);
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [phase, reduceMotion, scale]);

  const pose: "walk" | "think" | "thumbs" = phase === "success" ? "thumbs" : clip;
  const { gif, still } = pickAssets(pose, isDark);
  const showGif = !reduceMotion && !gifFailed;
  const label =
    pose === "thumbs" ? "Comparison ready" : pose === "think" ? "Owl thinking" : "Owl checking products";

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.mascotLift, { opacity: fade, transform: [{ scale }] }]}>
        <Image source={still} style={styles.mascot} resizeMode="contain" accessibilityLabel={label} />
        {showGif ? (
          <Image
            source={gif}
            style={styles.mascotGif}
            resizeMode="contain"
            onError={() => setGifFailed(true)}
          />
        ) : null}
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
      animationType={reduceMotion ? "none" : "fade"}
      presentationStyle="overFullScreen"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCancel}
      hardwareAccelerated
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: isDark ? "#000000" : "#FFFFFF",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.content}>
          <OwlMascot phase={phase} isDark={isDark} reduceMotion={reduceMotion} active={visible} />
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
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { alignItems: "center", width: "100%", paddingHorizontal: 40 },
  stage: {
    width: 220,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  mascotLift: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: {
    width: 200,
    height: 200,
  },
  mascotGif: {
    position: "absolute",
    width: 200,
    height: 200,
  },
  preloader: {
    position: "absolute",
    width: 200,
    height: 200,
    left: -420,
    top: -420,
    opacity: 0,
    overflow: "hidden",
  },
  preloaderImg: {
    position: "absolute",
    width: 200,
    height: 200,
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
