// ==========================================================================
// SAMATA SAINIK DAL (SSD) - MEDIA & PHOTO ARCHIVES ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// 1. GET ALL GALLERY MEDIA (Public)
router.get('/', async (req, res) => {
  try {
    const { category, historical } = req.query;
    let gallery = Array.from(embeddedStore.gallery.values());

    if (category && category !== 'ALL') {
      gallery = gallery.filter(g => g.category.toLowerCase() === category.toLowerCase());
    }
    if (historical === 'true') {
      gallery = gallery.filter(g => g.is_historical);
    }

    gallery.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return res.json({ success: true, count: gallery.length, gallery: gallery });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. ADD MEDIA ARCHIVE ITEM (Media Admin)
router.post('/', authenticate, requireRole('super_admin', 'central_admin', 'media_admin'), async (req, res) => {
  try {
    const { title, caption, category, imageUrl, videoUrl, isHistorical } = req.body;

    if (!caption || !imageUrl || !category) {
      return res.status(400).json({ success: false, error: 'Caption, category, and image URL are required.' });
    }

    const mediaId = 'gal_' + Date.now();
    const newMedia = {
      id: mediaId,
      title: title || caption,
      caption: caption.trim(),
      category: category.trim(),
      image_url: imageUrl,
      video_url: videoUrl || null,
      is_historical: isHistorical === true,
      sort_order: embeddedStore.gallery.size + 1,
      created_at: new Date().toISOString()
    };

    embeddedStore.gallery.set(mediaId, newMedia);
    saveEmbeddedStore();

    return res.status(201).json({ success: true, message: 'Media added to photo archives.', media: newMedia });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
