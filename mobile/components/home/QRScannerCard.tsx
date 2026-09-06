import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform, Easing } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, Image as ImageIcon, Zap, ZapOff, ScanQrCode } from "lucide-react-native";
import jsQR from "jsqr";
import { useThemeColors, paletteTokens } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii } from "../../constants/Layout";
import * as Haptics from "../../utils/haptics";
import { MAX_QR_PRODUCTS } from "../../utils/qr";

type Props = {
  scanning: boolean;
  atCapacity: boolean;
  flashTick: number;
  scannedCount: number;
  onScan: (data: string) => void;
  onGallery: () => void;
};

type CamError = "denied" | "missing" | null;

const FLOW = Easing.bezier(0.16, 1, 0.3, 1);

function WebQrCamera({
  active,
  onScan,
  onError,
}: {
  active: boolean;
  onScan: (data: string) => void;
  onError: (reason: CamError) => void;
}) {
  const hostRef = useRef<View>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

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
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
    let detector: { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } | null = null;
    if (typeof Detector === "function") {
      try {
        detector = new Detector({ formats: ["qr_code"] });
      } catch {
        detector = null;
      }
    }

    const tick = async () => {
      if (stopped) return;
      if (video.readyState >= 2 && ctx) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          try {
            if (detector) {
              const codes = await detector.detect(video);
              if (codes?.[0]?.rawValue) onScanRef.current(codes[0].rawValue);
            } else {
              const max = 480;
              const scale = Math.min(1, max / Math.max(w, h));
              const dw = Math.max(1, Math.round(w * scale));
              const dh = Math.max(1, Math.round(h * scale));
              canvas.width = dw;
              canvas.height = dh;
              ctx.drawImage(video, 0, 0, dw, dh);
              const imageData = ctx.getImageData(0, 0, dw, dh);
              const code = jsQR(imageData.data, dw, dh, { inversionAttempts: "dontInvert" });
              if (code?.data) onScanRef.current(code.data);
            }
          } catch {
            /* frame skipped */
          }
        }
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

function Viewfinder({ color, opacity, scale }: { color: string; opacity: Animated.Value; scale: Animated.Value }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={[styles.corner, styles.tl, { borderColor: color }]} />
      <View style={[styles.corner, styles.tr, { borderColor: color }]} />
      <View style={[styles.corner, styles.bl, { borderColor: color }]} />
      <View style={[styles.corner, styles.br, { borderColor: color }]} />
    </Animated.View>
  );
}

