// ==========================================================================
// SAMATA SAINIK DAL (SSD) - TRANSACTION-SAFE SAINIK ID GENERATOR
// Format: SSD-[JOINING_YEAR]-[UNIQUE_NUMBER] (e.g. SSD-2012-0001, SSD-2015-0001)
// Strictly NO letter 'V' anywhere in generated Sainik IDs
// ==========================================================================

import { query, embeddedStore, saveEmbeddedStore, supabase, getDatabaseType } from '../db/index.js';

// Mutex queues per year to prevent race conditions during concurrent serverless/process calls
const yearMutexes = new Map();

function withYearLock(year, asyncFn) {
  const currentPromise = yearMutexes.get(year) || Promise.resolve();
  const nextPromise = currentPromise.then(
    () => asyncFn(),
    () => asyncFn()
  );
  yearMutexes.set(year, nextPromise.catch(() => {}));
  return nextPromise;
}

/**
 * Initializes and syncs counter for a given joining year
 */
function getInitialCounterForYear(year) {
  const yrStr = String(year);
  let maxSeq = 0;

  // 1. Scan embeddedStore.members
  if (embeddedStore.members) {
    for (const m of embeddedStore.members.values()) {
      const sId = m.sainik_id || m.sainikId;
      if (sId && typeof sId === 'string') {
        // Match SSD-YYYY-NNNN or SSD-STATE-YYYY-NNNN
        const matchExact = sId.match(new RegExp(`^SSD-${yrStr}-(\\d+)$`, 'i'));
        if (matchExact) {
          const num = parseInt(matchExact[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    }
  }

  // 2. Scan embeddedStore.membership_applications
  if (embeddedStore.membership_applications) {
    for (const a of embeddedStore.membership_applications.values()) {
      const sId = a.sainik_id || a.sainikId;
      if (sId && typeof sId === 'string') {
        const matchExact = sId.match(new RegExp(`^SSD-${yrStr}-(\\d+)$`, 'i'));
        if (matchExact) {
          const num = parseInt(matchExact[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    }
  }

  return maxSeq;
}

/**
 * Atomically allocates next sequential Sainik ID for a joining year.
 * Prevents duplicates during concurrent requests.
 * Format: SSD-[JOINING_YEAR]-[UNIQUE_NUMBER] (e.g. SSD-2012-0001)
 */
export async function allocateSainikId(joiningYearInput, options = {}) {
  // Validate and normalize joining year
  let year = parseInt(joiningYearInput, 10);
  if (isNaN(year) || year < 1927 || year > 2100) {
    const m = String(joiningYearInput).match(/\b(19\d{2}|20\d{2})\b/);
    year = m ? parseInt(m[1], 10) : 2026;
  }

  return withYearLock(year, async () => {
    let nextSeq = null;

    // 1. Try PostgreSQL / Supabase atomic sequence allocation if available
    const dbType = getDatabaseType();
    if (dbType === 'postgres' || dbType === 'supabase_postgres') {
      try {
        const res = await query(
          `INSERT INTO sainik_id_counters (joining_year, last_sequence, updated_at)
           VALUES ($1, 1, CURRENT_TIMESTAMP)
           ON CONFLICT (joining_year)
           DO UPDATE SET 
             last_sequence = sainik_id_counters.last_sequence + 1,
             updated_at = CURRENT_TIMESTAMP
           RETURNING last_sequence;`,
          [year]
        );
        if (res && res.rows && res.rows.length > 0 && res.rows[0].last_sequence) {
          nextSeq = parseInt(res.rows[0].last_sequence, 10);
        }
      } catch (dbErr) {
        // Fall through to embeddedStore
      }
    }

    // 2. Resilient In-Memory / Embedded Counter Fallback
    if (!embeddedStore.sainik_id_counters) {
      embeddedStore.sainik_id_counters = new Map();
    }

    if (nextSeq === null) {
      let currentVal = embeddedStore.sainik_id_counters.get(year);
      if (currentVal === undefined || currentVal === null) {
        currentVal = getInitialCounterForYear(year);
      }
      nextSeq = currentVal + 1;
      embeddedStore.sainik_id_counters.set(year, nextSeq);
    } else {
      // Keep embedded store counter aligned with PostgreSQL
      const curEmbedded = embeddedStore.sainik_id_counters.get(year) || 0;
      if (nextSeq > curEmbedded) {
        embeddedStore.sainik_id_counters.set(year, nextSeq);
      }
    }

    // Ensure collision avoidance against any historical or pre-seeded ID
    let candidateSeq = nextSeq;
    let candidateId = `SSD-${year}-${String(candidateSeq).padStart(4, '0')}`;

    // Guarantee no letter 'V' anywhere in ID
    if (candidateId.toUpperCase().includes('V')) {
      candidateId = candidateId.replace(/V/gi, '');
    }

    // Verify global uniqueness
    const isTaken = (id) => {
      if (embeddedStore.members && (embeddedStore.members.has(id) || Array.from(embeddedStore.members.values()).some(m => (m.sainik_id === id || m.sainikId === id)))) return true;
      if (embeddedStore.membership_applications && (embeddedStore.membership_applications.has(id) || Array.from(embeddedStore.membership_applications.values()).some(a => (a.sainik_id === id || a.sainikId === id)))) return true;
      return false;
    };

    while (isTaken(candidateId)) {
      candidateSeq++;
      candidateId = `SSD-${year}-${String(candidateSeq).padStart(4, '0')}`;
    }

    // Update counter to highest sequence allocated
    embeddedStore.sainik_id_counters.set(year, candidateSeq);
    saveEmbeddedStore();

    // Record audit log
    const auditRecord = {
      id: `audit_id_gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action: 'SAINIK_ID_ASSIGNED',
      entity_type: 'member',
      entity_id: candidateId,
      actor_name: options.assignedBy || 'Central Command Auto-Allocation',
      details: {
        sainikId: candidateId,
        joiningYear: year,
        sequenceNumber: candidateSeq,
        format: 'SSD-[JOINING_YEAR]-[UNIQUE_NUMBER]',
        applicationId: options.applicationId || null,
        membershipType: options.membershipType || 'LEGACY'
      },
      created_at: new Date().toISOString()
    };

    if (embeddedStore.audit_logs) {
      embeddedStore.audit_logs.set(auditRecord.id, auditRecord);
    }

    return {
      sainikId: candidateId,
      joiningYear: year,
      sequence: candidateSeq,
      generatedAt: new Date().toISOString()
    };
  });
}

/**
 * Validates whether a Sainik ID follows the official format:
 * SSD-[JOINING_YEAR]-[UNIQUE_NUMBER] (e.g. SSD-2012-0001)
 * Or existing legacy formats (e.g. SSD-MH-2026-001245)
 */
export function isValidSainikIdFormat(id) {
  if (!id || typeof id !== 'string') return false;
  // Strict revised format: SSD-[YYYY]-[0-9]{4,}
  const revisedPattern = /^SSD-(19\d{2}|20\d{2})-\d{4,}$/;
  // Legacy / state-based pattern: SSD-[STATE]-[YYYY]-[0-9]+
  const legacyPattern = /^SSD-[A-Z]{2}-(19\d{2}|20\d{2})-\d+$/;
  return revisedPattern.test(id) || legacyPattern.test(id);
}
