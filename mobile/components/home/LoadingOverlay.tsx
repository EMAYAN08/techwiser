import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, Easing, Modal, Image, AccessibilityInfo, Pressable } from "react-native";
import { type, Typography } from "../../constants/Typography";
import { setTabBarHidden } from "../../store/uiStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "../../utils/haptics";

const MESSAGES = [
  "Fetching product pages...",
  "Extracting specifications...",
  "Aligning data with AI...",
  "Calculating the winner...",
];

const WALK = require("../../assets/mascot/owl-walk-light.gif");
const THINK = require("../../assets/mascot/owl-think-light.gif");
const THUMBS = require("../../assets/mascot/owl-thumbs-light.gif");
const WALK_STILL = require("../../assets/mascot/owl-walk-still-light.png");
const THINK_STILL = require("../../assets/mascot/owl-think-still-light.png");
const THUMBS_STILL = require("../../assets/mascot/owl-thumbs-still-light.png");

export const MASCOT_ASSETS = [WALK, THINK, THUMBS, WALK_STILL, THINK_STILL, THUMBS_STILL];

const THUMBS_MS = 2000;
const THUMBS_CAP_MS = 2600;
const WALK_MS = 5000;
const THINK_MS = 5000;

type LoadClip = "walk" | "think";

function pickAssets(clip: "walk" | "think" | "thumbs") {
  if (clip === "thumbs") return { gif: THUMBS, still: THUMBS_STILL };
  if (clip === "think") return { gif: THINK, still: THINK_STILL };
  return { gif: WALK, still: WALK_STILL };
}

function OwlMascot({
  phase,
  reduceMotion,
  active,
}: {
  phase: "loading" | "success";
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
  }, [phase, clip]);

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
  const { gif, still } = pickAssets(pose);
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
            backgroundColor: "#FFFFFF",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.content}>
          <OwlMascot phase={phase} reduceMotion={reduceMotion} active={visible} />
          <Animated.Text style={[styles.message, { opacity: phase === "success" ? 1 : msgOpacity, color: "#1A1A1A" }]}>
            {message}
          </Animated.Text>
          <Text style={[styles.sub, { color: "#6A6A66" }]}>
            {phase === "success" ? "Opening comparison" : "Analyzing products"}
          </Text>
          {onCancel ? (
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCancel();
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
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
  cancelBtn: {
    height: 48,
    minWidth: 140,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    ...Typography.button,
    color: "#0A0A0A",
  },
});
