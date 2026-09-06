import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import * as Haptics from "../../utils/haptics";

interface ChipProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "selected" | "tag" | "overflow";
  style?: StyleProp<ViewStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = "tag",
  style,
  onPress,
  disabled,
  ...props
}) => {
  const { colors, isDark } = useThemeColors();

  const handlePress = (e: any) => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(e);
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case "selected":
        return colors.ink; // Wait, black bg in light, but should it adapt in dark? The prompt says "black bg, white text" but usually selected in dark might be lime or something. The prompt specifically says "(black bg, white text)" for selected, and "lime outline, ink text" for tag. Wait, I should probably use `colors.ink` for black bg and `colors.bg` or `#FFFFFF` for white text. I will use `colors.ink` and `colors.bg` (which is paper in light, ink in dark). Actually `colors.ink` in dark is paper. So I'll just follow the theme exactly: ink bg, paper text. Wait, in dark mode `colors.ink` is `#F6F6F4` (paper) and `colors.bg` is `#0A0A0A` (ink).
        // Let's use colors.ink for the background of selected, so it flips to white in dark mode, and for text use colors.bg (which flips to black).
        return colors.ink;
      case "tag":
        return "transparent";
      case "overflow":
        return colors.fog;
      default:
        return "transparent";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "selected":
        return colors.bg; // inverse of ink
      case "tag":
        return colors.ink;
      case "overflow":
        return colors.stone;
      default:
        return colors.ink;
    }
  };

  const getBorderColor = () => {
    if (variant === "tag") {
      return colors.spotify;
    }
    return "transparent";
  };

  const getBorderWidth = () => {
    if (variant === "tag") {
      return 1.5;
    }
    return 0;
  };

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: getBorderWidth(),
          opacity: pressed ? 0.72 : disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    >
      <Text style={[type.chip, { color: getTextColor() }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
});
