import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { useThemeColors } from "../../constants/Colors";

/**
 * Two product cards facing each other with a green compare badge between them.
 * The right card is a dashed "empty slot". Colours come from the theme so it
 * sits quietly on both light and dark backgrounds.
 */
export function RecentEmptyIllustration({ width = 168, height = 104 }: { width?: number; height?: number }) {
  const { colors, isDark } = useThemeColors();
  const cardFill = colors.surface;
  const cardStroke = isDark ? "rgba(255,255,255,0.14)" : colors.line;
  const skeleton = isDark ? "rgba(255,255,255,0.08)" : colors.fog;
  const ghost = isDark ? "rgba(255,255,255,0.22)" : colors.fieldBorder;
  const accent = colors.spotify;

  return (
    <Svg width={width} height={height} viewBox="0 0 168 104" fill="none">
      {/* Soft green glow on the floor */}
      <Ellipse cx="84" cy="92" rx="62" ry="6" fill={accent} opacity={isDark ? 0.14 : 0.1} />

      {/* Left product card */}
      <G transform="rotate(-6 50 50)">
        <Rect x="24" y="16" width="52" height="68" rx="12" fill={cardFill} stroke={cardStroke} strokeWidth={1.5} />
        <Rect x="33" y="25" width="34" height="26" rx="7" fill={skeleton} />
        <Path
          d="M43 42 l5 -6 4 4 3 -3 4 5"
          stroke={ghost}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect x="33" y="58" width="28" height="5" rx="2.5" fill={skeleton} />
        <Rect x="33" y="68" width="18" height="5" rx="2.5" fill={accent} opacity={0.55} />
      </G>

      {/* Right empty slot */}
      <G transform="rotate(6 118 50)">
        <Rect
          x="92"
          y="16"
          width="52"
          height="68"
          rx="12"
          stroke={ghost}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <Path d="M118 43 v14 M111 50 h14" stroke={ghost} strokeWidth={1.8} strokeLinecap="round" />
      </G>

      {/* Compare badge */}
      <Circle cx="84" cy="50" r="15" fill={colors.bg} />
      <Circle cx="84" cy="50" r="12" fill={accent} />
      <Path
        d="M78 46.5 h11 m-3 -3 l3 3 -3 3 M90 53.5 h-11 m3 -3 l-3 3 3 3"
        stroke={colors.spotifyInk}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Sparkles */}
      <Circle cx="20" cy="18" r="2" fill={accent} opacity={0.45} />
      <Circle cx="150" cy="14" r="2.5" fill={accent} opacity={0.35} />
      <Circle cx="156" cy="76" r="1.6" fill={accent} opacity={0.5} />
      <Path d="M14 66 v6 M11 69 h6" stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}
