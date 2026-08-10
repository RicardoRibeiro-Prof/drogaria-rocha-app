import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jduynqhrblvogqltmabk.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_8e-UiAHrdjYMT6_-R39MMA_WZVVtKQz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