export function QRScannerCard({ scanning, atCapacity, flashTick, scannedCount, onScan, onGallery }: Props) {
  const { colors, isDark } = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [camError, setCamError] = useState<CamError>(null);
  const [live, setLive] = useState(false);
  const [torch, setTorch] = useState(false);
  const scanLine = useRef(new Animated.Value(0)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const greenFlash = useRef(new Animated.Value(0)).current;
  const idleOp = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const cornerOp = useRef(new Animated.Value(0.7)).current;
  const cornerScale = useRef(new Animated.Value(1)).current;
  const countScale = useRef(new Animated.Value(1)).current;
  const capOp = useRef(new Animated.Value(0)).current;
  const lineOp = useRef(new Animated.Value(0.45)).current;

  const granted = permission?.granted === true && camError === null;
  const nativeReady = Platform.OS !== "web" && granted && live && !atCapacity;
  const webReady = Platform.OS === "web" && live && camError === null && !atCapacity;
  const showingIdle = !live || !!camError;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerOp, {
          toValue: showingIdle ? 0.55 : 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cornerOp, {
          toValue: showingIdle ? 0.85 : 0.62,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cornerOp, showingIdle]);

  useEffect(() => {
    Animated.timing(idleOp, {
      toValue: showingIdle ? 1 : 0,
      duration: 320,
      easing: FLOW,
      useNativeDriver: true,
    }).start();
  }, [showingIdle, idleOp]);

  useEffect(() => {
    Animated.timing(lineOp, {
      toValue: atCapacity ? 0 : live && !camError && scanning ? 1 : 0.42,
      duration: 280,
      easing: FLOW,
      useNativeDriver: true,
    }).start();
  }, [atCapacity, live, camError, scanning, lineOp]);

  useEffect(() => {
    Animated.timing(capOp, {
      toValue: atCapacity ? 1 : 0,
      duration: 280,
      easing: FLOW,
      useNativeDriver: true,
    }).start();
  }, [atCapacity, capOp]);

  useEffect(() => {
    if (!flashTick) return;
    flashOp.setValue(0.42);
    greenFlash.setValue(0.28);
    cornerScale.setValue(1.08);
    Animated.parallel([
      Animated.timing(flashOp, { toValue: 0, duration: 240, easing: FLOW, useNativeDriver: true }),
      Animated.timing(greenFlash, { toValue: 0, duration: 520, easing: FLOW, useNativeDriver: true }),
      Animated.spring(cornerScale, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [flashTick, flashOp, greenFlash, cornerScale]);

  useEffect(() => {
    if (!scannedCount) return;
    countScale.setValue(0.86);
    Animated.spring(countScale, { toValue: 1, tension: 280, friction: 8, useNativeDriver: true }).start();
  }, [scannedCount, countScale]);

  const startCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCamError(null);
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

  const statusText = atCapacity
    ? `Maximum ${MAX_QR_PRODUCTS} products`
    : live && !camError
      ? "Point at a product QR"
      : null;

  return (
    <View style={[styles.wrap, { backgroundColor: paletteTokens.ink, borderColor: colors.line }]}>
      {nativeReady ? (
        <CameraView
          facing="back"
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanning ? ({ data }) => onScan(data) : undefined}
          enableTorch={torch}
          onMountError={() => setCamError("missing")}
        />
      ) : null}

      {webReady ? (
        <WebQrCamera
          active={scanning}
          onScan={onScan}
          onError={(reason) => {
            setCamError(reason);
            setLive(false);
          }}
        />
      ) : null}

      <Animated.View pointerEvents="none" style={[styles.idle, { opacity: idleOp }]}>
        <Animated.View
          style={{
            transform: [
              {
                scale: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
            ],
            opacity: breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0.78, 1],
            }),
          }}
        >
          <ScanQrCode size={36} color={colors.spotify} strokeWidth={1.6} />
        </Animated.View>
        <Text style={[styles.idleTitle, { color: "#F6F6F4" }]}>Scan a product QR</Text>
        <Text style={[styles.idleSub, { color: "rgba(246,246,244,0.62)" }]}>
          {camError === "denied"
            ? "Camera permission denied — try a photo instead"
            : camError === "missing"
              ? "No camera here — scan a QR from a photo"
              : "Box, shelf tag, or retailer page"}
        </Text>
      </Animated.View>

      <Viewfinder color={colors.spotify} opacity={cornerOp} scale={cornerScale} />

      <Animated.View pointerEvents="none" style={[styles.scanLineTrack, { opacity: lineOp }]}>
        <Animated.View
          style={{
            width: "100%",
            transform: [
              {
                translateY: scanLine.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 118],
                }),
              },
            ],
          }}
        >
          <View style={[styles.scanGlow, { backgroundColor: colors.spotify }]} />
          <View style={[styles.scanCore, { backgroundColor: colors.spotify }]} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { backgroundColor: "#FFFFFF", opacity: flashOp }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { backgroundColor: colors.spotify, opacity: greenFlash }]}
      />

      <Animated.View pointerEvents="none" style={[styles.capacityMask, { opacity: capOp }]}>
        <Text style={styles.capacityText}>
          {MAX_QR_PRODUCTS} of {MAX_QR_PRODUCTS} — remove one to scan more
        </Text>
      </Animated.View>

      <View style={styles.hudTop}>
        <Animated.View
          style={[styles.countPill, { backgroundColor: "rgba(10,10,10,0.72)", transform: [{ scale: countScale }] }]}
        >
          <Text style={styles.countText}>
            {scannedCount} / {MAX_QR_PRODUCTS}
          </Text>
        </Animated.View>
        {live && Platform.OS !== "web" && !camError ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setTorch((t) => !t);
            }}
            style={[styles.iconBtn, { backgroundColor: "rgba(10,10,10,0.72)" }]}
            accessibilityLabel={torch ? "Turn torch off" : "Turn torch on"}
          >
            {torch ? (
              <Zap size={16} color={colors.spotify} strokeWidth={2.2} />
            ) : (
              <ZapOff size={16} color="#F6F6F4" strokeWidth={2.2} />
            )}
          </Pressable>
        ) : null}
      </View>

      {statusText ? <Text style={styles.status}>{statusText}</Text> : null}

      <View style={styles.hudBottom}>
        {showingIdle ? (
          <Pressable
            onPress={startCamera}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: isDark ? colors.spotify : "#F6F6F4",
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <Camera size={16} color={isDark ? paletteTokens.spotifyInk : paletteTokens.ink} strokeWidth={2.2} />
            <Text style={[styles.ctaText, { color: isDark ? paletteTokens.spotifyInk : paletteTokens.ink }]}>
              {camError === "denied" ? "Try camera again" : "Open camera"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onGallery();
          }}
          style={({ pressed }) => [
            styles.ctaGhost,
            { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
          accessibilityLabel="Scan QR from photo"
        >
          <ImageIcon size={16} color="#F6F6F4" strokeWidth={2.2} />
          <Text style={styles.ctaGhostText}>Photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 240,
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  idle: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 28,
    zIndex: 2,
  },
  idleTitle: {
    ...type.productName,
    fontFamily: "ClashDisplay-Semibold",
    fontSize: 18,
    marginTop: 4,
  },
  idleSub: {
    ...type.caption,
    fontSize: 13,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderWidth: 2.5,
    zIndex: 3,
  },
  tl: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLineTrack: {
    position: "absolute",
    top: 52,
    left: 40,
    right: 40,
    height: 134,
    overflow: "hidden",
    zIndex: 4,
  },
  scanGlow: {
    height: 14,
    width: "100%",
    borderRadius: 8,
    opacity: 0.18,
  },
  scanCore: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2,
    opacity: 0.95,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },
  capacityMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  capacityText: {
    ...type.caption,
    color: "#F6F6F4",
    fontSize: 13,
  },
  hudTop: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 7,
    pointerEvents: "box-none",
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  countText: {
    ...type.eyebrow,
    color: "#F6F6F4",
    fontSize: 10,
    letterSpacing: 1,
  },
  iconBtn: {
    position: "absolute",
    right: 52,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    position: "absolute",
    bottom: 56,
    left: 16,
    right: 16,
    textAlign: "center",
    color: "rgba(246,246,244,0.86)",
    ...type.caption,
    fontSize: 12,
    zIndex: 7,
  },
  hudBottom: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    zIndex: 7,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  ctaText: {
    ...type.button,
    fontSize: 13,
  },
  ctaGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(246,246,244,0.12)",
  },
  ctaGhostText: {
    ...type.button,
    fontSize: 13,
    color: "#F6F6F4",
  },
});
