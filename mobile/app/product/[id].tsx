import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useComparisonStore } from '../../store/useComparisonStore';
import { Button } from '../../components/ui/Button';
import { useThemeColors } from '../../constants/Colors';

export default function ProductDetailScreen() {
  const { colors } = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recentComparisons, setUrls } = useComparisonStore();

  const product = useMemo(() => {
    for (const comp of recentComparisons) {
      if (comp.result) {
        const found = comp.result.products.find(p => p.id === id);
        if (found) return found;
      }
    }
    return null;
  }, [id, recentComparisons]);

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Feather name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Product details not found.</Text>
        <Button title="Go Back" variant="primary" onPress={() => router.back()} />
      </View>
    );
  }

  const handleCompare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUrls([product.url, '']);
    router.navigate('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: product.name, headerBackTitle: 'Back' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.retailerBadge, { backgroundColor: product.retailerColor || '#333' }]}>
            <Text style={styles.retailerText}>{product.retailer}</Text>
          </View>
          <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
          <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
          {product.price && <Text style={[styles.price, { color: colors.success }]}>{product.price}</Text>}
        </View>

        {/* AI Summary */}
        {product.aiSummary && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.aiHeader}>
              <Feather name="zap" size={16} color={colors.ai} />
              <Text style={[styles.aiTitle, { color: colors.ai }]}>AI Summary</Text>
            </View>
            <Text style={[styles.aiSummary, { color: colors.textSecondary }]}>{product.aiSummary}</Text>
            
            {product.badges && product.badges.length > 0 && (
              <View style={styles.badgesRow}>
                {product.badges.map((badge, i) => (
                  <View key={i} style={[styles.badge, { backgroundColor: colors.aiMuted, borderColor: colors.ai }]}>
                    <Text style={[styles.badgeText, { color: colors.ai }]}>{badge}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Specs List */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Specifications</Text>
          {(product.rawSpecs && product.rawSpecs.length > 0 ? product.rawSpecs : (product.specs || [])).map((spec: any, index: number, arr: any[]) => (
            <View key={index} style={[styles.specRow, { borderBottomColor: colors.border }, index === arr.length - 1 && styles.noBorder]}>
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{spec.label}</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>{spec.value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title="Compare with another"
          variant="primary"
          onPress={handleCompare}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 24, paddingBottom: 100 },
  center: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: 'rgba(255,255,255,0.6)', marginTop: 16, marginBottom: 24 },
  
  header: { marginBottom: 24 },
  retailerBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 12 },
  retailerText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  brand: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 },
  productName: { color: '#FFF', fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8 },
  price: { color: '#10B981', fontSize: 18, fontWeight: '600' },

  card: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 16, padding: 20, marginBottom: 16 },
  
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  aiTitle: { color: '#A259FF', fontSize: 14, fontWeight: '600' },
  aiSummary: { color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: 'rgba(162, 89, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(162, 89, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#A259FF', fontSize: 12, fontWeight: '600' },

  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 16 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  noBorder: { borderBottomWidth: 0 },
  specLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, flex: 1, paddingRight: 16 },
  specValue: { color: '#FFF', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0A0A0A',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  }
});
