import { query } from '@/db/postgres';
import { AuthSessionPayload } from '@/modules/auth/service';
import { requirePermission } from '@/security/jurisdictionGuard';
import { AppError } from '@/lib/errors';
import { AuditLog } from '@/types';

export class CmsService {
  /**
   * Public & Scoped Events Query
   */
  static async getEvents(options: { status?: string; wing?: string; all?: boolean } = {}) {
    const res = await query<any>('SELECT * FROM events ORDER BY event_date ASC');
    let events = res.rows;

    if (!options.all) {
      events = events.filter((e) => (e.approval_status || e.approvalStatus || 'approved').toLowerCase() === 'approved');
    }
    if (options.status && options.status !== 'all') {
      events = events.filter((e) => (e.status || '').toLowerCase() === options.status?.toLowerCase());
    }
    if (options.wing) {
      events = events.filter((e) => e.wing_name === options.wing || e.wing === options.wing);
    }

    return events;
  }

  /**
   * Official News & Press Releases
   */
  static async getNews(options: { category?: string } = {}) {
    const res = await query<any>('SELECT * FROM news ORDER BY published_at DESC');
    let news = res.rows;

    if (options.category) {
      news = news.filter((n) => (n.category || '').toLowerCase() === options.category?.toLowerCase());
    }

    return news;
  }

  /**
   * Photo Gallery Archives
   */
  static async getGallery(options: { tag?: string } = {}) {
    const res = await query<any>('SELECT * FROM gallery ORDER BY created_at DESC');
    let gallery = res.rows;

    if (options.tag) {
      gallery = gallery.filter((g) => (g.tags || []).includes(options.tag));
    }

    return gallery;
  }

  /**
   * Leadership & Command Hierarchy
   */
  static async getLeadership() {
    const res = await query<any>('SELECT * FROM leadership ORDER BY display_order ASC, rank_level ASC');
    return res.rows;
  }

  /**
   * Tamper-Proof Audit Logs Query
   */
  static async getAuditLogs(session: AuthSessionPayload): Promise<AuditLog[]> {
    requirePermission(session, 'admin.audit.view');

    const res = await query<AuditLog>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');
    return res.rows;
  }
}
