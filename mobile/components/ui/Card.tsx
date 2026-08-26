import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useThemeColors } from '../../constants/Colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  borderRadius?: number;
}

export function Card({ children, borderRadius = 8, style, ...props }: CardProps) {
  const { colors } = useThemeColors();
  return (
    <View style={[{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius }, style]} {...props}>
      {children}
    </View>
  );
}
