import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Image,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import * as Haptics from "../../utils/haptics";
import {
  MAX_QR_PRODUCTS,
  SAMPLE_PRODUCTS,
  canonicalizeUrl,
  expandShortUrl,
  extractQrPayload,
  fetchUrlPreview,
  isShortenerHost,
  parseProductUrl,
  sampleQrImage,
  getHostname,
} from "../../utils/qr";
import { decodeQrFromImageUri } from "../../utils/decodeQr";
import { QRFlashCard, type QrItem } from "./QRFlashCard";
import { QRScannerCard } from "./QRScannerCard";

type ToastTone = "ok" | "warn" | "err";

function makeId() {
  return `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const [pasteValue, setPasteValue] = useState("");
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null);
  const [flashTick, setFlashTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const toastOp = useRef(new Animated.Value(0)).current;
  const itemsRef = useRef(items);
  const busyRef = useRef(false);
  const lastScanRef = useRef({ data: "", at: 0 });
  itemsRef.current = items;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const showToast = useCallback((text: string, tone: ToastTone) => {
    setToast({ text, tone });
    toastOp.setValue(0);
    Animated.timing(toastOp, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const handle = setTimeout(() => {
      Animated.timing(toastOp, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setToast(null);
      });
    }, 2600);
    return () => clearTimeout(handle);
  }, [toastOp]);

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

  const handleClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text?.trim()) {
        await ingest(text.trim());
        return;
      }
      try {
        const img = await Clipboard.getImageAsync({ format: "png" });
        if (img?.data) {
          const payload = await decodeQrFromImageUri(`data:image/png;base64,${img.data}`);
          if (payload) {
            await ingest(payload);
            return;
          }
        }
      } catch {
        /* no image on clipboard */
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast("Clipboard is empty — paste a URL below", "warn");
    } catch {
      showToast("Couldn't read the clipboard. Paste into the field below.", "warn");
    }
  };

  const handleManual = async () => {
    const value = pasteValue.trim();
    if (!value) return;
    await ingest(value);
    setPasteValue("");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearAll = () => {
    if (!items.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems([]);
  };

  const validUrls = items.filter((i) => i.status === "valid" || i.status === "loading").map((i) => i.url);
  const readyUrls = items.filter((i) => i.status === "valid").map((i) => i.url);
  const canCompare = readyUrls.length >= 2 && !isLoading;
  const slotsLeft = MAX_QR_PRODUCTS - items.length;

  let hint = "Scan 2–4 product QR codes to compare.";
  if (readyUrls.length === 1) hint = "Scan 1 more to compare.";
  else if (readyUrls.length >= 2 && slotsLeft > 0) {
    hint = `${readyUrls.length} ready · ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left.`;
  } else if (slotsLeft === 0) hint = "Maximum reached. Remove one to scan another.";
  else if (items.some((i) => i.status === "invalid" || i.status === "unsupported") && readyUrls.length < 2) {
    hint = "Need 2 supported Canadian retailer links.";
  }

  const pasteState = !pasteValue.trim()
    ? "idle"
    : extractQrPayload(pasteValue).kind === "url"
      ? "valid"
      : "invalid";

  return (
    <Animated.View style={{ opacity: fadeAnim, marginBottom: 8 }}>
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.stone }]}>QR scanner</Text>
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
        scanning={!paused && items.length < MAX_QR_PRODUCTS}
        atCapacity={items.length >= MAX_QR_PRODUCTS}
        flashTick={flashTick}
        scannedCount={items.length}
        onScan={handleScan}
        onGallery={handleGallery}
      />

      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastOp,
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

      <Text style={[styles.hint, { color: colors.stone }]}>{hint}</Text>

      <View style={styles.pasteRow}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Paste decoded QR or product URL"
            value={pasteValue}
            onChangeText={setPasteValue}
            onPaste={handleClipboard}
            onClear={() => setPasteValue("")}
            validationState={pasteState}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleManual}
          />
        </View>
        <Pressable
          onPress={handleManual}
          disabled={!pasteValue.trim()}
          style={({ pressed }) => [
            styles.addPaste,
            {
              backgroundColor: colors.ink,
              opacity: !pasteValue.trim() ? 0.3 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.addPasteText, { color: colors.bg }]}>Add</Text>
        </Pressable>
      </View>

      <Text style={[styles.sampleLabel, { color: colors.stone }]}>Try a sample scan</Text>
      <View style={styles.samples}>
        {SAMPLE_PRODUCTS.map((sample) => {
          const already = items.some((i) => i.canon === canonicalizeUrl(sample.url));
          return (
            <Pressable
              key={sample.id}
              onPress={() => ingest(sample.url)}
              disabled={already || items.length >= MAX_QR_PRODUCTS}
              style={({ pressed }) => [
                styles.sample,
                {
                  backgroundColor: colors.surface,
                  borderColor: already ? colors.spotify : colors.line,
                  opacity: already || items.length >= MAX_QR_PRODUCTS ? 0.55 : pressed ? 0.78 : 1,
                },
              ]}
            >
              <Image
                source={{ uri: sampleQrImage(sample.url) }}
                style={[styles.sampleQr, { backgroundColor: colors.fog }]}
              />
              <Text style={[styles.sampleName, { color: colors.ink }]} numberOfLines={1}>
                {sample.label}
              </Text>
              <Text style={[styles.sampleStore, { color: colors.stone }]} numberOfLines={1}>
                {sample.retailer}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {items.length > 0 ? (
        <View style={styles.cards}>
          <Text style={[styles.headerLabel, { color: colors.stone, marginBottom: 8 }]}>
            Scanned · {readyUrls.length} ready
          </Text>
          {items.map((item, index) => (
            <QRFlashCard key={item.id} item={item} index={index} onRemove={() => removeItem(item.id)} />
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button
            title={isLoading ? "Comparing..." : `Compare${readyUrls.length ? ` ${readyUrls.length}` : ""}`}
            variant="primary"
            onPress={() => onCompare(readyUrls)}
            disabled={!canCompare}
            style={{ width: "100%" }}
          />
        </View>
      </View>
      {validUrls.length >= 2 && readyUrls.length < 2 ? (
        <Text style={[styles.hint, { color: colors.stone, marginTop: 8 }]}>
          Waiting on previews…
        </Text>
      ) : null}
    </Animated.View>
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
  pasteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 18,
  },
  addPaste: {
    height: size.field,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  addPasteText: {
    ...type.button,
    fontSize: 14,
  },
  sampleLabel: {
    ...type.eyebrow,
    marginBottom: 10,
  },
  samples: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  sample: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.field,
    padding: 8,
    alignItems: "center",
    gap: 4,
  },
  sampleQr: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  sampleName: {
    ...type.caption,
    fontSize: 11,
    fontFamily: "Satoshi-Medium",
    textAlign: "center",
  },
  sampleStore: {
    ...type.caption,
    fontSize: 10,
    textAlign: "center",
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
