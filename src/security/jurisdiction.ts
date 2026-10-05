import { JurisdictionScope, SystemRole } from '../types';

export interface EvaluatedJurisdiction {
  isAuthorized: boolean;
  reason?: string;
}

/**
 * Validates whether an official with a given role and assigned jurisdiction
 * is authorized to access or modify a resource scoped to a specific jurisdiction.
 */
export function validateJurisdictionAccess(
  userRole: SystemRole,
  assignedJurisdiction: JurisdictionScope,
  resourceJurisdiction: JurisdictionScope
): EvaluatedJurisdiction {
  // Super Admin & Central Admin have national jurisdiction across all states and districts
  if (userRole === 'super_admin' || userRole === 'central_admin') {
    return { isAuthorized: true };
  }

  // State Official: Resource must be in the assigned state
  if (userRole === 'state_official') {
    if (!assignedJurisdiction.stateId && !assignedJurisdiction.stateName) {
      return { isAuthorized: false, reason: 'Official has no assigned state jurisdiction' };
    }
    const matchStateId = assignedJurisdiction.stateId && resourceJurisdiction.stateId === assignedJurisdiction.stateId;
    const matchStateName =
      assignedJurisdiction.stateName &&
      resourceJurisdiction.stateName?.toLowerCase() === assignedJurisdiction.stateName.toLowerCase();

    if (matchStateId || matchStateName) {
      return { isAuthorized: true };
    }
    return {
      isAuthorized: false,
      reason: `Access denied: Resource state (${resourceJurisdiction.stateName || resourceJurisdiction.stateId}) does not match assigned state (${assignedJurisdiction.stateName || assignedJurisdiction.stateId})`,
    };
  }

  // Regional Official: Resource must match assigned state and region
  if (userRole === 'regional_official') {
    if (!assignedJurisdiction.regionId && !assignedJurisdiction.regionName) {
      return { isAuthorized: false, reason: 'Official has no assigned regional jurisdiction' };
    }
    const matchRegionId = assignedJurisdiction.regionId && resourceJurisdiction.regionId === assignedJurisdiction.regionId;
    const matchRegionName =
      assignedJurisdiction.regionName &&
      resourceJurisdiction.regionName?.toLowerCase() === assignedJurisdiction.regionName.toLowerCase();

    if (matchRegionId || matchRegionName) {
      return { isAuthorized: true };
    }
    return {
      isAuthorized: false,
      reason: `Access denied: Resource region does not match assigned region`,
    };
  }

  // District Official: Resource MUST match assigned district
  if (userRole === 'district_official') {
    if (!assignedJurisdiction.districtId && !assignedJurisdiction.districtName) {
      return { isAuthorized: false, reason: 'Official has no assigned district jurisdiction' };
    }
    const matchDistrictId =
      assignedJurisdiction.districtId && resourceJurisdiction.districtId === assignedJurisdiction.districtId;
    const matchDistrictName =
      assignedJurisdiction.districtName &&
      resourceJurisdiction.districtName?.toLowerCase() === assignedJurisdiction.districtName.toLowerCase();

    if (matchDistrictId || matchDistrictName) {
      return { isAuthorized: true };
    }
    return {
      isAuthorized: false,
      reason: `Access denied: Resource district (${resourceJurisdiction.districtName || resourceJurisdiction.districtId}) does not match assigned jurisdiction (${assignedJurisdiction.districtName || assignedJurisdiction.districtId})`,
    };
  }

  // Taluka Official: Resource must match assigned taluka
  if (userRole === 'taluka_official') {
    if (!assignedJurisdiction.talukaId && !assignedJurisdiction.talukaName) {
      return { isAuthorized: false, reason: 'Official has no assigned taluka jurisdiction' };
    }
    const matchTalukaId = assignedJurisdiction.talukaId && resourceJurisdiction.talukaId === assignedJurisdiction.talukaId;
    const matchTalukaName =
      assignedJurisdiction.talukaName &&
      resourceJurisdiction.talukaName?.toLowerCase() === assignedJurisdiction.talukaName.toLowerCase();

    if (matchTalukaId || matchTalukaName) {
      return { isAuthorized: true };
    }
    return {
      isAuthorized: false,
      reason: `Access denied: Resource taluka does not match assigned taluka jurisdiction`,
    };
  }

  // Chapter Official: Resource must match assigned chapter
  if (userRole === 'chapter_official') {
    if (!assignedJurisdiction.chapterId && !assignedJurisdiction.chapterName) {
      return { isAuthorized: false, reason: 'Official has no assigned chapter jurisdiction' };
    }
    const matchChapterId =
      assignedJurisdiction.chapterId && resourceJurisdiction.chapterId === assignedJurisdiction.chapterId;
    const matchChapterName =
      assignedJurisdiction.chapterName &&
      resourceJurisdiction.chapterName?.toLowerCase() === assignedJurisdiction.chapterName.toLowerCase();

    if (matchChapterId || matchChapterName) {
      return { isAuthorized: true };
    }
    return {
      isAuthorized: false,
      reason: `Access denied: Resource chapter does not match assigned chapter jurisdiction`,
    };
  }

  // Finance and Media admins do not have territorial jurisdiction over membership records
  return {
    isAuthorized: false,
    reason: `Role '${userRole}' does not hold membership jurisdiction authority`,
  };
}
