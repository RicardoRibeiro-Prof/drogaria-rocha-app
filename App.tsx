import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AdminApp from './src/AdminApp';
import AppV2 from './src/AppV2';
import { supabase } from './src/lib/supabase';

export default function App() {
  return (
    <SafeAreaProvider>
      <RoleRouter />
    </SafeAreaProvider>
  );
}

function RoleRouter() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  const resolveRole = useCallback(async (nextSession: any) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      setIsAdmin(false);
      setReady(true);
      return;
    }

    setReady(false);
    const user = nextSession.user;
    const [{ data: adminData }, { data: profileData }] = await Promise.all([
      supabase.rpc('is_admin'),
      supabase
        .from('profiles')
        .select('name,phone,cpf,birth_date')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    setProfile(profileData || {
      name: user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || '',
    });
    setIsAdmin(adminData === true);
    setReady(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => resolveRole(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      resolveRole(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [resolveRole]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.loading} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#F47A1F" />
          <Text style={styles.loadingText}>Carregando Drogaria Rocha...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (session && isAdmin) {
    return <AdminApp session={session} profile={profile} />;
  }

  return (
    <SafeAreaView style={styles.clientSafeArea} edges={['bottom']}>
      <AppV2 />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#666666', fontSize: 13, fontWeight: '700' },
  clientSafeArea: { flex: 1, backgroundColor: '#FFFFFF' },
});
