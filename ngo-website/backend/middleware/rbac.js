// ==========================================================================
// SAMATA SAINIK DAL (SSD) - RBAC & JURISDICTION AUTHORIZATION ENGINE
// ==========================================================================

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }

    const userRole = req.user.role_id;
    if (userRole === 'super_admin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access Denied: Role '${userRole}' is not permitted for this command.`
    });
  };
}

export function enforceJurisdiction(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }

  const { role_id, jurisdiction } = req.user;

  // Super Admin, Central Command, and National Enlistment Approver have National Scope by default
  if (role_id === 'super_admin' || role_id === 'central_admin' || role_id === 'finance_admin' || role_id === 'media_admin' || (role_id === 'enlistment_officer' && (!jurisdiction || !jurisdiction.state_id))) {
    req.jurisdictionFilter = null; // No restriction
    return next();
  }

  if (!jurisdiction) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: No active territorial jurisdiction assigned to officer profile.'
    });
  }

  // Construct strict jurisdiction filter criteria
  const filter = {};
  if (jurisdiction.state_id) filter.state_id = jurisdiction.state_id;
  if (jurisdiction.region_id) filter.region_id = jurisdiction.region_id;
  if (jurisdiction.district_id) filter.district_id = jurisdiction.district_id;
  if (jurisdiction.taluka_id) filter.taluka_id = jurisdiction.taluka_id;
  if (jurisdiction.chapter_id) filter.chapter_id = jurisdiction.chapter_id;

  req.jurisdictionFilter = filter;
  next();
}

// Utility to verify if an officer can operate on a target record
export function canAccessRecord(user, record) {
  if (!user || !record) return false;
  const { role_id, jurisdiction } = user;

  if (role_id === 'super_admin' || role_id === 'central_admin' || (role_id === 'enlistment_officer' && (!jurisdiction || !jurisdiction.state_id))) return true;
  if (!jurisdiction) return false;

  if (role_id === 'enlistment_officer') {
    if (jurisdiction.district_id && record.district_id !== jurisdiction.district_id) return false;
    if (jurisdiction.state_id && record.state_id !== jurisdiction.state_id) return false;
    return true;
  }
  if (role_id === 'state_official') {
    return record.state_id === jurisdiction.state_id;
  }
  if (role_id === 'regional_official') {
    return record.state_id === jurisdiction.state_id && record.region_id === jurisdiction.region_id;
  }
  if (role_id === 'district_official') {
    return record.state_id === jurisdiction.state_id && record.district_id === jurisdiction.district_id;
  }
  if (role_id === 'taluka_official') {
    return record.state_id === jurisdiction.state_id && record.district_id === jurisdiction.district_id && record.taluka_id === jurisdiction.taluka_id;
  }
  if (role_id === 'chapter_official') {
    return record.chapter_id === jurisdiction.chapter_id;
  }

  return false;
}
