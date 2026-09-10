import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Trophy } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";

type Palette = ReturnType<typeof useThemeColors>["colors"];

export interface DetailedSpecValue {
  productId: string;
  productName: string;
  productColor: string;
  displayValue: string;
  numericValue: number | null;
  isWinner: boolean;
  isDraw: boolean;
}

export interface DetailedSpecRow {
  label: string;
  unit?: string;
  values: DetailedSpecValue[];
}

interface SpecBarRowProps {
  row: DetailedSpecRow;
  colors: Palette;
}

function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return name;
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.length > 10 ? first.slice(0, 10) : first;
}

interface TwoColCardProps {
  value: DetailedSpecValue;
  colors: Palette;
}

function TwoColCard({ value, colors }: TwoColCardProps) {
  const isWinner = value.isWinner && !value.isDraw;
  return (
    <View
      style={[
        styles.twoColCard,
        {
          backgroundColor: isWinner ? colors.spotifyWash : colors.fog,
          borderColor: isWinner ? colors.spotify : "transparent",
        },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={isWinner ? `${value.displayValue}. Winner.` : value.displayValue}
    >
      {isWinner && (
        <View style={[styles.trophyWrap, { backgroundColor: colors.spotify }]}>
          <Trophy size={9} color={colors.spotifyInk} strokeWidth={2.5} />
        </View>
      )}
      <Text
        style={[styles.twoColName, { color: isWinner ? colors.ink : colors.stone }]}
        numberOfLines={1}
      >
        {shortName(value.productName)}
      </Text>
      <Text
        style={[styles.twoColValue, { color: isWinner ? colors.ink : colors.body }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value.displayValue}
      </Text>
    </View>
  );
}

interface StackedRowProps {
  value: DetailedSpecValue;
  pct: number;
  fillColor: string;
  colors: Palette;
}

function StackedRow({ value, pct, fillColor, colors }: StackedRowProps) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      if (enabled) {
        width.setValue(pct);
        return;
      }
      Animated.timing(width, {
        toValue: pct,
        duration: 400,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [pct, width]);

  const interpolatedWidth = width.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${pct * 100}%`],
  });

  const isWinner = value.isWinner && !value.isDraw;
  const valueColor = isWinner ? colors.ink : colors.body;
  const nameColor = isWinner ? colors.ink : colors.stone;

  return (
    <View style={styles.stackedRow}>
      <View style={styles.stackedTopRow}>
        {isWinner && (
          <View style={[styles.stackedDot, { backgroundColor: colors.spotify }]} />
        )}
        <Text style={[styles.stackedName, { color: nameColor }]} numberOfLines={1}>
          {shortName(value.productName)}
        </Text>
        <Text style={[styles.stackedValue, { color: valueColor }]} numberOfLines={1}>
          {value.displayValue}
        </Text>
      </View>
      <View style={[styles.stackedTrack, { backgroundColor: colors.fog }]}>
        <Animated.View
          style={[
            styles.stackedFill,
            {
              width: interpolatedWidth,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function SpecBarRow({ row, colors }: SpecBarRowProps) {
  const values = row.values;

  const allMissing = useMemo(
    () => values.every((v) => !v.displayValue || v.displayValue === "—"),
    [values]
  );

  const hasNumeric = useMemo(
    () => values.some((v) => v.numericValue !== null),
    [values]
  );

  const max = useMemo(
    () => Math.max(...values.map((v) => v.numericValue ?? 0)),
    [values]
  );

  const pctFor = (v: DetailedSpecValue): number => {
    if (max <= 0) return 0.5;
    if (v.numericValue === null) return 0.5;
    const p = v.numericValue / max;
    return Math.max(0.05, Math.min(1, p));
  };

  const fillColorFor = (v: DetailedSpecValue): string => {
    return v.isWinner && !v.isDraw ? colors.spotify : colors.stone;
  };

  return (
    <View style={styles.outer}>
      <Text style={[styles.label, { color: colors.stone }]}>{row.label}</Text>

      {allMissing ? (
        <Text style={[styles.missing, { color: colors.stone }]}>
          Not enough verified info
        </Text>
      ) : values.length <= 2 ? (
        <View style={styles.twoColRow}>
          {values.map((v) => (
            <TwoColCard key={v.productId} value={v} colors={colors} />
          ))}
        </View>
      ) : !hasNumeric ? (
        <View style={styles.stackedList}>
          {values.map((v) => {
            const win = v.isWinner && !v.isDraw;
            return (
              <View key={v.productId} style={styles.textOnlyRow}>
                <Text
                  style={[styles.textOnlyName, { color: win ? colors.ink : colors.stone }]}
                  numberOfLines={1}
                >
                  {shortName(v.productName)}
                </Text>
                <Text
                  style={[styles.textOnlyValue, { color: win ? colors.ink : colors.body }]}
                  numberOfLines={1}
                >
                  {v.displayValue}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.stackedList}>
          {values.map((v) => (
            <StackedRow
              key={v.productId}
              value={v}
              pct={pctFor(v)}
              fillColor={fillColorFor(v)}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingVertical: 14,
  },
  label: {
    ...type.specLabel,
    marginBottom: 10,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  twoColCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    borderRadius: radii.spec,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  trophyWrap: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  twoColName: {
    ...type.eyebrow,
    fontSize: 11,
    marginBottom: 6,
  },
  twoColValue: {
    ...type.specValue,
    textAlign: "center",
  },
  stackedList: {
    gap: 12,
  },
  stackedRow: {
    gap: 6,
  },
  stackedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stackedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stackedName: {
    ...type.body,
    flex: 1,
    fontSize: 13,
  },
  stackedValue: {
    ...type.specValue,
    fontSize: 14,
    textAlign: "right",
    minWidth: 80,
  },
  stackedTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  stackedFill: {
    height: "100%",
    borderRadius: 2,
  },
  textOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  textOnlyName: {
    ...type.body,
    fontSize: 13,
    flex: 1,
  },
  textOnlyValue: {
    ...type.specValue,
    fontSize: 14,
    textAlign: "right",
  },
  missing: {
    ...type.caption,
    fontStyle: "italic",
    paddingVertical: 8,
  },
});
