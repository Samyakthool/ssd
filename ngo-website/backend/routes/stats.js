// ==========================================================================
// SAMATA SAINIK DAL (SSD) - PLATFORM & MOVEMENT STATS ROUTES
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

const DEFAULT_STATS = {
  members: 100000,
  states: 28,
  events: 5200,
  yearsActive: 99
};

// 1. GET STATS
router.get('/', (req, res) => {
  try {
    const raw = embeddedStore.system_settings.get('platform_stats');
    const stats = raw ? raw.value : DEFAULT_STATS;

    // Dynamically enhance with actual live counts if available
    const liveMembers = embeddedStore.members.size;
    const liveEvents = embeddedStore.events.size;
    const liveStates = embeddedStore.states.size;

    return res.json({
      success: true,
      stats: {
        members: Math.max(stats.members || 100000, liveMembers),
        states: Math.max(stats.states || 28, liveStates),
        events: Math.max(stats.events || 5200, liveEvents),
        yearsActive: stats.yearsActive || 99
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. UPDATE STATS (Admin)
router.post('/', (req, res) => {
  try {
    const { members, states, events, yearsActive } = req.body;
    const newStats = {
      members: Number(members) || 100000,
      states: Number(states) || 28,
      events: Number(events) || 5200,
      yearsActive: Number(yearsActive) || 99
    };

    embeddedStore.system_settings.set('platform_stats', {
      key: 'platform_stats',
      value: newStats,
      updated_at: new Date().toISOString()
    });
    saveEmbeddedStore();

    broadcastRealtimeEvent('stats:update', newStats);

    return res.json({
      success: true,
      message: 'Platform statistics updated successfully',
      stats: newStats
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
