// ==========================================================================
// SAMATA SAINIK DAL (SSD) - MEDIA & HISTORICAL ARCHIVES GALLERY ROUTES
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

// 1. GET ALL GALLERY ITEMS (Public & Admin)
router.get('/', (req, res) => {
  try {
    const list = Array.from(embeddedStore.gallery.values());
    return res.json({
      success: true,
      count: list.length,
      gallery: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CREATE / UPDATE GALLERY ITEM
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.imageUrl) {
      return res.status(400).json({ success: false, error: 'Image URL is required' });
    }

    const id = data.id || ('gal_' + Date.now());
    const galleryItem = {
      id: id,
      imageUrl: data.imageUrl.trim(),
      caption: data.caption ? data.caption.trim() : 'SSD Field Movement Unit',
      category: data.category || 'Cadet Drills',
      approvalStatus: data.approvalStatus || 'approved',
      updatedAt: Date.now()
    };

    embeddedStore.gallery.set(id, galleryItem);
    saveEmbeddedStore();

    broadcastRealtimeEvent('gallery:update', galleryItem);

    return res.status(200).json({
      success: true,
      message: 'Gallery item saved successfully',
      gallery: galleryItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. DELETE GALLERY ITEM
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existed = embeddedStore.gallery.delete(id);
    if (existed) {
      saveEmbeddedStore();
      broadcastRealtimeEvent('gallery:delete', { id });
    }
    return res.json({ success: true, message: 'Gallery item removed', id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
