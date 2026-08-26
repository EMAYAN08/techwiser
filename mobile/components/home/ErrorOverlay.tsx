import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Button } from "../ui/Button";
import { useThemeColors } from "../../constants/Colors";

interface ErrorOverlayProps {
  visible: boolean;
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ErrorOverlay({ visible, message, onRetry, onDismiss }: ErrorOverlayProps) {
  const { colors, isDark } = useThemeColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: isDark ? "rgba(10, 10, 10, 0.85)" : "rgba(255, 255, 255, 0.85)", opacity: fadeAnim }]}>
      <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.errorMuted }]}>
          <Feather name="alert-triangle" size={28} color={colors.error} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Comparison Failed</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
        
        <View style={styles.buttonRow}>
          <Button variant="ghost" title="Cancel" onPress={onDismiss} style={styles.button} />
          <Button variant="primary" title="Try Again" onPress={onRetry} style={styles.button} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 10, 0.85)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(235, 87, 87, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
  }
});
