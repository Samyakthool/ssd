// ==========================================================================
// SAMATA SAINIK DAL (SSD) - GAZETTE CMS & NEWS ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

// 1. GET ALL NEWS DISPATCHES (Public & Admin)
router.get('/', async (req, res) => {
  try {
    const { category, all } = req.query;
    let news = Array.from(embeddedStore.news.values());

    if (all !== 'true') {
      news = news.filter(n => n.is_published !== false && (n.approvalStatus || 'approved').toLowerCase() === 'approved');
    }

    if (category && category !== 'ALL') {
      news = news.filter(n => (n.category || '').toLowerCase() === category.toLowerCase());
    }

    news.sort((a, b) => new Date(b.published_at || b.date || b.created_at) - new Date(a.published_at || a.date || a.created_at));
    return res.json({ success: true, count: news.length, news: news });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET SINGLE NEWS ITEM
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = embeddedStore.news.get(id);
    if (!item) return res.status(404).json({ success: false, error: 'News dispatch not found' });
    return res.json({ success: true, news: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CREATE / UPSERT GAZETTE DISPATCH
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { id, title, excerpt, content, category, imageUrl, pdfUrl, isPublished, approvalStatus, date } = req.body;

    if (!title || !category) {
      return res.status(400).json({ success: false, error: 'Title and category are required.' });
    }

    const newsId = id || ('news_' + Date.now());
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newItem = {
      id: newsId,
      title: title.trim(),
      slug: slug,
      excerpt: excerpt || '',
      content: content || excerpt || '',
      category: category.trim(),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      pdfUrl: pdfUrl || '',
      date: date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      is_published: isPublished ?? true,
      approvalStatus: approvalStatus || 'approved',
      author_name: req.user ? (req.user.fullName || req.user.name) : 'Central Command Media Desk',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    embeddedStore.news.set(newsId, newItem);
    saveEmbeddedStore();

    // Broadcast to real-time stream
    broadcastRealtimeEvent('news:update', newItem);

    return res.status(201).json({ success: true, message: 'Gazette dispatch published.', news: newItem });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. UPDATE GAZETTE DISPATCH
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = embeddedStore.news.get(id) || {};
    const updated = {
      ...existing,
      ...req.body,
      id: id,
      updated_at: new Date().toISOString()
    };

    embeddedStore.news.set(id, updated);
    saveEmbeddedStore();

    broadcastRealtimeEvent('news:update', updated);
    return res.json({ success: true, message: 'Gazette dispatch updated', news: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DELETE GAZETTE DISPATCH
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existed = embeddedStore.news.delete(id);
    if (existed) {
      saveEmbeddedStore();
      broadcastRealtimeEvent('news:delete', { id });
    }
    return res.json({ success: true, message: 'Gazette dispatch deleted', id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
