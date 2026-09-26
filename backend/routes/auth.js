// ==========================================================================
// SAMATA SAINIK DAL (SSD) - AUTHENTICATION & OFFICER MANAGEMENT ROUTES
// ==========================================================================

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ssd_prod_secret_key_change_in_production_1927_2027';

// 1. OFFICER LOGIN
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { username, email, password, passcode } = req.body;
    const inputEmail = (email || username || '').trim().toLowerCase();
    const inputPass = password || passcode || '';

    if (!inputEmail || !inputPass) {
      return res.status(400).json({ success: false, error: 'Email/Username and Password are required.' });
    }

    // Find User
    const userRes = await query('SELECT * FROM users WHERE email = $1', [inputEmail]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Officer account not found.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: 'Officer account has been suspended or deactivated.' });
    }

    // Verify Password Hash
    let isMatch = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      isMatch = bcrypt.compareSync(inputPass, user.password_hash);
    } else {
      isMatch = (user.password_hash === inputPass); // fallback for plaintext seed
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Authentication failed.' });
    }

    // Fetch Jurisdiction Info
    const jurRes = await query('SELECT * FROM user_jurisdictions WHERE user_id = $1', [user.id]);
    const jurisdictions = jurRes.rows;
    const primaryJurisdiction = jurisdictions.find(j => j.is_primary) || jurisdictions[0] || {};

    // Generate JWT Token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role_id
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Update Last Login
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Record Audit Log
    const auditId = 'log_' + Date.now();
    await query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, jurisdiction_summary, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        auditId,
        user.id,
        user.full_name,
        user.role_id,
        'LOGIN',
        'AUTH',
        user.id,
        primaryJurisdiction.district_id ? `${primaryJurisdiction.district_id}, ${primaryJurisdiction.state_id}` : 'National HQ',
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role_id,
        department: user.department,
        jurisdiction: primaryJurisdiction,
        jurisdictions: jurisdictions
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error during authentication.' });
  }
});

// 2. GET CURRENT AUTHENTICATED PROFILE
router.get('/me', authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// 3. CHANGE PASSWORD
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const userRes = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    let isMatch = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    } else {
      isMatch = (user.password_hash === currentPassword);
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password does not match.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, req.user.id]);

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. LIST ALL OFFICERS (Super Admin & Central Admin)
router.get('/officers', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const usersRes = await query('SELECT id, email, full_name, phone, role_id, department, status, last_login, created_at FROM users ORDER BY created_at ASC');
    const jurRes = await query('SELECT * FROM user_jurisdictions');

    const officers = usersRes.rows.map(u => {
      const jur = jurRes.rows.filter(j => j.user_id === u.id);
      return {
        ...u,
        jurisdictions: jur,
        primaryJurisdiction: jur.find(j => j.is_primary) || jur[0] || null
      };
    });

    return res.json({ success: true, officers: officers });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. ONBOARD NEW OFFICER
router.post('/officers', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const { email, password, fullName, phone, roleId, department, stateId, regionId, districtId, talukaId, chapterId } = req.body;

    if (!email || !password || !fullName || !roleId) {
      return res.status(400).json({ success: false, error: 'Email, password, full name, and role are required.' });
    }

    // Check duplicate
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'An officer with this email address already exists.' });
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const passwordHash = bcrypt.hashSync(password, 10);

    await query(
      `INSERT INTO users (id, email, password_hash, full_name, phone, role_id, department, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, email.trim().toLowerCase(), passwordHash, fullName.trim(), phone, roleId, department || 'Organizational Directorate']
    );

    // Insert Jurisdiction
    const jurId = 'jur_' + userId;
    await query(
      `INSERT INTO user_jurisdictions (id, user_id, role_id, state_id, region_id, district_id, taluka_id, chapter_id, is_primary, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP)`,
      [jurId, userId, roleId, stateId || null, regionId || null, districtId || null, talukaId || null, chapterId || null]
    );

    return res.json({
      success: true,
      message: 'Officer onboarded successfully with assigned jurisdiction.',
      officerId: userId
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. TOGGLE OFFICER STATUS
router.patch('/officers/:id/status', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }

    await query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    return res.json({ success: true, message: `Officer account set to ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. UPDATE OFFICER DETAILS & JURISDICTION
router.put('/officers/:id', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, roleId, department, status, password, stateId, regionId, districtId, talukaId, chapterId } = req.body;

    const userRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Officer account not found.' });
    }

    if (password && password.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      await query(
        'UPDATE users SET full_name = $1, phone = $2, role_id = $3, department = $4, status = $5, password_hash = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7',
        [fullName || userRes.rows[0].full_name, phone || userRes.rows[0].phone, roleId || userRes.rows[0].role_id, department || userRes.rows[0].department, status || userRes.rows[0].status, hash, id]
      );
    } else {
      await query(
        'UPDATE users SET full_name = $1, phone = $2, role_id = $3, department = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6',
        [fullName || userRes.rows[0].full_name, phone || userRes.rows[0].phone, roleId || userRes.rows[0].role_id, department || userRes.rows[0].department, status || userRes.rows[0].status, id]
      );
    }

    // Update Jurisdiction
    await query('DELETE FROM user_jurisdictions WHERE user_id = $1', [id]);
    const jurId = 'jur_' + id;
    await query(
      `INSERT INTO user_jurisdictions (id, user_id, role_id, state_id, region_id, district_id, taluka_id, chapter_id, is_primary, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP)`,
      [jurId, id, roleId || userRes.rows[0].role_id, stateId || null, regionId || null, districtId || null, talukaId || null, chapterId || null]
    );

    return res.json({ success: true, message: 'Officer details and jurisdiction updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. REVOKE / DELETE OFFICER
router.delete('/officers/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot revoke your own active super admin credentials.' });
    }
    await query('DELETE FROM user_jurisdictions WHERE user_id = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Officer authorization revoked successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
