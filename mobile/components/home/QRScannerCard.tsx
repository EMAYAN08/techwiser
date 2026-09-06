import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Camera, Image as ImageIcon, Check } from "lucide-react-native";
import jsQR from "jsqr";
import { useThemeColors, paletteTokens } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";
import * as Haptics from "../../utils/haptics";
import { MAX_QR_PRODUCTS } from "../../utils/qr";
import {
  LOCK_HOLD_MS,
  LOST_GRACE_MS,
  GUIDE_STICK_MS,
  assessGuide,
  geometryFromBox,
  geometryFromCorners,
  guideCopy,
  observationFromDataOnly,
  pickBestObservation,
  type QrObservation,
  type ScanGuide,
} from "../../utils/qrGuide";

type Props = {
  scanning: boolean;
  atCapacity: boolean;
  flashTick: number;
  scannedCount: number;
  onScan: (data: string) => void;
  onGallery: () => void;
};

type CamError = "denied" | "missing" | null;

type BarcodeDetectorCtor = new (o: { formats: string[] }) => {
  detect: (src: CanvasImageSource) => Promise<
    Array<{
      rawValue?: string;
      boundingBox?: { x: number; y: number; width: number; height: number };
      cornerPoints?: Array<{ x: number; y: number }>;
    }>
  >;
};

function observationsFromJsQR(
  imageData: ImageData,
  dw: number,
  dh: number
): QrObservation | null {
  const code = jsQR(imageData.data, dw, dh, { inversionAttempts: "dontInvert" });
  if (!code?.data) return null;
  return (
    geometryFromCorners(
      [
        code.location.topLeftCorner,
        code.location.topRightCorner,
        code.location.bottomRightCorner,
        code.location.bottomLeftCorner,
      ],
      dw,
      dh,
      code.data
    ) || observationFromDataOnly(code.data)
  );
}

function WebQrCamera({
  active,
  observing,
  onObserve,
  onError,
}: {
  active: boolean;
  observing: boolean;
  onObserve: (obs: QrObservation | null) => void;
  onError: (reason: CamError) => void;
}) {
  const hostRef = useRef<View>(null);
  const onObserveRef = useRef(onObserve);
  const onErrorRef = useRef(onError);
  const observingRef = useRef(observing);
  onObserveRef.current = onObserve;
  onErrorRef.current = onError;
  observingRef.current = observing;

  useEffect(() => {
    if (!active || Platform.OS !== "web" || typeof document === "undefined") return;
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    host.appendChild(video);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    let detector: InstanceType<BarcodeDetectorCtor> | null = null;
    if (typeof Detector === "function") {
      try {
        detector = new Detector({ formats: ["qr_code"] });
      } catch {
        detector = null;
      }
    }

    const tick = async () => {
      if (stopped) return;
      if (video.readyState >= 2 && ctx && observingRef.current) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          try {
            let found: QrObservation | null = null;
            if (detector) {
              const codes = await detector.detect(video);
              const mapped: QrObservation[] = [];
              for (const code of codes || []) {
                if (!code.rawValue) continue;
                const pts = code.cornerPoints;
                const box = code.boundingBox;
                const geo =
                  (pts && geometryFromCorners(pts, w, h, code.rawValue)) ||
                  (box && geometryFromBox(box.x, box.y, box.width, box.height, w, h, code.rawValue)) ||
                  observationFromDataOnly(code.rawValue);
                mapped.push(geo);
              }
              found = pickBestObservation(mapped);
            } else {
              const max = 480;
              const scale = Math.min(1, max / Math.max(w, h));
              const dw = Math.max(1, Math.round(w * scale));
              const dh = Math.max(1, Math.round(h * scale));
              canvas.width = dw;
              canvas.height = dh;
              ctx.drawImage(video, 0, 0, dw, dh);
              const imageData = ctx.getImageData(0, 0, dw, dh);
              found = observationsFromJsQR(imageData, dw, dh);
            }
            onObserveRef.current(found);
          } catch {
            /* frame skipped */
          }
        }
      } else if (observingRef.current) {
        onObserveRef.current(null);
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          onErrorRef.current("missing");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        video.srcObject = stream;
        await video.play();
        raf = requestAnimationFrame(tick);
      } catch (e: unknown) {
        const name = (e as { name?: string })?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          onErrorRef.current("denied");
        } else {
          onErrorRef.current("missing");
        }
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      if (host.contains(video)) host.removeChild(video);
    };
  }, [active]);

  return <View ref={hostRef} collapsable={false} style={StyleSheet.absoluteFillObject} />;
}

