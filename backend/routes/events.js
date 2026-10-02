// ==========================================================================
// SAMATA SAINIK DAL (SSD) - DRILLS, CONCLAVES & EVENTS ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';

const router = express.Router();

// 1. GET ALL EVENTS (Public & Admin)
router.get('/', async (req, res) => {
  try {
    const { status, wing, all } = req.query;
    let events = Array.from(embeddedStore.events.values());

    if (all !== 'true') {
      events = events.filter(e => (e.approvalStatus || 'approved').toLowerCase() === 'approved');
    }

    if (status && status !== 'all') {
      events = events.filter(e => (e.status || '').toLowerCase() === status.toLowerCase());
    }
    if (wing) {
      events = events.filter(e => e.wing_name === wing || e.wing === wing);
    }

    events.sort((a, b) => new Date(a.event_date || a.date) - new Date(b.event_date || b.date));
    return res.json({ success: true, count: events.length, events: events });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET EVENT BY ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const event = embeddedStore.events.get(id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    return res.json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CREATE / UPSERT EVENT
router.post('/', optionalAuth, async (req, res) => {
  try {
    const data = req.body;
    const { id, title, description, eventDate, date, eventTime, location, stateName, districtName, wingName, bannerUrl, pdfUrl, status, approvalStatus, registrationRequired, participantLimit } = data;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Event title is required.' });
    }

    const eventId = id || ('event_' + Date.now());
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newEvent = {
      id: eventId,
      title: title.trim(),
      slug: slug,
      description: description || '',
      event_date: eventDate || date || 'Sept 24, 2026',
      date: date || eventDate || 'Sept 24, 2026',
      event_time: eventTime || '09:00 AM',
      location: location ? location.trim() : 'Nagpur / New Delhi',
      state_name: stateName || 'National',
      district_name: districtName || 'Central HQ',
      wing_name: wingName || 'Central Cadet Corps (Sainik Wing)',
      banner_url: bannerUrl || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
      pdfUrl: pdfUrl || '',
      status: (status || 'upcoming').toLowerCase(),
      approvalStatus: approvalStatus || 'approved',
      registration_required: registrationRequired === true,
      participant_limit: Number(participantLimit) || 0,
      organizer: req.user ? (req.user.fullName || req.user.name) : 'SSD Central Command',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    embeddedStore.events.set(eventId, newEvent);
    saveEmbeddedStore();

    broadcastRealtimeEvent('event:update', newEvent);

    return res.status(201).json({ success: true, message: 'Event scheduled successfully.', event: newEvent });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. UPDATE EVENT
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = embeddedStore.events.get(id) || {};
    const updated = {
      ...existing,
      ...req.body,
      id: id,
      updated_at: new Date().toISOString()
    };

    embeddedStore.events.set(id, updated);
    saveEmbeddedStore();

    broadcastRealtimeEvent('event:update', updated);
    return res.json({ success: true, message: 'Event updated', event: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DELETE EVENT
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existed = embeddedStore.events.delete(id);
    if (existed) {
      saveEmbeddedStore();
      broadcastRealtimeEvent('event:delete', { id });
    }
    return res.json({ success: true, message: 'Event deleted', id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. REGISTER FOR AN EVENT (Public / Sainik)
router.post('/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobile, sainikId } = req.body;

    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, error: 'Full name, email, and mobile are required.' });
    }

    const event = embeddedStore.events.get(id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const regId = 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newReg = {
      id: regId,
      event_id: id,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      sainik_id: sainikId || null,
      attended: false,
      registered_at: new Date().toISOString()
    };

    embeddedStore.event_registrations.set(regId, newReg);
    saveEmbeddedStore();

    broadcastRealtimeEvent('event:register', { eventId: id, registration: newReg });

    return res.status(201).json({
      success: true,
      message: 'Registration confirmed for ' + event.title,
      registrationId: regId
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
