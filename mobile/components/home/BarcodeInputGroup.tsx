import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing, Platform, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "../../constants/Colors";
import { type, fonts } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";
import { Button } from "../ui/Button";
import * as Haptics from "../../utils/haptics";
import {
  canonicalizeUrl,
  expandShortUrl,
  fetchUrlPreview,
  isShortenerHost,
  parseProductUrl,
  getHostname,
  buildImageCandidates,
} from "../../utils/qr";
import {
  MAX_BARCODE_PRODUCTS,
  extractBarcodePayload,
  formatGtin,
  normalizeGtin,
} from "../../utils/barcode";
import { lookupBarcode, preferLookupTitle, primaryOffer } from "../../utils/barcodeLookup";
import { decodeBarcodeFromImageUri } from "../../utils/decodeBarcode";
import { QRFlashCard, type QrItem } from "./QRFlashCard";
import { QRScannerCard } from "./QRScannerCard";

type ToastTone = "ok" | "warn" | "err";

const FLOW = Easing.bezier(0.16, 1, 0.3, 1);

function makeId() {
  return `upc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

export function BarcodeInputGroup({
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
  const [shownHint, setShownHint] = useState("Scan 2–3 product barcodes to compare.");
  const [manual, setManual] = useState("");

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

  const hasCode = useCallback((code: string) => {
    return itemsRef.current.some((i) => i.upc === code || i.canon === code);
  }, []);

  const addUrlCard = useCallback(
    async (rawUrl: string, upc?: string) => {
      let url = rawUrl.trim();
      const host = getHostname(url);
      if (isShortenerHost(host)) {
        url = await expandShortUrl(url);
      }
      const parsed = parseProductUrl(url);
      const canon = canonicalizeUrl(parsed.url || url);
      if (itemsRef.current.some((i) => i.canon === canon || (upc && i.upc === upc))) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast("Already scanned", "warn");
        return false;
      }
      if (itemsRef.current.length >= MAX_BARCODE_PRODUCTS) {
        showToast(`Maximum ${MAX_BARCODE_PRODUCTS} products`, "warn");
        return false;
      }
      const id = makeId();
      const next: QrItem = {
        id,
        url: parsed.url || url,
        canon,
        upc,
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
                    imageCandidates: preview.imageCandidates.length ? preview.imageCandidates : i.imageCandidates,
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

  const addGtinCard = useCallback(
    async (code: string) => {
      if (hasCode(code)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast("Already scanned", "warn");
        return;
      }
      if (itemsRef.current.length >= MAX_BARCODE_PRODUCTS) {
        showToast(`Maximum ${MAX_BARCODE_PRODUCTS} products`, "warn");
        return;
      }

      const id = makeId();
      const placeholder: QrItem = {
        id,
        url: "",
        canon: code,
        upc: code,
        status: "loading",
        title: `Looking up ${formatGtin(code)}`,
        retailer: "Barcode",
        domain: formatGtin(code),
        imageUrl: null,
        imageCandidates: [],
      };
      setItems((prev) => [...prev, placeholder]);
      setFlashTick((n) => n + 1);

      try {
        const found = await lookupBarcode(code);
        const offer = primaryOffer(found);
        if (!offer) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: "invalid",
                    title: found.title || i.title,
                    imageUrl: found.imageUrl,
                    imageCandidates: found.imageCandidates,
                    retailer: found.brand || "Barcode",
                    error: found.title
                      ? "Found the product, but no Canadian retailer link. Try a QR or paste a URL."
                      : "Couldn't find this barcode at Canadian retailers.",
                  }
                : i
            )
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast("No Canadian product page for that code", "err");
          return;
        }

        let url = offer.url;
        if (isShortenerHost(getHostname(url))) url = await expandShortUrl(url);
        const parsed = parseProductUrl(url);
        const canon = canonicalizeUrl(parsed.url || url);

        if (itemsRef.current.some((i) => i.id !== id && i.canon === canon)) {
          setItems((prev) => prev.filter((i) => i.id !== id));
          showToast("Already scanned", "warn");
          return;
        }

        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  url: parsed.url || url,
                  canon,
                  status: parsed.valid ? "loading" : "unsupported",
                  title: found.title || parsed.title,
                  retailer: offer.retailer || parsed.retailer,
                  domain: offer.domain || parsed.domain,
                  imageUrl: found.imageUrl || parsed.guessImage || null,
                  imageCandidates: buildImageCandidates(found.imageUrl, parsed.guessImage),
                  error: parsed.valid ? undefined : parsed.message,
                }
              : i
          )
        );

        if (!parsed.valid) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
          const preview = await fetchUrlPreview(parsed.url || url);
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: "valid",
                    title: preferLookupTitle(preview.title, found.title, i.title),
                    imageUrl: preview.imageUrl || found.imageUrl || i.imageUrl,
                    imageCandidates: preview.imageCandidates.length
                      ? preview.imageCandidates
                      : buildImageCandidates(found.imageUrl, i.imageUrl),
                    description: preview.description,
                  }
                : i
            )
          );
        } catch {
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: "valid",
                    title: found.title || i.title,
                  }
                : i
            )
          );
        }
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: "invalid",
                  error: "Couldn't look up that barcode. Check your connection.",
                }
              : i
          )
        );
        showToast("Lookup failed", "err");
      }
    },
    [hasCode, showToast]
  );

  const ingest = useCallback(
    async (raw: string) => {
      const extracted = extractBarcodePayload(raw);
      if (extracted.kind === "url") {
        await addUrlCard(extracted.url);
        return;
      }
      if (extracted.kind === "gtin") {
        await addGtinCard(extracted.code);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(extracted.message, "err");
    },
    [addUrlCard, addGtinCard, showToast]
  );

  const handleScan = useCallback(
    (data: string) => {
      if (!data || paused || busyRef.current) return;
      const now = Date.now();
      if (data === lastScanRef.current.data && now - lastScanRef.current.at < 1800) return;
      if (itemsRef.current.length >= MAX_BARCODE_PRODUCTS) return;
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
          showToast("Photo access is needed to scan a barcode from an image", "err");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const payload = await decodeBarcodeFromImageUri(result.assets[0].uri);
      if (!payload) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("No UPC or EAN in that image. Use QR Code for QR labels.", "err");
        return;
      }
      await ingest(payload);
    } catch {
      showToast("Couldn't open that photo", "err");
    }
  };

  const handleManual = () => {
    const gtin = normalizeGtin(manual);
    if (!gtin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Enter a valid UPC or EAN", "err");
      return;
    }
    setManual("");
    ingest(gtin);
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

  const validUrls = items.filter((i) => i.status === "valid" || i.status === "loading").map((i) => i.url).filter(Boolean);
  const readyUrls = items.filter((i) => i.status === "valid" && i.url).map((i) => i.url);
  const canCompare = readyUrls.length >= 2 && !isLoading;
  const slotsLeft = MAX_BARCODE_PRODUCTS - items.length;

  let hint = "Scan 2–3 product barcodes to compare.";
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

  const manualValid = Boolean(normalizeGtin(manual));

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
          kind="barcode"
          scanning={!paused && items.length < MAX_BARCODE_PRODUCTS && !isLoading}
          atCapacity={items.length >= MAX_BARCODE_PRODUCTS}
          flashTick={flashTick}
          scannedCount={items.length}
          onScan={handleScan}
          onGallery={handleGallery}
          allowed={!isLoading}
        />

        <View style={[styles.manual, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <TextInput
            testID="barcode-manual-input"
            value={manual}
            onChangeText={setManual}
            placeholder="Or type a UPC / EAN"
            placeholderTextColor={colors.stone}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleManual}
            style={[styles.manualInput, { color: colors.ink }]}
            accessibilityLabel="Enter UPC or EAN"
          />
          <Pressable
            testID="barcode-add-btn"
            onPress={handleManual}
            disabled={!manualValid || items.length >= MAX_BARCODE_PRODUCTS}
            style={({ pressed }) => [
              styles.manualBtn,
              {
                backgroundColor: colors.ink,
                opacity: !manualValid || items.length >= MAX_BARCODE_PRODUCTS ? 0.35 : pressed ? 0.8 : 1,
              },
            ]}
            accessibilityLabel="Look up barcode"
          >
            <Text style={[styles.manualBtnText, { color: colors.bg }]}>Add</Text>
          </Pressable>
        </View>
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
          <Text style={[styles.toastText, { color: toast.tone === "err" ? colors.error : colors.ink }]}>
            {toast.text}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.Text style={[styles.hint, { color: colors.stone, opacity: hintOp }]}>{shownHint}</Animated.Text>

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
  manual: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radii.field,
    height: size.field,
    paddingLeft: 14,
    paddingRight: 6,
    marginBottom: 14,
    gap: 8,
  },
  manualInput: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    paddingVertical: 0,
  },
  manualBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  manualBtnText: {
    ...type.button,
    fontSize: 13,
  },
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
