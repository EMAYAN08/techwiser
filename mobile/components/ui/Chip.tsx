import React from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useThemeColors, paletteTokens } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import * as Haptics from "../../utils/haptics";
import { radii, size } from "../../constants/Layout";

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
  const { colors } = useThemeColors();

  const handlePress = (e: any) => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(e);
    }
  };

  const backgroundColor =
    variant === "selected"
      ? paletteTokens.ink
      : variant === "overflow"
        ? colors.fog
        : "transparent";
  const textColor =
    variant === "selected" ? "#FFFFFF" : variant === "overflow" ? colors.stone : colors.ink;
  const borderColor = variant === "tag" ? colors.spotify : "transparent";
  const borderWidth = variant === "tag" ? 1.5 : 0;

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          opacity: pressed ? 0.72 : disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    >
      <Text style={[type.chip, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: size.chip,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
});
