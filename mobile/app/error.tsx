import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from '../utils/haptics';
import { useThemeColors } from "../constants/Colors";
import { Button } from "../components/ui/Button";

// View-based illustration of a broken server connection
function BrokenServerSVG({ colors }: { colors: any }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View style={svgStyles.wrap}>
      {/* Background circles */}
      <View style={[svgStyles.circleBg, { backgroundColor: colors.surfaceHighlight }]} />
      <View style={[svgStyles.circleBgLarge, { borderColor: colors.border }]} />
      
      <Animated.View style={[svgStyles.serverGroup, { transform: [{ translateY: floatAnim }] }]}>
        {/* Top Server Blade */}
        <View style={[svgStyles.blade, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[svgStyles.dot, { backgroundColor: colors.textTertiary }]} />
          <View style={[svgStyles.line, { backgroundColor: colors.border }]} />
        </View>

        {/* Middle Broken Blade */}
        <View style={[svgStyles.bladeBroken, { backgroundColor: colors.error + '20', borderColor: colors.error + '50' }]}>
          <Animated.View style={[svgStyles.dot, { backgroundColor: colors.error, opacity: pulseAnim }]} />
          <View style={[svgStyles.line, { backgroundColor: colors.error + '50' }]} />
          <View style={svgStyles.slashWrap}>
            <Feather name="zap" size={24} color={colors.error} style={{ position: 'absolute', right: -25, top: -12 }} />
          </View>
        </View>

        {/* Bottom Server Blade */}
        <View style={[svgStyles.blade, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[svgStyles.dot, { backgroundColor: colors.textTertiary }]} />
          <View style={[svgStyles.line, { backgroundColor: colors.border }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const svgStyles = StyleSheet.create({
  wrap: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  circleBg: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  circleBgLarge: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderStyle: 'dashed' },
  serverGroup: { gap: 12, alignItems: 'center' },
  blade: { width: 100, height: 28, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  bladeBroken: { width: 110, height: 28, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10, transform: [{ rotate: '-3deg' }, { translateX: -4 }] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  line: { flex: 1, height: 4, borderRadius: 2 },
  slashWrap: { position: 'absolute', right: 0 },
});

export default function ErrorScreen() {
  const router = useRouter();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Pressable 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
        style={[styles.backBtn, { top: Math.max(insets.top, 20) + 16, backgroundColor: colors.surface, borderColor: colors.border }]}
        hitSlop={15}
      >
        <Feather name="arrow-left" size={20} color={colors.text} />
      </Pressable>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]} >
        
        <BrokenServerSVG colors={colors} />
        
        <Text style={[styles.title, { color: colors.text }]}>Extraction Failed</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          {message || "We couldn't extract specifications from one or more of these URLs. Ensure they are valid product pages."}
        </Text>

        <View style={styles.actions}>
          <Button 
            title="Try Again" 
            variant="primary" 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }} 
            style={{ width: '100%' }}
          />
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24 },
  backBtn: { position: 'absolute', left: 24, zIndex: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, letterSpacing: -0.5 },
  desc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 },
  actions: { width: '100%', maxWidth: 300, gap: 12 },
});
