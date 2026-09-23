// ==========================================================================
// SAMATA SAINIK DAL (SSD) - VERCEL SERVERLESS HEALTH ENDPOINT
// ==========================================================================

import app, { ensureDb } from '../server.js';

export default async function handler(req, res) {
  await ensureDb();
  return app(req, res);
}
