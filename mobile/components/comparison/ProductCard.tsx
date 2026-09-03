import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../ui/Card';
import { useThemeColors, getRetailerColor, formatRetailerName } from '../../constants/Colors';

function AIBadge({ label }: { label: string }) {
  const { colors } = useThemeColors();
  return (
    <View style={[styles.aiBadge, { backgroundColor: colors.aiMuted }]}>
      <Text style={[styles.aiBadgeText, { color: colors.ai }]}>? {label}</Text>
    </View>
  );
}

export function ProductCard({ product, index }: { product: any; index: number }) {
  const { colors } = useThemeColors();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const color = getRetailerColor(product.retailer);

  return (
    <Animated.View style={[{ flex: 1, marginHorizontal: 4 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Pressable onPress={() => router.push(`/product/${product.id}`)}>
        <Card borderRadius={12} style={styles.productCard}>
          <View style={[styles.badge, { borderColor: color }]}>
            <Text style={[styles.badgeText, { color: color }]}>
              {formatRetailerName(product.retailer).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.price && (
            <Text style={[styles.productPrice, { color: colors.text }]}>{product.price}</Text>
          )}
          
          <View style={styles.badgesContainer}>
            {product.badges?.slice(0, 2).map((b: string) => <AIBadge key={b} label={b} />)}
            {(product.badges?.length || 0) > 2 && (
              <View style={[styles.aiBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={[styles.aiBadgeText, { color: 'rgba(255,255,255,0.6)' }]}>+{(product.badges?.length || 0) - 2}</Text>
              </View>
            )}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  productCard: { padding: 14, height: 170, display: 'flex', flexDirection: 'column' },
  productName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.88)', marginVertical: 6, lineHeight: 18 },
  productPrice: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 'auto' },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  aiBadge: { backgroundColor: 'rgba(35,131,226,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  aiBadgeText: { fontSize: 10, color: '#2383E2', fontWeight: '600' },
});
