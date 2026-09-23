// ==========================================================================
// SAMATA SAINIK DAL (SSD) - APPROVAL WORKFLOW CONFIGURATION ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// 1. GET ALL ACTIVE WORKFLOWS
router.get('/', authenticate, async (req, res) => {
  try {
    const workflows = Array.from(embeddedStore.approval_workflows.values());
    const steps = Array.from(embeddedStore.approval_workflow_steps.values());

    const result = workflows.map(wf => ({
      ...wf,
      steps: steps.filter(s => s.workflow_id === wf.id).sort((a, b) => a.step_order - b.step_order)
    }));

    return res.json({ success: true, workflows: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CREATE CUSTOM STATE / ORGANIZATIONAL WORKFLOW (Super Admin)
router.post('/', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const { name, stateId, description, steps } = req.body;
    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ success: false, error: 'Workflow name and step definitions are required.' });
    }

    const workflowId = 'wf_' + Date.now();
    const newWorkflow = {
      id: workflowId,
      name: name.trim(),
      state_id: stateId || null,
      description: description || '',
      is_active: true,
      created_at: new Date().toISOString()
    };
    embeddedStore.approval_workflows.set(workflowId, newWorkflow);

    steps.forEach((step, idx) => {
      const stepId = 'step_' + workflowId + '_' + (idx + 1);
      embeddedStore.approval_workflow_steps.set(stepId, {
        id: stepId,
        workflow_id: workflowId,
        step_order: idx + 1,
        role_required: step.roleRequired || 'district_official',
        step_label: step.label || `Step ${idx + 1}`,
        can_recommend: step.canRecommend ?? true,
        can_request_correction: step.canRequestCorrection ?? true,
        can_reject: step.canReject ?? true,
        can_escalate: step.canEscalate ?? true,
        can_final_approve: step.canFinalApprove ?? false,
        is_optional: step.isOptional ?? false
      });
    });

    saveEmbeddedStore();
    return res.status(201).json({ success: true, message: 'Workflow created successfully.', workflowId: workflowId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
