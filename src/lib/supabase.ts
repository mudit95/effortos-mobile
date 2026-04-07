import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://muqavvntwzwzbxuxefre.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vy1CHkBMrKJ2FSY4-ODvIg_aFUcygLK';

// SecureStore has a 2048-byte limit per key.
// Supabase JWT tokens are often larger, so we chunk the value across multiple keys.
const CHUNK_SIZE = 1800;

const ChunkedSecureStore = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Try reading as a single value first (small values)
      const single = await SecureStore.getItemAsync(key);
      if (single !== null && !single.startsWith('__CHUNKED__')) return single;

      if (single === null) return null;

      // It's chunked — read the count and reassemble
      const count = parseInt(single.replace('__CHUNKED__', ''), 10);
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}__chunk_${i}`);
        if (chunk === null) return null; // Corrupted — bail
        chunks.push(chunk);
      }
      return chunks.join('');
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (value.length <= CHUNK_SIZE) {
        // Small enough — store directly
        await SecureStore.setItemAsync(key, value);
        // Clean up any old chunks
        for (let i = 0; i < 10; i++) {
          try { await SecureStore.deleteItemAsync(`${key}__chunk_${i}`); } catch {}
        }
      } else {
        // Chunk it
        const chunks: string[] = [];
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.slice(i, i + CHUNK_SIZE));
        }
        // Store the chunk count as the main value
        await SecureStore.setItemAsync(key, `__CHUNKED__${chunks.length}`);
        // Store each chunk
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.setItemAsync(`${key}__chunk_${i}`, chunks[i]);
        }
      }
    } catch {}
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const val = await SecureStore.getItemAsync(key);
      await SecureStore.deleteItemAsync(key);
      // Clean up chunks if any
      if (val && val.startsWith('__CHUNKED__')) {
        const count = parseInt(val.replace('__CHUNKED__', ''), 10);
        for (let i = 0; i < count; i++) {
          try { await SecureStore.deleteItemAsync(`${key}__chunk_${i}`); } catch {}
        }
      }
    } catch {}
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ChunkedSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
