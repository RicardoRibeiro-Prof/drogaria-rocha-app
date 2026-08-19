import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminRoot from './src/AdminRoot';
import ClientApp from './src/ClientApp';
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
      supabase.from('profiles').select('name,phone,cpf,birth_date').eq('user_id', user.id).maybeSingle(),
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => resolveRole(nextSession));
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
    return <AdminRoot session={session} profile={profile} />;
  }

  return <ClientShell />;
}

function ClientShell() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.clientRoot}>
      <ClientApp />

      <View
        pointerEvents="none"
        style={[
          styles.clientHeaderOverlay,
          { height: 68 + insets.top, paddingTop: insets.top },
        ]}
      >
        <View style={styles.clientBrand}>
          <View style={styles.clientLogoBox}>
            <Image source={require('./assets/logo-rocha-oficial.webp')} style={styles.clientLogo} resizeMode="contain" />
          </View>
          <Text style={styles.clientBrandName}>Drogaria Rocha</Text>
        </View>

        <View style={styles.clientCartVisual}>
          <Ionicons name="bag-handle-outline" size={25} color="#F47A1F" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#666666', fontSize: 13, fontWeight: '700' },
  clientRoot: { flex: 1, backgroundColor: '#F47A1F' },
  clientHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 20,
    backgroundColor: '#F47A1F',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientLogoBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clientLogo: { width: 50, height: 50 },
  clientBrandName: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  clientCartVisual: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
