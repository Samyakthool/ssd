// Script to clean all Unsplash URLs from Firebase Realtime Database
const FIREBASE_URL = 'https://ssdind-9b4f8-default-rtdb.firebaseio.com';

async function cleanFirebase() {
  console.log('Fetching database from Firebase...');

  // 1. Clean News
  try {
    const res = await fetch(`${FIREBASE_URL}/news.json`);
    const news = await res.json();
    if (news && typeof news === 'object') {
      let updated = false;
      for (const [key, item] of Object.entries(news)) {
        if (item && item.imageUrl && item.imageUrl.includes('unsplash.com')) {
          item.imageUrl = 'ssd-cadets-march.jpg';
          await fetch(`${FIREBASE_URL}/news/${key}/imageUrl.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify('ssd-cadets-march.jpg')
          });
          console.log(`Cleaned unsplash from news/${key}`);
        }
      }
    }
  } catch (e) {
    console.error('Error cleaning news:', e.message);
  }

  // 2. Clean Campaigns
  try {
    const res = await fetch(`${FIREBASE_URL}/campaigns.json`);
    const campaigns = await res.json();
    if (campaigns && typeof campaigns === 'object') {
      for (const [key, item] of Object.entries(campaigns)) {
        if (item && item.imageUrl && item.imageUrl.includes('unsplash.com')) {
          await fetch(`${FIREBASE_URL}/campaigns/${key}/imageUrl.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify('ssd-cadets-march.jpg')
          });
          console.log(`Cleaned unsplash from campaigns/${key}`);
        }
      }
    }
  } catch (e) {
    console.error('Error cleaning campaigns:', e.message);
  }

  // 3. Clean Leadership
  try {
    const res = await fetch(`${FIREBASE_URL}/leadership.json`);
    const leadership = await res.json();
    if (leadership && typeof leadership === 'object') {
      for (const [key, item] of Object.entries(leadership)) {
        if (item && item.photoUrl && item.photoUrl.includes('unsplash.com')) {
          await fetch(`${FIREBASE_URL}/leadership/${key}/photoUrl.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify('logo.png')
          });
          console.log(`Cleaned unsplash from leadership/${key}`);
        }
      }
    }
  } catch (e) {
    console.error('Error cleaning leadership:', e.message);
  }

  // 4. Ensure Gallery is empty
  try {
    await fetch(`${FIREBASE_URL}/gallery.json`, {
      method: 'DELETE'
    });
    console.log('Ensured gallery is deleted from Firebase.');
  } catch (e) {
    console.error('Error deleting gallery:', e.message);
  }

  console.log('Firebase clean complete!');
}

cleanFirebase();
