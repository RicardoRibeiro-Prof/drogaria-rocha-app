import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const TEST_KEY = '@drogaria-rocha/teste';

export default function App() {
  const [storageOk, setStorageOk] = useState(false);

  useEffect(() => {
    (async () => {
      await AsyncStorage.setItem(TEST_KEY, 'ok');
      const value = await AsyncStorage.getItem(TEST_KEY);
      setStorageOk(value === 'ok');
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={44} color="#F47A1F" />
          </View>
          <Text style={styles.title}>Drogaria Rocha</Text>
          <Text style={styles.text}>Teste 3: Safe Area + AsyncStorage</Text>
          <Text style={styles.status}>{storageOk ? 'Funcionando corretamente' : 'Testando armazenamento...'}</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconBox: { width: 84, height: 84, borderRadius: 24, backgroundColor: '#FFF1E6', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', color: '#111111' },
  text: { marginTop: 10, fontSize: 15, color: '#666666', textAlign: 'center' },
  status: { marginTop: 12, fontSize: 15, fontWeight: '800', color: '#F47A1F' },
});
