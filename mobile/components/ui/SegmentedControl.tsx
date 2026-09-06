import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  LayoutChangeEvent,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import * as Haptics from "../../utils/haptics";

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedIndex,
  onChange,
  style,
}) => {
  const { colors, isDark } = useThemeColors();
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const itemWidth =
    containerWidth > 0 ? (containerWidth - 8) / options.length : 0;

  useEffect(() => {
    if (itemWidth > 0) {
      Animated.spring(translateX, {
        toValue: selectedIndex * itemWidth,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
  }, [selectedIndex, itemWidth, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handlePress = (index: number) => {
    if (index !== selectedIndex) {
      Haptics.selectionAsync();
      onChange(index);
    }
  };

  const thumbBackgroundColor = isDark ? colors.spotify : colors.ink;
  const thumbTextColor = isDark ? colors.spotifyInk : "#FFFFFF";

  return (
    <View
      style={[styles.container, { backgroundColor: colors.fog }, style]}
      onLayout={handleLayout}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: itemWidth,
              backgroundColor: thumbBackgroundColor,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={option}
            style={styles.option}
            onPress={() => handlePress(index)}
          >
            <Text
              style={[
                type.button,
                { color: isSelected ? thumbTextColor : colors.stone },
                styles.text,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    padding: 4,
    alignItems: "center",
    position: "relative",
  },
  thumb: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999, // Pill radius
  },
  option: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  text: {
    textAlign: "center",
  },
});