function ViewfinderCorners({ color }: { color: string }) {
  const arm = 22;
  const thick = 3;
  const inset = 10;
  const common = {
    position: "absolute" as const,
    width: arm,
    height: arm,
    borderColor: color,
  };
  return (
    <>
      <View style={[common, { top: inset, left: inset, borderTopWidth: thick, borderLeftWidth: thick }]} />
      <View style={[common, { top: inset, right: inset, borderTopWidth: thick, borderRightWidth: thick }]} />
      <View style={[common, { bottom: inset, left: inset, borderBottomWidth: thick, borderLeftWidth: thick }]} />
      <View style={[common, { bottom: inset, right: inset, borderBottomWidth: thick, borderRightWidth: thick }]} />
    </>
  );
}

export function QRScannerCard({
  scanning,
  atCapacity,
  scannedCount,
  onScan,
  onGallery,
}: Props) {
  const { colors } = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [camError, setCamError] = useState<CamError>(null);
  const [live, setLive] = useState(false);
  const [guide, setGuide] = useState<ScanGuide>("seek");
  const [previewSize, setPreviewSize] = useState({ w: 1, h: 1 });

  const pulse = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const lockPop = useRef(new Animated.Value(1)).current;

  const lockedRef = useRef(false);
  const guideRef = useRef<ScanGuide>("seek");
  const pendingRef = useRef<{ g: Exclude<ScanGuide, "lock">; at: number } | null>(null);
  const goodSinceRef = useRef<number | null>(null);
  const lastHitRef = useRef<{ obs: QrObservation; at: number } | null>(null);
  const lastLockedDataRef = useRef("");
  const sawCodeRef = useRef(false);
  const prevScanning = useRef(scanning);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  guideRef.current = guide;

  const granted = permission?.granted === true && camError === null;
  const nativeReady = Platform.OS !== "web" && granted && live && !atCapacity;
  const webReady = Platform.OS === "web" && live && camError === null && !atCapacity;
  const cameraLive = live && !camError && !atCapacity;
  const locked = guide === "lock";
  const ring = locked ? colors.spotify : colors.scannerAmber;

  const publishGuide = useCallback((next: ScanGuide) => {
    if (guideRef.current === next) return;
    guideRef.current = next;
    setGuide(next);
  }, []);

  const captureLock = useCallback(
    (data: string) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      lastLockedDataRef.current = data;
      goodSinceRef.current = null;
      pendingRef.current = null;
      publishGuide("lock");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flash.setValue(0.55);
      lockPop.setValue(0.97);
      Animated.parallel([
        Animated.timing(flash, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(lockPop, { toValue: 1, tension: 220, friction: 12, useNativeDriver: true }),
      ]).start();
      onScanRef.current(data);
    },
    [flash, lockPop, publishGuide]
  );

  const consider = useCallback(
    (obs: QrObservation | null) => {
      const now = Date.now();
      if (obs) lastHitRef.current = { obs, at: now };
      const hit = lastHitRef.current;
      const effective =
        obs || (hit && now - hit.at < LOST_GRACE_MS ? hit.obs : null);

      if (lastLockedDataRef.current && effective?.data === lastLockedDataRef.current) {
        goodSinceRef.current = null;
        if (guideRef.current !== "lock") publishGuide("lock");
        return;
      }

      if (lockedRef.current) return;

      if (lastLockedDataRef.current && !effective) {
        lastLockedDataRef.current = "";
        sawCodeRef.current = false;
        publishGuide("seek");
        return;
      }

      const assessed = assessGuide(effective);

      if (assessed === "hold" && effective) {
        if (goodSinceRef.current == null) goodSinceRef.current = now;
        if (now - goodSinceRef.current >= LOCK_HOLD_MS) {
          captureLock(effective.data);
          return;
        }
      } else {
        goodSinceRef.current = null;
      }

      if (assessed === "closer" || assessed === "farther") {
        if (!sawCodeRef.current) {
          sawCodeRef.current = true;
          Haptics.selectionAsync();
        }
      }

      const published = guideRef.current;
      if (published === "lock" && assessed !== "seek") {
        publishGuide(assessed);
        return;
      }
      if (assessed === published) {
        pendingRef.current = null;
        return;
      }
      if (!pendingRef.current || pendingRef.current.g !== assessed) {
        pendingRef.current = { g: assessed, at: now };
        if (assessed === "hold" || published === "seek" || published === "lock") {
          publishGuide(assessed);
        }
        return;
      }
      if (now - pendingRef.current.at >= GUIDE_STICK_MS) {
        publishGuide(assessed);
        pendingRef.current = null;
      }
    },
    [captureLock, publishGuide]
  );

  useEffect(() => {
    const resumed = scanning && !prevScanning.current;
    prevScanning.current = scanning;
    if (!resumed) return;
    lockedRef.current = false;
    goodSinceRef.current = null;
    pendingRef.current = null;
  }, [scanning, publishGuide]);

  useEffect(() => {
    if (!cameraLive || locked) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.42,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cameraLive, locked, pulse]);

  useEffect(() => {
    if (!cameraLive || !scanning) return;
    const id = setInterval(() => consider(null), 120);
    return () => clearInterval(id);
  }, [cameraLive, scanning, consider]);

  const startCamera = async () => {
    if (atCapacity) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCamError(null);
    lockedRef.current = false;
    lastLockedDataRef.current = "";
    sawCodeRef.current = false;
    lastHitRef.current = null;
    goodSinceRef.current = null;
    pendingRef.current = null;
    publishGuide("seek");
    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamError("missing");
        return;
      }
      setLive(true);
      return;
    }
    const res = permission?.granted ? permission : await requestPermission();
    if (res?.granted) {
      setLive(true);
    } else {
      setCamError("denied");
    }
  };

  const stopCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLive(false);
    setCamError(null);
    lockedRef.current = false;
    lastLockedDataRef.current = "";
    publishGuide("seek");
  };

  const handleNativeBarcode = (result: BarcodeScanningResult) => {
    if (!scanning) return;
    const data = result?.data;
    if (!data) return;
    const fw = previewSize.w;
    const fh = previewSize.h;
    const geo =
      geometryFromCorners(result.cornerPoints || [], fw, fh, data) ||
      (result.bounds
        ? geometryFromBox(
            result.bounds.origin.x,
            result.bounds.origin.y,
            result.bounds.size.width,
            result.bounds.size.height,
            fw,
            fh,
            data
          )
        : null) ||
      observationFromDataOnly(data);
    consider(geo);
  };

  const copy = cameraLive ? guideCopy(guide, scannedCount) : { description: "", pill: null };

  let description = "From a box, shelf tag, or retailer page.";
  if (atCapacity) {
    description = `Maximum ${MAX_QR_PRODUCTS} products. Remove one to scan more.`;
  } else if (camError === "denied") {
    description = "Camera permission denied. Try a photo instead.";
  } else if (camError === "missing") {
    description = "No camera here. Scan a QR from a photo.";
  } else if (live) {
    description = copy.description;
  } else if (scannedCount === 1) {
    description = "1 scanned. Add 1 more to compare.";
  } else if (scannedCount >= 2) {
    description = `${scannedCount} of ${MAX_QR_PRODUCTS} scanned.`;
  }

  const glowStyle =
    Platform.OS === "web"
      ? ({
          boxShadow: locked
            ? "0 0 0 3px rgba(29,185,84,0.28), 0 0 18px rgba(29,185,84,0.42)"
            : "0 0 0 3px rgba(245,180,0,0.3), 0 0 16px rgba(245,180,0,0.38)",
        } as const)
      : {
          shadowColor: ring,
          shadowOpacity: locked ? 0.55 : 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        };

  const pillBg = locked ? colors.spotify : colors.scannerAmber;
  const pillFg = paletteTokens.spotifyInk;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.spotify,
        },
      ]}
    >
      {cameraLive ? (
        <Animated.View
          testID="qr-viewfinder"
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setPreviewSize({ w: width, h: height });
          }}
          style={[
            styles.previewWrap,
            glowStyle,
            { transform: [{ scale: lockPop }] },
          ]}
        >
          <View
            style={[
              styles.preview,
              {
                backgroundColor: paletteTokens.ink,
                borderColor: ring,
              },
            ]}
          >
            {nativeReady ? (
              <CameraView
                facing="back"
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanning ? handleNativeBarcode : undefined}
                onMountError={() => setCamError("missing")}
              />
            ) : null}
            {webReady ? (
              <WebQrCamera
                active
                observing={scanning}
                onObserve={consider}
                onError={(reason) => {
                  setCamError(reason);
                  setLive(false);
                }}
              />
            ) : null}

            <Animated.View
              pointerEvents="none"
              style={[styles.chrome, { opacity: locked ? 1 : pulse }]}
            >
              <ViewfinderCorners color={ring} />
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[styles.flash, { opacity: flash }]}
            />

            {copy.pill ? (
              <View
                testID="qr-guide-pill"
                pointerEvents="none"
                style={[styles.pill, { backgroundColor: pillBg }]}
              >
                {locked ? <Check size={14} color={pillFg} strokeWidth={3} /> : null}
                <Text style={[styles.pillText, { color: pillFg }]}>{copy.pill}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Text style={[styles.title, { color: colors.ink }]}>Scan a product QR</Text>
      <Text
        testID="qr-guide-text"
        accessibilityLiveRegion="polite"
        style={[styles.description, { color: colors.body }]}
      >
        {description}
      </Text>

      <View style={styles.actions}>
        <Pressable
          testID="qr-camera-btn"
          onPress={cameraLive ? stopCamera : startCamera}
          disabled={atCapacity && !cameraLive}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: colors.primaryBtn,
              opacity: atCapacity && !cameraLive ? 0.35 : pressed ? 0.82 : 1,
              transform: [{ scale: pressed && !(atCapacity && !cameraLive) ? 0.96 : 1 }],
            },
          ]}
          accessibilityLabel={cameraLive ? "Close camera" : "Open camera"}
        >
          <Camera size={16} color={colors.primaryBtnFg} strokeWidth={2.2} />
          <Text style={[styles.btnText, { color: colors.primaryBtnFg }]}>
            {cameraLive ? "Close" : "Camera"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onGallery();
          }}
          disabled={atCapacity}
          style={({ pressed }) => [
            styles.btn,
            styles.btnGhost,
            {
              borderColor: colors.ink,
              opacity: atCapacity ? 0.35 : pressed ? 0.75 : 1,
              transform: [{ scale: pressed && !atCapacity ? 0.96 : 1 }],
            },
          ]}
          accessibilityLabel="Scan QR from photo"
        >
          <ImageIcon size={16} color={colors.ink} strokeWidth={2.2} />
          <Text style={[styles.btnText, { color: colors.ink }]}>Photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 14,
    gap: 8,
  },
  previewWrap: {
    marginBottom: 8,
    borderRadius: radii.field,
  },
  preview: {
    height: 220,
    borderRadius: radii.field,
    overflow: "hidden",
    borderWidth: 3,
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  pill: {
    position: "absolute",
    alignSelf: "center",
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  pillText: {
    ...type.button,
    fontSize: 13,
    letterSpacing: 0.1,
  },
  title: {
    ...type.productName,
    fontFamily: "ClashDisplay-Semibold",
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  description: {
    ...type.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: size.button,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  btnText: {
    ...type.button,
    fontSize: 15,
  },
});
