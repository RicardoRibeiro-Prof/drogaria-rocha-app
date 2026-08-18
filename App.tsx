import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppV2 from './src/AppV2';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <AppV2 />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
