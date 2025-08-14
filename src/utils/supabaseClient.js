import { createClient } from '@supabase/supabase-js';

let supabase = null;
try {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    supabase = createClient(url, key, {
      auth: { persistSession: false },
      global: { headers: { 'X-Client-Info': 'birrpay-bot/1.0' } }
    });
    console.log('✅ Supabase client initialized');
  } else {
    console.log('ℹ️ Supabase not configured (SUPABASE_URL missing)');
  }
} catch (e) {
  console.warn('⚠️ Failed to initialize Supabase client:', e.message);
}

export { supabase };