import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { useThemeColors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";

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

function normalizeShortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return name;
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.length > 8 ? first.slice(0, 8) : first;
}

interface BarFillProps {
  pct: number;
  color: string;
  trackHeight: number;
}

function BarFill({ pct, color, trackHeight }: BarFillProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const targetWidth = `${pct * 100}%`;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [anim, pct]);

  const widthInterpolated = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", targetWidth],
  });

  return (
    <Animated.View
      style={[
        styles.barFill,
        {
          width: widthInterpolated,
          height: trackHeight,
          borderRadius: trackHeight / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

interface TwoColProductRowProps {
  value: DetailedSpecValue;
  pct: number;
  fillColor: string;
  colors: Palette;
}

function TwoColProductRow({
  value,
  pct,
  fillColor,
  colors,
}: TwoColProductRowProps) {
  const valueColor = value.isWinner ? colors.success : colors.text;
  return (
    <View style={styles.perProductRow}>
      <View
        style={[styles.retailerDot, { backgroundColor: value.productColor }]}
      />
      <Text
        style={[styles.shortName, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {normalizeShortName(value.productName)}
      </Text>
      <View
        style={[
          styles.barTrack,
          { backgroundColor: colors.surfaceHighlight },
        ]}
      >
        <BarFill pct={pct} color={fillColor} trackHeight={8} />
      </View>
      <Text
        style={[
          styles.valueText,
          { color: valueColor, fontFamily: Fonts.mono },
        ]}
        numberOfLines={1}
      >
        {value.displayValue}
      </Text>
    </View>
  );
}

interface StackedProductRowProps {
  value: DetailedSpecValue;
  pct: number;
  fillColor: string;
  colors: Palette;
}

function StackedProductRow({
  value,
  pct,
  fillColor,
  colors,
}: StackedProductRowProps) {
  const valueColor = value.isWinner ? colors.success : colors.text;
  return (
    <View style={styles.stackedRow}>
      <View style={styles.stackedBarWrap}>
        <BarFill pct={pct} color={fillColor} trackHeight={6} />
      </View>
      <View style={styles.stackedRightCol}>
        <Text
          style={[styles.stackedName, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {normalizeShortName(value.productName)}
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
    </View>
  );
}

interface NonNumericChipsProps {
  values: DetailedSpecValue[];
  colors: Palette;
}

function NonNumericChips({ values, colors }: NonNumericChipsProps) {
  return (
    <View style={styles.chipsRow}>
      {values.map((v) => {
        const isWinner = v.isWinner;
        return (
          <View
            key={v.productId}
            style={[
              styles.chip,
              {
                backgroundColor: isWinner
                  ? colors.successMuted
                  : colors.surfaceHighlight,
                borderWidth: isWinner ? 1 : 0,
                borderColor: colors.success,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isWinner ? colors.success : colors.text },
              ]}
              numberOfLines={1}
            >
              <Text style={{ color: colors.textTertiary }}>
                {normalizeShortName(v.productName)} ·{" "}
              </Text>
              {v.displayValue}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function SpecBarRow({ row, colors }: SpecBarRowProps) {
  const values = row.values;

  const allMissing = useMemo(
    () => values.every((v) => !v.displayValue || v.displayValue === "—"),
    [values],
  );

  const hasNumeric = useMemo(
    () => values.some((v) => v.numericValue !== null),
    [values],
  );

  const hasAnyWinner = useMemo(
    () => values.some((v) => v.isWinner),
    [values],
  );

  const hasDraw = useMemo(
    () => values.some((v) => v.isDraw),
    [values],
  );

  const max = useMemo(
    () => Math.max(...values.map((v) => v.numericValue ?? 0)),
    [values],
  );

  const pctFor = (v: DetailedSpecValue): number => {
    if (max <= 0) return 0.5;
    if (v.numericValue === null) return 0.5;
    const p = v.numericValue / max;
    return Math.max(0.05, Math.min(1, p));
  };

  const barColorFor = (v: DetailedSpecValue): string => {
    if (hasDraw) return colors.textTertiary;
    return v.isWinner ? colors.success : colors.textTertiary;
  };

  return (
    <View style={styles.outer}>
      <View style={styles.labelRow}>
        {hasAnyWinner && (
          <Trophy size={12} color={colors.success} strokeWidth={2.25} />
        )}
        <Text style={[styles.labelText, { color: colors.text }]}>
          {row.label}
        </Text>
      </View>

      {allMissing ? (
        <Text style={[styles.missingText, { color: colors.textTertiary }]}>
          Not enough verified info
        </Text>
      ) : !hasNumeric ? (
        <NonNumericChips values={values} colors={colors} />
      ) : (
        values.map((v) => {
          const pct = pctFor(v);
          const fillColor = barColorFor(v);
          if (values.length <= 2) {
            return (
              <TwoColProductRow
                key={v.productId}
                value={v}
                pct={pct}
                fillColor={fillColor}
                colors={colors}
              />
            );
          }
          return (
            <StackedProductRow
              key={v.productId}
              value={v}
              pct={pct}
              fillColor={fillColor}
              colors={colors}
            />
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: "column",
    gap: 6,
    paddingVertical: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  perProductRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retailerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shortName: {
    width: 56,
    fontSize: 11,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 4,
  },
  valueText: {
    minWidth: 64,
    textAlign: "right",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  stackedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  stackedBarWrap: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  stackedRightCol: {
    width: 88,
  },
  stackedName: {
    fontSize: 10,
  },
  stackedValue: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  chipText: {
    fontSize: 12,
  },
  missingText: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
