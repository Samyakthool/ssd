// ==========================================================================
// SAMATA SAINIK DAL (SSD) - UNIFIED CLIENT REAL-TIME EVENT HUB
// Dual-Channel: Browser BroadcastChannel + Server-Sent Events (SSE)
// ==========================================================================

(function(global) {
  const listeners = new Map();
  let broadcastChannel = null;
  let eventSource = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let isConnected = false;

  // Initialize BroadcastChannel for instant local cross-tab sync
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('ssd_realtime_pipeline');
      broadcastChannel.onmessage = (event) => {
        if (event && event.data && event.data.type) {
          triggerHandlers(event.data.type, event.data.payload, 'broadcast_channel');
        }
      };
    }
  } catch (e) {
    console.warn('[SSD Realtime] BroadcastChannel init note:', e);
  }

  // Cross-tab Storage Fallback
  window.addEventListener('storage', (e) => {
    if (e.key === 'ssd_admin_local_data') {
      triggerHandlers('storage:sync', { key: e.key }, 'local_storage');
    }
  });

  function triggerHandlers(eventType, payload, origin) {
    const list = listeners.get(eventType) || [];
    list.forEach(fn => {
      try { fn(payload, origin); } catch (err) { console.error(`[SSD Realtime] Listener error for ${eventType}:`, err); }
    });

    // Also trigger wildcard listeners
    const anyList = listeners.get('*') || [];
    anyList.forEach(fn => {
      try { fn(eventType, payload, origin); } catch (err) { console.error(`[SSD Realtime] Wildcard error for ${eventType}:`, err); }
    });
  }

  function connectSSE() {
    if (typeof EventSource === 'undefined') return;
    if (eventSource) {
      try { eventSource.close(); } catch (e) {}
    }

    try {
      eventSource = new EventSource('/api/realtime/stream');

      eventSource.onopen = () => {
        isConnected = true;
        reconnectAttempts = 0;
        triggerHandlers('realtime:connected', { status: 'ONLINE' }, 'sse');
      };

      eventSource.onerror = () => {
        isConnected = false;
        try { eventSource.close(); } catch (e) {}
        eventSource = null;

        // Exponential backoff reconnect: 1s, 2s, 4s, up to 15s max
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 15000);
        reconnectAttempts++;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectSSE, delay);
      };

      // Listen for all server broadcast events
      const knownEvents = [
        'connected',
        'leadership:update',
        'leadership:delete',
        'news:update',
        'news:delete',
        'event:update',
        'event:delete',
        'event:register',
        'campaign:update',
        'campaign:delete',
        'gallery:update',
        'gallery:delete',
        'membership:apply',
        'membership:approve',
        'membership:reject',
        'membership:workflow',
        'donation:new',
        'stats:update',
        'chapter:update',
        'sync:all'
      ];

      knownEvents.forEach(evt => {
        eventSource.addEventListener(evt, (e) => {
          let data = null;
          try { data = JSON.parse(e.data); } catch (err) { data = e.data; }
          triggerHandlers(evt, data, 'sse');
        });
      });

    } catch (err) {
      console.warn('[SSD Realtime] SSE connection error:', err);
    }
  }

  // Connect on load
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', connectSSE);
    } else {
      connectSSE();
    }
  }

  const SSDRealtime = {
    on(eventType, callback) {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, []);
      }
      listeners.get(eventType).push(callback);
      return () => this.off(eventType, callback);
    },

    off(eventType, callback) {
      if (!listeners.has(eventType)) return;
      const arr = listeners.get(eventType).filter(fn => fn !== callback);
      listeners.set(eventType, arr);
    },

    emit(eventType, payload, syncToServer = true) {
      // 1. Dispatch locally
      triggerHandlers(eventType, payload, 'local');

      // 2. Dispatch cross-tab via BroadcastChannel
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: eventType, payload });
        } catch (e) {}
      }

      // 3. Dispatch to server to push to other browsers/devices
      if (syncToServer) {
        fetch('/api/realtime/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: eventType, data: payload })
        }).catch(() => {});
      }
    },

    isConnected() {
      return isConnected;
    }
  };

  global.SSDRealtime = SSDRealtime;
})(typeof window !== 'undefined' ? window : this);
