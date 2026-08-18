import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';

export default function App() {
  const [status, setStatus] = useState('Conectando ao Supabase...');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('stores').select('id,name').limit(1);
        if (!mounted) return;
        if (error) setStatus(`Supabase carregou. Consulta retornou: ${error.message}`);
        else setStatus(`Supabase funcionando. ${data?.length || 0} loja(s) encontrada(s).`);
      } catch (error: any) {
        if (mounted) setStatus(`Erro: ${error?.message || String(error)}`);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <View style={styles.iconBox}>
            <Ionicons name="cloud-done-outline" size={44} color="#F47A1F" />
          </View>
          <Text style={styles.title}>Drogaria Rocha</Text>
          <Text style={styles.text}>Teste 4: Supabase</Text>
          <Text style={styles.status}>{status}</Text>
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
  status: { marginTop: 12, fontSize: 15, fontWeight: '800', color: '#F47A1F', textAlign: 'center' },
});
