// ==========================================================================
// SAMATA SAINIK DAL (SSD) - SUPABASE CLIENT-SIDE CONNECTOR
// Provides real-time subscriptions & public Supabase cloud services
// ==========================================================================

(function (window) {
  'use strict';

  let supabaseInstance = null;

  async function initSupabaseClient() {
    if (supabaseInstance) return supabaseInstance;

    // 1. Fetch public Supabase configuration from server if not set on window
    const supabaseUrl = window.SUPABASE_URL || (window.ENV && window.ENV.SUPABASE_URL);
    const supabaseAnonKey = window.SUPABASE_ANON_KEY || (window.ENV && window.ENV.SUPABASE_ANON_KEY);

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      return null;
    }

    // 2. Ensure Supabase JS library is loaded (from CDN if not already loaded)
    if (typeof window.supabase === 'undefined' && typeof window.createClient === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(err => {
        console.warn('Could not load Supabase client library from CDN:', err);
        return null;
      });
    }

    try {
      const createClientFn = window.supabase ? window.supabase.createClient : window.createClient;
      if (typeof createClientFn === 'function') {
        supabaseInstance = createClientFn(supabaseUrl, supabaseAnonKey);
        console.log('⚡ [Supabase Client] Successfully initialized for client-side connection.');
        return supabaseInstance;
      }
    } catch (err) {
      console.warn('Supabase client initialization notice:', err);
    }
    return null;
  }

  window.initSupabaseClient = initSupabaseClient;
  window.getSupabaseClient = () => supabaseInstance;

})(window);
