import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Animated, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { URLInputGroup } from "../../components/home/URLInputGroup";
import { RecentComparisons } from "../../components/home/RecentComparisons";
import { LoadingOverlay } from "../../components/home/LoadingOverlay";
import { InputModeTabs, InputMode } from "../../components/home/InputModeTabs";
import { ComingSoonPanel } from "../../components/home/ComingSoonPanel";
import { NameSearchGroup } from "../../components/home/NameSearchGroup";
import { Button } from "../../components/ui/Button";
import { useComparisonStore } from "../../store/useComparisonStore";
import { useThemeColors } from "../../constants/Colors";

const RETAILER_COLORS: Record<string, string> = {
  "bestbuy.ca": "#003B64",
  "amazon.ca": "#FF9900",
  "canadacomputers.com": "#E31837",
  "memoryexpress.com": "#005BAA",
  "newegg.ca": "#E2241B",
  "staples.ca": "#CC0000",
  "thesource.ca": "#E4002B",
};

export default function Home() {
  const router = useRouter();
  const {
    urls,
    isLoading,
    setLoading,
    setActiveComparison,
    addRecentComparison,
    seedMockComparison,
  } = useComparisonStore();
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const { colors } = useThemeColors();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panelFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }, []);

  const handleModeChange = (mode: InputMode) => {
    Animated.timing(panelFade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setInputMode(mode);
      Animated.timing(panelFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const validUrls = urls.filter((url: string) => url.trim().length > 0);
  const canCompare = validUrls.length >= 2 && inputMode === "url";

  const handleCompare = async () => {
    if (!canCompare || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true, "Fetching product pages...");
    
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://techwiser.onrender.com";
      console.log(`Sending comparison to ${apiUrl}/api/compare`);

      const response = await fetch(`${apiUrl}/api/compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: validUrls }),
      });

      if (!response.ok) {
        throw new Error(`We couldn't reach the server or parsing failed (Error ${response.status}). Ensure your backend is running and the API key is valid.`);
      }

      const { data, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }
      
      setActiveComparison(data);
      addRecentComparison({
        id: data.id,
        title: `${data.products[0].name} vs ${data.products[1].name}`,
        date: "Just now",
        urls: validUrls,
        result: data,
      });
      setLoading(false);
      router.push("/compare");
    } catch (err: any) {
      console.log("Backend fetch failed:", err.message);
      setLoading(false);
      
      let msg = err.message || "Failed to extract specs.";
      if (msg.includes("Network request timed out") || msg.includes("Failed to fetch")) {
        msg = "The connection timed out. Please ensure your backend server is running and accessible on the same network.";
      }
      
      router.push({ pathname: "/error", params: { message: msg } });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LoadingOverlay visible={isLoading} />
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16 }}>
        <Animated.Text style={[styles.header, { opacity: fadeAnim, color: colors.text }]}>
          Workspace
        </Animated.Text>
        <Text style={[styles.subheader, { color: colors.textTertiary }]}>Compare any 2-4 Canadian tech products</Text>

        <InputModeTabs activeMode={inputMode} onModeChange={handleModeChange} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >

        <Animated.View style={{ opacity: panelFade }}>
          {inputMode === "url" && (
            <>
              <URLInputGroup onSwipeStart={() => setScrollEnabled(false)} onSwipeEnd={() => setScrollEnabled(true)} />
              <Button
                title={isLoading ? "Comparing..." : "Compare"}
                variant="primary"
                onPress={handleCompare}
                disabled={!canCompare || isLoading}
              />
            </>
          )}
          {inputMode === "name" && <NameSearchGroup />}
          {inputMode === "upc" && <ComingSoonPanel mode="upc" />}
          {inputMode === "qr"  && <ComingSoonPanel mode="qr"  />}
        </Animated.View>

        <RecentComparisons />

        {__DEV__ && <DevSeedPanel
          onSeedTwo={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            seedMockComparison("two");
            router.push("/compare");
          }}
          onSeedThree={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            seedMockComparison("three");
            router.push("/compare");
          }}
          onOpenDetailed={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            seedMockComparison("two");
            router.push("/compare/detailed");
          }}
        />}
      </ScrollView>
    </View>
  );
}

interface DevSeedPanelProps {
  onSeedTwo: () => void;
  onSeedThree: () => void;
  onOpenDetailed: () => void;
}

function DevSeedPanel({ onSeedTwo, onSeedThree, onOpenDetailed }: DevSeedPanelProps) {
  const { colors } = useThemeColors();
  return (
    <View
      style={[
        styles.devPanel,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.devLabel, { color: colors.textTertiary }]}>
        DEV SEED
      </Text>
      <View style={styles.devRow}>
        <Pressable
          onPress={onSeedTwo}
          accessibilityRole="button"
          accessibilityLabel="Seed 2-product comparison"
          style={({ pressed }) => [
            styles.devBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.devBtnText, { color: colors.text }]}>2 products</Text>
        </Pressable>
        <Pressable
          onPress={onSeedThree}
          accessibilityRole="button"
          accessibilityLabel="Seed 3-product comparison"
          style={({ pressed }) => [
            styles.devBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.devBtnText, { color: colors.text }]}>3 products</Text>
        </Pressable>
        <Pressable
          onPress={onOpenDetailed}
          accessibilityRole="button"
          accessibilityLabel="Open detailed comparison"
          style={({ pressed }) => [
            styles.devBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.devBtnText, { color: colors.text }]}>Detailed</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 64, paddingBottom: 32 },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subheader: {
    fontSize: 14,
    color: "rgba(255,255,255,0.38)",
    marginBottom: 24,
  },

  // Dev seed panel
  devPanel: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  devLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  devRow: {
    flexDirection: "row",
    gap: 8,
  },
  devBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    minHeight: 36,
    justifyContent: "center",
  },
  devBtnText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});
