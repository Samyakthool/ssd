// ==========================================================================
// SAMATA SAINIK DAL (SSD) - CONTENT MANAGEMENT SYSTEM (CMS) ROUTES
// Homepage Sections, Aim & Motto, Historical Organizations & Timeline
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

// Helper to log content audits
function recordContentAudit(user, action, entityType, entityId, details) {
  try {
    const auditId = 'caudit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const entry = {
      id: auditId,
      user_id: user ? user.id : 'system',
      user_name: user ? (user.fullName || user.email) : 'System Event',
      user_role: user ? (user.role_id || user.role) : 'Public/System',
      action: action, // CREATE, UPDATE, APPROVE, PUBLISH, DELETE
      entity_type: entityType,
      entity_id: entityId,
      details: details || {},
      created_at: new Date().toISOString()
    };
    if (embeddedStore.content_audit_logs) {
      embeddedStore.content_audit_logs.set(auditId, entry);
    }
    if (embeddedStore.audit_logs) {
      embeddedStore.audit_logs.set(auditId, {
        ...entry,
        jurisdiction_summary: 'CMS / Central Command'
      });
    }
    saveEmbeddedStore();
  } catch (err) {
    console.error('Content audit log error:', err.message);
  }
}

// Permission checking helper for CMS editing
function canEditCms(user) {
  if (!user) return false;
  const role = user.role_id || user.role;
  return [
    'super_admin',
    'central_admin',
    'content_editor',
    'historical_editor',
    'authorized_publisher',
    'media',
    'media_admin'
  ].includes(role);
}

