// ==========================================================================
// SAMATA SAINIK DAL (SSD) - UNIFIED DATA PIPELINE SYNC ENGINE
// Fast Boot Synchronization & Realtime Broadcast Pipeline
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

// 1. GET FULL LIVE SNAPSHOT FOR INSTANT CLIENT BOOT
router.get('/all', (req, res) => {
  try {
    const news = Array.from(embeddedStore.news.values());
    const events = Array.from(embeddedStore.events.values());
    const campaigns = Array.from(embeddedStore.campaigns.values());
    const gallery = Array.from(embeddedStore.gallery.values());
    const leadership = Array.from(embeddedStore.leadership.values());
    const statsSetting = embeddedStore.system_settings.get('platform_stats');
    const stats = statsSetting ? statsSetting.value : {
      members: 100000,
      states: 28,
      events: 5200,
      yearsActive: 99
    };
    const chapters = Array.from(embeddedStore.chapters.values());

    return res.json({
      success: true,
      timestamp: Date.now(),
      news,
      events,
      campaigns,
      gallery,
      leadership,
      stats,
      chapters
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. ADMIN BULK PUSH: Syncs client state to server database and broadcasts
router.post('/push', (req, res) => {
  try {
    const { dataset, items } = req.body;
    if (!dataset || !items) {
      return res.status(400).json({ success: false, error: 'Dataset name and items object/array are required.' });
    }

    if (embeddedStore[dataset]) {
      const map = embeddedStore[dataset];
      const entries = Array.isArray(items) ? items : Object.entries(items).map(([k, v]) => ({ id: k, ...v }));

      entries.forEach(item => {
        const id = item.id || (dataset + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
        map.set(id, { ...item, id });
      });

      saveEmbeddedStore();

      // Disseminate to all active clients
      broadcastRealtimeEvent(`${dataset}:bulk`, entries);
      broadcastRealtimeEvent('sync:all', { dataset, count: entries.length, timestamp: Date.now() });

      return res.json({
        success: true,
        message: `Synced ${entries.length} items to ${dataset}`,
        dataset,
        count: entries.length
      });
    } else {
      return res.status(404).json({ success: false, error: `Dataset ${dataset} not found in database store.` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
