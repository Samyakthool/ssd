// ==========================================================================
// SAMATA SAINIK DAL (SSD) - BATCH MANAGEMENT & ALLOCATION ROUTES
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore, supabase } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Helper to calculate batch code from date & config
export function computeBatchCode(dateStr, stateCode = 'MH', config = null) {
  if (!config) {
    config = embeddedStore.batch_config.get('default_config') || {
      format_pattern: 'SSD-BATCH-{YEAR}',
      allocation_rule: 'CALENDAR_YEAR',
      sequence_prefix: 'SSD'
    };
  }

  let year = '2026';
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getFullYear())) {
      year = String(d.getFullYear());
    } else {
      const match = String(dateStr).match(/\b(19\d{2}|20\d{2})\b/);
      if (match) year = match[1];
    }
  }

  const pattern = config.format_pattern || 'SSD-BATCH-{YEAR}';
  let code = pattern
    .replace('{YEAR}', year)
    .replace('{STATE}', (stateCode || 'MH').toUpperCase());

  // If pattern has sequence {SEQ}, calculate next sequence
  if (code.includes('{SEQ}')) {
    let count = 1;
    for (const b of embeddedStore.batches.values()) {
      if (b.batch_code && b.batch_code.startsWith(code.replace('{SEQ}', ''))) count++;
    }
    const seqStr = String(count).padStart(3, '0');
    code = code.replace('{SEQ}', seqStr);
  }

  return code;
}

