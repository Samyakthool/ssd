// ==========================================================================
// SAMATA SAINIK DAL (SSD) - DIGITAL LIBRARY & ARCHIVES GATEWAY
// Secure upload, magic-byte inspection, multi-tier access control,
// publication workflows, document versioning, and immutable audit trails.
// ==========================================================================

import express from 'express';
import path from 'path';
import fs from 'fs';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';
import {
  libraryUpload,
  validateMagicBytes,
  calculateFileSha256,
  formatBytes,
  libraryFilesDir,
  libraryThumbsDir
} from '../middleware/libraryUpload.js';

const router = express.Router();

// Helper: check library management authorization
function canManageLibrary(user) {
  if (!user) return false;
  const role = user.role_id || user.role;
  return ['super_admin', 'central_admin', 'library_manager', 'content_editor'].includes(role);
}

// Helper: check high-level approval and publishing authority
function canApproveOrPublish(user) {
  if (!user) return false;
  const role = user.role_id || user.role;
  return ['super_admin', 'central_admin', 'library_manager'].includes(role);
}

// Helper: check member portal access
function isCadetOrMember(user) {
  if (!user) return false;
  return !!(user.sainik_id || user.sainikId || user.role_id || user.id);
}

// Helper: record library audit log
function recordLibraryAudit(resourceId, user, action, details = {}, ip = '127.0.0.1') {
  try {
    const auditId = 'laudit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const log = {
      id: auditId,
      resource_id: resourceId,
      user_id: user ? (user.id || user.sainik_id || 'system') : 'anonymous',
      user_name: user ? (user.fullName || user.name || user.email || 'Official') : 'Anonymous User',
      user_role: user ? (user.role_id || user.role || 'public') : 'public',
      action: action,
      details: details,
      ip_address: ip,
      created_at: new Date().toISOString()
    };
    if (embeddedStore.library_audit_logs) {
      embeddedStore.library_audit_logs.set(auditId, log);
    }
    if (embeddedStore.content_audit_logs) {
      embeddedStore.content_audit_logs.set('caudit_' + auditId, {
        id: 'caudit_' + auditId,
        user_id: log.user_id,
        user_name: log.user_name,
        user_role: log.user_role,
        action: action,
        entity_type: 'library_resource',
        entity_id: resourceId,
        details: details,
        created_at: log.created_at
      });
    }
    saveEmbeddedStore();
    return log;
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

// --------------------------------------------------------------------------
// 1. GET LIBRARY CATEGORIES
// --------------------------------------------------------------------------
router.get('/categories', (req, res) => {
  try {
    const { all } = req.query;
    let categories = Array.from(embeddedStore.library_categories?.values() || []);

    if (all !== 'true') {
      categories = categories.filter(c => c.is_active !== false);
    }

    categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Calculate dynamic resource counts per category
    const resources = Array.from(embeddedStore.library_resources?.values() || []);
    const counts = {};
    resources.forEach(r => {
      if (r.status === 'published' || !r.status) {
        counts[r.category_id] = (counts[r.category_id] || 0) + 1;
        counts[r.category] = (counts[r.category] || 0) + 1;
      }
    });

    const enriched = categories.map(cat => ({
      ...cat,
      resource_count: counts[cat.id] || counts[cat.slug] || 0
    }));

    return res.json({ success: true, count: enriched.length, categories: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 2. CREATE CATEGORY (ADMIN / LIBRARY MANAGER)
// --------------------------------------------------------------------------
router.post('/categories', authenticate, (req, res) => {
  try {
    if (!canApproveOrPublish(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to create categories.' });
    }

    const { name, slug, description, icon, sort_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = 'cat_' + cleanSlug.replace(/-/g, '_') + '_' + Date.now().toString(36).substr(-4);

    const category = {
      id,
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : '',
      icon: icon || 'fa-book-bookmark',
      sort_order: Number(sort_order) || (embeddedStore.library_categories.size + 1),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    embeddedStore.library_categories.set(id, category);
    saveEmbeddedStore();

    recordLibraryAudit(id, req.user, 'CREATE_LIBRARY_CATEGORY', { name: category.name, slug: category.slug }, req.ip);

    return res.status(201).json({ success: true, category });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. UPDATE CATEGORY (ADMIN / LIBRARY MANAGER)
// --------------------------------------------------------------------------
router.put('/categories/:id', authenticate, (req, res) => {
  try {
    if (!canApproveOrPublish(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const { id } = req.params;
    const cat = embeddedStore.library_categories?.get(id);
    if (!cat) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }

    const { name, description, icon, sort_order, is_active } = req.body;
    if (name) cat.name = name.trim();
    if (description !== undefined) cat.description = description.trim();
    if (icon) cat.icon = icon;
    if (sort_order !== undefined) cat.sort_order = Number(sort_order);
    if (is_active !== undefined) cat.is_active = !!is_active;
    cat.updated_at = new Date().toISOString();

    embeddedStore.library_categories.set(id, cat);
    saveEmbeddedStore();

    recordLibraryAudit(id, req.user, 'UPDATE_LIBRARY_CATEGORY', { name: cat.name }, req.ip);

    return res.json({ success: true, category: cat });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. DELETE / DEACTIVATE CATEGORY (ADMIN ONLY)
// --------------------------------------------------------------------------
router.delete('/categories/:id', authenticate, (req, res) => {
  try {
    if (!canApproveOrPublish(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: SuperAdmin or Central Admin role required.' });
    }

    const { id } = req.params;
    const cat = embeddedStore.library_categories?.get(id);
    if (!cat) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }

    // Check if resources are assigned to this category
    const resources = Array.from(embeddedStore.library_resources?.values() || []);
    const linkedCount = resources.filter(r => r.category_id === id || r.category === cat.slug || r.category === id).length;

    if (linkedCount > 0) {
      // Soft-deactivate to prevent breaking existing links
      cat.is_active = false;
      cat.updated_at = new Date().toISOString();
      embeddedStore.library_categories.set(id, cat);
      saveEmbeddedStore();
      recordLibraryAudit(id, req.user, 'DEACTIVATE_LIBRARY_CATEGORY', { name: cat.name, linkedResources: linkedCount }, req.ip);
      return res.json({ success: true, message: `Category '${cat.name}' has ${linkedCount} active resource(s) linked; deactivated instead of deleted.` });
    }

    embeddedStore.library_categories.delete(id);
    saveEmbeddedStore();
    recordLibraryAudit(id, req.user, 'DELETE_LIBRARY_CATEGORY', { name: cat.name }, req.ip);

    return res.json({ success: true, message: 'Category removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. GET DASHBOARD STATISTICS (ADMIN & OFFICIALS)
// --------------------------------------------------------------------------
router.get('/stats', authenticate, (req, res) => {
  try {
    if (!canManageLibrary(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Library access clearance required.' });
    }

    const resources = Array.from(embeddedStore.library_resources?.values() || []);
    const auditLogs = Array.from(embeddedStore.library_audit_logs?.values() || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    let totalBytes = 0;
    let publishedCount = 0;
    let draftCount = 0;
    let inReviewCount = 0;
    let approvedCount = 0;
    let correctionCount = 0;
    let archivedCount = 0;

    resources.forEach(r => {
      totalBytes += Number(r.file_size_bytes || 0);
      const s = (r.status || (r.is_published ? 'published' : 'draft')).toLowerCase();
      if (s === 'published') publishedCount++;
      else if (s === 'draft') draftCount++;
      else if (s === 'in_review') inReviewCount++;
      else if (s === 'approved') approvedCount++;
      else if (s === 'correction_required') correctionCount++;
      else if (s === 'archived') archivedCount++;
    });

    const recentUploads = [...resources]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);

    return res.json({
      success: true,
      stats: {
        totalResources: resources.length,
        publishedCount,
        draftCount,
        inReviewCount,
        approvedCount,
        correctionCount,
        archivedCount,
        totalStorageBytes: totalBytes,
        totalStorageFormatted: formatBytes(totalBytes),
        recentUploads,
        recentActivity: auditLogs.slice(0, 10)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. GET LIBRARY RESOURCES (FILTERABLE, PAGINATED, ACCESS-TIERED)
// --------------------------------------------------------------------------
router.get('/resources', optionalAuth, (req, res) => {
  try {
    const {
      search,
      category,
      language,
      year,
      resource_type,
      access_level,
      status,
      featured,
      all,
      page = 1,
      limit = 50
    } = req.query;

    let list = Array.from(embeddedStore.library_resources?.values() || []);
    const user = req.user;
    const isOfficer = canManageLibrary(user);
    const isCadet = isCadetOrMember(user);

    // 1. Strict status & access tier enforcement for public/non-officer users
    if (!isOfficer && all !== 'true') {
      list = list.filter(item => {
        const itemStatus = (item.status || (item.is_published ? 'published' : 'draft')).toLowerCase();
        // Public/cadet users CANNOT see drafts, in_review, correction_required, or archived resources
        if (itemStatus !== 'published') return false;

        const level = (item.access_level || item.accessLevel || 'public').toLowerCase();
        if (level === 'public') return true;
        if (level === 'member' && isCadet) return true;
        if (level === 'restricted' && isOfficer) return true;
        if (level === 'admin' && isOfficer) return true;

        return false;
      });
    }

    // 2. Status filter (admin queue)
    if (status && status !== 'all') {
      list = list.filter(item => {
        const itemStatus = (item.status || (item.is_published ? 'published' : 'draft')).toLowerCase();
        return itemStatus === status.toLowerCase();
      });
    }

    // 3. Category filter (supports id or slug)
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      list = list.filter(item => {
        const cid = (item.category_id || '').toLowerCase();
        const cslug = (item.category || '').toLowerCase();
        return cid === catLower || cslug === catLower;
      });
    }

    // 4. Language filter
    if (language && language !== 'all') {
      list = list.filter(item => (item.language || '').toLowerCase().includes(language.toLowerCase()));
    }

    // 5. Year / Era filter
    if (year && year !== 'all') {
      list = list.filter(item => String(item.year || item.publication_date || '').includes(String(year)));
    }

    // 6. Resource Type filter
    if (resource_type && resource_type !== 'all') {
      list = list.filter(item => (item.resource_type || item.format || '').toLowerCase().includes(resource_type.toLowerCase()));
    }

    // 7. Access Level filter
    if (access_level && access_level !== 'all') {
      list = list.filter(item => (item.access_level || item.accessLevel || 'public').toLowerCase() === access_level.toLowerCase());
    }

    // 8. Featured filter
    if (featured === 'true') {
      list = list.filter(item => !!item.is_featured || !!item.isFeatured || !!item.featured);
    }

    // 9. Full-text search (title, author, publisher, description, document_number, tags)
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      list = list.filter(item => {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const authorMatch = (item.author || '').toLowerCase().includes(q);
        const pubMatch = (item.publisher || '').toLowerCase().includes(q);
        const docNumMatch = (item.document_number || item.official_doc_number || '').toLowerCase().includes(q);
        const tagsMatch = Array.isArray(item.tags)
          ? item.tags.some(t => String(t).toLowerCase().includes(q))
          : (typeof item.tags === 'string' && item.tags.toLowerCase().includes(q));
        return titleMatch || descMatch || authorMatch || pubMatch || docNumMatch || tagsMatch;
      });
    }

    // Sort: Featured first, then newest publication/creation
    list.sort((a, b) => {
      const aFeat = a.is_featured || a.isFeatured || a.featured;
      const bFeat = b.is_featured || b.isFeatured || b.featured;
      if (aFeat && !bFeat) return -1;
      if (!aFeat && bFeat) return 1;
      return new Date(b.created_at || b.publication_date || 0) - new Date(a.created_at || a.publication_date || 0);
    });

    const totalCount = list.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const startIndex = (pageNum - 1) * pageSize;
    const paginated = list.slice(startIndex, startIndex + pageSize);

    return res.json({
      success: true,
      count: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / pageSize),
      resources: paginated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. GET SINGLE RESOURCE BY ID (WITH ACCESS ENFORCEMENT)
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
    const isCadet = isCadetOrMember(user);
    const level = (item.access_level || item.accessLevel || 'public').toLowerCase();
    const itemStatus = (item.status || (item.is_published ? 'published' : 'draft')).toLowerCase();

    // Check status: only officers can inspect unpublished/drafts
    if (itemStatus !== 'published' && !isOfficer) {
      return res.status(404).json({ success: false, error: 'Resource is currently in draft or under editorial review.' });
    }

    // Check access clearance
    if (level === 'member' && !isCadet && !isOfficer) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Active Sainik Cadet Membership login required to access this resource.',
        accessLevel: 'member'
      });
    }

    if (level === 'restricted' && !isOfficer) {
      return res.status(403).json({
        success: false,
        error: 'Restricted Archive: Classified for Central Command authorized officers only.',
        accessLevel: 'restricted'
      });
    }

    if (level === 'admin' && !isOfficer) {
      return res.status(403).json({
        success: false,
        error: 'Administrative Clearance Required.',
        accessLevel: 'admin'
      });
    }

    // Increment view count
    item.views_count = (item.views_count || 0) + 1;
    embeddedStore.library_resources.set(id, item);

    // Fetch related versions if any
    const versions = Array.from(embeddedStore.library_document_versions?.values() || [])
      .filter(v => v.resource_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({
      success: true,
      resource: item,
      versions
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. UPLOAD / CREATE NEW RESOURCE (ADMIN / CONTRIBUTOR)
// --------------------------------------------------------------------------
router.post('/resources', authenticate, (req, res) => {
  libraryUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      if (!canManageLibrary(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Library contributor or admin clearance required.' });
      }

      const file = req.files?.file?.[0];
      if (!file) {
        return res.status(400).json({ success: false, error: 'File upload is required for new library resources.' });
      }

      // 1. Deep server-side magic byte validation
      const ext = path.extname(file.originalname).toLowerCase();
      const magicCheck = validateMagicBytes(file.path, ext);
      if (!magicCheck.valid) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return res.status(400).json({ success: false, error: `Security Rejected: ${magicCheck.reason}` });
      }

      // 2. Cryptographic SHA-256 Checksum Calculation
      const sha256 = await calculateFileSha256(file.path);

      // 3. Process optional thumbnail
      const thumb = req.files?.thumbnail?.[0];
      let thumbnailPath = thumb ? thumb.filename : (req.body.cover_image || req.body.coverImage || null);

      const b = req.body;
      if (!b.title || !b.title.trim()) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return res.status(400).json({ success: false, error: 'Resource title is required.' });
      }
      if (!b.category_id && !b.category) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return res.status(400).json({ success: false, error: 'Resource category is required.' });
      }

      const id = 'lib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const cleanSlug = b.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Parse tags
      let parsedTags = [];
      if (b.tags) {
        try {
          parsedTags = Array.isArray(b.tags) ? b.tags : (typeof b.tags === 'string' ? (b.tags.startsWith('[') ? JSON.parse(b.tags) : b.tags.split(',').map(s => s.trim())) : []);
        } catch (e) {
          parsedTags = String(b.tags).split(',').map(s => s.trim());
        }
      }

      // Access Level validation
      const validAccessLevels = ['public', 'member', 'restricted', 'admin'];
      const accessLevel = validAccessLevels.includes((b.access_level || b.accessLevel || '').toLowerCase())
        ? (b.access_level || b.accessLevel).toLowerCase()
        : 'public';

      // Workflow Status validation
      const validStatuses = ['draft', 'in_review', 'correction_required', 'approved', 'published', 'rejected', 'unpublished', 'archived'];
      let requestedStatus = (b.status || 'draft').toLowerCase();
      if (!validStatuses.includes(requestedStatus)) requestedStatus = 'draft';

      // Only authorized approvers can set status directly to 'published' or 'approved'
      if ((requestedStatus === 'published' || requestedStatus === 'approved') && !canApproveOrPublish(req.user)) {
        requestedStatus = 'in_review';
      }

      const versionStr = b.version ? b.version.trim() : '1.0';
      const fileSizeFormatted = formatBytes(file.size);

      const resource = {
        id,
        title: b.title.trim(),
        slug: cleanSlug,
        description: b.description ? b.description.trim() : '',
        category_id: b.category_id || b.category,
        category: b.category || b.category_id,
        resource_type: b.resource_type || b.format || 'document',
        language: b.language || 'English',
        author: b.author ? b.author.trim() : 'Samata Sainik Dal Central Directorate',
        publisher: b.publisher ? b.publisher.trim() : 'Samata Sainik Dal Press',
        publication_date: b.publication_date || null,
        year: b.year ? String(b.year).trim() : String(new Date().getFullYear()),
        document_number: b.document_number || b.official_doc_number || null,
        version: versionStr,
        tags: parsedTags,
        storage_path: file.path,
        file_name: file.filename,
        file_url: `/api/library/resources/${id}/download`,
        thumbnail_path: thumbnailPath,
        cover_image: thumbnailPath || 'ssd-cadets-march.jpg',
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        file_size_formatted: fileSizeFormatted,
        sha256_checksum: sha256,
        access_level: accessLevel,
        accessLevel: accessLevel,
        status: requestedStatus,
        is_published: requestedStatus === 'published',
        is_featured: b.is_featured === 'true' || b.is_featured === true || b.isFeatured === true,
        historical_period: b.historical_period || null,
        provenance: b.provenance ? b.provenance.trim() : 'Central Archives, Nagpur',
        related_entity: b.related_entity || null,
        copyright_holder: b.copyright_holder || 'Samata Sainik Dal (SSD)',
        usage_permissions: b.usage_permissions || 'Public Archival and Educational Use',
        reference_url: b.reference_url || null,
        reviewer_notes: b.reviewer_notes || null,
        official_doc_type: b.official_doc_type || null,
        official_doc_number: b.official_doc_number || b.document_number || null,
        issuing_authority: b.issuing_authority || null,
        approval_date: b.approval_date || null,
        effective_date: b.effective_date || null,
        superseded_ref: b.superseded_ref || null,
        downloads_count: 0,
        views_count: 0,
        uploaded_by: req.user.id,
        reviewed_by: requestedStatus === 'approved' || requestedStatus === 'published' ? req.user.id : null,
        approved_by: requestedStatus === 'approved' || requestedStatus === 'published' ? req.user.id : null,
        published_at: requestedStatus === 'published' ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create Initial Version in library_document_versions
      const initialVersionId = 'ver_' + id + '_v1';
      const initialVersion = {
        id: initialVersionId,
        resource_id: id,
        version_number: versionStr,
        storage_path: file.path,
        file_name: file.filename,
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        file_size_formatted: fileSizeFormatted,
        sha256_checksum: sha256,
        change_summary: 'Initial official publication / upload.',
        is_current: true,
        is_superseded: false,
        approval_date: resource.approval_date || null,
        effective_date: resource.effective_date || null,
        uploaded_by: req.user.id,
        approved_by: resource.approved_by,
        created_at: resource.created_at
      };

      resource.current_version_id = initialVersionId;

      embeddedStore.library_resources.set(id, resource);
      embeddedStore.library_document_versions.set(initialVersionId, initialVersion);
      saveEmbeddedStore();

      recordLibraryAudit(id, req.user, 'UPLOAD_LIBRARY_RESOURCE', {
        title: resource.title,
        version: versionStr,
        status: requestedStatus,
        fileSize: fileSizeFormatted,
        sha256: sha256
      }, req.ip);

      broadcastRealtimeEvent('library:update', resource);

      return res.status(201).json({
        success: true,
        message: `Resource '${resource.title}' uploaded successfully (${requestedStatus.toUpperCase()}).`,
        resource
      });

    } catch (err) {
      if (req.files?.file?.[0]?.path) {
        try { fs.unlinkSync(req.files.file[0].path); } catch (e) {}
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  });
});

// --------------------------------------------------------------------------
// 9. UPDATE RESOURCE METADATA (ADMIN / EDITOR)
// --------------------------------------------------------------------------
router.put('/resources/:id', authenticate, (req, res) => {
  try {
    if (!canManageLibrary(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const { id } = req.params;
    const item = embeddedStore.library_resources?.get(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    const b = req.body;
    if (b.title) item.title = b.title.trim();
    if (b.description !== undefined) item.description = b.description.trim();
    if (b.category_id || b.category) {
      item.category_id = b.category_id || b.category;
      item.category = b.category || b.category_id;
    }
    if (b.resource_type) item.resource_type = b.resource_type;
    if (b.language) item.language = b.language;
    if (b.author) item.author = b.author.trim();
    if (b.publisher) item.publisher = b.publisher.trim();
    if (b.year) item.year = String(b.year).trim();
    if (b.publication_date !== undefined) item.publication_date = b.publication_date;
    if (b.document_number !== undefined) item.document_number = b.document_number;
    if (b.historical_period !== undefined) item.historical_period = b.historical_period;
    if (b.provenance !== undefined) item.provenance = b.provenance;
    if (b.related_entity !== undefined) item.related_entity = b.related_entity;
    if (b.copyright_holder !== undefined) item.copyright_holder = b.copyright_holder;
    if (b.usage_permissions !== undefined) item.usage_permissions = b.usage_permissions;
    if (b.reference_url !== undefined) item.reference_url = b.reference_url;
    if (b.reviewer_notes !== undefined) item.reviewer_notes = b.reviewer_notes;
    if (b.official_doc_type !== undefined) item.official_doc_type = b.official_doc_type;
    if (b.official_doc_number !== undefined) item.official_doc_number = b.official_doc_number;
    if (b.issuing_authority !== undefined) item.issuing_authority = b.issuing_authority;
    if (b.approval_date !== undefined) item.approval_date = b.approval_date;
    if (b.effective_date !== undefined) item.effective_date = b.effective_date;
    if (b.superseded_ref !== undefined) item.superseded_ref = b.superseded_ref;
    if (b.is_featured !== undefined) {
      item.is_featured = b.is_featured === true || b.is_featured === 'true';
      item.isFeatured = item.is_featured;
    }
    if (b.access_level || b.accessLevel) {
      const lvl = (b.access_level || b.accessLevel).toLowerCase();
      if (['public', 'member', 'restricted', 'admin'].includes(lvl)) {
        item.access_level = lvl;
        item.accessLevel = lvl;
      }
    }
    if (b.tags) {
      try {
        item.tags = Array.isArray(b.tags) ? b.tags : (typeof b.tags === 'string' ? (b.tags.startsWith('[') ? JSON.parse(b.tags) : b.tags.split(',').map(s => s.trim())) : item.tags);
      } catch (e) {
        item.tags = String(b.tags).split(',').map(s => s.trim());
      }
    }

    item.updated_at = new Date().toISOString();
    item.updated_by = req.user.id;

    embeddedStore.library_resources.set(id, item);
    saveEmbeddedStore();

    recordLibraryAudit(id, req.user, 'UPDATE_LIBRARY_METADATA', { title: item.title, accessLevel: item.access_level }, req.ip);
    broadcastRealtimeEvent('library:update', item);

    return res.json({ success: true, message: 'Resource metadata updated successfully.', resource: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 10. UPLOAD REPLACEMENT FILE / CREATE NEW VERSION (VERSION CONTROL)
// --------------------------------------------------------------------------
router.post('/resources/:id/version', authenticate, (req, res) => {
  libraryUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      if (!canManageLibrary(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
      }

      const { id } = req.params;
      const resource = embeddedStore.library_resources?.get(id);
      if (!resource) {
        if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(404).json({ success: false, error: 'Resource not found.' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'Replacement file is required.' });
      }

      // Magic byte validation
      const ext = path.extname(file.originalname).toLowerCase();
      const magicCheck = validateMagicBytes(file.path, ext);
      if (!magicCheck.valid) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return res.status(400).json({ success: false, error: `Security Rejected: ${magicCheck.reason}` });
      }

      const sha256 = await calculateFileSha256(file.path);
      const newVersionNum = req.body.version_number ? req.body.version_number.trim() : (parseFloat(resource.version || '1.0') + 0.1).toFixed(1);
      const changeSummary = req.body.change_summary ? req.body.change_summary.trim() : 'Official document revision uploaded.';
      const effectiveDate = req.body.effective_date || null;
      const approvalDate = req.body.approval_date || null;

      // Mark previous current version as superseded
      const allVersions = Array.from(embeddedStore.library_document_versions?.values() || [])
        .filter(v => v.resource_id === id);
      
      allVersions.forEach(v => {
        if (v.is_current) {
          v.is_current = false;
          v.is_superseded = true;
          embeddedStore.library_document_versions.set(v.id, v);
        }
      });

      // Create new version record
      const versionId = 'ver_' + id + '_' + Date.now();
      const fileSizeFormatted = formatBytes(file.size);

      const newVersionRecord = {
        id: versionId,
        resource_id: id,
        version_number: newVersionNum,
        storage_path: file.path,
        file_name: file.filename,
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        file_size_formatted: fileSizeFormatted,
        sha256_checksum: sha256,
        change_summary: changeSummary,
        is_current: true,
        is_superseded: false,
        approval_date: approvalDate,
        effective_date: effectiveDate,
        uploaded_by: req.user.id,
        approved_by: canApproveOrPublish(req.user) ? req.user.id : null,
        created_at: new Date().toISOString()
      };

      embeddedStore.library_document_versions.set(versionId, newVersionRecord);

      // Update parent resource pointers
      resource.version = newVersionNum;
      resource.current_version_id = versionId;
      resource.storage_path = file.path;
      resource.file_name = file.filename;
      resource.mime_type = file.mimetype;
      resource.file_size_bytes = file.size;
      resource.file_size_formatted = fileSizeFormatted;
      resource.sha256_checksum = sha256;
      resource.updated_at = new Date().toISOString();
      resource.updated_by = req.user.id;

      embeddedStore.library_resources.set(id, resource);
      saveEmbeddedStore();

      recordLibraryAudit(id, req.user, 'CREATE_DOCUMENT_VERSION', {
        version: newVersionNum,
        changeSummary,
        sha256
      }, req.ip);

      broadcastRealtimeEvent('library:update', resource);

      return res.status(201).json({
        success: true,
        message: `Version ${newVersionNum} uploaded successfully. Previous versions preserved.`,
        version: newVersionRecord,
        resource
      });

    } catch (err) {
      if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(500).json({ success: false, error: err.message });
    }
  });
});

// --------------------------------------------------------------------------
// 11. WORKFLOW STATE TRANSITIONS (SUBMIT, APPROVE, PUBLISH, ARCHIVE)
// --------------------------------------------------------------------------
router.post('/resources/:id/workflow', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    const resource = embeddedStore.library_resources?.get(id);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    const previousStatus = resource.status || (resource.is_published ? 'published' : 'draft');
    let newStatus = previousStatus;

    if (action === 'submit_review') {
      newStatus = 'in_review';
    } else if (action === 'request_correction') {
      if (!canApproveOrPublish(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Reviewer or Admin clearance required.' });
      }
      newStatus = 'correction_required';
      resource.reviewer_notes = remarks || 'Correction requested by editorial reviewer.';
    } else if (action === 'approve') {
      if (!canApproveOrPublish(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Official Approver clearance required.' });
      }
      newStatus = 'approved';
      resource.approved_by = req.user.id;
      resource.approval_date = new Date().toISOString().split('T')[0];
    } else if (action === 'publish') {
      if (!canApproveOrPublish(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Publishing clearance required.' });
      }
      newStatus = 'published';
      resource.is_published = true;
      resource.published_at = new Date().toISOString();
      resource.approved_by = resource.approved_by || req.user.id;
    } else if (action === 'unpublish') {
      if (!canApproveOrPublish(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Publishing clearance required.' });
      }
      newStatus = 'unpublished';
      resource.is_published = false;
    } else if (action === 'archive') {
      if (!canApproveOrPublish(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Archiving clearance required.' });
      }
      newStatus = 'archived';
      resource.is_published = false;
      resource.archived_at = new Date().toISOString();
    } else if (action === 'restore') {
      if (!canApproveOrPublish(req.user)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Restoration clearance required.' });
      }
      newStatus = 'draft';
      resource.archived_at = null;
    } else {
      return res.status(400).json({ success: false, error: `Invalid workflow action: ${action}` });
    }

    resource.status = newStatus;
    resource.updated_at = new Date().toISOString();
    resource.updated_by = req.user.id;

    embeddedStore.library_resources.set(id, resource);
    saveEmbeddedStore();

    recordLibraryAudit(id, req.user, `WORKFLOW_${action.toUpperCase()}`, {
      fromStatus: previousStatus,
      toStatus: newStatus,
      remarks: remarks || ''
    }, req.ip);

    broadcastRealtimeEvent('library:update', resource);

    return res.json({
      success: true,
      message: `Workflow state updated from ${previousStatus.toUpperCase()} to ${newStatus.toUpperCase()}.`,
      resource
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 12. DELETE RESOURCE (SUPER ADMIN / CENTRAL ADMIN WITH CONFIRMATION)
// --------------------------------------------------------------------------
router.delete('/resources/:id', authenticate, (req, res) => {
  try {
    if (!canApproveOrPublish(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: SuperAdmin or Central Admin role required for deletion.' });
    }

    const { id } = req.params;
    const resource = embeddedStore.library_resources?.get(id);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    const reason = req.body?.reason || req.query?.reason || 'Administrative removal';

    // Delete associated physical file if exists
    if (resource.storage_path && fs.existsSync(resource.storage_path)) {
      try { fs.unlinkSync(resource.storage_path); } catch (e) {}
    }

    // Delete associated versions and files
    const versions = Array.from(embeddedStore.library_document_versions?.values() || [])
      .filter(v => v.resource_id === id);

    versions.forEach(v => {
      if (v.storage_path && fs.existsSync(v.storage_path)) {
        try { fs.unlinkSync(v.storage_path); } catch (e) {}
      }
      embeddedStore.library_document_versions.delete(v.id);
    });

    embeddedStore.library_resources.delete(id);
    saveEmbeddedStore();

    recordLibraryAudit(id, req.user, 'DELETE_LIBRARY_RESOURCE', {
      title: resource.title,
      version: resource.version,
      reason
    }, req.ip);

    broadcastRealtimeEvent('library:delete', { id });

    return res.json({ success: true, message: `Resource '${resource.title}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 13. SECURE FILE DOWNLOAD (AUTHENTICATED & ACCESS-CONTROLLED)
// --------------------------------------------------------------------------
router.get('/resources/:id/download', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const resource = embeddedStore.library_resources?.get(id);

    if (!resource) {
      return res.status(404).json({ success: false, error: 'Library resource not found.' });
    }

    const user = req.user;
    const isOfficer = canManageLibrary(user);
    const isCadet = isCadetOrMember(user);
    const level = (resource.access_level || resource.accessLevel || 'public').toLowerCase();
    const itemStatus = (resource.status || (resource.is_published ? 'published' : 'draft')).toLowerCase();

    // Check status: only officers can download unpublished/draft resources
    if (itemStatus !== 'published' && !isOfficer) {
      return res.status(403).json({ success: false, error: 'Access Denied: Resource is not published.' });
    }

    // Check clearance
    if (level === 'member' && !isCadet && !isOfficer) {
      return res.status(401).json({
        success: false,
        error: 'Sainik Cadet Portal login required to download this archival document.'
      });
    }

    if (level === 'restricted' && !isOfficer) {
      return res.status(403).json({
        success: false,
        error: 'Restricted Resource: Classified for Central Command authorized officers only.'
      });
    }

    if (level === 'admin' && !isOfficer) {
      return res.status(403).json({
        success: false,
        error: 'Administrative Clearance Required.'
      });
    }

    // Determine file path on disk
    let diskPath = resource.storage_path;
    if (!diskPath || !fs.existsSync(diskPath)) {
      // Fallback: check project root for bundled PDF (e.g. SSD_System_Architecture_and_Workflow.pdf)
      const bundled = path.join(__dirname, '../../', resource.fileUrl || resource.file_name || 'SSD_System_Architecture_and_Workflow.pdf');
      if (fs.existsSync(bundled)) {
        diskPath = bundled;
      } else {
        // Fallback test sample file if missing
        diskPath = path.join(__dirname, '../../SSD_System_Architecture_and_Workflow.pdf');
      }
    }

    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ success: false, error: 'Physical document file not found on storage server.' });
    }

    // Increment download counter
    resource.downloads_count = (resource.downloads_count || 0) + 1;
    embeddedStore.library_resources.set(id, resource);

    // Record audit if restricted or member
    if (level !== 'public') {
      recordLibraryAudit(id, user, 'DOWNLOAD_SECURE_DOCUMENT', { accessLevel: level, title: resource.title }, req.ip);
    }

    const ext = path.extname(diskPath) || '.pdf';
    const safeTitle = (resource.title || 'document').replace(/[^a-zA-Z0-9_\-\. ]/g, '_');

    res.setHeader('Content-Type', resource.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}${ext}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(diskPath);
    return stream.pipe(res);

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 14. DOCUMENT PREVIEW STREAM (INLINE EMBED, AUDIO, VIDEO, IMAGE)
// --------------------------------------------------------------------------
router.get('/resources/:id/preview', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const resource = embeddedStore.library_resources?.get(id);

    if (!resource) {
      return res.status(404).send('Resource not found.');
    }

    const user = req.user;
    const isOfficer = canManageLibrary(user);
    const isCadet = isCadetOrMember(user);
    const level = (resource.access_level || resource.accessLevel || 'public').toLowerCase();
    const itemStatus = (resource.status || (resource.is_published ? 'published' : 'draft')).toLowerCase();

    if (itemStatus !== 'published' && !isOfficer) {
      return res.status(403).send('Resource is not published.');
    }

    if (level === 'member' && !isCadet && !isOfficer) {
      return res.status(401).send('Cadet membership login required.');
    }

    if ((level === 'restricted' || level === 'admin') && !isOfficer) {
      return res.status(403).send('Restricted Document.');
    }

    let diskPath = resource.storage_path;
    if (!diskPath || !fs.existsSync(diskPath)) {
      const bundled = path.join(__dirname, '../../', resource.fileUrl || resource.file_name || 'SSD_System_Architecture_and_Workflow.pdf');
      if (fs.existsSync(bundled)) {
        diskPath = bundled;
      } else {
        diskPath = path.join(__dirname, '../../SSD_System_Architecture_and_Workflow.pdf');
      }
    }

    if (!fs.existsSync(diskPath)) {
      return res.status(404).send('Physical file missing.');
    }

    res.setHeader('Content-Type', resource.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(diskPath);
    return stream.pipe(res);

  } catch (err) {
    return res.status(500).send('Streaming error: ' + err.message);
  }
});

// --------------------------------------------------------------------------
// 15. GET DOCUMENT VERSION HISTORY
// --------------------------------------------------------------------------
router.get('/resources/:id/versions', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const versions = Array.from(embeddedStore.library_document_versions?.values() || [])
      .filter(v => v.resource_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, count: versions.length, versions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 16. GET DOCUMENT AUDIT HISTORY
// --------------------------------------------------------------------------
router.get('/resources/:id/audit', authenticate, (req, res) => {
  try {
    if (!canManageLibrary(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const { id } = req.params;
    const logs = Array.from(embeddedStore.library_audit_logs?.values() || [])
      .filter(l => l.resource_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, count: logs.length, logs, auditLogs: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 17. BULK ACTIONS (ADMIN ONLY)
// --------------------------------------------------------------------------
router.post('/bulk', authenticate, (req, res) => {
  try {
    if (!canApproveOrPublish(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin authorization required for bulk operations.' });
    }

    const { ids, action, target_category_id } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Resource IDs array is required.' });
    }

    let updatedCount = 0;
    ids.forEach(id => {
      const item = embeddedStore.library_resources?.get(id);
      if (item) {
        if (action === 'publish') {
          item.status = 'published';
          item.is_published = true;
          item.published_at = new Date().toISOString();
        } else if (action === 'unpublish') {
          item.status = 'unpublished';
          item.is_published = false;
        } else if (action === 'archive') {
          item.status = 'archived';
          item.is_published = false;
          item.archived_at = new Date().toISOString();
        } else if (action === 'change_category' && target_category_id) {
          item.category_id = target_category_id;
          item.category = target_category_id;
        }
        item.updated_at = new Date().toISOString();
        item.updated_by = req.user.id;
        embeddedStore.library_resources.set(id, item);
        updatedCount++;
      }
    });

    saveEmbeddedStore();
    recordLibraryAudit('bulk', req.user, `BULK_${(action || 'UPDATE').toUpperCase()}`, { count: updatedCount, ids }, req.ip);

    return res.json({ success: true, message: `Bulk action applied to ${updatedCount} resource(s).` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
