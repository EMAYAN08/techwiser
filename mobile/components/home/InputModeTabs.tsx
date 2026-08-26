import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "../../constants/Colors";

export type InputMode = "url" | "name" | "upc" | "qr";

interface Tab {
  id: InputMode;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}

const TABS: Tab[] = [
  { id: "url",  label: "URL",      icon: "link"    },
  { id: "name", label: "Name",     icon: "search"  },
  { id: "upc",  label: "Barcode",  icon: "maximize"},
  { id: "qr",   label: "QR Code",  icon: "camera"  },
];

interface InputModeTabsProps {
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export function InputModeTabs({ activeMode, onModeChange }: InputModeTabsProps) {
  const { colors } = useThemeColors();
  const scales = useRef(TABS.map(() => new Animated.Value(1))).current;

  const handlePress = (tab: Tab, index: number) => {
    Animated.sequence([
      Animated.timing(scales[index], { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1, useNativeDriver: true, tension: 180, friction: 7 }),
    ]).start();

    if (tab.id !== activeMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onModeChange(tab.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {TABS.map((tab, index) => {
        const isActive = activeMode === tab.id;
        return (
          <Animated.View
            key={tab.id}
            style={[styles.tabWrapper, { transform: [{ scale: scales[index] }] }]}
          >
            <Pressable
              onPress={() => handlePress(tab, index)}
              style={[styles.tab, isActive && { backgroundColor: colors.primary }]}
            >
              <Feather
                name={tab.icon}
                size={16}
                color={isActive ? "#FFFFFF" : colors.textTertiary}
              />
              <Text style={[styles.label, { color: isActive ? "#FFFFFF" : colors.textTertiary }, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 4,
    marginBottom: 24,
  },
  tabWrapper: {
    flex: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
    gap: 4,
  },
  tabActive: {
    backgroundColor: "#2383E2",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.40)",
    textAlign: "center",
  },
  labelActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

