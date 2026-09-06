import React, { useState, useRef, useEffect } from "react";
import { TextInput, StyleSheet, TextInputProps, View, Pressable, Animated } from "react-native";
import { Clipboard, X, CheckCircle2, XCircle } from "lucide-react-native";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { fonts } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";

type ValidationState = "idle" | "valid" | "invalid";

interface InputProps extends TextInputProps {
  onPaste?: () => void;
  onClear?: () => void;
  validationState?: ValidationState;
}

export function Input({ onPaste, onClear, style, validationState = "idle", ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const prevState = useRef<ValidationState>("idle");
  const { colors } = useThemeColors();

  useEffect(() => {
    let toValue = 0;
    if (validationState === "valid") toValue = 2;
    else if (validationState === "invalid") toValue = 3;
    else if (isFocused) toValue = 1;
    Animated.timing(borderAnim, { toValue, duration: 200, useNativeDriver: false }).start();
  }, [isFocused, validationState, borderAnim]);

  useEffect(() => {
    if (validationState !== "idle" && prevState.current === "idle") {
      iconScale.setValue(0);
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }).start();
    } else if (validationState === "idle") {
      Animated.timing(iconScale, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
    prevState.current = validationState;
  }, [validationState, iconScale]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [colors.line, colors.ink, colors.spotify, colors.error],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { backgroundColor: colors.surface, borderColor }]}>
        <TextInput
          style={[styles.input, { color: colors.ink }, style]}
          placeholderTextColor={colors.stone}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          selectionColor={colors.spotify}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType="url"
          {...props}
        />
        <View style={styles.icons}>
          {onClear && props.value && String(props.value).length > 0 ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClear();
              }}
              hitSlop={10}
              style={styles.iconBtn}
            >
              <X size={14} color={colors.stone} strokeWidth={2.25} />
            </Pressable>
          ) : null}
          {validationState !== "idle" ? (
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              {validationState === "valid" ? (
                <CheckCircle2 size={16} color={colors.spotify} strokeWidth={2.25} />
              ) : (
                <XCircle size={16} color={colors.error} strokeWidth={2.25} />
              )}
            </Animated.View>
          ) : null}
          {onPaste ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPaste?.();
              }}
              hitSlop={10}
              style={styles.iconBtn}
            >
              <Clipboard size={16} color={colors.stone} strokeWidth={2.25} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.field,
    minHeight: size.field,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.uiRegular,
    paddingVertical: 12,
  },
  icons: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 4 },
});
