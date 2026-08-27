import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useComparisonStore, Product } from '../../store/useComparisonStore';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProductCard } from '../../components/comparison/ProductCard';
import { useThemeColors } from '../../constants/Colors';

export default function LibraryScreen() {
  const { recentComparisons } = useComparisonStore();
  const router = useRouter();
  const { colors } = useThemeColors();

  // Extract all unique products from past comparisons
  const allProducts = useMemo(() => {
    const map = new Map<string, Product>();
    recentComparisons.forEach(comp => {
      if (comp.result) {
        comp.result.products.forEach(p => {
          if (!map.has(p.id)) {
            map.set(p.id, p);
          }
        });
      }
    });
    return Array.from(map.values());
  }, [recentComparisons]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tech Library</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {allProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="folder" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Your library is empty.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Products you compare will automatically be saved here.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {allProducts.map((p, index) => (
              <View key={p.id} style={styles.cardWrapper}>
                <ProductCard product={p} index={index} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
  scroll: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cardWrapper: { width: '50%', paddingBottom: 16 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, padding: 24 },
  emptyText: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtext: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
