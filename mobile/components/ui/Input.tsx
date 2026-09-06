import React, { useState, useRef, useEffect } from 'react';
import { TextInput, StyleSheet, TextInputProps, View, Pressable, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from './Card';
import * as Haptics from '../../utils/haptics';
import { useThemeColors } from '../../constants/Colors';

type ValidationState = 'idle' | 'valid' | 'invalid';

interface InputProps extends TextInputProps {
  onPaste?: () => void;
  onClear?: () => void;
  validationState?: ValidationState;
}

export function Input({ onPaste, onClear, style, validationState = 'idle', ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const prevState = useRef<ValidationState>('idle');
  const { colors } = useThemeColors();

  useEffect(() => {
    let toValue = 0;
    if (validationState === 'valid') toValue = 2;
    else if (validationState === 'invalid') toValue = 3;
    else if (isFocused) toValue = 1;
    Animated.timing(borderAnim, { toValue, duration: 200, useNativeDriver: false }).start();
  }, [isFocused, validationState]);

  useEffect(() => {
    if (validationState !== 'idle' && prevState.current === 'idle') {
      iconScale.setValue(0);
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }).start();
    } else if (validationState === 'idle') {
      Animated.timing(iconScale, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
    prevState.current = validationState;
  }, [validationState]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [colors.border, colors.primary, colors.success, colors.error],
  });

  return (
    <Card borderRadius={8} style={styles.wrapper}>
      <Animated.View style={[styles.container, { borderColor }]}>
        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          {...props}
        />
        <View style={styles.icons}>
          {onClear && props.value && String(props.value).length > 0 && (
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClear(); }} hitSlop={10} style={styles.clearButton}>
              <Feather name="x" size={14} color={colors.textSecondary} />
            </Pressable>
          )}
          {validationState !== 'idle' && (
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              <Feather name={validationState === 'valid' ? 'check-circle' : 'x-circle'} size={16} color={validationState === 'valid' ? colors.success : colors.error} />
            </Animated.View>
          )}
          {onPaste && (
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPaste?.(); }} hitSlop={10} style={styles.pasteButton}>
              <Feather name="clipboard" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  container: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, backgroundColor: 'transparent', minHeight: 48, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearButton: { padding: 4 },
  pasteButton: { padding: 4, marginLeft: 4 },
});
