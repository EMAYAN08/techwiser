import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";
import { useThemeColors } from "../../constants/Colors";

interface EmptyStateProps {
  /** Illustration (usually a small SVG) shown above the copy. */
  illustration?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Dashed "empty slot" outline. Off for full-screen empty states. */
  outlined?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Quiet, theme-aware empty state: illustration, title, one line of help.
 * Fades in once so it doesn't pop when the list is cleared.
 */
export function EmptyState({ illustration, title, subtitle, outlined = true, style, testID }: EmptyStateProps) {
  const { colors } = useThemeColors();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 360,
      delay: 120,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={[
        styles.root,
        outlined && [styles.outlined, { borderColor: colors.line }],
        {
          opacity: fade,
          transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        },
        style,
      ]}
    >
      {illustration ? <View style={styles.art}>{illustration}</View> : null}
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.stone }]}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  outlined: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radii.cardSm,
  },
  art: { marginBottom: 16 },
  title: { ...type.productName, textAlign: "center", marginBottom: 6 },
  subtitle: { ...type.caption, textAlign: "center", maxWidth: 280 },
});
