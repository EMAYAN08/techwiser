import React, { useState, useRef, useEffect } from "react";
import { TextInput, StyleSheet, TextInputProps, View, Pressable, Animated } from "react-native";
import { Clipboard as ClipboardIcon, X, CheckCircle2, XCircle } from "lucide-react-native";
import * as ExpoClipboard from "expo-clipboard";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { fonts } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";

type ValidationState = "idle" | "valid" | "invalid";

interface InputProps extends TextInputProps {
  /** Called with clipboard text when the user taps paste. */
  onPaste?: (text: string) => void;
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
    outputRange: [colors.fieldBorder, colors.ink, colors.spotify, colors.error],
  });

  const handleFallbackPaste = async () => {
    try {
      const text = await ExpoClipboard.getStringAsync();
      const trimmed = text?.trim() ?? "";
      if (trimmed) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPaste?.(trimmed);
    } catch {
      onPaste?.("");
    }
  };

  const renderPasteControl = () => {
    if (!onPaste) return null;

    if (ExpoClipboard.isPasteButtonAvailable) {
      return (
        <ExpoClipboard.ClipboardPasteButton
          displayMode="iconOnly"
          acceptedContentTypes={["plain-text", "url"]}
          backgroundColor={colors.fog}
          foregroundColor={colors.placeholder}
          cornerStyle="small"
          style={styles.pasteBtn}
          onPress={(data) => {
            if (data.type === "text" && data.text?.trim()) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPaste(data.text.trim());
            } else {
              onPaste("");
            }
          }}
        />
      );
    }

    return (
      <Pressable onPress={handleFallbackPaste} hitSlop={10} style={styles.iconBtn}>
        <ClipboardIcon size={16} color={colors.placeholder} strokeWidth={2.25} />
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor,
            // Soft lift so white fields separate from paper bg (web + iOS)
            shadowColor: "#0A0A0A",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            elevation: 1,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.ink }, style]}
          placeholderTextColor={colors.placeholder}
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
              <X size={14} color={colors.placeholder} strokeWidth={2.25} />
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
          {renderPasteControl()}
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
    borderWidth: 1.5,
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
  pasteBtn: { width: 28, height: 28 },
});
