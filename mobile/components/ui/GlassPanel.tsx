import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useThemeColors } from "../../constants/Colors";
import { radii } from "../../constants/Layout";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
};

export function GlassPanel({ children, style, contentStyle, radius = radii.card, intensity }: Props) {
  const { isDark } = useThemeColors();
  const blur = intensity ?? (isDark ? 48 : 64);
  const webChrome =
    Platform.OS === "web"
      ? ({
          backdropFilter: isDark ? "blur(36px) saturate(190%)" : "blur(32px) saturate(180%)",
          WebkitBackdropFilter: isDark ? "blur(36px) saturate(190%)" : "blur(32px) saturate(180%)",
        } as object)
      : null;

  return (
    <View
      style={[
        styles.shell,
        {
          borderRadius: radius,
          borderColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.72)",
          backgroundColor: isDark ? "rgba(28,28,28,0.42)" : "rgba(255,255,255,0.28)",
        },
        webChrome,
        style,
      ]}
    >
      {Platform.OS !== "web" ? (
        <BlurView
          intensity={blur}
          tint={isDark ? "dark" : "light"}
          blurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.shine,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.46)",
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.edge,
          {
            borderRadius: radius,
            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.55)",
          },
        ]}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 1,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    opacity: 0.7,
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {},
});
