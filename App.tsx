import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomerScreen from './src/screens/CustomerScreen';
import { RestaurantProvider } from './src/contexts/RestaurantContext';

export default function App() {
  return (
    <RestaurantProvider>
      <SafeAreaProvider>
        <CustomerScreen />
      </SafeAreaProvider>
    </RestaurantProvider>
  );
}