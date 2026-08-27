import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore, ThemePreference } from '../../store/useThemeStore';
import { useThemeColors } from '../../constants/Colors';

export default function SettingsScreen() {
  const { preference, setPreference } = useThemeStore();
  const { colors } = useThemeColors();

  const handleSelect = (pref: ThemePreference) => {
    if (preference !== pref) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPreference(pref);
    }
  };

  const GenericOption = ({ label, icon, isDestructive = false }: { label: string, icon: any, isDestructive?: boolean }) => {
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.option,
          pressed && { backgroundColor: colors.primaryMuted }
        ]}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        <Feather name={icon} size={18} color={isDestructive ? colors.error : colors.textSecondary} />
        <Text style={[styles.optionText, { color: isDestructive ? colors.error : colors.text }]}>
          {label}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
      </Pressable>
    );
  };

  const SegmentedControl = () => {
    const options: { id: ThemePreference; icon: any }[] = [
      { id: 'system', icon: 'monitor' },
      { id: 'light', icon: 'sun' },
      { id: 'dark', icon: 'moon' },
    ];

    return (
      <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
        {options.map((opt) => {
          const isActive = preference === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => handleSelect(opt.id)}
              style={[
                styles.segmentButton,
                isActive && { backgroundColor: colors.border }
              ]}
            >
              <Feather 
                name={opt.icon} 
                size={15} 
                color={isActive ? colors.text : colors.textTertiary} 
              />
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          
          <View style={styles.appearanceRow}>
            <Text style={[styles.optionText, { color: colors.text }]}>Appearance</Text>
            <SegmentedControl />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <GenericOption label="Currency" icon="dollar-sign" />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DATA & STORAGE</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <GenericOption label="Clear Search History" icon="trash-2" isDestructive />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <GenericOption label="Privacy Policy" icon="shield" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <GenericOption label="Terms of Service" icon="file-text" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <GenericOption label="App Version 1.0.0" icon="info" />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  scroll: { padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4, marginTop: 16 },
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  appearanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingLeft: 16 },
  optionText: { fontSize: 15 },
  segmentContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 4, 
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, marginLeft: 46 },
});
