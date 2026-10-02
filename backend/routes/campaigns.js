// ==========================================================================
// SAMATA SAINIK DAL (SSD) - CAMPAIGNS & ADVOCACY INITIATIVES ROUTES
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

// 1. GET ALL CAMPAIGNS (Public & Admin)
router.get('/', (req, res) => {
  try {
    const list = Array.from(embeddedStore.campaigns.values());
    return res.json({
      success: true,
      count: list.length,
      campaigns: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET SINGLE CAMPAIGN BY ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const campaign = embeddedStore.campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    return res.json({ success: true, campaign });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CREATE / UPDATE CAMPAIGN (Admin)
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.title) {
      return res.status(400).json({ success: false, error: 'Campaign title is required' });
    }

    const id = data.id || ('camp_' + Date.now());
    const campItem = {
      id: id,
      title: data.title.trim(),
      category: data.category || 'General Advocacy',
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      description: data.description || '',
      targetAmount: Number(data.targetAmount) || 1000000,
      raisedAmount: Number(data.raisedAmount) || 0,
      volunteersCount: data.volunteersCount || '1,000+',
      districtsCount: data.districtsCount || '50+',
      causeKey: data.causeKey || data.title,
      approvalStatus: data.approvalStatus || 'approved',
      updatedAt: Date.now()
    };

    embeddedStore.campaigns.set(id, campItem);
    saveEmbeddedStore();

    // Broadcast real-time change to all clients
    broadcastRealtimeEvent('campaign:update', campItem);

    return res.status(200).json({
      success: true,
      message: `Campaign ${campItem.title} saved successfully`,
      campaign: campItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. PUT /:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = embeddedStore.campaigns.get(id) || {};
    const updated = {
      ...existing,
      ...req.body,
      id: id,
      updatedAt: Date.now()
    };

    embeddedStore.campaigns.set(id, updated);
    saveEmbeddedStore();

    broadcastRealtimeEvent('campaign:update', updated);
    return res.json({ success: true, campaign: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DELETE CAMPAIGN
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existed = embeddedStore.campaigns.delete(id);
    if (existed) {
      saveEmbeddedStore();
      broadcastRealtimeEvent('campaign:delete', { id });
    }
    return res.json({ success: true, message: 'Campaign deleted', id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