// --------------------------------------------------------------------------
// 1. HOMEPAGE CMS ENDPOINTS
// --------------------------------------------------------------------------
router.get('/homepage', (req, res) => {
  try {
    const homepage = embeddedStore.cms_sections.get('homepage') || {
      hero: {
        headline: "Samata Sainik Dal",
        tagline: "Discipline • Patience • Continuity",
        subheadline: "",
        primaryCtaText: "Explore SSD",
        primaryCtaLink: "#about-ssd",
        secondaryCtaText: "Become a Sainik",
        secondaryCtaLink: "membership.html",
        tertiaryCtaText: "Explore Digital Library",
        tertiaryCtaLink: "library.html",
        bgImage: "ssd-cadets-march.jpg"
      },
      aimMottoHighlight: {
        aimShort: "To organize, educate, and discipline the oppressed masses to safeguard constitutional morality, eliminate caste barriers, and establish an enlightened democratic fraternity.",
        mottoShort: "Self-Respect, Discipline, Equality & Social Service (आत्मसन्मान, शिस्त, समानता व समाजसेवा)"
      }
    };

    return res.json({ success: true, homepage });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/homepage', authenticate, (req, res) => {
  try {
    if (!canEditCms(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: CMS edit privileges required.' });
    }

    const current = embeddedStore.cms_sections.get('homepage') || {};
    const updated = {
      ...current,
      ...req.body,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    embeddedStore.cms_sections.set('homepage', updated);
    saveEmbeddedStore();

    recordContentAudit(req.user, 'UPDATE_HOMEPAGE', 'cms_sections', 'homepage', req.body);
    broadcastRealtimeEvent('cms:homepage_update', updated);

    return res.json({ success: true, message: 'Homepage CMS content updated successfully.', homepage: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 2. AIM & MOTTO ENDPOINTS (TRILINGUAL)
// --------------------------------------------------------------------------
router.get('/aim-motto', (req, res) => {
  try {
    const data = embeddedStore.aim_motto.get('current') || {};
    return res.json({ success: true, aim_motto: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/aim-motto', authenticate, (req, res) => {
  try {
    if (!canEditCms(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: CMS edit privileges required.' });
    }

    const current = embeddedStore.aim_motto.get('current') || {};
    const updated = {
      ...current,
      ...req.body,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    embeddedStore.aim_motto.set('current', updated);
    saveEmbeddedStore();

    recordContentAudit(req.user, 'UPDATE_AIM_MOTTO', 'aim_motto', 'current', req.body);
    broadcastRealtimeEvent('cms:aim_motto_update', updated);

    return res.json({ success: true, message: 'Official Aim & Motto formulation updated.', aim_motto: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. HISTORICAL ORGANIZATIONS (PREDECESSORS & BACKGROUND)
// --------------------------------------------------------------------------
router.get('/history/organizations', (req, res) => {
  try {
    const { all } = req.query;
    let list = Array.from(embeddedStore.historical_organizations.values());

    if (all !== 'true') {
      list = list.filter(item => item.is_published !== false);
    }

    return res.json({ success: true, count: list.length, organizations: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/history/organizations', authenticate, (req, res) => {
  try {
    if (!canEditCms(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Historical Editor privileges required.' });
    }

    const data = req.body;
    if (!data.title || !data.foundingDate || !data.significance) {
      return res.status(400).json({ success: false, error: 'Title, founding date, and historical significance are required.' });
    }

    const id = data.id || ('hist_org_' + Date.now());
    const existing = embeddedStore.historical_organizations.get(id);

    const record = {
      id: id,
      title: data.title.trim(),
      foundingDate: data.foundingDate.trim(),
      location: data.location || 'India',
      keyFigures: data.keyFigures || '',
      significance: data.significance.trim(),
      verifiedSource: data.verifiedSource || 'Archival record',
      status: data.status || 'Verified Historical Document',
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      is_published: data.is_published !== undefined ? !!data.is_published : true,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    embeddedStore.historical_organizations.set(id, record);
    saveEmbeddedStore();

    recordContentAudit(req.user, existing ? 'UPDATE_HIST_ORG' : 'CREATE_HIST_ORG', 'historical_organizations', id, record);
    broadcastRealtimeEvent('cms:history_update', record);

    return res.json({ success: true, message: 'Historical organization record saved.', organization: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/history/organizations/:id', authenticate, (req, res) => {
  try {
    if (!canEditCms(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Historical Editor privileges required.' });
    }

    const { id } = req.params;
    if (!embeddedStore.historical_organizations.has(id)) {
      return res.status(404).json({ success: false, error: 'Organization not found.' });
    }

    embeddedStore.historical_organizations.delete(id);
    saveEmbeddedStore();

    recordContentAudit(req.user, 'DELETE_HIST_ORG', 'historical_organizations', id, { id });
    return res.json({ success: true, message: 'Historical organization record removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. HISTORICAL TIMELINE ENTRIES
// --------------------------------------------------------------------------
router.get('/history/timeline', (req, res) => {
  try {
    const { all } = req.query;
    let list = Array.from(embeddedStore.historical_timeline.values());

    if (all !== 'true') {
      list = list.filter(item => item.is_published !== false);
    }

    list.sort((a, b) => {
      const yearA = parseInt(a.year, 10) || 9999;
      const yearB = parseInt(b.year, 10) || 9999;
      return yearA - yearB;
    });

    return res.json({ success: true, count: list.length, timeline: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/history/timeline', authenticate, (req, res) => {
  try {
    if (!canEditCms(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Historical Editor privileges required.' });
    }

    const data = req.body;
    if (!data.year || !data.title || !data.summary) {
      return res.status(400).json({ success: false, error: 'Year, title, and summary are required.' });
    }

    const id = data.id || ('time_' + Date.now());
    const existing = embeddedStore.historical_timeline.get(id);

    const record = {
      id: id,
      year: String(data.year).trim(),
      dateFormatted: data.dateFormatted || data.year,
      title: data.title.trim(),
      location: data.location || '',
      summary: data.summary.trim(),
      period: data.period || 'Historical Milestone',
      is_published: data.is_published !== undefined ? !!data.is_published : true,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    embeddedStore.historical_timeline.set(id, record);
    saveEmbeddedStore();

    recordContentAudit(req.user, existing ? 'UPDATE_TIMELINE' : 'CREATE_TIMELINE', 'historical_timeline', id, record);
    broadcastRealtimeEvent('cms:timeline_update', record);

    return res.json({ success: true, message: 'Timeline entry saved.', timelineEntry: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/history/timeline/:id', authenticate, (req, res) => {
  try {
    if (!canEditCms(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Historical Editor privileges required.' });
    }

    const { id } = req.params;
    if (!embeddedStore.historical_timeline.has(id)) {
      return res.status(404).json({ success: false, error: 'Timeline entry not found.' });
    }

    embeddedStore.historical_timeline.delete(id);
    saveEmbeddedStore();

    recordContentAudit(req.user, 'DELETE_TIMELINE', 'historical_timeline', id, { id });
    return res.json({ success: true, message: 'Timeline entry deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. CMS AUDIT LOGS
// --------------------------------------------------------------------------
router.get('/audit-logs', authenticate, (req, res) => {
  try {
    if (!canEditCms(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: CMS view privileges required.' });
    }

    const logs = Array.from(embeddedStore.content_audit_logs?.values() || []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
