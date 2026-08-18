import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://khmowqmmwdrornfgrbpi.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_oUgMPwAr5mUSeW3Pxgl6DA_p_-7CwZx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
