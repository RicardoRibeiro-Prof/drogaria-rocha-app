import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Ionicons name="medkit" size={44} color="#F47A1F" />
        </View>
        <Text style={styles.title}>Drogaria Rocha</Text>
        <Text style={styles.text}>Teste 2: ícones carregados com sucesso.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconBox: { width: 84, height: 84, borderRadius: 24, backgroundColor: '#FFF1E6', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', color: '#111111' },
  text: { marginTop: 10, fontSize: 15, color: '#666666', textAlign: 'center' },
});
