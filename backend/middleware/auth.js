// ==========================================================================
// SAMATA SAINIK DAL (SSD) - AUTHENTICATION MIDDLEWARE
// ==========================================================================

import jwt from 'jsonwebtoken';
import { query, embeddedStore } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ssd_prod_secret_key_change_in_production_1927_2027';

export async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization Header: Bearer <token>
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.ssd_token) {
      token = req.cookies.ssd_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: No active session or token provided.'
      });
    }

    // Verify Token
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Authentication Token.'
      });
    }

    // Hydrate User Profile
    const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = userRes.rows[0];

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive or not found.'
      });
    }

    // Hydrate User Jurisdiction
    const jurRes = await query('SELECT * FROM user_jurisdictions WHERE user_id = $1', [user.id]);
    const jurisdictions = jurRes.rows;
    const primaryJurisdiction = jurisdictions.find(j => j.is_primary) || jurisdictions[0] || {};

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role_id: user.role_id,
      department: user.department,
      jurisdiction: primaryJurisdiction,
      jurisdictions: jurisdictions
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, error: 'Authentication failed: ' + err.message });
  }
}

// Optional Auth (for public/member endpoints that behave differently if logged in)
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.userId) {
        const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (userRes.rows[0]) {
          req.user = userRes.rows[0];
        }
      }
    }
  } catch (ignored) {}
  next();
}
