// ==========================================================================
// SAMATA SAINIK DAL (SSD) - DIGITAL LIBRARY ROUTES
// Archival Publications, Books, Speeches, Historical Photos, Access Control
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

function canManageLibrary(user) {
  if (!user) return false;
  const role = user.role_id || user.role;
  return ['super_admin', 'central_admin', 'library_manager', 'content_editor'].includes(role);
}

// --------------------------------------------------------------------------
// 1. GET LIBRARY CATEGORIES
// --------------------------------------------------------------------------
router.get('/categories', (req, res) => {
  try {
    const categories = Array.from(embeddedStore.library_categories?.values() || []);
    return res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 2. GET LIBRARY RESOURCES WITH COMPREHENSIVE FILTERING & ACCESS TIERING
// --------------------------------------------------------------------------
router.get('/resources', optionalAuth, (req, res) => {
  try {
    const { category, language, year, search, featured, access, all } = req.query;
    let list = Array.from(embeddedStore.library_resources?.values() || []);

    const user = req.user;
    const isOfficer = canManageLibrary(user);
    const isCadet = !!(user && (user.sainik_id || user.role_id || user.id));

    // Access control tiering
    if (!isOfficer && all !== 'true') {
      list = list.filter(item => {
        // Must be published
        if (item.is_published === false) return false;

        const level = (item.accessLevel || 'public').toLowerCase();
        if (level === 'public') return true;
        if (level === 'member' && isCadet) return true;
        if (level === 'restricted' && isOfficer) return true;
        if (level === 'admin' && isOfficer) return true;

        return false;
      });
    }

    // Category filter
    if (category && category !== 'all') {
      list = list.filter(item => (item.category || '').toLowerCase() === category.toLowerCase());
    }

    // Language filter
    if (language && language !== 'all') {
      list = list.filter(item => (item.language || '').toLowerCase().includes(language.toLowerCase()));
    }

    // Year filter
    if (year && year !== 'all') {
      list = list.filter(item => String(item.year || '') === String(year));
    }

    // Featured filter
    if (featured === 'true') {
      list = list.filter(item => item.isFeatured === true);
    }

    // Keyword search filter (title, author, description, tags)
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      list = list.filter(item => {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const authorMatch = (item.author || '').toLowerCase().includes(q);
        const tagsMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
        return titleMatch || descMatch || authorMatch || tagsMatch;
      });
    }

    // Sort newest/featured first
    list.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (Number(b.year || 0)) - (Number(a.year || 0));
    });

    return res.json({
      success: true,
      count: list.length,
      resources: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. GET SINGLE RESOURCE BY ID (WITH STRICT ACCESS CHECKS)
// --------------------------------------------------------------------------
router.get('/resources/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const item = embeddedStore.library_resources?.get(id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Library resource not found.' });
    }

    const user = req.user;
    const isOfficer = canManageLibrary(user);
    const isCadet = !!(user && (user.sainik_id || user.role_id || user.id));
    const level = (item.accessLevel || 'public').toLowerCase();

    if (level === 'restricted' && !isOfficer) {
      return res.status(403).json({
        success: false,
        error: 'Restricted Resource: Classified for Central Command officials only.'
      });
    }

    if (level === 'member' && !isCadet && !isOfficer) {
      return res.status(401).json({
        success: false,
        error: 'Cadet Portal Required: This historical archive requires active Sainik membership login.'
      });
    }

    return res.json({ success: true, resource: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. CREATE / UPSERT RESOURCE (ADMIN / LIBRARY MANAGER)
// --------------------------------------------------------------------------
router.post('/resources', authenticate, (req, res) => {
  try {
    if (!canManageLibrary(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Library Manager or SuperAdmin credentials required.'
      });
    }

    const data = req.body;
    if (!data.title || !data.category) {
      return res.status(400).json({ success: false, error: 'Resource title and category are required.' });
    }

    const id = data.id || ('lib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
    const isNew = !embeddedStore.library_resources.has(id);

    const resource = {
      id: id,
      title: data.title.trim(),
      author: data.author ? data.author.trim() : 'Samata Sainik Dal Central Directorate',
      publisher: data.publisher || 'Samata Sainik Dal Press',
      year: data.year ? String(data.year).trim() : String(new Date().getFullYear()),
      category: data.category,
      language: data.language || 'English',
      format: data.format || 'PDF',
      fileSize: data.fileSize || '1.2 MB',
      description: data.description ? data.description.trim() : '',
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      fileUrl: data.fileUrl || 'SSD_System_Architecture_and_Workflow.pdf',
      accessLevel: data.accessLevel || 'public', // public, member, restricted
      isFeatured: !!data.isFeatured,
      is_published: data.is_published !== undefined ? !!data.is_published : true,
      tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()) : []),
      provenance: data.provenance || 'Central Archives, Nagpur',
      sha256Checksum: data.sha256Checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    embeddedStore.library_resources.set(id, resource);
    saveEmbeddedStore();

    // Audit Log
    const auditId = 'caudit_' + Date.now();
    if (embeddedStore.content_audit_logs) {
      embeddedStore.content_audit_logs.set(auditId, {
        id: auditId,
        user_id: req.user.id,
        user_name: req.user.fullName,
        user_role: req.user.role_id,
        action: isNew ? 'CREATE_LIBRARY_RESOURCE' : 'UPDATE_LIBRARY_RESOURCE',
        entity_type: 'library_resource',
        entity_id: id,
        details: { title: resource.title, category: resource.category, accessLevel: resource.accessLevel },
        created_at: new Date().toISOString()
      });
    }

    broadcastRealtimeEvent('library:update', resource);

    return res.json({
      success: true,
      message: `Library resource [${resource.title}] saved successfully.`,
      resource: resource
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. DELETE / ARCHIVE RESOURCE
// --------------------------------------------------------------------------
router.delete('/resources/:id', authenticate, (req, res) => {
  try {
    if (!canManageLibrary(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Library Manager role required.' });
    }

    const { id } = req.params;
    if (!embeddedStore.library_resources.has(id)) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    const old = embeddedStore.library_resources.get(id);
    embeddedStore.library_resources.delete(id);
    saveEmbeddedStore();

    const auditId = 'caudit_' + Date.now();
    if (embeddedStore.content_audit_logs) {
      embeddedStore.content_audit_logs.set(auditId, {
        id: auditId,
        user_id: req.user.id,
        user_name: req.user.fullName,
        user_role: req.user.role_id,
        action: 'DELETE_LIBRARY_RESOURCE',
        entity_type: 'library_resource',
        entity_id: id,
        details: { title: old?.title },
        created_at: new Date().toISOString()
      });
    }

    broadcastRealtimeEvent('library:delete', { id });

    return res.json({ success: true, message: 'Resource removed from library catalog.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
