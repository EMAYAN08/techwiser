import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useComparisonStore } from '../../store/useComparisonStore';
import { Button } from '../../components/ui/Button';
import { useThemeColors, getRetailerColor } from '../../constants/Colors';
import { exportProductToPDF } from '../../utils/exportPDF';

export default function ProductDetailScreen() {
  const { colors, isDark } = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recentComparisons, setUrls } = useComparisonStore();
  const insets = useSafeAreaInsets();

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

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await exportProductToPDF(product, isDark);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: product.name, headerBackTitle: 'Back' }} />
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 24) }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.retailerBadge, { backgroundColor: getRetailerColor(product.retailer) || '#333' }]}>
              <Text style={styles.retailerText}>{product.retailer}</Text>
            </View>
            <Pressable
              onPress={handleExport}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Export to PDF"
              style={({ pressed }) => [
                styles.backBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="share" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
        <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
        {product.price && <Text style={[styles.price, { color: colors.success }]}>{product.price}</Text>}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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

                {/* Description */}
        {product.description && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Feather name="align-left" size={18} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: 8 }]}>Overview</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{product.description}</Text>
          </View>
        )}

        {/* What's In The Box */}
        {product.whatsInTheBox && product.whatsInTheBox.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Feather name="box" size={18} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: 8 }]}>What's in the box</Text>
            </View>
            <View style={styles.listContainer}>
              {product.whatsInTheBox.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.bullet, { backgroundColor: colors.textSecondary }]} />
                  <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* User Insights */}
        {product.userInsights && (
          <View style={[styles.card, { backgroundColor: colors.surfaceHighlight, borderColor: colors.primary }]}>
            <View style={styles.sectionHeader}>
              <Feather name="users" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0, marginLeft: 8 }]}>User Insights & Reviews</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{product.userInsights}</Text>
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
        <View style={{ flex: 1 }}>
          <Button
            title="View Product"
            variant="ghost"
            onPress={() => Linking.openURL(product.url)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Compare"
            variant="primary"
            onPress={handleCompare}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 24, paddingTop: 16, paddingBottom: 100 },
  center: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: 'rgba(255,255,255,0.6)', marginTop: 16, marginBottom: 24 },
  
  header: { padding: 24, paddingBottom: 16, borderBottomWidth: 1, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  retailerBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
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

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bodyText: { fontSize: 15, lineHeight: 22 },
  listContainer: { marginTop: 4 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 12 },
  bullet: { width: 4, height: 4, borderRadius: 2, marginTop: 9, marginRight: 8 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    backgroundColor: '#0A0A0A',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  }
});


