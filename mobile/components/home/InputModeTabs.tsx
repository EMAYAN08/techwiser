import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import Svg, { Rect, Circle, Path, Ellipse } from "react-native-svg";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { fonts } from "../../constants/Typography";
import { size } from "../../constants/Layout";

export type InputMode = "url" | "name" | "upc" | "qr";

type ModeTint = {
  icon: string;
  accent: string;
  wash: string;
  wellDark: string;
};

const TINTS: Record<InputMode, ModeTint> = {
  url: { icon: "#3B6EA5", accent: "#7FA3C9", wash: "#DCE6F0", wellDark: "#2A3340" },
  name: { icon: "#B85C5C", accent: "#D68F8F", wash: "#F5E6E6", wellDark: "#3D2B2B" },
  upc: { icon: "#8A6A3B", accent: "#C4A574", wash: "#F3E9D6", wellDark: "#3A3328" },
  qr: { icon: "#7A5C99", accent: "#A38FC4", wash: "#EBE6F2", wellDark: "#302B3D" },
};

interface Tab {
  id: InputMode;
  label: string;
}

const TABS: Tab[] = [
  { id: "url", label: "URL" },
  { id: "name", label: "Name" },
  { id: "upc", label: "Barcode" },
  { id: "qr", label: "QR Code" },
];

function GlyphUrl({ color, accent }: { color: string; accent: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
      <Ellipse
        cx="12.2"
        cy="17"
        rx="8.4"
        ry="5.6"
        stroke={color}
        strokeWidth={2.7}
        transform="rotate(-38 12.2 17)"
      />
      <Ellipse
        cx="21.8"
        cy="17"
        rx="8.4"
        ry="5.6"
        stroke={accent}
        strokeWidth={2.7}
        transform="rotate(-38 21.8 17)"
      />
    </Svg>
  );
}

function GlyphName({ color, accent }: { color: string; accent: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
      <Circle cx="15" cy="15" r="8.2" stroke={color} strokeWidth={2.8} />
      <Circle cx="15" cy="15" r="4.4" fill={accent} opacity={0.45} />
      <Path d="M21.2 21.2 27 27" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}

function GlyphBarcode({ color, accent }: { color: string; accent: string }) {
  const bars = [
    { x: 8.5, w: 2.2, h: 16, c: color },
    { x: 12.7, w: 1.5, h: 16, c: accent },
    { x: 16.2, w: 3, h: 16, c: color },
    { x: 21.2, w: 1.5, h: 16, c: accent },
    { x: 24.7, w: 2.2, h: 16, c: color },
  ];
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
      {/* Viewfinder Corners */}
      <Path d="M5 12V7a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M29 12V7a2 2 0 0 0-2-2h-4" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 22v5a2 2 0 0 0 2 2h4" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M29 22v5a2 2 0 0 1-2 2h-4" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Barcode Lines */}
      {bars.map((b, i) => (
        <Rect key={i} x={b.x} y={17 - b.h / 2} width={b.w} height={b.h} rx={0.5} fill={b.c} />
      ))}
    </Svg>
  );
}

function GlyphQr({ color, accent, hole }: { color: string; accent: string; hole: string }) {
  const rings: { x: number; y: number }[] = [
    { x: 4, y: 4 },
    { x: 20, y: 4 },
    { x: 4, y: 20 },
  ];
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
      {rings.flatMap((f, i) => [
        <Rect key={`o${i}`} x={f.x} y={f.y} width={10} height={10} rx={1.6} fill={color} />,
        <Rect key={`m${i}`} x={f.x + 2.2} y={f.y + 2.2} width={5.6} height={5.6} rx={0.8} fill={hole} />,
        <Rect key={`i${i}`} x={f.x + 3.4} y={f.y + 3.4} width={3.2} height={3.2} rx={0.5} fill={color} />,
      ])}
      <Rect x="21" y="21" width="3.2" height="3.2" rx={0.5} fill={color} />
      <Rect x="25.6" y="21" width="3.2" height="3.2" rx={0.5} fill={accent} />
      <Rect x="21" y="25.6" width="3.2" height="3.2" rx={0.5} fill={accent} />
      <Rect x="25.6" y="25.6" width="3.2" height="3.2" rx={0.5} fill={color} />
      <Rect x="16.2" y="16.2" width="2.6" height="2.6" rx={0.5} fill={color} />
    </Svg>
  );
}

function ModeGlyph({
  id,
  color,
  accent,
  hole,
}: {
  id: InputMode;
  color: string;
  accent: string;
  hole: string;
}) {
  if (id === "url") return <GlyphUrl color={color} accent={accent} />;
  if (id === "name") return <GlyphName color={color} accent={accent} />;
  if (id === "upc") return <GlyphBarcode color={color} accent={accent} />;
  return <GlyphQr color={color} accent={accent} hole={hole} />;
}

interface InputModeTabsProps {
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export function InputModeTabs({ activeMode, onModeChange }: InputModeTabsProps) {
  const { colors, isDark } = useThemeColors();
  const scales = useRef(TABS.map(() => new Animated.Value(1))).current;
  const wobbles = useRef(TABS.map(() => new Animated.Value(0))).current;

  const bounceIcon = (index: number) => {
    scales[index].setValue(1);
    wobbles[index].setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scales[index], { toValue: 0.82, duration: 70, useNativeDriver: true }),
        Animated.spring(scales[index], { toValue: 1, useNativeDriver: true, friction: 4, tension: 260 }),
      ]),
      Animated.sequence([
        Animated.timing(wobbles[index], { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(wobbles[index], { toValue: -0.7, duration: 90, useNativeDriver: true }),
        Animated.spring(wobbles[index], { toValue: 0, useNativeDriver: true, friction: 5, tension: 220 }),
      ]),
    ]).start();
  };

  const handlePress = (tab: Tab, index: number) => {
    bounceIcon(index);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tab.id !== activeMode) onModeChange(tab.id);
  };

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {TABS.map((tab, index) => {
        const isActive = activeMode === tab.id;
        const tint = TINTS[tab.id];
        const wellBg = isActive ? (isDark ? tint.wellDark : tint.wash) : colors.modeWell;

        return (
          <Pressable
            key={tab.id}
            onPress={() => handlePress(tab, index)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={styles.item}
          >
            <View 
              style={[
                styles.well, 
                { 
                  backgroundColor: wellBg,
                  borderWidth: isActive ? 2 : 0,
                  borderColor: isActive ? colors.primary : "transparent"
                }
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: scales[index] },
                    {
                      rotate: wobbles[index].interpolate({
                        inputRange: [-1, 1],
                        outputRange: ["-8deg", "8deg"],
                      }),
                    },
                  ],
                }}
              >
                <ModeGlyph id={tab.id} color={tint.icon} accent={tint.accent} hole={wellBg} />
              </Animated.View>
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.ink : colors.stone,
                  fontFamily: isActive ? fonts.uiBold : fonts.uiMedium,
                },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  well: {
    width: size.modeWell,
    height: size.modeWell,
    borderRadius: size.modeWell / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
    textAlign: "center",
  },
});
