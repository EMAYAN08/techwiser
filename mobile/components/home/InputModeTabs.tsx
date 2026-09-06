import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Typography } from "../../constants/Typography";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "../../utils/haptics";
import { useThemeColors } from "../../constants/Colors";
import { radii, size } from "../../constants/Layout";

export type InputMode = "url" | "name" | "upc" | "qr";

interface Tab {
  id: InputMode;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}

const TABS: Tab[] = [
  { id: "url", label: "URL", icon: "link" },
  { id: "name", label: "Name", icon: "search" },
  { id: "upc", label: "Barcode", icon: "maximize" },
  { id: "qr", label: "QR Code", icon: "camera" },
];

interface InputModeTabsProps {
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export function InputModeTabs({ activeMode, onModeChange }: InputModeTabsProps) {
  const { colors, isDark } = useThemeColors();
  const scales = useRef(TABS.map(() => new Animated.Value(1))).current;

  const handlePress = (tab: Tab, index: number) => {
    Animated.sequence([
      Animated.timing(scales[index], { toValue: 0.94, duration: 70, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1, useNativeDriver: true, tension: 180, friction: 7 }),
    ]).start();

    if (tab.id !== activeMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onModeChange(tab.id);
    }
  };

  const selectedBg = isDark ? colors.spotify : colors.ink;
  const selectedFg = isDark ? colors.spotifyInk : "#FFFFFF";

  return (
    <View style={[styles.container, { backgroundColor: colors.fog }]}>
      {TABS.map((tab, index) => {
        const isActive = activeMode === tab.id;
        return (
          <Animated.View
            key={tab.id}
            style={[styles.tabWrapper, { transform: [{ scale: scales[index] }] }]}
          >
            <Pressable
              onPress={() => handlePress(tab, index)}
              style={[styles.tab, isActive && { backgroundColor: selectedBg }]}
            >
              <Feather
                name={tab.icon}
                size={15}
                color={isActive ? selectedFg : colors.stone}
              />
              <Text
                style={[
                  styles.label,
                  { color: isActive ? selectedFg : colors.stone },
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
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
    borderRadius: radii.field,
    padding: 4,
    height: size.segment,
    alignItems: "center",
  },
  tabWrapper: {
    flex: 1,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: radii.pill,
    gap: 3,
    height: size.segment - 8,
  },
  label: {
    ...Typography.chip,
    fontSize: 11,
    textAlign: "center",
  },
  labelActive: {
    fontFamily: Typography.button.fontFamily,
  },
});
