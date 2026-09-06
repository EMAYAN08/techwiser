import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { useThemeColors } from "../../constants/Colors";
import { radii } from "../../constants/Layout";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  borderRadius?: number;
}

export function Card({ children, borderRadius = radii.card, style, ...props }: CardProps) {
  const { colors } = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  pad: { padding: 16 },
});
