import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <View style={styles.mark} />
        <Text style={styles.title}>Drogaria Rocha</Text>
        <Text style={styles.text}>React Native + Expo funcionando corretamente.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mark: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#F47A1F', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', color: '#111111' },
  text: { marginTop: 10, fontSize: 15, color: '#666666', textAlign: 'center' },
});
