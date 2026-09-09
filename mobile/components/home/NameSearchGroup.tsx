
import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Animated, TextInput, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "../../constants/Colors";
import { type, fonts } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import * as Haptics from "../../utils/haptics";
import { resolveProductNames } from "../../services/api";

const MOCK_SUGGESTIONS: Record<string, string[]> = {
  iphone: ["Apple iPhone 15 Pro", "Apple iPhone 14", "Apple iPhone 13 128GB"],
  ipad: ["Apple iPad Pro 11-inch", "Apple iPad Air (5th gen)"],
  macbook: ["Apple MacBook Air M3", "Apple MacBook Pro 14 M3 Pro"],
  samsung: ["Samsung Galaxy S24 Ultra", "Samsung Galaxy S24+", "Samsung Galaxy A55"],
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
    outputRange: [colors.line, colors.ink],
  });

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (!isFocused) setSuggestions([]);
  }, [isFocused, borderAnim]);

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
      <Animated.View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor }]}>
        <Feather name="search" size={15} color={colors.stone} style={styles.searchIcon} />
        <TextInput
          style={[styles.textInput, { color: colors.ink }]}
          placeholder={`Product ${index + 1} name`}
          placeholderTextColor={colors.stone}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          returnKeyType="next"
          selectionColor={colors.spotify}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChange("");
              setSuggestions([]);
            }}
            hitSlop={10}
            style={styles.clearBtn}
          >
            <Feather name="x" size={14} color={colors.stone} />
          </Pressable>
        ) : null}
        {onRemove ? (
          <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
            <Feather name="minus-circle" size={15} color={colors.stone} />
          </Pressable>
        ) : null}
      </Animated.View>

      {suggestions.length > 0 ? (
        <Card borderRadius={radii.field} style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <React.Fragment key={s}>
              <Pressable
                onPress={() => handleSuggestion(s)}
                style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.fog }]}
              >
                <Feather name="package" size={12} color={colors.stone} />
                <Text style={[styles.suggestionText, { color: colors.body }]}>{s}</Text>
              </Pressable>
              {i < suggestions.length - 1 ? <View style={[styles.suggDivider, { backgroundColor: colors.line }]} /> : null}
            </React.Fragment>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

interface NameSearchGroupProps {
  onCompare: (urls: string[]) => void;
  isLoading: boolean;
}

export function NameSearchGroup({ onCompare, isLoading }: NameSearchGroupProps) {
  const { colors } = useThemeColors();
  const [names, setNames] = useState(["", ""]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const updateName = (index: number, value: string) => {
    const next = [...names];
    next[index] = value;
    setNames(next);
  };

  const addName = () => {
    if (names.length < 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNames([...names, ""]);
    }
  };

  const removeName = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNames(names.filter((_, i) => i !== index));
  };

  const handleCompare = async () => {
    const validNames = names.map(n => n.trim()).filter(Boolean);
    if (validNames.length < 2) return;
    
    console.log(`[NameSearchGroup] User triggered compare with names:`, validNames);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsResolving(true);
    try {
      console.log(`[NameSearchGroup] Calling resolveProductNames API...`);
      const urls = await resolveProductNames(validNames);
      console.log(`[NameSearchGroup] Received resolved URLs from API:`, urls);
      
      if (!urls || urls.length === 0) {
        console.warn(`[NameSearchGroup] Zero products resolved.`);
        Alert.alert("Error", "Could not find any products matching those names.");
        return;
      }
      if (urls.length < 2) {
        console.warn(`[NameSearchGroup] Only 1 product resolved. Needed at least 2.`);
        Alert.alert("Warning", "Only found one product. Please check your spelling.");
        return;
      }
      
      console.log(`[NameSearchGroup] Successfully resolved ${urls.length} products! Passing to onCompare pipeline.`);
      onCompare(urls);
    } catch (e) {
      console.error(`[NameSearchGroup] Error resolving names:`, e);
      Alert.alert("Error", "Failed to search products.");
    } finally {
      setIsResolving(false);
    }
  };

  const disableCompare = names.filter((n) => n.trim()).length < 2 || isLoading || isResolving;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={[styles.infoPill, { backgroundColor: colors.fog }]}>
        <Feather name="info" size={14} color={colors.stone} />
        <Text style={[styles.infoText, { color: colors.body }]}>
          Type a product name - we search across Canadian retailers
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

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16, alignItems: "center" }}>
        {names.length < 3 ? (
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={addName}
              disabled={isLoading || isResolving}
              style={({ pressed }) => [styles.addBtn, { borderColor: colors.ink, opacity: pressed || isLoading || isResolving ? 0.4 : 1 }]}
            >
              <Feather name="plus" size={16} color={colors.ink} />
              <Text style={[styles.addBtnText, { color: colors.ink }]}>Add product</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            title={isResolving ? "Searching..." : "Compare"}
            variant="primary"
            onPress={handleCompare}
            disabled={disableCompare}
            style={{ width: "100%" }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.field,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  infoText: {
    ...type.caption,
    flex: 1,
  },
  inputBlock: {
    marginBottom: 12,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.field,
    minHeight: size.field,
    paddingHorizontal: 16,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.uiRegular,
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
  suggestionText: {
    ...type.caption,
  },
  suggDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: size.button,
  },
  addBtnText: {
    ...type.button,
    fontSize: 15,
  },
});

