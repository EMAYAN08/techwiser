import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, Pressable, Animated, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from '../../utils/haptics';
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useThemeColors } from "../../constants/Colors";

// Mock autocomplete suggestions for demo
const MOCK_SUGGESTIONS: Record<string, string[]> = {
  mac: ["MacBook Pro 14\" M3 Pro", "MacBook Air 15\" M3", "MacBook Pro 16\" M3 Max"],
  dell: ["Dell XPS 15 9530", "Dell XPS 13 Plus", "Dell Inspiron 15"],
  iphone: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus"],
  galaxy: ["Samsung Galaxy S24 Ultra", "Samsung Galaxy S24+", "Samsung Galaxy A55"],
  sony: ["Sony WH-1000XM5", "Sony WF-1000XM5", "Sony Bravia XR A95L"],
  lg: ["LG OLED C3 55\"", "LG OLED C3 65\"", "LG UltraGear 27GN950"],
};

function getSuggestions(query: string): string[] {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  for (const key of Object.keys(MOCK_SUGGESTIONS)) {
    if (q.startsWith(key) || key.startsWith(q)) {
      return MOCK_SUGGESTIONS[key];
    }
  }
  return [];
}

interface NameInputProps {
  index: number;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
}

function NameInput({ index, value, onChange, onRemove }: NameInputProps) {
  const { colors } = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (!isFocused) setSuggestions([]);
  }, [isFocused]);

  const handleChange = (text: string) => {
    onChange(text);
    setSuggestions(isFocused ? getSuggestions(text) : []);
  };

  const handleSuggestion = (s: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(s);
    setSuggestions([]);
  };

  return (
    <View style={styles.inputBlock}>
      <Card borderRadius={8} style={styles.cardWrap}>
        <Animated.View style={[styles.inputRow, { borderColor }]}>
          <Feather name="search" size={15} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder={`Product ${index + 1} name`}
            placeholderTextColor={colors.textTertiary}
            value={value}
            onChangeText={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            returnKeyType="next"
            selectionColor={colors.primary}
          />
          {value.length > 0 && (
            <Pressable
              onPress={() => { onChange(""); setSuggestions([]); }}
              hitSlop={10}
              style={styles.clearBtn}
            >
              <Feather name="x" size={14} color={colors.textSecondary} />
            </Pressable>
          )}
          {onRemove && (
            <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
              <Feather name="minus-circle" size={15} color={colors.textTertiary} />
            </Pressable>
          )}
        </Animated.View>
      </Card>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <Card borderRadius={8} style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <React.Fragment key={s}>
              <Pressable
                onPress={() => handleSuggestion(s)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              >
                <Feather name="package" size={12} color={colors.textTertiary} />
                <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{s}</Text>
              </Pressable>
              {i < suggestions.length - 1 && <View style={[styles.suggDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </Card>
      )}
    </View>
  );
}

export function NameSearchGroup() {
  const { colors } = useThemeColors();
  const [names, setNames] = useState(["", ""]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const updateName = (index: number, value: string) => {
    const next = [...names];
    next[index] = value;
    setNames(next);
  };

  const addName = () => {
    if (names.length < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNames([...names, ""]);
    }
  };

  const removeName = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNames(names.filter((_, i) => i !== index));
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Info pill */}
      <View style={[styles.infoPill, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '40' }]}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          Type a product name - we search across all Canadian retailers
        </Text>
      </View>

      {names.map((name, index) => (
        <NameInput
          key={index}
          index={index}
          value={name}
          onChange={(v) => updateName(index, v)}
          onRemove={names.length > 2 ? () => removeName(index) : undefined}
        />
      ))}

      {names.length < 4 && (
        <Pressable
          onPress={addName}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '40' },
            pressed && { opacity: 0.7 }
          ]}
        >
          <Feather name="plus" size={14} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>Add product</Text>
        </Pressable>
      )}

      {/* Search button */}
      <View style={{ marginBottom: 16 }}>
        <Button
          title="Compare"
          variant="primary"
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          disabled={names.filter((n) => n.trim()).length < 2}
        />
      </View>

      {/* Coming soon note */}
      <View style={styles.comingSoonRow}>
        <View style={[styles.comingSoonLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.comingSoonNote, { color: colors.textTertiary }]}>Product name search - Phase 2</Text>
        <View style={[styles.comingSoonLine, { backgroundColor: colors.border }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#141414",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    flex: 1,
    lineHeight: 17,
  },
  inputBlock: {
    marginBottom: 10,
    zIndex: 10,
  },
  cardWrap: {
    marginBottom: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    color: "rgba(255,255,255,0.90)",
    fontSize: 15,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },
  removeBtn: {
    padding: 4,
    marginLeft: 2,
  },
  dropdown: {
    marginTop: 4,
    overflow: "hidden",
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  suggestionText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
  },
  suggDivider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 14,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2383E2",
    borderRadius: 8,
    height: 48,
    marginTop: 4,
    marginBottom: 16,
  },
  searchBtnDisabled: {
    opacity: 0.45,
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  comingSoonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  comingSoonLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E1E1E",
  },
  comingSoonNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.20)",
    fontWeight: "500",
  },
});
