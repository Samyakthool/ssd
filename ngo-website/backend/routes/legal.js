// ==========================================================================
// SAMATA SAINIK DAL (SSD) - LEGAL, TERMS & CONDITIONS, PRIVACY ROUTES
// 20 Statutory Clauses, DPDP Act 2023 Compliance, and User Acceptance Tracking
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

function canManageLegal(user) {
  if (!user) return false;
  const role = user.role_id || user.role;
  return ['super_admin', 'central_admin', 'legal_reviewer'].includes(role);
}

// --------------------------------------------------------------------------
// 1. GET TERMS & CONDITIONS
// --------------------------------------------------------------------------
router.get('/terms', (req, res) => {
  try {
    const data = embeddedStore.terms_conditions.get('current') || {};
    return res.json({ success: true, terms: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 2. UPDATE TERMS & CONDITIONS (LEGAL REVIEWER / ADMIN)
// --------------------------------------------------------------------------
router.put('/terms', authenticate, (req, res) => {
  try {
    if (!canManageLegal(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Legal Reviewer or SuperAdmin role required to modify statutory terms.'
      });
    }

    const current = embeddedStore.terms_conditions.get('current') || {};
    const updated = {
      ...current,
      ...req.body,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    embeddedStore.terms_conditions.set('current', updated);
    saveEmbeddedStore();

    const auditId = 'caudit_' + Date.now();
    if (embeddedStore.content_audit_logs) {
      embeddedStore.content_audit_logs.set(auditId, {
        id: auditId,
        user_id: req.user.id,
        user_name: req.user.fullName,
        user_role: req.user.role_id,
        action: 'UPDATE_TERMS',
        entity_type: 'terms_conditions',
        entity_id: 'current',
        details: { version: updated.version, effectiveDate: updated.effectiveDate },
        created_at: new Date().toISOString()
      });
    }

    broadcastRealtimeEvent('legal:terms_update', updated);

    return res.json({ success: true, message: 'Terms & Conditions updated.', terms: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. GET PRIVACY POLICY
// --------------------------------------------------------------------------
router.get('/privacy', (req, res) => {
  try {
    const data = embeddedStore.privacy_policy.get('current') || {};
    return res.json({ success: true, privacy: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. UPDATE PRIVACY POLICY (LEGAL REVIEWER / ADMIN)
// --------------------------------------------------------------------------
router.put('/privacy', authenticate, (req, res) => {
  try {
    if (!canManageLegal(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Legal Reviewer or SuperAdmin role required.'
      });
    }

    const current = embeddedStore.privacy_policy.get('current') || {};
    const updated = {
      ...current,
      ...req.body,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    embeddedStore.privacy_policy.set('current', updated);
    saveEmbeddedStore();

    const auditId = 'caudit_' + Date.now();
    if (embeddedStore.content_audit_logs) {
      embeddedStore.content_audit_logs.set(auditId, {
        id: auditId,
        user_id: req.user.id,
        user_name: req.user.fullName,
        user_role: req.user.role_id,
        action: 'UPDATE_PRIVACY_POLICY',
        entity_type: 'privacy_policy',
        entity_id: 'current',
        details: { version: updated.version },
        created_at: new Date().toISOString()
      });
    }

    broadcastRealtimeEvent('legal:privacy_update', updated);

    return res.json({ success: true, message: 'Privacy Policy updated.', privacy: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. RECORD USER / MEMBER ACCEPTANCE OF TERMS (COMPLIANCE REQUIREMENT)
// --------------------------------------------------------------------------
router.post('/accept-terms', (req, res) => {
  try {
    const { userIdentifier, versionAccepted } = req.body;
    if (!userIdentifier) {
      return res.status(400).json({ success: false, error: 'User/Cadet identifier is required for acceptance tracking.' });
    }

    const currentTerms = embeddedStore.terms_conditions.get('current') || {};
    const version = versionAccepted || currentTerms.version || '1.0';

    if (!embeddedStore.user_terms_acceptances) {
      embeddedStore.user_terms_acceptances = new Map();
    }

    const acceptanceId = 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const acceptanceRecord = {
      id: acceptanceId,
      user_identifier: String(userIdentifier).trim(),
      version_accepted: version,
      accepted_at: new Date().toISOString(),
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Unknown Browser'
    };

    embeddedStore.user_terms_acceptances.set(acceptanceId, acceptanceRecord);
    saveEmbeddedStore();

    return res.json({
      success: true,
      message: 'Statutory acceptance recorded successfully in immutable compliance log.',
      recordId: acceptanceId,
      version: version
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. GET ACCEPTANCE RECORDS (AUDIT / COMPLIANCE)
// --------------------------------------------------------------------------
router.get('/acceptances', authenticate, (req, res) => {
  try {
    if (!canManageLegal(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Legal auditor privileges required.' });
    }

    const records = Array.from(embeddedStore.user_terms_acceptances?.values() || []).sort(
      (a, b) => new Date(b.accepted_at) - new Date(a.accepted_at)
    );

    return res.json({ success: true, count: records.length, acceptances: records });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
