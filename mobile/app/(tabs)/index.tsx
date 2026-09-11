import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Animated } from "react-native";
import { Typography } from "../../constants/Typography";
import { useRouter } from "expo-router";
import * as Haptics from "../../utils/haptics";
import { handleScroll } from "../../store/uiStore";
import { URLInputGroup, URLInputHeader } from "../../components/home/URLInputGroup";
import { RecentComparisons, RecentHeader } from "../../components/home/RecentComparisons";
import { InputModeTabs, InputMode } from "../../components/home/InputModeTabs";
import { NameSearchGroup } from "../../components/home/NameSearchGroup";
import { QRInputGroup } from "../../components/home/QRInputGroup";
import { BarcodeInputGroup } from "../../components/home/BarcodeInputGroup";
import { useComparisonStore } from "../../store/useComparisonStore";
import { registerLoadingOverlayHandlers } from "../../store/loadingOverlayBridge";
import { useThemeColors } from "../../constants/Colors";
import { space } from "../../constants/Layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getApiBase } from "../../utils/apiBase";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    urls,
    isLoading,
    setLoading,
    setLoadPhase,
    setActiveComparison,
    addRecentComparison,
  } = useComparisonStore();
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const { colors } = useThemeColors();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panelFade = useRef(new Animated.Value(1)).current;
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const navigatedRef = useRef(false);
  const loadPhaseRef = useRef<"loading" | "success">("loading");
  const loadPhase = useComparisonStore((s) => s.loadPhase);
  loadPhaseRef.current = loadPhase;

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

  const goToCompare = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.push("/compare");
    setTimeout(() => {
      if (useComparisonStore.getState().isLoading) {
        useComparisonStore.getState().setLoading(false);
      }
    }, 1800);
  }, [router]);

  const handleCancel = useCallback(() => {
    if (loadPhaseRef.current === "success") {
      goToCompare();
      return;
    }
    cancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadPhase("loading");
    setLoading(false);
  }, [goToCompare, setLoadPhase, setLoading]);

  const handleCelebrateEnd = useCallback(() => {
    if (cancelledRef.current) return;
    goToCompare();
  }, [goToCompare]);

  useEffect(() => {
    registerLoadingOverlayHandlers({
      onCancel: handleCancel,
      onCelebrateEnd: handleCelebrateEnd,
    });
    return () => registerLoadingOverlayHandlers({});
  }, [handleCancel, handleCelebrateEnd]);

  const handleCompare = async (overrideUrls?: string[] | unknown) => {
    const source = Array.isArray(overrideUrls) ? overrideUrls : urls;
    const compareUrls = source.filter((url: string) => typeof url === "string" && url.trim().length > 0);
    if (compareUrls.length < 2 || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cancelledRef.current = false;
    navigatedRef.current = false;
    setLoadPhase("loading");
    setLoading(true, "Fetching product pages...");
    abortControllerRef.current = new AbortController();
    const startedAt = Date.now();

    try {
      const apiUrl = getApiBase();
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
      if (cancelledRef.current) return;

      setActiveComparison(data);
      addRecentComparison({
        id: data.id,
        title: `${data.products[0].name} vs ${data.products[1].name}`,
        date: "Just now",
        urls: compareUrls,
        result: data,
      });
      abortControllerRef.current = null;

      const remain = Math.max(0, 900 - (Date.now() - startedAt));
      if (remain) await new Promise((r) => setTimeout(r, remain));
      if (cancelledRef.current) return;
      setLoadPhase("success");
    } catch (err: any) {
      if (err.name === "AbortError" || cancelledRef.current) return;
      abortControllerRef.current = null;
      setLoadPhase("loading");
      let msg = err.message || "Failed to extract specs.";
      if (msg.includes("Network request timed out") || msg.includes("Failed to fetch")) {
        msg =
          "The connection timed out. Please ensure your backend server is running and accessible on the same network.";
      }
      router.push({ pathname: "/error", params: { message: msg } });
      setTimeout(() => {
        if (useComparisonStore.getState().isLoading) {
          useComparisonStore.getState().setLoading(false);
        }
      }, 1800);
    }
  };

  const scrollY = useRef(new Animated.Value(0)).current;
  const TITLE_HEIGHT = 104;
  const TABS_HEIGHT = 104;
  const HEADER_HEIGHT = TITLE_HEIGHT + TABS_HEIGHT;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, TITLE_HEIGHT],
    outputRange: [0, -TITLE_HEIGHT],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 20) }]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(insets.top, 20), backgroundColor: colors.bg, zIndex: 999, elevation: 99 }} />
      <Animated.View
        style={{
          position: "absolute",
          top: Math.max(insets.top, 20),
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: colors.bg,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <View style={{ height: TITLE_HEIGHT, paddingHorizontal: space.gutter, paddingTop: 16 }}>
          <Animated.Text style={[styles.header, { opacity: fadeAnim, color: colors.ink }]}>
            Compare
          </Animated.Text>
          <Text style={[styles.subheader, { color: colors.stone }]}>Any 2–3 tech products.</Text>
        </View>

        <View style={{ height: TABS_HEIGHT, paddingHorizontal: space.gutter, paddingBottom: 8, backgroundColor: colors.bg }}>
          <InputModeTabs activeMode={inputMode} onModeChange={handleModeChange} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }], 
          { useNativeDriver: true, listener: handleScroll }
        )}
        scrollEventThrottle={16}
        style={[styles.container, { marginTop: TITLE_HEIGHT }]}
        stickyHeaderIndices={[1, 3]}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        {/* Content 0: Dummy spacer to sit behind the Tabs initially */}
        <View style={{ height: TABS_HEIGHT }} />

        {/* Sticky Header 1: Dynamic Input Header */}
        <View style={{ zIndex: 10, backgroundColor: colors.bg }} pointerEvents="box-none">
          <Animated.View style={{ opacity: panelFade, paddingHorizontal: space.gutter, backgroundColor: colors.bg }}>
            {inputMode === "url" && <URLInputHeader />}
            {/* Other modes */}
            {inputMode !== "url" && (
              <View style={{ backgroundColor: colors.bg, paddingBottom: 12, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[{ color: colors.stone, ...Typography.eyebrow, textTransform: 'uppercase' }]}>
                  {inputMode === "name" ? "PRODUCT NAMES" : inputMode === "upc" ? "BARCODE SCANNER" : "QR SCANNER"}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Content 2: Input Group */}
        <Animated.View style={{ opacity: panelFade, paddingHorizontal: space.gutter, backgroundColor: colors.bg }}>
          {inputMode === "url" && (
            <URLInputGroup
              onSwipeStart={() => setScrollEnabled(false)}
              onSwipeEnd={() => setScrollEnabled(true)}
              onCompare={() => handleCompare()}
              isLoading={isLoading}
              canCompare={canCompare}
            />
          )}
          {inputMode === "name" && <NameSearchGroup onCompare={handleCompare} isLoading={isLoading} />}
          {inputMode === "upc" && <BarcodeInputGroup onCompare={handleCompare} isLoading={isLoading} />}
          {inputMode === "qr" && <QRInputGroup onCompare={handleCompare} isLoading={isLoading} />}
        </Animated.View>

        {/* Sticky Header 3: Recent Header */}
        <View style={{ zIndex: 10, paddingHorizontal: space.gutter, backgroundColor: colors.bg }} pointerEvents="box-none">
           <RecentHeader />
        </View>

        {/* Content 4: Recent List */}
        <View style={{ paddingHorizontal: space.gutter }}>
          <RecentComparisons />
        </View>
      </Animated.ScrollView>
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
    marginBottom: 18,
  },
});
