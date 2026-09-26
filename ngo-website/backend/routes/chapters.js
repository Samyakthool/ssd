// ==========================================================================
// SAMATA SAINIK DAL (SSD) - STATE, REGION, DISTRICT & CHAPTER MANAGEMENT
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// 1. PUBLIC CHAPTER LOCATOR / HIERARCHY DIRECTORY
router.get('/', async (req, res) => {
  try {
    const states = Array.from(embeddedStore.states.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const regions = Array.from(embeddedStore.regions.values());
    const districts = Array.from(embeddedStore.districts.values());
    const chapters = Array.from(embeddedStore.chapters.values());

    const result = states.map(st => {
      const stateRegions = regions.filter(r => r.state_id === st.id);
      const stateDistricts = districts.filter(d => d.state_id === st.id);
      const stateChapters = chapters.filter(c => c.state_id === st.id);

      return {
        ...st,
        regions: stateRegions,
        districts: stateDistricts,
        chapters: stateChapters
      };
    });

    return res.json({ success: true, states: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET DISTRICTS FOR A STATE
router.get('/districts/:stateId', async (req, res) => {
  try {
    const { stateId } = req.params;
    const districts = Array.from(embeddedStore.districts.values()).filter(
      d => d.state_id === stateId || d.state_id.toLowerCase().includes(stateId.toLowerCase())
    );
    return res.json({ success: true, districts: districts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET TALUKAS FOR A DISTRICT
router.get('/talukas/:districtId', async (req, res) => {
  try {
    const { districtId } = req.params;
    const talukas = Array.from(embeddedStore.talukas.values()).filter(
      t => t.district_id === districtId || t.district_id.toLowerCase().includes(districtId.toLowerCase())
    );
    return res.json({ success: true, talukas: talukas });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CREATE STATE CHAPTER (Super Admin / Central Command)
router.post('/states', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const { name, hindiName, marathiName, code, headquarters, presidentName, secretaryName } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'State name and code are required.' });
    }

    const stateId = 'state_' + code.toLowerCase().trim();
    const newState = {
      id: stateId,
      name: name.trim(),
      hindi_name: hindiName || name,
      marathi_name: marathiName || name,
      code: code.trim().toUpperCase(),
      headquarters: headquarters || '',
      president_name: presidentName || '',
      secretary_name: secretaryName || '',
      status: 'ACTIVE',
      sort_order: embeddedStore.states.size + 1,
      created_at: new Date().toISOString()
    };

    embeddedStore.states.set(stateId, newState);
    saveEmbeddedStore();

    return res.status(201).json({ success: true, message: 'State chapter registered.', state: newState });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. CREATE DISTRICT COMMAND
router.post('/districts', authenticate, requireRole('super_admin', 'central_admin', 'state_official'), async (req, res) => {
  try {
    const { stateId, regionId, name, commanderName, contactPhone } = req.body;
    if (!stateId || !name) {
      return res.status(400).json({ success: false, error: 'State and district name are required.' });
    }

    const distId = 'dist_' + stateId.replace('state_', '') + '_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newDistrict = {
      id: distId,
      state_id: stateId,
      region_id: regionId || null,
      name: name.trim(),
      commander_name: commanderName || '',
      contact_phone: contactPhone || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    embeddedStore.districts.set(distId, newDistrict);
    saveEmbeddedStore();

    return res.status(201).json({ success: true, message: 'District unit created.', district: newDistrict });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. CREATE LOCAL CHAPTER
router.post('/local', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'district_official'), async (req, res) => {
  try {
    const { name, stateId, regionId, districtId, talukaId, locationAddress, commanderName, secretaryName, contactPhone, contactEmail } = req.body;
    if (!name || !stateId || !districtId) {
      return res.status(400).json({ success: false, error: 'Chapter name, state, and district are required.' });
    }

    const chapId = 'chap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newChap = {
      id: chapId,
      name: name.trim(),
      state_id: stateId,
      region_id: regionId || null,
      district_id: districtId,
      taluka_id: talukaId || null,
      location_address: locationAddress || '',
      commander_name: commanderName || '',
      secretary_name: secretaryName || '',
      contact_phone: contactPhone || '',
      contact_email: contactEmail || '',
      members_count: 0,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    embeddedStore.chapters.set(chapId, newChap);
    saveEmbeddedStore();

    return res.status(201).json({ success: true, message: 'Local chapter unit created.', chapter: newChap });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
