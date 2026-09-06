import React from "react";
import {
  StyleSheet,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useThemeColors } from "../../constants/Colors";
import * as Haptics from "../../utils/haptics";

interface NavCircleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const NavCircle = React.forwardRef<any, NavCircleProps>(
  ({ style, onPress, disabled, children, ...props }, ref) => {
    const { colors } = useThemeColors();

    const handlePress = (e: any) => {
      if (!disabled && onPress) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(e);
      }
    };

    return (
      <Pressable
        ref={ref}
        onPress={onPress ? handlePress : undefined}
        disabled={disabled}
        style={({ pressed }) => [
          styles.circle,
          { backgroundColor: colors.fog },
          { opacity: pressed ? 0.72 : disabled ? 0.6 : 1 },
          style,
        ]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        {...props}
      >
        {children}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
