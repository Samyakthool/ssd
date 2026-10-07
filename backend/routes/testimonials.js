// ==========================================================================
// SAMATA SAINIK DAL (SSD) - TESTIMONIALS & CADRE VOICES ROUTES
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

function checkTestimonialsPermission(req, res, next) {
  if (req.user) {
    const role = req.user.role_id || req.user.role;
    const isSuper = role === 'super_admin' || role === 'central_admin';
    const isMedia = role === 'media' || role === 'media_admin';
    const isEditor = role === 'testimonials_editor';
    const hasPerm = !!(req.user.can_edit_testimonials === true || req.user.can_edit_testimonials === 'true');
    if (!isSuper && !isMedia && !isEditor && !hasPerm) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have permission to modify Voices from the Frontline. Request authorization from SuperAdmin.'
      });
    }
  }
  next();
}

// 1. GET ALL TESTIMONIES (Public & Admin)
router.get('/', (req, res) => {
  try {
    const { all, category, status } = req.query;
    let list = Array.from(embeddedStore.testimonials.values());

    // Unless 'all=true' (admin view), only return published and approved testimonies
    if (all !== 'true') {
      list = list.filter(t => {
        const isPublished = t.is_published !== false && t.published !== false;
        const approval = (t.approvalStatus || 'approved').toLowerCase();
        return isPublished && approval === 'approved';
      });
    }

    if (category && category !== 'all') {
      list = list.filter(t => (t.category || '').toLowerCase() === category.toLowerCase());
    }

    if (status && status !== 'all') {
      list = list.filter(t => {
        const isPublished = t.is_published !== false && t.published !== false;
        if (status === 'published') return isPublished;
        if (status === 'draft' || status === 'pending') return !isPublished;
        return true;
      });
    }

    // Sort newest first or by order
    list.sort((a, b) => (Number(b.updatedAt || b.submittedAt || 0)) - (Number(a.updatedAt || a.submittedAt || 0)));

    return res.json({
      success: true,
      count: list.length,
      testimonials: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET SINGLE TESTIMONY BY ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = embeddedStore.testimonials.get(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Cadre testimony not found' });
    }
    return res.json({ success: true, testimonial: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CREATE / UPSERT TESTIMONY (Admin)
router.post('/', optionalAuth, checkTestimonialsPermission, (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.quote) {
      return res.status(400).json({ success: false, error: 'Cadet name and testimony quote are required' });
    }

    const id = data.id || ('test_' + Date.now());
    const isPub = data.is_published !== undefined ? !!data.is_published : (data.published !== undefined ? !!data.published : true);

    const testimonialData = {
      id: id,
      name: data.name.trim(),
      designation: data.designation ? data.designation.trim() : 'Sainik Cadre',
      category: data.category || 'leadership',
      cadetId: data.cadetId ? data.cadetId.trim() : `SSD-CADRE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      state: data.state ? data.state.trim() : 'India',
      tenure: data.tenure ? data.tenure.trim() : 'Active Cadre',
      highlight: data.highlight ? data.highlight.trim() : '',
      quote: data.quote.trim(),
      photoUrl: data.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
      approvalStatus: data.approvalStatus || 'approved',
      is_published: isPub,
      published: isPub,
      submittedBy: data.submittedBy || (req.user ? (req.user.fullName || req.user.email) : 'Command Officer'),
      submittedAt: data.submittedAt || Date.now(),
      updatedAt: Date.now()
    };

    embeddedStore.testimonials.set(id, testimonialData);
    saveEmbeddedStore();

    broadcastRealtimeEvent('testimonials:update', testimonialData);

    return res.status(200).json({
      success: true,
      message: `Cadre testimony of ${testimonialData.name} saved successfully`,
      testimonial: testimonialData
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. UPDATE TESTIMONY BY ID
router.put('/:id', optionalAuth, checkTestimonialsPermission, (req, res) => {
  try {
    const { id } = req.params;
    const existing = embeddedStore.testimonials.get(id) || {};
    const isPub = req.body.is_published !== undefined ? !!req.body.is_published : (req.body.published !== undefined ? !!req.body.published : existing.is_published !== false);

    const updated = {
      ...existing,
      ...req.body,
      id: id,
      is_published: isPub,
      published: isPub,
      updatedAt: Date.now()
    };

    embeddedStore.testimonials.set(id, updated);
    saveEmbeddedStore();

    broadcastRealtimeEvent('testimonials:update', updated);

    return res.json({ success: true, message: 'Testimony updated successfully', testimonial: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. TOGGLE PUBLISH STATUS
router.patch('/:id/toggle', optionalAuth, checkTestimonialsPermission, (req, res) => {
  try {
    const { id } = req.params;
    const existing = embeddedStore.testimonials.get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Testimony not found' });
    }

    const currentPublished = existing.is_published !== false && existing.published !== false;
    existing.is_published = !currentPublished;
    existing.published = !currentPublished;
    existing.updatedAt = Date.now();

    embeddedStore.testimonials.set(id, existing);
    saveEmbeddedStore();

    broadcastRealtimeEvent('testimonials:update', existing);

    return res.json({
      success: true,
      message: `Testimony marked as ${existing.is_published ? 'Published' : 'Draft'}`,
      is_published: existing.is_published,
      testimonial: existing
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. DELETE TESTIMONY
router.delete('/:id', optionalAuth, checkTestimonialsPermission, (req, res) => {
  try {
    const { id } = req.params;
    const existed = embeddedStore.testimonials.delete(id);
    if (existed) {
      saveEmbeddedStore();
      broadcastRealtimeEvent('testimonials:delete', { id });
    }
    return res.json({ success: true, message: 'Testimony removed', id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
