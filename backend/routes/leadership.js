// ==========================================================================
// SAMATA SAINIK DAL (SSD) - LEADERSHIP & GOVERNING BODY ROUTES
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

// 1. GET ALL LEADERSHIP MEMBERS (Public & Admin)
router.get('/', (req, res) => {
  try {
    const { all, category, level, state } = req.query;
    let list = Array.from(embeddedStore.leadership.values());

    // Unless 'all=true' (admin view), only return approved leaders
    if (all !== 'true') {
      list = list.filter(l => {
        const status = (l.approvalStatus || 'approved').toLowerCase();
        return status === 'approved';
      });
    }

    if (category) {
      list = list.filter(l => (l.category || '').toLowerCase() === category.toLowerCase());
    }

    if (level) {
      list = list.filter(l => (l.level || '').toLowerCase() === level.toLowerCase());
    }

    if (state) {
      list = list.filter(l => (l.state || '').toLowerCase().includes(state.toLowerCase()));
    }

    list.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));

    return res.json({
      success: true,
      count: list.length,
      leadership: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET SINGLE LEADER BY ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const leader = embeddedStore.leadership.get(id);
    if (!leader) {
      return res.status(404).json({ success: false, error: 'Leader not found' });
    }
    return res.json({ success: true, leader });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CREATE / UPDATE LEADER (Admin)
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.name) {
      return res.status(400).json({ success: false, error: 'Leader name is required' });
    }

    const id = data.id || ('lead_' + Date.now());
    const memberData = {
      id: id,
      name: data.name.trim(),
      designation: data.designation ? data.designation.trim() : 'Council Member',
      category: data.category || 'Supreme Council',
      level: data.level || 'national',
      state: data.state || 'National HQ',
      district: data.district || '',
      rankBadge: data.rankBadge || 'National Command',
      photoUrl: data.photoUrl || '',
      pdfUrl: data.pdfUrl || '',
      credentials: data.credentials || '',
      bio: data.bio || '',
      order: Number(data.order) || 10,
      approvalStatus: data.approvalStatus || 'approved',
      submittedBy: data.submittedBy || 'Admin',
      updatedAt: Date.now()
    };

    embeddedStore.leadership.set(id, memberData);
    saveEmbeddedStore();

    // Broadcast real-time change to all clients
    broadcastRealtimeEvent('leadership:update', memberData);

    return res.status(200).json({
      success: true,
      message: `Leader ${memberData.name} saved successfully`,
      leader: memberData
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. UPDATE LEADER BY ID
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = embeddedStore.leadership.get(id) || {};
    const updated = {
      ...existing,
      ...req.body,
      id: id,
      updatedAt: Date.now()
    };

    embeddedStore.leadership.set(id, updated);
    saveEmbeddedStore();

    // Broadcast real-time change to all clients
    broadcastRealtimeEvent('leadership:update', updated);

    return res.json({ success: true, message: 'Leader updated', leader: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DELETE LEADER
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existed = embeddedStore.leadership.delete(id);
    if (existed) {
      saveEmbeddedStore();
      broadcastRealtimeEvent('leadership:delete', { id });
    }
    return res.json({ success: true, message: 'Leader removed', id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
