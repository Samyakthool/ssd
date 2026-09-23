// ==========================================================================
// SAMATA SAINIK DAL (SSD) - GAZETTE CMS & NEWS ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// 1. GET ALL NEWS DISPATCHES (Public)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let news = Array.from(embeddedStore.news.values()).filter(n => n.is_published);

    if (category && category !== 'ALL') {
      news = news.filter(n => n.category.toLowerCase() === category.toLowerCase());
    }

    news.sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));
    return res.json({ success: true, count: news.length, news: news });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CREATE GAZETTE DISPATCH (Media Admin / Central Admin)
router.post('/', authenticate, requireRole('super_admin', 'central_admin', 'media_admin'), async (req, res) => {
  try {
    const { title, excerpt, content, category, imageUrl, isPublished } = req.body;

    if (!title || !category) {
      return res.status(400).json({ success: false, error: 'Title and category are required.' });
    }

    const newsId = 'news_' + Date.now();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newItem = {
      id: newsId,
      title: title.trim(),
      slug: slug,
      excerpt: excerpt || '',
      content: content || excerpt || '',
      category: category.trim(),
      image_url: imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      is_published: isPublished ?? true,
      author_name: req.user.fullName,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    embeddedStore.news.set(newsId, newItem);
    saveEmbeddedStore();

    return res.status(201).json({ success: true, message: 'Gazette dispatch published.', news: newItem });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
