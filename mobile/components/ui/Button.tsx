import React, { useRef } from 'react';
import { StyleSheet, Text, Pressable, PressableProps, Animated, View, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../../constants/Colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export const Button = React.forwardRef<any, ButtonProps>(
  ({ title, variant = 'primary', style, onPress, disabled, ...props }, ref) => {
    const scale = useRef(new Animated.Value(1)).current;
    const { colors } = useThemeColors();

    const handlePressIn = (e: any) => {
      if (!disabled) {
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
      }
      props.onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
      if (!disabled) {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }
      props.onPressOut?.(e);
    };

    const handlePress = (e: any) => {
      if (!disabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }
    };

    const isPrimary = variant === 'primary';

    return (
      <AnimatedPressable
        ref={ref}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.button,
          isPrimary ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border },
          { transform: [{ scale }], opacity: disabled ? 0.6 : 1 },
          style,
        ]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        {...props}
      >
        {isPrimary && <View style={[StyleSheet.absoluteFillObject, styles.innerHighlight]} />}
        <Text style={[styles.text, isPrimary ? { color: "#FFFFFF" } : { color: colors.textSecondary }]}>
          {title}
        </Text>
      </AnimatedPressable>
    );
  }
);

const styles = StyleSheet.create({
  button: { height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, paddingHorizontal: 24, overflow: 'hidden' },
  innerHighlight: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 8 },
  text: { fontSize: 15, fontWeight: '600' },
});
