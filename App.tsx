import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';
import CustomerScreen from './src/screens/CustomerScreen';
import { RestaurantProvider } from './src/contexts/RestaurantContext';

export default function App() {
  // Preload Cairo font family in parallel while the opening splash screen plays
  useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  return (
    <RestaurantProvider>
      <SafeAreaProvider>
        <CustomerScreen />
        <Toast />
      </SafeAreaProvider>
    </RestaurantProvider>
  );
}