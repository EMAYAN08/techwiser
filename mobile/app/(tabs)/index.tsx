import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Animated } from "react-native";
import { Typography } from "../../constants/Typography";
import { useRouter } from "expo-router";
import * as Haptics from "../../utils/haptics";
import { URLInputGroup } from "../../components/home/URLInputGroup";
import { RecentComparisons } from "../../components/home/RecentComparisons";
import { LoadingOverlay } from "../../components/home/LoadingOverlay";
import { InputModeTabs, InputMode } from "../../components/home/InputModeTabs";
import { ComingSoonPanel } from "../../components/home/ComingSoonPanel";
import { NameSearchGroup } from "../../components/home/NameSearchGroup";
import { QRInputGroup } from "../../components/home/QRInputGroup";
import { useComparisonStore } from "../../store/useComparisonStore";
import { useThemeColors } from "../../constants/Colors";
import { space } from "../../constants/Layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    urls,
    isLoading,
    setLoading,
    setActiveComparison,
    addRecentComparison,
  } = useComparisonStore();
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const { colors } = useThemeColors();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panelFade = useRef(new Animated.Value(1)).current;
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fadeAnim]);

  const handleModeChange = (mode: InputMode) => {
    Animated.timing(panelFade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setInputMode(mode);
      Animated.timing(panelFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const validUrls = urls.filter((url: string) => url.trim().length > 0);
  const canCompare = validUrls.length >= 2 && inputMode === "url";

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const handleCompare = async (overrideUrls?: string[] | unknown) => {
    const source = Array.isArray(overrideUrls) ? overrideUrls : urls;
    const compareUrls = source.filter((url: string) => typeof url === "string" && url.trim().length > 0);
    if (compareUrls.length < 2 || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true, "Fetching product pages...");
    abortControllerRef.current = new AbortController();

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://techwiser.onrender.com";
      const response = await fetch(`${apiUrl}/api/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: compareUrls }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(
          `We couldn't reach the server or parsing failed (Error ${response.status}). Ensure your backend is running and the API key is valid.`
        );
      }

      const { data, error } = await response.json();
      if (error) throw new Error(error);

      setActiveComparison(data);
      addRecentComparison({
        id: data.id,
        title: `${data.products[0].name} vs ${data.products[1].name}`,
        date: "Just now",
        urls: compareUrls,
        result: data,
      });
      setLoading(false);
      abortControllerRef.current = null;
      router.push("/compare");
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setLoading(false);
      abortControllerRef.current = null;
      let msg = err.message || "Failed to extract specs.";
      if (msg.includes("Network request timed out") || msg.includes("Failed to fetch")) {
        msg =
          "The connection timed out. Please ensure your backend server is running and accessible on the same network.";
      }
      router.push({ pathname: "/error", params: { message: msg } });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LoadingOverlay visible={isLoading} onCancel={handleCancel} />

      <View
        style={{
          paddingHorizontal: space.gutter,
          paddingTop: Math.max(insets.top, 20) + 16,
          paddingBottom: 8,
          zIndex: 10,
          backgroundColor: colors.bg,
        }}
      >
        <Animated.Text style={[styles.header, { opacity: fadeAnim, color: colors.ink }]}>
          Compare
        </Animated.Text>
        <Text style={[styles.subheader, { color: colors.stone }]}>Any 2–4 tech products.</Text>
        <InputModeTabs activeMode={inputMode} onModeChange={handleModeChange} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingHorizontal: space.gutter,
          paddingTop: 12,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: panelFade }}>
          {inputMode === "url" && (
            <URLInputGroup
              onSwipeStart={() => setScrollEnabled(false)}
              onSwipeEnd={() => setScrollEnabled(true)}
              onCompare={() => handleCompare()}
              isLoading={isLoading}
              canCompare={canCompare}
            />
          )}
          {inputMode === "name" && <NameSearchGroup />}
          {inputMode === "upc" && <ComingSoonPanel mode="upc" />}
          {inputMode === "qr" && <QRInputGroup onCompare={handleCompare} isLoading={isLoading} />}
        </Animated.View>

        <RecentComparisons />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  header: {
    ...Typography.display,
    marginBottom: 6,
  },
  subheader: {
    ...Typography.subtitle,
    marginBottom: 20,
  },
});
