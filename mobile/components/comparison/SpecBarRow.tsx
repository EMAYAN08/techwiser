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
import { Fonts, Typography } from "../../constants/Typography";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return name;
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.length > 10 ? first.slice(0, 10) : first;
}

// ---------------------------------------------------------------------------
// Two-column comparison card (2 products)
// ---------------------------------------------------------------------------

interface TwoColCardProps {
  value: DetailedSpecValue;
  colors: Palette;
  isLast: boolean;
}

function TwoColCard({ value, colors, isLast }: TwoColCardProps) {
  const isWinner = value.isWinner && !value.isDraw;
  return (
    <View
      style={[
        styles.twoColCard,
        {
          backgroundColor: isWinner ? colors.successMuted : colors.surface,
          borderColor: isWinner ? colors.success : colors.border,
        },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        isWinner
          ? `${value.displayValue}. Winner.`
          : value.displayValue
      }
    >
      {isWinner && (
        <View style={[styles.trophyWrap, { backgroundColor: colors.success }]}>
          <Trophy size={9} color={colors.background} strokeWidth={2.5} />
        </View>
      )}
      <Text
        style={[
          styles.twoColName,
          { color: isWinner ? colors.success : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {shortName(value.productName)}
      </Text>
      <Text
        style={[
          styles.twoColValue,
          {
            color: isWinner ? colors.success : colors.text,
            fontFamily: Fonts.mono,
          },
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value.displayValue}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stacked row (3+ products) with animated thin bar
// ---------------------------------------------------------------------------

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
  const valueColor = isWinner ? colors.success : colors.text;
  const nameColor = isWinner ? colors.success : colors.textSecondary;

  return (
    <View style={styles.stackedRow}>
      <View style={styles.stackedTopRow}>
        {isWinner && (
          <View style={[styles.stackedDot, { backgroundColor: colors.success }]} />
        )}
        <Text
          style={[styles.stackedName, { color: nameColor }]}
          numberOfLines={1}
        >
          {shortName(value.productName)}
        </Text>
        <Text
          style={[
            styles.stackedValue,
            { color: valueColor, fontFamily: Fonts.mono },
          ]}
          numberOfLines={1}
        >
          {value.displayValue}
        </Text>
      </View>
      <View
        style={[
          styles.stackedTrack,
          { backgroundColor: colors.surfaceHighlight },
        ]}
      >
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

// ---------------------------------------------------------------------------
// Public row
// ---------------------------------------------------------------------------

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

  const hasDraw = useMemo(
    () => values.some((v) => v.isDraw),
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
    if (hasDraw) return colors.textTertiary;
    return v.isWinner ? colors.success : colors.textTertiary;
  };

  return (
    <View style={styles.outer}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {row.label}
      </Text>

      {allMissing ? (
        <Text style={[styles.missing, { color: colors.textTertiary }]}>
          Not enough verified info
        </Text>
      ) : values.length <= 2 ? (
        <View style={styles.twoColRow}>
          {values.map((v, i) => (
            <TwoColCard
              key={v.productId}
              value={v}
              colors={colors}
              isLast={i === values.length - 1}
            />
          ))}
        </View>
      ) : !hasNumeric ? (
        // 3+ products with no numeric values: just stack name + value.
        <View style={styles.stackedList}>
          {values.map((v) => (
            <View key={v.productId} style={styles.textOnlyRow}>
              <Text
                style={[styles.textOnlyName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {shortName(v.productName)}
              </Text>
              <Text
                style={[
                  styles.textOnlyValue,
                  {
                    color: v.isWinner ? colors.success : colors.text,
                    fontFamily: Fonts.mono,
                  },
                ]}
                numberOfLines={1}
              >
                {v.displayValue}
              </Text>
            </View>
          ))}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outer: {
    paddingVertical: 14,
  },
  label: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // Two-column cards
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  twoColCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  twoColValue: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
  },

  // Stacked rows (3+)
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
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  stackedValue: {
    fontSize: 14,
    fontWeight: "600",
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

  // Text-only rows (3+ non-numeric)
  textOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  textOnlyName: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  textOnlyValue: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },

  // Missing
  missing: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },
});
