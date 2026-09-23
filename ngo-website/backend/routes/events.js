// ==========================================================================
// SAMATA SAINIK DAL (SSD) - DRILLS, CONCLAVES & EVENTS ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// 1. GET ALL EVENTS (Public)
router.get('/', async (req, res) => {
  try {
    const { status, wing } = req.query;
    let events = Array.from(embeddedStore.events.values());

    if (status) {
      events = events.filter(e => e.status.toUpperCase() === status.toUpperCase());
    }
    if (wing) {
      events = events.filter(e => e.wing_name === wing);
    }

    events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    return res.json({ success: true, count: events.length, events: events });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CREATE EVENT (Media Admin / Central / State Officials)
router.post('/', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'media_admin'), async (req, res) => {
  try {
    const { title, description, eventDate, eventTime, location, stateName, districtName, wingName, bannerUrl, registrationRequired, participantLimit } = req.body;

    if (!title || !eventDate || !location) {
      return res.status(400).json({ success: false, error: 'Event title, date, and location are required.' });
    }

    const eventId = 'event_' + Date.now();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newEvent = {
      id: eventId,
      title: title.trim(),
      slug: slug,
      description: description || '',
      event_date: eventDate,
      event_time: eventTime || '09:00 AM',
      location: location.trim(),
      state_name: stateName || 'National',
      district_name: districtName || 'Central HQ',
      wing_name: wingName || 'Central Cadet Corps (Sainik Wing)',
      organizer: req.user.fullName,
      banner_url: bannerUrl || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
      status: 'UPCOMING',
      registration_required: registrationRequired === true,
      participant_limit: Number(participantLimit) || 0,
      created_at: new Date().toISOString()
    };

    embeddedStore.events.set(eventId, newEvent);
    saveEmbeddedStore();

    return res.status(201).json({ success: true, message: 'Event scheduled successfully.', event: newEvent });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. REGISTER FOR AN EVENT (Public / Sainik)
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
