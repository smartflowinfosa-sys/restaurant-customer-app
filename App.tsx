import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomerScreen from './src/screens/CustomerScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <CustomerScreen />
    </SafeAreaProvider>
  );
}