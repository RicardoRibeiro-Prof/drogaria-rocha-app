import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://khmowqmmwdrornfgrbpi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_oUgMPwAr5mUSeW3Pxgl6DA_p_-7CwZx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
