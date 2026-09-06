import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, Image as ImageIcon } from "lucide-react-native";
import jsQR from "jsqr";
import { useThemeColors, paletteTokens } from "../../constants/Colors";
import { type } from "../../constants/Typography";
import { radii, size } from "../../constants/Layout";
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
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o: { formats: string[] }) => {
          detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;
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

  const granted = permission?.granted === true && camError === null;
  const nativeReady = Platform.OS !== "web" && granted && live && !atCapacity;
  const webReady = Platform.OS === "web" && live && camError === null && !atCapacity;

  const startCamera = async () => {
    if (atCapacity) return;
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

  const stopCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLive(false);
    setCamError(null);
  };

  let description = "From a box, shelf tag, or retailer page.";
  if (atCapacity) {
    description = `Maximum ${MAX_QR_PRODUCTS} products. Remove one to scan more.`;
  } else if (camError === "denied") {
    description = "Camera permission denied. Try a photo instead.";
  } else if (camError === "missing") {
    description = "No camera here. Scan a QR from a photo.";
  } else if (live) {
    description = "Hold steady on the product QR.";
  } else if (scannedCount === 1) {
    description = "1 scanned. Add 1 more to compare.";
  } else if (scannedCount >= 2) {
    description = `${scannedCount} of ${MAX_QR_PRODUCTS} scanned.`;
  }

  const cameraLive = live && !camError && !atCapacity;

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
        <View style={[styles.preview, { backgroundColor: paletteTokens.ink, borderColor: colors.line }]}>
          {nativeReady ? (
            <CameraView
              facing="back"
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanning ? ({ data }) => onScan(data) : undefined}
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
        </View>
      ) : null}

      <Text style={[styles.title, { color: colors.ink }]}>Scan a product QR</Text>
      <Text style={[styles.description, { color: colors.body }]}>{description}</Text>

      <View style={styles.actions}>
        <Pressable
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
          <Camera
            size={16}
            color={colors.primaryBtnFg}
            strokeWidth={2.2}
          />
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
  preview: {
    height: 168,
    borderRadius: radii.field,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 8,
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
