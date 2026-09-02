import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useComparisonStore, Comparison } from '../../store/useComparisonStore';
import { useRouter } from 'expo-router';
import { Card } from '../ui/Card';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../../constants/Colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ComparisonCard({ comparison, index }: { comparison: Comparison; index: number }) {
  const { colors } = useThemeColors();
  const router = useRouter();
  const setActiveComparison = useComparisonStore((state) => state.setActiveComparison);
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 50 + 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (comparison.result) {
      setActiveComparison(comparison.result);
      router.push("/compare");
    }
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.cardWrapper, { transform: [{ scale }] }]}
      >
        <Card borderRadius={12} style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{comparison.title}</Text>
          <Text style={[styles.cardDate, { color: colors.textTertiary }]}>{comparison.date}</Text>
        </Card>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function RecentComparisons() {
  const { colors } = useThemeColors();
  const { recentComparisons } = useComparisonStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 150,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (recentComparisons.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.header, { opacity: fadeAnim, color: colors.textTertiary }]}>
        RECENT
      </Animated.Text>
      {recentComparisons.map((comp, index) => (
        <ComparisonCard key={comp.id} comparison={comp} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },
  header: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.38)',
    marginBottom: 16,
    letterSpacing: 1.2,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.38)',
  },
});
