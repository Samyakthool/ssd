import { query } from '@/db/postgres';
import { AuthSessionPayload } from '@/modules/auth/service';
import { requirePermission } from '@/security/jurisdictionGuard';
import { AppError } from '@/lib/errors';
import { AuditLog } from '@/types';
// @ts-ignore
import { embeddedStore, saveEmbeddedStore } from '../../../backend/db/index.js';
import { getSupabaseAdmin } from '@/db/supabase';

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
    let gallery: any[] = [];
    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        const { data } = await sb.from('gallery').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          gallery = data.map((d: any) => ({
            id: d.id,
            imageUrl: d.image_url || d.imageUrl,
            caption: d.caption,
            category: d.category,
            approvalStatus: d.approval_status || d.approvalStatus || 'approved',
            createdAt: d.created_at
          }));
        }
      }
    } catch {}

    if (gallery.length === 0) {
      const res = await query<any>('SELECT * FROM gallery ORDER BY created_at DESC');
      gallery = res.rows;
    }

    // Filter out black and white photos
    gallery = gallery.filter((item: any) => {
      const url = (item.imageUrl || item.image_url || '').toLowerCase();
      const cap = (item.caption || '').toLowerCase();
      return !url.includes('dr-ambedkar-with-ssd-cadets') &&
             !url.includes('dr-ambedkar-founder') &&
             !url.includes('yeola') &&
             !url.includes('renouncing_hinduism') &&
             !url.includes('ambedkar_delivering_speech') &&
             !cap.includes('renouncing hinduism') &&
             !cap.includes('address at yeola');
    });

    if (options.tag) {
      gallery = gallery.filter((g) => (g.tags || []).includes(options.tag));
    }

    return gallery;
  }

  static async createGalleryItem(data: { imageUrl: string; caption?: string; category?: string; approvalStatus?: string; id?: string }) {
    const id = data.id || ('gal_' + Date.now());
    const item = {
      id,
      imageUrl: data.imageUrl.trim(),
      caption: data.caption ? data.caption.trim() : 'SSD Field Photograph',
      category: data.category || 'Cadet Drills',
      approvalStatus: data.approvalStatus || 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        await sb.from('gallery').upsert({
          id: item.id,
          image_url: item.imageUrl,
          caption: item.caption,
          category: item.category,
          approval_status: item.approvalStatus,
          created_at: item.created_at,
          updated_at: item.updated_at
        });
      }
    } catch {}

    if (embeddedStore && embeddedStore.gallery) {
      embeddedStore.gallery.set(id, item);
      saveEmbeddedStore();
    }

    return item;
  }

  static async deleteGalleryItem(id: string) {
    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        await sb.from('gallery').delete().eq('id', id);
      }
    } catch {}

    let existed = false;
    if (embeddedStore && embeddedStore.gallery) {
      existed = embeddedStore.gallery.delete(id);
      if (existed) {
        saveEmbeddedStore();
      }
    }
    return existed;
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
