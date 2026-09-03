import * as ExpoHaptics from 'expo-haptics';
import { useSettingsStore } from '../store/useSettingsStore';

export const impactAsync = async (style?: ExpoHaptics.ImpactFeedbackStyle) => {
  if (useSettingsStore.getState().hapticsEnabled) {
    await ExpoHaptics.impactAsync(style);
  }
};

export const notificationAsync = async (type?: ExpoHaptics.NotificationFeedbackType) => {
  if (useSettingsStore.getState().hapticsEnabled) {
    await ExpoHaptics.notificationAsync(type);
  }
};

export const selectionAsync = async () => {
  if (useSettingsStore.getState().hapticsEnabled) {
    await ExpoHaptics.selectionAsync();
  }
};

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
