import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe fallback credentials to prevent unhandled fatal exception during standalone boot
const DEFAULT_SUPABASE_URL = 'https://eueqqgjijpbonnnvzwej.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFxZ2ppanBib25ubnZ6d2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNjc3MjcsImV4cCI6MjEwNDg0MzcyN30.cHMURGn8c_Y5KLW88pTLbEDAremT-CxR584__4xxXS8';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Warning: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment. Using safe default configuration.'
  );
}

// Initialize Supabase client with AsyncStorage for auth persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
