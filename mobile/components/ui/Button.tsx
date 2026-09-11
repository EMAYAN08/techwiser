import React, { useRef } from "react";
import {
  StyleSheet,
  Text,
  Pressable,
  PressableProps,
  Animated,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: "primary" | "ghost";
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<any, ButtonProps>(
  ({ title, variant = "primary", style, onPress, disabled, icon, ...props }, ref) => {
    const scale = useRef(new Animated.Value(1)).current;
    const { colors } = useThemeColors();
    const isPrimary = variant === "primary";
    const labelColor = isPrimary ? colors.primaryBtnFg : colors.ink;

    const handlePressIn = (e: any) => {
      if (!disabled) {
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
      }
      props.onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
      if (!disabled) {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
      }
      props.onPressOut?.(e);
    };

    const handlePress = (e: any) => {
      if (!disabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }
    };

    return (
      <AnimatedPressable
        ref={ref}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        android_ripple={{ color: "transparent" }}
        style={[
          styles.button,
          isPrimary
            ? { backgroundColor: colors.primaryBtn }
            : {
                backgroundColor: "transparent",
                borderWidth: 1.5,
                borderColor: colors.ink,
              },
          { transform: [{ scale }], opacity: disabled ? 0.3 : 1 },
          style,
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        {...props}
      >
        <View style={styles.labelRow}>
          <Text style={[styles.text, { color: labelColor }]}>{title}</Text>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
        </View>
      </AnimatedPressable>
    );
  }
);

const styles = StyleSheet.create({
  button: {
    height: size.button,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radii.pill,
    paddingHorizontal: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    ...Typography.button,
  },
});
