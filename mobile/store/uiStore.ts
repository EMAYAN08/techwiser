import { Animated } from "react-native";

export const tabBarAnim = new Animated.Value(1); // 1 = visible, 0 = hidden

let isTabBarVisible = true;
let lastScrollY = 0;

export const handleScroll = (event: any) => {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
  const currentScrollY = contentOffset.y;
  
  // Ignore top rubber banding on iOS
  if (currentScrollY < 0) return;
  
  // Ignore bottom rubber banding (prevents tab bar from popping up when bouncing at the bottom)
  const maxScroll = contentSize.height - layoutMeasurement.height;
  if (currentScrollY > maxScroll && maxScroll > 0) return;

  const delta = currentScrollY - lastScrollY;
  lastScrollY = currentScrollY;

  // Scroll down (content moves up) -> hide tab bar
  if (delta > 8 && isTabBarVisible) {
    isTabBarVisible = false;
    Animated.spring(tabBarAnim, {
      toValue: 0, // hidden
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  } 
  // Scroll up (content moves down) -> show tab bar
  else if (delta < -12 && !isTabBarVisible) {
    isTabBarVisible = true;
    Animated.spring(tabBarAnim, {
      toValue: 1, // visible
      useNativeDriver: true,
      tension: 200,
      friction: 14,
    }).start();
  }
};
