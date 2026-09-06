import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { type } from "../../constants/Typography";
import { Feather } from "@expo/vector-icons";
import { InputMode } from "./InputModeTabs";
import { paletteTokens, useThemeColors } from "../../constants/Colors";
import { radii } from "../../constants/Layout";

const CONFIG: Record<
  "upc" | "qr",
  {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    subtitle: string;
    description: string;
  }
> = {
  upc: {
    icon: "maximize",
    title: "Barcode Scanner",
    subtitle: "UPC / EAN",
    description:
      "Point your camera at any product barcode. We'll instantly pull the full spec sheet and live Canadian pricing across 7 retailers.",
  },
  qr: {
    icon: "camera",
    title: "QR Code Scanner",
    subtitle: "Manufacturer & Retailer QR",
    description:
      "Scan QR codes from product boxes, shelf tags, or retailer pages to jump straight to a comparison — no URL typing needed.",
  },
};

function BarcodeSVG({ color, isDark }: { color: string; isDark: boolean }) {
  const bars = [6, 3, 8, 2, 5, 3, 9, 4, 6, 2, 7, 3, 8, 2, 5, 4, 6, 3, 7, 2, 8, 4, 5, 3, 6];
  const cornerColor = isDark ? "white" : paletteTokens.ink;
  return (
    <View style={svgStyles.wrap}>
      <View style={[svgStyles.corner, svgStyles.tl, { borderColor: cornerColor }]} />
      <View style={[svgStyles.corner, svgStyles.tr, { borderColor: cornerColor }]} />
      <View style={[svgStyles.corner, svgStyles.bl, { borderColor: cornerColor }]} />
      <View style={[svgStyles.corner, svgStyles.br, { borderColor: cornerColor }]} />
      <View style={svgStyles.bars}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[
              svgStyles.bar,
              {
                height: h * 4,
                backgroundColor: color,
                opacity: i % 3 === 0 ? 0.9 : i % 2 === 0 ? 0.55 : 0.25,
                width: i % 4 === 0 ? 3 : 1.5,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[svgStyles.barcode, { color }]}>4 00000 12345 6</Text>
    </View>
  );
}

function QRCodeSVG({ color, isDark }: { color: string; isDark: boolean }) {
  const grid = [
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  ];
  const cornerColor = isDark ? "white" : paletteTokens.ink;
  return (
    <View style={[svgStyles.wrap, { alignItems: "center", justifyContent: "center" }]}>
      <View style={[svgStyles.corner, svgStyles.tl, { borderColor: cornerColor }]} />
      <View style={[svgStyles.corner, svgStyles.tr, { borderColor: cornerColor }]} />
      <View style={[svgStyles.corner, svgStyles.bl, { borderColor: cornerColor }]} />
      <View style={[svgStyles.corner, svgStyles.br, { borderColor: cornerColor }]} />
      <View style={svgStyles.qrGrid}>
        {grid.map((row, r) => (
          <View key={r} style={svgStyles.qrRow}>
            {row.map((cell, c) => (
              <View
                key={c}
                style={[svgStyles.qrCell, { backgroundColor: cell ? color : "transparent", opacity: cell ? 0.85 : 0 }]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const svgStyles = StyleSheet.create({
  wrap: {
    width: 160,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderWidth: 2.5,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 3 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 3 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 3 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 3 },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2.5,
    height: 72,
  },
  bar: {
    borderRadius: 1,
  },
  barcode: {
    position: "absolute",
    bottom: 0,
    fontSize: 9,
    letterSpacing: 2,
    opacity: 0.6,
  },
  qrGrid: { flexDirection: "column" },
  qrRow: { flexDirection: "row" },
  qrCell: { width: 7, height: 7, margin: 0.5, borderRadius: 1 },
});

export function ComingSoonPanel({ mode }: { mode: Extract<InputMode, "upc" | "qr"> }) {
  const { colors, isDark } = useThemeColors();
  const cfg = CONFIG[mode];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const accent = colors.spotify;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(14);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }),
    ]).start();
  }, [mode, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.illustrationBox, { borderBottomColor: colors.line }]}>
        {mode === "upc" ? <BarcodeSVG color={accent} isDark={isDark} /> : <QRCodeSVG color={accent} isDark={isDark} />}
      </View>

      <View style={styles.textBlock}>
        <View style={[styles.pill, { backgroundColor: colors.spotifyWash, borderColor: accent }]}>
          <Text style={[styles.pillText, { color: accent }]}>{cfg.subtitle}</Text>
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>{cfg.title}</Text>
        <Text style={[styles.desc, { color: colors.body }]}>{cfg.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={[styles.footerDot, { backgroundColor: colors.line }]} />
        <View style={[styles.footerDot, { backgroundColor: colors.line }]} />
        <View style={[styles.footerDot, { backgroundColor: colors.line }]} />
        <Text style={[styles.footerText, { color: colors.stone }]}>Arriving in Phase 2</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  illustrationBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    borderBottomWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  textBlock: {
    padding: 24,
    alignItems: "flex-start",
    gap: 10,
  },
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    ...type.eyebrow,
    fontSize: 11,
  },
  title: {
    ...type.productName,
    fontFamily: "ClashDisplay-Semibold",
    fontSize: 20,
  },
  desc: {
    ...type.body,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 6,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  footerText: {
    ...type.caption,
    fontSize: 11,
    marginLeft: 4,
  },
});
