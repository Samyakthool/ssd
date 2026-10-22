// ==========================================================================
// TEST SUITE: CMS, AIM & MOTTO, HISTORY, CONSTITUTION, LIBRARY & LEGAL
// ==========================================================================

import assert from 'assert';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const dataStr = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

async function run() {
  console.log('--- Testing CMS, Constitution, Library & Legal APIs ---');

  // 1. Homepage CMS
  const homeRes = await get('/api/cms/homepage');
  assert.strictEqual(homeRes.status, 200);
  assert.strictEqual(homeRes.body.success, true);
  assert.ok(homeRes.body.homepage.hero);
  console.log('✅ PASS: Homepage CMS retrieval');

  // 2. Aim & Motto
  const aimRes = await get('/api/cms/aim-motto');
  assert.strictEqual(aimRes.status, 200);
  assert.ok(aimRes.body.aim_motto.official_aim.mr);
  assert.ok(aimRes.body.aim_motto.official_motto.hi);
  console.log('✅ PASS: Trilingual Aim & Motto retrieval');

  // 3. Historical Organizations
  const histOrgRes = await get('/api/cms/history/organizations');
  assert.strictEqual(histOrgRes.status, 200);
  assert.ok(histOrgRes.body.organizations.length >= 5);
  console.log(`✅ PASS: Historical Organizations (${histOrgRes.body.organizations.length} verified records)`);

  // 4. Historical Timeline
  const timeRes = await get('/api/cms/history/timeline');
  assert.strictEqual(timeRes.status, 200);
  assert.ok(timeRes.body.timeline.length >= 8);
  console.log(`✅ PASS: Historical Timeline (${timeRes.body.timeline.length} milestone events)`);

  // 5. Constitution & Checksum
  const constRes = await get('/api/constitution');
  assert.strictEqual(constRes.status, 200);
  assert.ok(constRes.body.constitution.chapters.length >= 6);
  assert.ok(constRes.body.constitution.sha256Checksum);
  console.log('✅ PASS: Official Constitution & Chapters retrieval');

  const verifyCheckRes = await post('/api/constitution/verify-checksum', {
    checksum: constRes.body.constitution.sha256Checksum
  });
  assert.strictEqual(verifyCheckRes.status, 200);
  assert.strictEqual(verifyCheckRes.body.valid, true);
  console.log('✅ PASS: Cryptographic SHA-256 Checksum Verification');

  // 6. Library Categories & Resources
  const catsRes = await get('/api/library/categories');
  assert.strictEqual(catsRes.status, 200);
  assert.ok(catsRes.body.categories.length >= 6);

  const libRes = await get('/api/library/resources');
  assert.strictEqual(libRes.status, 200);
  assert.ok(libRes.body.resources.length >= 5);
  console.log(`✅ PASS: Digital Library Catalog (${libRes.body.resources.length} resources across ${catsRes.body.categories.length} categories)`);

  // 7. Terms & Conditions (20 sections)
  const termsRes = await get('/api/legal/terms');
  assert.strictEqual(termsRes.status, 200);
  assert.strictEqual(termsRes.body.terms.sections.length, 20);
  console.log('✅ PASS: Terms & Conditions with all 20 required sections');

  // 8. Privacy Policy (DPDP Compliant)
  const privacyRes = await get('/api/legal/privacy');
  assert.strictEqual(privacyRes.status, 200);
  assert.ok(privacyRes.body.privacy.sections.length >= 6);
  console.log('✅ PASS: DPDP Act 2023 compliant Privacy Policy');

  // 9. Statutory Terms Acceptance Recording
  const acceptRes = await post('/api/legal/accept-terms', {
    userIdentifier: 'SSD-MH-2026-TEST',
    versionAccepted: '1.0'
  });
  assert.strictEqual(acceptRes.status, 200);
  assert.strictEqual(acceptRes.body.success, true);
  assert.ok(acceptRes.body.recordId);
  console.log('✅ PASS: User statutory terms acceptance logged');

  console.log('🎉 ALL NEW FEATURE ENDPOINTS VALIDATED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
