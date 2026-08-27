import { ImageSourcePropType } from 'react-native';

export const categoryIcons: Record<string, ImageSourcePropType> = {
  // Device Categories
  Phone: require('../assets/icons/phone.jpg'),
  Headphones: require('../assets/icons/headphones.jpg'),
  Earphones: require('../assets/icons/earphones.jpg'),
  TV: require('../assets/icons/tv.jpg'),
  Fridge: require('../assets/icons/fridge.jpg'),
  AC: require('../assets/icons/ac.jpg'),
  Laptops: require('../assets/icons/laptop.jpg'),
  Desktop: require('../assets/icons/desktop.jpg'),
  Monitor: require('../assets/icons/monitor.jpg'),
  Keyboard: require('../assets/icons/keyboard.jpg'),
  
  // Spec Categories
  Performance: require('../assets/icons/performance.jpg'),
  Display: require('../assets/icons/display.jpg'),
  Battery: require('../assets/icons/battery.jpg'),
  Camera: require('../assets/icons/camera.jpg'),
  Build: require('../assets/icons/build.jpg'),
  Connectivity: require('../assets/icons/connectivity.jpg'),
};
