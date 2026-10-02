// ==========================================================================
// SAMATA SAINIK DAL (SSD) - REAL-TIME EVENT STREAM & BROADCAST ENGINE
// High-Performance Server-Sent Events (SSE) & Cross-Client Data Pipeline
// ==========================================================================

import express from 'express';

// Active connected SSE client responses
const sseClients = new Set();

/**
 * Broadcasts an event to all currently connected SSE clients.
 * @param {string} eventName Name of the event (e.g., 'news:update', 'membership:apply')
 * @param {object|any} payload Event data payload
 */
export function broadcastRealtimeEvent(eventName, payload = {}) {
  const dataString = JSON.stringify(payload || {});
  const message = `event: ${eventName}\ndata: ${dataString}\n\n`;

  let activeCount = 0;
  for (const client of sseClients) {
    try {
      client.write(message);
      activeCount++;
    } catch (err) {
      console.warn('Realtime client write error, removing socket:', err.message);
      sseClients.delete(client);
    }
  }

  // Also log for developer visibility
  if (process.env.NODE_ENV !== 'test') {
    console.log(`📡 [Realtime SSE Broadcast] '${eventName}' dispatched to ${activeCount} active client(s).`);
  }
}

/**
 * Initializes the realtime endpoints on the Express application.
 * @param {express.Application} app 
 */
export function initRealtimeRoutes(app) {
  const router = express.Router();

  // 1. SSE Stream Endpoint: Clients connect here with new EventSource('/api/realtime/stream')
  router.get('/stream', (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Flush headers if supported
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Register active client
    sseClients.add(res);

    // Initial handshake message
    res.write(`event: connected\ndata: ${JSON.stringify({
      status: 'connected',
      service: 'SSD Real-Time Data Pipeline',
      activeClients: sseClients.size,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Keepalive ping every 25 seconds to keep the socket alive through NAT/proxies
    const keepAliveTimer = setInterval(() => {
      try {
        res.write(':keepalive\n\n');
      } catch (e) {
        clearInterval(keepAliveTimer);
        sseClients.delete(res);
      }
    }, 25000);

    // Clean up when client disconnects
    req.on('close', () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    });

    req.on('end', () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    });
  });

  // 2. Broadcast API: Allows client or admin to trigger a real-time event across all clients
  router.post('/broadcast', (req, res) => {
    try {
      const { event, data } = req.body;
      if (!event) {
        return res.status(400).json({ success: false, error: 'Event name is required.' });
      }

      broadcastRealtimeEvent(event, data || {});
      return res.json({
        success: true,
        event: event,
        clientCount: sseClients.size,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Status inspection
  router.get('/status', (req, res) => {
    return res.json({
      status: 'ONLINE',
      activeConnections: sseClients.size,
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/realtime', router);
}
