import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dbFiles = [
  path.join(rootDir, 'data_store.json'),
  path.join(rootDir, 'ngo-website', 'data_store.json')
];

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

for (const filePath of dbFiles) {
  if (!fs.existsSync(filePath)) continue;

  console.log(`Purging demo data in ${filePath}...`);
  const ds = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Clear test and demo datasets
  ds.membership_applications = [];
  ds.approval_actions = [];
  ds.members = [];
  ds.donations = [];
  ds.receipts = [];
  ds.event_registrations = [];
  ds.contact_messages = [];
  ds.audit_logs = [];
  ds.batch_history = [];
  ds.content_audit_logs = [];
  ds.enlistment_questionnaires = [];
  ds.applicant_organizations = [];
  ds.user_terms_acceptances = [];

  // 2. Filter users to official command officer accounts
  const preservedUserIds = new Set();
  const filteredUsers = [];
  for (const [id, u] of ds.users) {
    if (officialEmails.has(u.email)) {
      preservedUserIds.add(id);
      filteredUsers.push([id, u]);
    }
  }
  ds.users = filteredUsers;

  // 3. Filter jurisdictions
  ds.user_jurisdictions = ds.user_jurisdictions.filter(([id, j]) => preservedUserIds.has(j.user_id));

  // 4. Authentic historical gallery (zero Unsplash stock photos, zero B&W photos)
  ds.gallery = [
    [
      'gal_1',
      {
        id: 'gal_1',
        imageUrl: 'ssd-cadets-march.jpg',
        caption: 'Samata Sainik Dal Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi',
        category: 'Cadet Drills',
        approvalStatus: 'approved',
        updatedAt: Date.now()
      }
    ]
  ];

  // 5. Replace Unsplash stock photos in Leadership with official logo
  if (Array.isArray(ds.leadership)) {
    for (const [id, leader] of ds.leadership) {
      if (leader.photoUrl && leader.photoUrl.includes('unsplash.com')) {
        leader.photoUrl = 'logo.png';
      }
    }
  }

  // 6. Replace Unsplash stock photos in Testimonials with official logo
  if (Array.isArray(ds.testimonials)) {
    for (const [id, t] of ds.testimonials) {
      if (t.photoUrl && t.photoUrl.includes('unsplash.com')) {
        t.photoUrl = 'logo.png';
      }
    }
  }

  // 7. Replace Unsplash in News
  if (Array.isArray(ds.news)) {
    for (const [id, n] of ds.news) {
      if (n.imageUrl && n.imageUrl.includes('unsplash.com')) {
        n.imageUrl = 'ssd-cadets-march.jpg';
      }
    }
  }

  // 8. Replace Unsplash in Campaigns
  if (Array.isArray(ds.campaigns)) {
    for (const [id, c] of ds.campaigns) {
      if (c.imageUrl && c.imageUrl.includes('unsplash.com')) {
        c.imageUrl = 'ssd-cadets-march.jpg';
      }
    }
  }

  // 9. Replace Unsplash in Events
  if (Array.isArray(ds.events)) {
    for (const [id, e] of ds.events) {
      if (e.banner_url && e.banner_url.includes('unsplash.com')) {
        e.banner_url = 'ssd-cadets-march.jpg';
      }
      if (e.image_url && e.image_url.includes('unsplash.com')) {
        e.image_url = 'ssd-cadets-march.jpg';
      }
    }
  }

  // 10. Replace Unsplash in Historical Organizations
  if (Array.isArray(ds.historical_organizations)) {
    for (const [id, ho] of ds.historical_organizations) {
      if (ho.imageUrl && ho.imageUrl.includes('unsplash.com')) {
        ho.imageUrl = 'dr-ambedkar-with-ssd-cadets.jpg';
      }
    }
  }

  // 11. Replace Unsplash in Library Resources
  if (Array.isArray(ds.library_resources)) {
    for (const [id, lr] of ds.library_resources) {
      if (lr.coverUrl && lr.coverUrl.includes('unsplash.com')) {
        lr.coverUrl = 'logo.png';
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(ds, null, 2), 'utf8');
  console.log(`Successfully purged demo data and stock photos in ${filePath}`);
}

