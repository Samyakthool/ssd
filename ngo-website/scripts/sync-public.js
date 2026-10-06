import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Files to copy to public directory
const itemsToCopy = [
  'index.html',
  'admin.html',
  'about.html',
  'cadet-corps.html',
  'contact.html',
  'gallery.html',
  'legal-cell.html',
  'mahila-dal.html',
  'member-portal.html',
  'membership.html',
  'news-events.html',
  'sewa-relief.html',
  'verify.html',
  'youth-wing.html',
  'architecture-and-workflow.html',
  'styles.css',
  'admin.css',
  'app.js',
  'admin.js',
  'member-portal.js',
  'logo.svg',
  'logo.png',
  'image.png',
  'SSD_System_Architecture_and_Workflow.pdf',
  'Dr._Babasaheb_Ambedkar_delivering_speech_about_renouncing_Hinduism_at_Yeola,_Nashik_on_13_Oct,_1935.jpg_01.jpg'
];

for (const item of itemsToCopy) {
  const src = path.join(rootDir, item);
  const dest = path.join(publicDir, item);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Directories to copy
const dirsToCopy = ['js', 'uploads'];
for (const dir of dirsToCopy) {
  const src = path.join(rootDir, dir);
  const dest = path.join(publicDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

console.log('✅ [Build Sync] Public output directory synchronized successfully.');
