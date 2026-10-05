import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { useThemeColors } from "../../constants/Colors";

/**
 * An empty shopping bag with two ghost product cards peeking out and a green
 * bookmark emblem on the front — "your saved products live here".
 * Every colour comes from the theme so it reads on paper (light) and ink (dark).
 */
export function LibraryEmptyIllustration({ width = 220, height = 176 }: { width?: number; height?: number }) {
  const { colors, isDark } = useThemeColors();
  const accent = colors.spotify;
  const cardFill = colors.surface;
  const cardStroke = isDark ? "rgba(255,255,255,0.14)" : colors.line;
  const skeleton = isDark ? "rgba(255,255,255,0.08)" : colors.fog;
  const ghost = isDark ? "rgba(255,255,255,0.24)" : colors.fieldBorder;
  const bagTop = isDark ? "#1E1E1E" : "#FFFFFF";
  const bagBottom = isDark ? "#151515" : "#F4F4F0";

  return (
    <Svg width={width} height={height} viewBox="0 0 220 176" fill="none">
      <Defs>
        <RadialGradient id="libEmptyHalo" cx="110" cy="92" r="86" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={accent} stopOpacity={isDark ? 0.22 : 0.16} />
          <Stop offset="0.65" stopColor={accent} stopOpacity={isDark ? 0.06 : 0.04} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="libEmptyBag" x1="110" y1="76" x2="110" y2="148" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={bagTop} />
          <Stop offset="1" stopColor={bagBottom} />
        </LinearGradient>
      </Defs>

      {/* Halo + orbit ring */}
      <Circle cx="110" cy="92" r="86" fill="url(#libEmptyHalo)" />
      <Circle
        cx="110"
        cy="92"
        r="70"
        stroke={accent}
        strokeOpacity={isDark ? 0.22 : 0.18}
        strokeWidth={1}
        strokeDasharray="2 6"
        strokeLinecap="round"
      />

      {/* Floor shadow */}
      <Ellipse cx="110" cy="156" rx="60" ry="6" fill={isDark ? "#000000" : colors.ink} opacity={isDark ? 0.5 : 0.07} />

      {/* Ghost product card — left */}
      <G transform="rotate(-12 86 66)">
        <Rect x="64" y="34" width="44" height="62" rx="10" fill={cardFill} stroke={cardStroke} strokeWidth={1.4} />
        <Rect x="71" y="41" width="30" height="22" rx="6" fill={skeleton} />
        <Path d="M79 57 l4 -5 3.5 3.5 2.5 -2.5 3.5 4" stroke={ghost} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="71" y="69" width="24" height="4.5" rx="2.25" fill={skeleton} />
      </G>

      {/* Ghost product card — right (dashed: an empty slot) */}
      <G transform="rotate(10 134 66)">
        <Rect
          x="112"
          y="36"
          width="44"
          height="62"
          rx="10"
          fill={isDark ? "rgba(22,22,22,0.85)" : "rgba(255,255,255,0.7)"}
          stroke={ghost}
          strokeWidth={1.4}
          strokeDasharray="3.5 3.5"
        />
        <Path d="M134 54 v12 M128 60 h12" stroke={ghost} strokeWidth={1.6} strokeLinecap="round" />
      </G>

      {/* Bag handle */}
      <Path d="M92 80 V70 a18 18 0 0 1 36 0 V80" stroke={accent} strokeWidth={4} strokeLinecap="round" />

      {/* Bag body */}
      <Path
        d="M70 76 H150 a8 8 0 0 1 7.9 6.8 l7.6 56 a8 8 0 0 1 -7.9 9.2 H62.4 a8 8 0 0 1 -7.9 -9.2 l7.6 -56 A8 8 0 0 1 70 76 Z"
        fill="url(#libEmptyBag)"
        stroke={cardStroke}
        strokeWidth={1.5}
      />
      {/* Fold line + handle rivets */}
      <Path d="M63 90 H157" stroke={cardStroke} strokeWidth={1.2} strokeLinecap="round" />
      <Circle cx="92" cy="83" r="2.2" fill={accent} />
      <Circle cx="128" cy="83" r="2.2" fill={accent} />

      {/* Bookmark emblem */}
      <Circle cx="110" cy="118" r="17" fill={colors.spotifyWash} />
      <Circle cx="110" cy="118" r="11.5" fill={accent} />
      <Path
        d="M105.5 111.5 h9 a1 1 0 0 1 1 1 v12 l-5.5 -3.6 -5.5 3.6 v-12 a1 1 0 0 1 1 -1 Z"
        fill={colors.spotifyInk}
      />

      {/* Sparkles */}
      <Path d="M38 52 v8 M34 56 h8" stroke={accent} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
      <Path d="M182 40 v6 M179 43 h6" stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
      <Circle cx="186" cy="110" r="2.4" fill={accent} opacity={0.45} />
      <Circle cx="30" cy="118" r="1.8" fill={accent} opacity={0.4} />
      <Circle cx="168" cy="22" r="1.6" fill={ghost} />
      <Circle cx="52" cy="24" r="1.6" fill={ghost} />
    </Svg>
  );
}
