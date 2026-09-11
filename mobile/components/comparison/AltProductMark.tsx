import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export function AltProductMark({ accent = "#1ED760", ink = "#1C1C1C" }: { accent?: string; ink?: string }) {
  return (
    <Svg width={72} height={72} viewBox="0 0 72 72" fill="none">
      <Circle cx="36" cy="36" r="34" fill={accent} opacity={0.12} />
      <Rect x="18" y="14" width="28" height="40" rx="6" fill={ink} />
      <Rect x="21.5" y="18.5" width="21" height="27" rx="3" fill="#F4F4F5" />
      <Rect x="27" y="48.5" width="10" height="2.4" rx="1.2" fill="#F4F4F5" opacity={0.7} />
      <Path
        d="M42 38.5c0-6.2 5-11.2 11.2-11.2 6.1 0 11.1 5 11.1 11.2 0 6.2-5 11.2-11.1 11.2C47 49.7 42 44.7 42 38.5Z"
        fill={accent}
      />
      <Path
        d="M53.2 32.4c.4-.4 1-.4 1.4 0l3.1 3.1 6.2-6.2c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-6.9 6.9c-.4.4-1 .4-1.4 0l-3.8-3.8c-.4-.4-.4-1 0-1.4Z"
        fill="#0B1A10"
      />
    </Svg>
  );
}
