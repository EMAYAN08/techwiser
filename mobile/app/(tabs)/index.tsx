import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Animated } from "react-native";
import { Typography } from "../../constants/Typography";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "../../utils/haptics";
import { handleScroll, resetScrollTracking } from "../../store/uiStore";
import { URLInputGroup, URLInputHeader } from "../../components/home/URLInputGroup";
import { RecentComparisons, RecentHeader } from "../../components/home/RecentComparisons";
import { InputModeTabs, InputMode } from "../../components/home/InputModeTabs";
import { QRInputGroup } from "../../components/home/QRInputGroup";
import { useComparisonStore } from "../../store/useComparisonStore";
import { registerLoadingOverlayHandlers } from "../../store/loadingOverlayBridge";
import { useThemeColors } from "../../constants/Colors";
import { space, tabBarScrollPadding } from "../../constants/Layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { compareProducts } from "../../services/api";
import { getApiBase } from "../../utils/apiBase";
import { MIN_COMPARE_URLS, uniqueSupportedProductUrls } from "../../utils/validators";
import { canStartUrlCompare, recentComparisonTitle, userFacingCompareError } from "../../utils/userFlows";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const urls = useComparisonStore((s) => s.urls);
  const isLoading = useComparisonStore((s) => s.isLoading);
  const setLoading = useComparisonStore((s) => s.setLoading);
  const setLoadPhase = useComparisonStore((s) => s.setLoadPhase);
  const setActiveComparison = useComparisonStore((s) => s.setActiveComparison);
  const addRecentComparison = useComparisonStore((s) => s.addRecentComparison);
  const loadPhase = useComparisonStore((s) => s.loadPhase);
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const { colors } = useThemeColors();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panelFade = useRef(new Animated.Value(1)).current;
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const navigatedRef = useRef(false);
  const loadPhaseRef = useRef<"loading" | "success">("loading");
  loadPhaseRef.current = loadPhase;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    const apiUrl = getApiBase();
    fetch(`${apiUrl}/api/health`).catch(() => {});
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

  const canCompare = canStartUrlCompare({ urls, inputMode, isLoading: false }).ready;

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
    const compareUrls = uniqueSupportedProductUrls(
      source.filter((url: unknown): url is string => typeof url === "string")
    );
    if (compareUrls.length < MIN_COMPARE_URLS || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cancelledRef.current = false;
    navigatedRef.current = false;
    setLoadPhase("loading");
    setLoading(true, "Fetching product pages...");
    abortControllerRef.current = new AbortController();
    const startedAt = Date.now();

    try {
      const { data, error } = await compareProducts(compareUrls, {
        signal: abortControllerRef.current.signal,
        onProgress: (message) => {
          if (!cancelledRef.current) setLoading(true, message);
        },
      });
      if (error) throw new Error(error);
      if (cancelledRef.current) return;

      setActiveComparison(data);
      addRecentComparison({
        id: data.id,
        title: recentComparisonTitle((data.products || []).map((p: { name?: string }) => p?.name || "")),
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
      const msg = userFacingCompareError(err.message);
      router.push({ pathname: "/error", params: { message: msg } });
      setTimeout(() => {
        if (useComparisonStore.getState().isLoading) {
          useComparisonStore.getState().setLoading(false);
        }
      }, 1800);
    }
  };

  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
      listener: handleScroll,
    })
  ).current;
  const TITLE_HEIGHT = 104;
  // Pill minHeight is 52 (InputModeTabs). Extra slot is the gap down to the section heading.
  const TABS_HEIGHT = 52 + 12;

  useFocusEffect(
    useCallback(() => {
      resetScrollTracking();
      return undefined;
    }, [])
  );

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

        <View style={{ height: TABS_HEIGHT, paddingHorizontal: space.gutter, backgroundColor: colors.bg }}>
          <InputModeTabs activeMode={inputMode} onModeChange={handleModeChange} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={[styles.container, { marginTop: TITLE_HEIGHT }]}
        stickyHeaderIndices={[1, 3]}
        contentContainerStyle={{
          paddingBottom: tabBarScrollPadding(insets.bottom),
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
              <View style={{ backgroundColor: colors.bg, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[{ color: colors.stone, ...Typography.eyebrow, textTransform: 'uppercase' }]}>
                  QR SCANNER
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