// 1. GET ALL BATCHES
router.get('/', authenticate, async (req, res) => {
  try {
    const { year, scope, status } = req.query;
    let list = Array.from(embeddedStore.batches.values());

    if (year) {
      list = list.filter(b => b.batch_code.includes(year) || (b.start_date && b.start_date.startsWith(year)));
    }
    if (scope && scope !== 'ALL') {
      list = list.filter(b => b.scope === scope);
    }
    if (status && status !== 'ALL') {
      list = list.filter(b => b.status === status);
    }

    // Sort newest start date or code first
    list.sort((a, b) => (b.start_date || b.batch_code).localeCompare(a.start_date || a.batch_code));

    return res.json({ success: true, count: list.length, batches: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET CURRENT BATCH CONFIGURATION
router.get('/config', authenticate, async (req, res) => {
  try {
    let cfg = embeddedStore.batch_config.get('default_config');
    if (!cfg) {
      cfg = {
        id: 'default_config',
        format_pattern: 'SSD-BATCH-{YEAR}',
        allocation_rule: 'CALENDAR_YEAR',
        sequence_prefix: 'SSD',
        active_scope: 'NATIONAL',
        historical_mapping_enabled: true,
        updated_at: new Date().toISOString()
      };
      embeddedStore.batch_config.set('default_config', cfg);
    }
    return res.json({ success: true, config: cfg });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. UPDATE BATCH CONFIGURATION (Super Admin only)
router.put('/config', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { formatPattern, allocationRule, sequencePrefix, activeScope, historicalMappingEnabled, notes } = req.body;
    let cfg = embeddedStore.batch_config.get('default_config') || { id: 'default_config' };

    cfg.format_pattern = formatPattern || cfg.format_pattern || 'SSD-BATCH-{YEAR}';
    cfg.allocation_rule = allocationRule || cfg.allocation_rule || 'CALENDAR_YEAR';
    cfg.sequence_prefix = sequencePrefix || cfg.sequence_prefix || 'SSD';
    cfg.active_scope = activeScope || cfg.active_scope || 'NATIONAL';
    cfg.historical_mapping_enabled = historicalMappingEnabled ?? cfg.historical_mapping_enabled ?? true;
    cfg.notes = notes || cfg.notes || '';
    cfg.updated_at = new Date().toISOString();
    cfg.updated_by = req.user.full_name || req.user.email;

    embeddedStore.batch_config.set('default_config', cfg);

    // Record Audit Log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.role_id,
      action: 'BATCH_CONFIG_UPDATED',
      entity_type: 'BATCH_CONFIG',
      entity_id: 'default_config',
      details: { formatPattern: cfg.format_pattern, allocationRule: cfg.allocation_rule },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();

    return res.json({ success: true, message: 'Batch configuration updated successfully.', config: cfg });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. CREATE NEW BATCH DEFINITION
router.post('/', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const { batchCode, batchName, startDate, endDate, scope, allocationRule, notes } = req.body;
    if (!batchCode) {
      return res.status(400).json({ success: false, error: 'Batch code is required.' });
    }

    const cleanCode = batchCode.trim().toUpperCase();
    if (embeddedStore.batches.has(cleanCode)) {
      return res.status(409).json({ success: false, error: `Batch '${cleanCode}' already exists.` });
    }

    const batchId = 'batch_' + cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newBatch = {
      id: batchId,
      batch_code: cleanCode,
      batch_name: batchName || `SSD Cadre Batch (${cleanCode})`,
      start_date: startDate || null,
      end_date: endDate || null,
      scope: scope || 'NATIONAL',
      allocation_rule: allocationRule || 'CALENDAR_YEAR',
      notes: notes || '',
      created_by: req.user.full_name || req.user.email,
      created_at: new Date().toISOString(),
      status: 'ACTIVE'
    };

    embeddedStore.batches.set(cleanCode, newBatch);
    embeddedStore.batches.set(batchId, newBatch);

    // Audit Log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.role_id,
      action: 'BATCH_CREATED',
      entity_type: 'BATCH',
      entity_id: cleanCode,
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.status(201).json({ success: true, message: 'Batch registered successfully.', batch: newBatch });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET BATCH ASSIGNMENT & CORRECTION HISTORY (AUDIT TRAIL)
router.get('/history', authenticate, async (req, res) => {
  try {
    const { memberId, batchCode } = req.query;
    let history = Array.from(embeddedStore.batch_history.values());

    if (memberId) {
      history = history.filter(h => h.member_id === memberId || (h.sainik_id && h.sainik_id === memberId));
    }
    if (batchCode) {
      history = history.filter(h => h.new_batch_code === batchCode || h.previous_batch_code === batchCode);
    }

    history.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return res.json({ success: true, count: history.length, history });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. AUTHORIZED BATCH CORRECTION FOR A MEMBER
// Acceptance Test 6 & 9:
// - Non-authorized official cannot modify batch
// - Requires a mandatory recorded reason
// - Preserves audit history
router.post('/correct', authenticate, requireRole('super_admin', 'central_admin', 'enlistment_officer'), async (req, res) => {
  try {
    const { memberId, newBatchCode, reason } = req.body;

    if (!memberId || !newBatchCode) {
      return res.status(400).json({ success: false, error: 'Member ID and New Batch Code are mandatory.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Mandatory Audit Requirement: An authorized justification/reason must be recorded for any batch correction.'
      });
    }

    // Locate member or application
    let member = embeddedStore.members.get(memberId) || embeddedStore.members.get(memberId.toUpperCase());
    let isApp = false;

    if (!member) {
      for (const m of embeddedStore.members.values()) {
        if (m.id === memberId || m.sainik_id === memberId || (m.sainik_id && m.sainik_id.toUpperCase() === memberId.toUpperCase())) {
          member = m;
          break;
        }
      }
    }

    if (!member) {
      let app = embeddedStore.membership_applications.get(memberId);
      if (!app) {
        for (const a of embeddedStore.membership_applications.values()) {
          if (a.id === memberId || a.sainik_id === memberId) {
            app = a;
            break;
          }
        }
      }
      if (app) {
        member = app;
        isApp = true;
      }
    }

    if (!member) {
      return res.status(404).json({ success: false, error: 'Member or application record not found.' });
    }

    const previousBatch = member.batch_code || member.batch_no || member.batchNo || 'UNASSIGNED';
    const targetBatch = newBatchCode.trim().toUpperCase();

    // Ensure target batch exists in batches store or create on the fly
    if (!embeddedStore.batches.has(targetBatch)) {
      const yearMatch = targetBatch.match(/\b(19\d{2}|20\d{2})\b/);
      const bYear = yearMatch ? yearMatch[1] : '2026';
      embeddedStore.batches.set(targetBatch, {
        id: 'batch_' + targetBatch.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        batch_code: targetBatch,
        batch_name: `SSD Batch ${targetBatch}`,
        start_date: `${bYear}-01-01`,
        end_date: `${bYear}-12-31`,
        scope: 'NATIONAL',
        allocation_rule: 'CALENDAR_YEAR',
        notes: `Created via authorized correction by ${req.user.full_name}`,
        created_by: req.user.full_name,
        created_at: new Date().toISOString(),
        status: 'ACTIVE'
      });
    }

    // Update member/app batch
    member.batch_code = targetBatch;
    member.batch_no = targetBatch;
    if (member.batchNo !== undefined) member.batchNo = targetBatch;
    member.batch_assignment_status = 'ASSIGNED';
    member.batch_assigned_by = req.user.full_name || req.user.email;
    member.batch_assigned_at = new Date().toISOString();
    member.updated_at = new Date().toISOString();

    // Create immutable audit entry in batch_history
    const historyId = 'bh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const historyRecord = {
      id: historyId,
      member_id: member.id || member.sainik_id,
      sainik_id: member.sainik_id || null,
      previous_batch_code: previousBatch,
      new_batch_code: targetBatch,
      change_type: 'CORRECTION',
      reason: reason.trim(),
      changed_by: req.user.full_name || req.user.email,
      changed_by_role: req.user.role_id,
      created_at: new Date().toISOString()
    };
    embeddedStore.batch_history.set(historyId, historyRecord);

    // Record system audit log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.role_id,
      action: 'BATCH_CORRECTED',
      entity_type: isApp ? 'APPLICATION' : 'MEMBER',
      entity_id: member.id || member.sainik_id,
      details: { previousBatch, newBatch: targetBatch, reason: reason.trim() },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();

    return res.json({
      success: true,
      message: `Batch successfully corrected from '${previousBatch}' to '${targetBatch}'.`,
      auditRecord: historyRecord,
      member: {
        id: member.id,
        sainikId: member.sainik_id,
        batchCode: member.batch_code
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. PREVIEW BATCH ALLOCATION CALCULATION
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { originalJoiningDate, stateCode } = req.body;
    const cfg = embeddedStore.batch_config.get('default_config');
    const calculatedCode = computeBatchCode(originalJoiningDate, stateCode, cfg);

    return res.json({
      success: true,
      originalJoiningDate,
      calculatedBatchCode: calculatedCode,
      allocationRule: cfg?.allocation_rule || 'CALENDAR_YEAR',
      formatPattern: cfg?.format_pattern || 'SSD-BATCH-{YEAR}'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
