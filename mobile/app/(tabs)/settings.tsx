import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Alert, Linking } from "react-native";
import { type } from "../../constants/Typography";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "../../utils/haptics";
import { useThemeStore, ThemePreference } from "../../store/useThemeStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useComparisonStore } from "../../store/useComparisonStore";
import { useThemeColors } from "../../constants/Colors";
import { radii, space } from "../../constants/Layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

export default function SettingsScreen() {
  const { preference, setPreference } = useThemeStore();
  const { hapticsEnabled, setHapticsEnabled } = useSettingsStore();
  const clearRecentComparisons = useComparisonStore((s) => s.clearRecentComparisons);
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const version = Constants.nativeApplicationVersion || Constants.expoConfig?.version || "1.0.0";

  const handleSelect = (pref: ThemePreference) => {
    if (preference !== pref) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPreference(pref);
    }
  };

  const Row = ({
    label,
    icon,
    onPress,
    trailing,
  }: {
    label: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    onPress?: () => void;
    trailing?: React.ReactNode;
  }) => (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && onPress && { backgroundColor: colors.fog }]}
      onPress={
        onPress
          ? () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress();
            }
          : undefined
      }
    >
      <Feather name={icon} size={18} color={colors.body} />
      <Text style={[styles.optionText, { color: colors.ink }]}>{label}</Text>
      {trailing ?? <Feather name="chevron-right" size={16} color={colors.stone} style={{ marginLeft: "auto" }} />}
    </Pressable>
  );

  const AppearanceControl = () => {
    const options: { id: ThemePreference; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
      { id: "system", icon: "monitor" },
      { id: "light", icon: "sun" },
      { id: "dark", icon: "moon" },
    ];
    return (
      <View style={[styles.segmentContainer, { backgroundColor: colors.fog }]}>
        {options.map((opt) => {
          const isActive = preference === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => handleSelect(opt.id)}
              style={[
                styles.segmentButton,
                isActive && { backgroundColor: colors.segmentSelectedBg },
              ]}
            >
              <Feather
                name={opt.icon}
                size={15}
                color={isActive ? colors.segmentSelectedFg : colors.stone}
              />
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.ink }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.stone }]}>Preferences</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.appearanceRow}>
            <Text style={[styles.optionText, { color: colors.ink }]}>Appearance</Text>
            <AppearanceControl />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <View style={styles.appearanceRow}>
            <Text style={[styles.optionText, { color: colors.ink }]}>Haptic Feedback</Text>
            <Switch
              value={hapticsEnabled}
              onValueChange={(value) => {
                setHapticsEnabled(value);
                if (value) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: colors.line, true: colors.spotify }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.line}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <Row
            label="Currency"
            icon="dollar-sign"
            trailing={<Text style={[styles.trailing, { color: colors.stone }]}>CAD</Text>}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.stone }]}>Data</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Row
            label="Clear search history"
            icon="trash-2"
            onPress={() =>
              Alert.alert("Clear search history", "This will remove your recent comparisons on this device.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Clear",
                  style: "destructive",
                  onPress: () => clearRecentComparisons(),
                },
              ])
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.stone }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Row
            label="Privacy Policy"
            icon="shield"
            onPress={() => Linking.openURL("https://github.com/EMAYAN08/techwiser")}
          />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <Row
            label="Terms of Service"
            icon="file-text"
            onPress={() => Linking.openURL("https://github.com/EMAYAN08/techwiser")}
          />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <Row
            label="App version"
            icon="info"
            trailing={<Text style={[styles.trailing, { color: colors.stone }]}>{version}</Text>}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: 16,
  },
  headerTitle: { ...type.screenTitle },
  scroll: { paddingHorizontal: space.gutter },
  sectionTitle: { ...type.eyebrow, marginBottom: 8, marginLeft: 4, marginTop: 20 },
  card: { borderWidth: 1, borderRadius: radii.cardSm, overflow: "hidden" },
  option: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, minHeight: 52 },
  appearanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    paddingLeft: 16,
    minHeight: 52,
  },
  optionText: { ...type.body, fontFamily: type.button.fontFamily, fontSize: 15 },
  trailing: { ...type.caption, marginLeft: "auto" },
  segmentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: radii.pill,
  },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
});
