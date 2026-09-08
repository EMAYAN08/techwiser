import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";
import { Button } from "../ui/Button";
import * as Haptics from "../../utils/haptics";
import {
  MAX_QR_PRODUCTS,
  canonicalizeUrl,
  expandShortUrl,
  extractQrPayload,
  fetchUrlPreview,
  isShortenerHost,
  parseProductUrl,
  getHostname,
  buildImageCandidates,
} from "../../utils/qr";
import { decodeQrFromImageUri } from "../../utils/decodeQr";
import { QRFlashCard, type QrItem } from "./QRFlashCard";
import { QRScannerCard } from "./QRScannerCard";

type ToastTone = "ok" | "warn" | "err";

const FLOW = Easing.bezier(0.16, 1, 0.3, 1);

function makeId() {
  return `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fadeUp(anim: Animated.Value, from = 18) {
  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [from, 0],
        }),
      },
    ],
  };
}

export function QRInputGroup({
  onCompare,
  isLoading,
}: {
  onCompare: (urls: string[]) => void;
  isLoading: boolean;
}) {
  const { colors } = useThemeColors();
  const [items, setItems] = useState<QrItem[]>([]);
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null);
  const [flashTick, setFlashTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [shownHint, setShownHint] = useState("Scan 2–3 product QR codes to compare.");

  const scannerEnter = useRef(new Animated.Value(0)).current;
  const ctaEnter = useRef(new Animated.Value(0)).current;
  const toastOp = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(8)).current;
  const hintOp = useRef(new Animated.Value(1)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const cardsOp = useRef(new Animated.Value(1)).current;
  const itemsRef = useRef(items);
  const busyRef = useRef(false);
  const lastScanRef = useRef({ data: "", at: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyWas = useRef(false);
  itemsRef.current = items;

  useEffect(() => {
    Animated.stagger(95, [
      Animated.timing(scannerEnter, { toValue: 1, duration: 520, easing: FLOW, useNativeDriver: true }),
      Animated.timing(ctaEnter, { toValue: 1, duration: 460, easing: FLOW, useNativeDriver: true }),
    ]).start();
  }, [scannerEnter, ctaEnter]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback(
    (text: string, tone: ToastTone) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ text, tone });
      toastOp.setValue(0);
      toastY.setValue(10);
      Animated.parallel([
        Animated.timing(toastOp, { toValue: 1, duration: 240, easing: FLOW, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: 0, duration: 320, easing: FLOW, useNativeDriver: true }),
      ]).start();
      toastTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOp, { toValue: 0, duration: 200, easing: FLOW, useNativeDriver: true }),
          Animated.timing(toastY, { toValue: -8, duration: 200, easing: FLOW, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) setToast(null);
        });
      }, 2400);
    },
    [toastOp, toastY]
  );

  const addUrlCard = useCallback(
    async (rawUrl: string) => {
      let url = rawUrl.trim();
      const host = getHostname(url);
      if (isShortenerHost(host)) {
        url = await expandShortUrl(url);
      }
      const parsed = parseProductUrl(url);
      const canon = canonicalizeUrl(parsed.url || url);
      if (itemsRef.current.some((i) => i.canon === canon)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast("Already scanned", "warn");
        return false;
      }
      if (itemsRef.current.length >= MAX_QR_PRODUCTS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast(`Maximum ${MAX_QR_PRODUCTS} products`, "warn");
        return false;
      }

      const id = makeId();
      const next: QrItem = {
        id,
        url: parsed.url || url,
        canon,
        status: parsed.valid ? "loading" : parsed.reason === "unsupported" ? "unsupported" : "invalid",
        title: parsed.title,
        retailer: parsed.retailer,
        domain: parsed.domain,
        imageUrl: parsed.guessImage ?? null,
        imageCandidates: buildImageCandidates(parsed.guessImage),
        error: parsed.valid ? undefined : parsed.message,
      };
      setItems((prev) => [...prev, next]);
      setFlashTick((n) => n + 1);
      if (parsed.valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
          const preview = await fetchUrlPreview(next.url);
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: "valid",
                    title: preview.title || i.title,
                    imageUrl: preview.imageUrl || i.imageUrl,
                    imageCandidates: preview.imageCandidates.length
                      ? preview.imageCandidates
                      : i.imageCandidates,
                    description: preview.description,
                  }
                : i
            )
          );
        } catch {
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "valid" } : i)));
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return parsed.valid;
    },
    [showToast]
  );

  const ingest = useCallback(
    async (raw: string) => {
      const extracted = extractQrPayload(raw);
      if (extracted.kind !== "url" || extracted.urls.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(extracted.message, "err");
        return;
      }

      const remaining = MAX_QR_PRODUCTS - itemsRef.current.length;
      if (remaining <= 0) {
        showToast(`Maximum ${MAX_QR_PRODUCTS} products`, "warn");
        return;
      }

      const urls = extracted.urls.slice(0, remaining);
      for (const url of urls) {
        await addUrlCard(url);
      }
      if (extracted.urls.length > remaining) {
        showToast(`Only ${remaining} slot${remaining === 1 ? "" : "s"} left — skipped the rest`, "warn");
      }
    },
    [addUrlCard, showToast]
  );

  const handleScan = useCallback(
    (data: string) => {
      if (!data || paused || busyRef.current) return;
      const now = Date.now();
      if (data === lastScanRef.current.data && now - lastScanRef.current.at < 1800) return;
      if (itemsRef.current.length >= MAX_QR_PRODUCTS) return;
      lastScanRef.current = { data, at: now };
      busyRef.current = true;
      setPaused(true);
      ingest(data).finally(() => {
        busyRef.current = false;
        setTimeout(() => setPaused(false), 900);
      });
    },
    [ingest, paused]
  );

  const handleGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showToast("Photo access is needed to scan a QR from an image", "err");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const payload = await decodeQrFromImageUri(result.assets[0].uri);
      if (!payload) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("No QR code in that image. Use Barcode for UPC/EAN.", "err");
        return;
      }
      await ingest(payload);
    } catch {
      showToast("Couldn't open that photo", "err");
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearAll = () => {
    if (!items.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(cardsOp, { toValue: 0, duration: 180, easing: FLOW, useNativeDriver: true }).start(
      ({ finished }) => {
        if (!finished) return;
        setItems([]);
        cardsOp.setValue(1);
      }
    );
  };

  const validUrls = items.filter((i) => i.status === "valid" || i.status === "loading").map((i) => i.url);
  const readyUrls = items.filter((i) => i.status === "valid").map((i) => i.url);
  const canCompare = readyUrls.length >= 2 && !isLoading;
  const slotsLeft = MAX_QR_PRODUCTS - items.length;

  let hint = "Scan 2–3 product QR codes to compare.";
  if (readyUrls.length === 1) hint = "Scan 1 more to compare.";
  else if (readyUrls.length >= 2 && slotsLeft > 0) {
    hint = `${readyUrls.length} ready · ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left.`;
  } else if (slotsLeft === 0) hint = "Maximum reached. Remove one to scan another.";
  else if (items.some((i) => i.status === "invalid" || i.status === "unsupported") && readyUrls.length < 2) {
    hint = "Need 2 supported Canadian retailer links.";
  }

  useEffect(() => {
    if (hint === shownHint) return;
    Animated.timing(hintOp, { toValue: 0, duration: 120, easing: FLOW, useNativeDriver: true }).start(() => {
      setShownHint(hint);
      Animated.timing(hintOp, { toValue: 1, duration: 240, easing: FLOW, useNativeDriver: true }).start();
    });
  }, [hint, hintOp, shownHint]);

  useEffect(() => {
    if (canCompare && !readyWas.current) {
      ctaScale.setValue(0.96);
      Animated.spring(ctaScale, { toValue: 1, tension: 160, friction: 8, useNativeDriver: true }).start();
    }
    readyWas.current = canCompare;
  }, [canCompare, ctaScale]);

  return (
    <View style={{ marginBottom: 8 }}>
      <Animated.View style={fadeUp(scannerEnter, 14)}>
        <View style={[styles.header, { justifyContent: "flex-end", height: items.length > 0 ? undefined : 0, marginBottom: items.length > 0 ? 10 : 0 }]}>
          {items.length > 0 ? (
            <Pressable
              onPress={handleClearAll}
              style={[styles.clearAllBtn, { backgroundColor: colors.fog }]}
              hitSlop={8}
            >
              <Feather name="trash-2" size={12} color={colors.body} />
              <Text style={[styles.clearAllText, { color: colors.body }]}>Clear all</Text>
            </Pressable>
          ) : null}
        </View>

        <QRScannerCard
          scanning={!paused && items.length < MAX_QR_PRODUCTS && !isLoading}
          atCapacity={items.length >= MAX_QR_PRODUCTS}
          flashTick={flashTick}
          scannedCount={items.length}
          onScan={handleScan}
          onGallery={handleGallery}
          allowed={!isLoading}
        />
      </Animated.View>

      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastOp,
              transform: [{ translateY: toastY }],
              backgroundColor: toast.tone === "err" ? colors.errorMuted : colors.spotifyWash,
              borderColor: toast.tone === "err" ? colors.error : colors.spotify,
            },
          ]}
        >
          <Text
            style={[
              styles.toastText,
              { color: toast.tone === "err" ? colors.error : colors.ink },
            ]}
          >
            {toast.text}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.Text style={[styles.hint, { color: colors.stone, opacity: hintOp }]}>
        {shownHint}
      </Animated.Text>

      {items.length > 0 ? (
        <Animated.View style={[styles.cards, { opacity: cardsOp }]}>
          <Text style={[styles.headerLabel, { color: colors.stone, marginBottom: 8 }]}>
            Scanned · {readyUrls.length} ready
          </Text>
          {items.map((item, index) => (
            <QRFlashCard key={item.id} item={item} index={index} onRemove={() => removeItem(item.id)} />
          ))}
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.actions,
          {
            opacity: ctaEnter,
            transform: [
              {
                translateY: ctaEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
              { scale: ctaScale },
            ],
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Button
            title={isLoading ? "Comparing..." : `Compare${readyUrls.length ? ` ${readyUrls.length}` : ""}`}
            variant="primary"
            onPress={() => onCompare(readyUrls)}
            disabled={!canCompare}
            style={{ width: "100%" }}
          />
        </View>
      </Animated.View>
      {validUrls.length >= 2 && readyUrls.length < 2 ? (
        <Text style={[styles.hint, { color: colors.stone, marginTop: 8 }]}>Waiting on previews…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLabel: {
    ...type.eyebrow,
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  clearAllText: { ...type.caption, fontSize: 12 },
  toast: {
    borderWidth: 1,
    borderRadius: radii.field,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  toastText: {
    ...type.caption,
    fontSize: 13,
  },
  hint: {
    ...type.caption,
    fontSize: 12,
    marginBottom: 12,
  },
  cards: {
    gap: 10,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
});
