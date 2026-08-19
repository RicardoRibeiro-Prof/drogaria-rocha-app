import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminRoot from './src/AdminRoot';
import ClientApp from './src/ClientApp';
import { supabase } from './src/lib/supabase';

function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido')), ms)),
  ]);
}

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

  const resolveRole = useCallback(async (nextSession: any) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    const user = nextSession.user;
    const fallbackProfile = {
      name: user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || '',
    };

    // O app abre sem esperar Supabase. Perfil e papel de admin são resolvidos em segundo plano.
    setProfile(fallbackProfile);

    try {
      const [adminResult, profileResult] = await withTimeout(
        Promise.all([
          supabase.rpc('is_admin'),
          supabase.from('profiles').select('name,phone,cpf,birth_date').eq('user_id', user.id).maybeSingle(),
        ]),
        6000,
      );

      setProfile(profileResult.data || fallbackProfile);
      setIsAdmin(adminResult.data === true);
    } catch {
      // Falha de rede não impede o aplicativo de abrir.
      setProfile(fallbackProfile);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) resolveRole(data.session);
      })
      .catch(() => {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Evita executar novas chamadas Supabase dentro do callback interno de autenticação.
      setTimeout(() => {
        if (mounted) resolveRole(nextSession);
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [resolveRole]);

  if (session && isAdmin) {
    return <AdminRoot session={session} profile={profile} />;
  }

  return <ClientShell session={session} profile={profile} />;
}

function ClientShell({ session, profile }: { session: any; profile: any }) {
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
          <View style={styles.clientBrandText}>
            <Text style={styles.clientBrandName}>Drogaria Rocha</Text>
            {session?.user ? (
              <Text style={styles.clientAccount} numberOfLines={1}>
                {profile?.name || 'Cliente'} • {session.user.email}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.clientCartVisual}>
          <Ionicons name="bag-handle-outline" size={25} color="#F47A1F" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  clientBrandText: { flex: 1, minWidth: 0 },
  clientBrandName: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  clientAccount: {
    color: '#FFF2E8',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    marginTop: 1,
    paddingRight: 8,
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