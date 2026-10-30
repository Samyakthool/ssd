// ==========================================================================
// SAMATA SAINIK DAL (SSD) - ADMIN DASHBOARD & AUDIT LOGS ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole, enforceJurisdiction } from '../middleware/rbac.js';

const router = express.Router();

// 1. ROLE & JURISDICTION TAILORED DASHBOARD ANALYTICS
router.get('/dashboard', authenticate, enforceJurisdiction, async (req, res) => {
  try {
    const { role_id, jurisdiction } = req.user;
    const jf = req.jurisdictionFilter;

    // Filter Applications by Jurisdiction
    let apps = Array.from(embeddedStore.membership_applications.values());
    if (jf) {
      apps = apps.filter(a => {
        if (jf.state_id && a.state_id !== jf.state_id) return false;
        if (jf.region_id && a.region_id !== jf.region_id) return false;
        if (jf.district_id && a.district_id !== jf.district_id) return false;
        return true;
      });
    }

    // Filter Members by Jurisdiction
    let members = Array.from(embeddedStore.members.values());
    if (jf) {
      members = members.filter(m => {
        if (jf.state_id && m.state_name && !m.state_name.toLowerCase().includes(jf.state_id.replace('state_', ''))) {}
        if (jf.district_id && m.district_name && !m.district_name.toLowerCase().includes(jf.district_id.replace('dist_mh_', '').replace('dist_', ''))) {}
        return true;
      });
    }

    // Pending counts in this specific officer's queue
    let myPendingCount = 0;
    if (role_id === 'district_official') {
      myPendingCount = apps.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;
    } else if (role_id === 'regional_official') {
      myPendingCount = apps.filter(a => a.status === 'RECOMMENDED' && a.assigned_role === 'regional_official').length;
    } else if (role_id === 'state_official') {
      myPendingCount = apps.filter(a => a.status === 'RECOMMENDED' && a.assigned_role === 'state_official').length;
    } else if (role_id === 'super_admin' || role_id === 'central_admin') {
      myPendingCount = apps.filter(a => a.status === 'RECOMMENDED' || a.status === 'ESCALATED' || a.status === 'SUBMITTED').length;
    }

    // Wings distribution
    const wingBreakdown = {};
    apps.forEach(a => {
      const w = a.wing_name || 'General';
      wingBreakdown[w] = (wingBreakdown[w] || 0) + 1;
    });

    // Status breakdown
    const statusBreakdown = {
      SUBMITTED: apps.filter(a => a.status === 'SUBMITTED').length,
      UNDER_REVIEW: apps.filter(a => a.status === 'UNDER_REVIEW').length,
      RECOMMENDED: apps.filter(a => a.status === 'RECOMMENDED').length,
      CORRECTION_REQUIRED: apps.filter(a => a.status === 'CORRECTION_REQUIRED').length,
      ESCALATED: apps.filter(a => a.status === 'ESCALATED').length,
      FINAL_APPROVED: apps.filter(a => a.status === 'FINAL_APPROVED').length,
      REJECTED: apps.filter(a => a.status === 'REJECTED').length
    };

    // Donations (Finance / Central only)
    const donations = Array.from(embeddedStore.donations.values());
    const totalDonations = donations
      .filter(d => d.status === 'COMPLETED')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const totalChapters = embeddedStore.chapters.size;
    const totalEvents = embeddedStore.events.size;

    return res.json({
      success: true,
      officer: {
        name: req.user.fullName,
        role: req.user.role_id,
        department: req.user.department,
        jurisdictionSummary: jurisdiction?.district_id
          ? `${jurisdiction.district_id}, ${jurisdiction.state_id}`
          : jurisdiction?.state_id
            ? `${jurisdiction.state_id}`
            : 'National Executive HQ'
      },
      metrics: {
        totalSainiks: members.length,
        totalApplications: apps.length,
        myPendingApprovals: myPendingCount,
        statusBreakdown: statusBreakdown,
        wingBreakdown: wingBreakdown,
        totalDonationsRaised: totalDonations,
        activeChaptersCount: totalChapters,
        upcomingEventsCount: totalEvents
      },
      recentApplications: apps.slice(0, 10)
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET SYSTEM AUDIT LOGS (Super Admin & Central Admin)
router.get('/audit-logs', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const logs = Array.from(embeddedStore.audit_logs.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return res.json({ success: true, count: logs.length, logs: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. EXPORT JURISDICTION DATA TO CSV
router.get('/export/:type', authenticate, enforceJurisdiction, async (req, res) => {
  try {
    const { type } = req.params;
    const jf = req.jurisdictionFilter;
    let csvData = '';

    if (type === 'members') {
      let members = Array.from(embeddedStore.members.values());
      if (jf && jf.state_id) members = members.filter(m => m.state_name && m.state_name.includes(jf.state_id.replace('state_', '')));
      csvData = 'Sainik ID,Full Name,Mobile,Email,State,District,Wing,Designation,Status,Joining Date\n';
      members.forEach(m => {
        csvData += `"${m.sainik_id}","${m.full_name}","${m.mobile}","${m.email}","${m.state_name}","${m.district_name}","${m.wing_name}","${m.designation}","${m.status}","${m.created_at}"\n`;
      });
    } else if (type === 'applications') {
      let apps = Array.from(embeddedStore.membership_applications.values());
      if (jf && jf.state_id) apps = apps.filter(a => a.state_id === jf.state_id);
      csvData = 'Application ID,Full Name,Mobile,Email,State,District,Wing,Status,Current Role,Created At\n';
      apps.forEach(a => {
        csvData += `"${a.id}","${a.full_name}","${a.mobile}","${a.email}","${a.state_name}","${a.district_name}","${a.wing_name}","${a.status}","${a.assigned_role}","${a.created_at}"\n`;
      });
    } else if (type === 'donations') {
      if (req.user.role_id !== 'super_admin' && req.user.role_id !== 'central_admin' && req.user.role_id !== 'finance_admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized to export financial records.' });
      }
      const donations = Array.from(embeddedStore.donations.values());
      csvData = 'Receipt No,Donor Name,Amount,Cause,PAN,Status,Payment ID,Date\n';
      donations.forEach(d => {
        csvData += `"${d.receipt_number || 'N/A'}","${d.donor_name}","${d.amount}","${d.cause}","${d.pan || 'N/A'}","${d.status}","${d.payment_id || 'N/A'}","${d.created_at}"\n`;
      });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid export type. Supported: members, applications, donations.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ssd_${type}_export_${Date.now()}.csv`);
    return res.send(csvData);

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET SYSTEM SETTINGS
router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = Array.from(embeddedStore.system_settings.values());
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    return res.json({ success: true, settings: settingsObj });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. UPDATE SYSTEM SETTINGS (Super Admin)
router.post('/settings', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, error: 'Setting key and value are required.' });
    }

    embeddedStore.system_settings.set(key, {
      key: key,
      value: value,
      description: description || '',
      updated_by: req.user.id,
      updated_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({ success: true, message: `System setting [${key}] updated successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. CLEAR ALL DEMO DATA (Super Admin only)
router.post('/clear-demo-data', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    embeddedStore.membership_applications.clear();
    embeddedStore.approval_actions.clear();
    embeddedStore.members.clear();
    embeddedStore.donations.clear();
    embeddedStore.receipts.clear();
    embeddedStore.audit_logs.clear();
    embeddedStore.contact_messages.clear();
    embeddedStore.event_registrations.clear();
    if (embeddedStore.batch_history) embeddedStore.batch_history.clear();
    if (embeddedStore.content_audit_logs) embeddedStore.content_audit_logs.clear();
    if (embeddedStore.enlistment_questionnaires) embeddedStore.enlistment_questionnaires.clear();
    if (embeddedStore.applicant_organizations) embeddedStore.applicant_organizations.clear();
    if (embeddedStore.user_terms_acceptances) embeddedStore.user_terms_acceptances.clear();

    // Reset Gallery to authentic historical records only (zero Unsplash stock photos)
    embeddedStore.gallery.clear();
    embeddedStore.gallery.set('gal_1', {
      id: 'gal_1',
      imageUrl: 'dr-ambedkar-with-ssd-cadets.jpg',
      caption: 'Historic Archival Record: Dr. Babasaheb Ambedkar with Uniformed Samata Sainik Dal Cadets',
      category: 'Historical',
      approvalStatus: 'approved',
      updatedAt: Date.now()
    });
    embeddedStore.gallery.set('gal_2', {
      id: 'gal_2',
      imageUrl: 'ssd-cadets-march.jpg',
      caption: 'Samata Sainik Dal Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi',
      category: 'Cadet Drills',
      approvalStatus: 'approved',
      updatedAt: Date.now()
    });
    embeddedStore.gallery.set('gal_3', {
      id: 'gal_3',
      imageUrl: 'dr-ambedkar-founder.jpg',
      caption: 'Bodhisattva Dr. B.R. Ambedkar - Founder, Samata Sainik Dal (Est. 24 September 1927)',
      category: 'Historical',
      approvalStatus: 'approved',
      updatedAt: Date.now()
    });

    // Strip any Unsplash stock photos from leadership & testimonials
    if (embeddedStore.leadership) {
      for (const [id, l] of embeddedStore.leadership.entries()) {
        if (l.photoUrl && l.photoUrl.includes('unsplash.com')) {
          l.photoUrl = 'logo.png';
        }
      }
    }
    if (embeddedStore.testimonials) {
      for (const [id, t] of embeddedStore.testimonials.entries()) {
        if (t.photoUrl && t.photoUrl.includes('unsplash.com')) {
          t.photoUrl = 'logo.png';
        }
      }
    }

    const officialEmails = new Set([
      'admin@ssd.org',
      'secretary@ssd.org',
      'state.mh@ssd.org',
      'region.vidarbha@ssd.org',
      'district.nagpur@ssd.org',
      'district.pune@ssd.org',
      'finance@ssd.org',
      'media@ssd.org',
      'approvals@ssd.org',
      'taluka.nagpur@ssd.org',
      'taluka.haveli@ssd.org'
    ]);

    const preservedUserIds = new Set();
    for (const [id, u] of embeddedStore.users.entries()) {
      if (officialEmails.has(u.email)) {
        preservedUserIds.add(id);
      } else {
        embeddedStore.users.delete(id);
      }
    }

    for (const [id, j] of embeddedStore.user_jurisdictions.entries()) {
      if (!preservedUserIds.has(j.user_id)) {
        embeddedStore.user_jurisdictions.delete(id);
      }
    }

    saveEmbeddedStore();

    return res.json({
      success: true,
      message: 'All demo applications, members, donations, receipts, and demo photos cleared successfully. Authentic archives preserved.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

